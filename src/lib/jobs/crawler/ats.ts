// Free job crawler using public ATS board APIs.
//
// Greenhouse, Lever and Ashby all expose documented, keyless JSON endpoints
// that serve the same data as the company's own careers page. Consuming them
// is their intended use, there is no scraping involved, and the apply link is
// the real ATS URL rather than an aggregator redirect.
//
// Cost: $0. This is why it's the default crawler (spec §7, §37) — the Apify
// budget in §2 only ever comes into play for coverage this can't provide.
//
// The trade-off is curation: this only sees companies on the list in
// companies.ts. That's a real limitation, and also a quality feature — a
// curated set of employers beats an unfiltered scrape.

import type { CrawlOutcome, JobCrawler, JobQuery, NormalizedJob } from "../types";
import { COMPANY_BOARDS, type CompanyBoard } from "./companies";
import { normalizeAtsJob } from "../normalize";

/** Per-board fetch timeout. One slow board must not stall the whole crawl. */
const BOARD_TIMEOUT_MS = 8_000;

/** Boards fetched in parallel. Kept modest to stay polite to each host. */
const CONCURRENCY = 6;

interface RawBoardJob {
  raw: Record<string, unknown>;
  board: CompanyBoard;
}

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "FindUrAI/1.0 (+https://www.findurai.com)" },
      signal: AbortSignal.timeout(BOARD_TIMEOUT_MS),
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    // A board being down is normal and not worth failing the crawl over.
    return null;
  }
}

/** Fetches every posting for one company board, in that ATS's own shape. */
async function fetchBoard(board: CompanyBoard): Promise<RawBoardJob[]> {
  const wrap = (items: unknown[]): RawBoardJob[] =>
    items
      .filter((i): i is Record<string, unknown> => !!i && typeof i === "object")
      .map((raw) => ({ raw, board }));

  switch (board.ats) {
    case "greenhouse": {
      // content=true returns the full job description in one call.
      const data = await fetchJson(
        `https://boards-api.greenhouse.io/v1/boards/${board.slug}/jobs?content=true`
      );
      const jobs = (data as { jobs?: unknown[] })?.jobs;
      return Array.isArray(jobs) ? wrap(jobs) : [];
    }
    case "lever": {
      const data = await fetchJson(`https://api.lever.co/v0/postings/${board.slug}?mode=json`);
      return Array.isArray(data) ? wrap(data) : [];
    }
    case "ashby": {
      const data = await fetchJson(
        `https://api.ashbyhq.com/posting-api/job-board/${board.slug}?includeCompensation=true`
      );
      const jobs = (data as { jobs?: unknown[] })?.jobs;
      return Array.isArray(jobs) ? wrap(jobs) : [];
    }
    default:
      return [];
  }
}

/** Runs `worker` over `items` with bounded concurrency. */
async function mapLimit<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results.push(await worker(items[index]));
    }
  });
  await Promise.all(runners);
  return results;
}

/** Loose relevance check so we don't return a company's entire board. */
function matchesQuery(job: NormalizedJob, query: JobQuery): boolean {
  const terms = query.keywords
    .toLowerCase()
    .split(/[\s,]+/)
    .filter((t) => t.length > 2);
  if (terms.length === 0) return true;

  const haystack = `${job.title} ${job.requiredSkills.join(" ")} ${job.description.slice(0, 2000)}`.toLowerCase();
  // At least one meaningful term must appear in the title, or two anywhere —
  // title hits are far stronger evidence than a passing mention in prose.
  const titleHit = terms.some((t) => job.title.toLowerCase().includes(t));
  if (titleHit) return true;

  const bodyHits = terms.filter((t) => haystack.includes(t)).length;
  return bodyHits >= 2;
}

function matchesLocation(job: NormalizedJob, query: JobQuery): boolean {
  if (query.remoteOnly) return job.workplaceType === "Remote";
  if (!query.location) return true;

  const wanted = query.location.toLowerCase().trim();
  if (!wanted || wanted === "remote") {
    return wanted === "remote" ? job.workplaceType === "Remote" : true;
  }
  const where = `${job.location} ${job.city ?? ""} ${job.country ?? ""}`.toLowerCase();
  // Remote roles satisfy any location filter — they're location-independent.
  return job.workplaceType === "Remote" || where.includes(wanted);
}

export const atsCrawler: JobCrawler = {
  name: "ats",

  // Public endpoints, no per-result billing.
  estimateCost() {
    return 0;
  },

  async searchJobs(query: JobQuery): Promise<CrawlOutcome> {
    const boards = COMPANY_BOARDS;
    const batches = await mapLimit(boards, CONCURRENCY, fetchBoard);

    const normalized: NormalizedJob[] = [];
    for (const batch of batches) {
      for (const { raw, board } of batch) {
        const job = normalizeAtsJob(raw, board);
        if (job) normalized.push(job);
      }
    }

    const relevant = normalized
      .filter((job) => matchesQuery(job, query) && matchesLocation(job, query))
      // Freshest first, undated last — a job with no date is less trustworthy
      // than one that says when it opened.
      .sort((a, b) => (b.postedAt?.getTime() ?? 0) - (a.postedAt?.getTime() ?? 0))
      .slice(0, query.limit);

    return {
      jobs: relevant,
      provider: "ats",
      runId: null,
      requestedResults: query.limit,
      returnedResults: relevant.length,
      estimatedCostUsd: 0,
      actualCostUsd: 0,
    };
  },
};
