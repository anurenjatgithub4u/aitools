// Apify-backed job crawler, budget-guarded (spec §2, §8, §23, §24).
//
// COST WARNING — read before changing APIFY_JOB_ACTOR
// ---------------------------------------------------
// The §2 budget is $0.10 per crawl for up to 100 results. Measured actor
// pricing at time of writing:
//
//   cheap_scraper/linkedin-job-scraper   $0.0007/result + $0.005/run  → $0.075
//   curious_coder/linkedin-jobs-scraper  $0.0020/result + $0.00005/run → $0.200
//   fantastic-jobs/career-site-api       $0.0120/result + $0.010/run   → $1.210
//
// Only the first fits the budget at full volume. If you switch actors, update
// APIFY_PRICE_PER_RESULT_USD and APIFY_PRICE_PER_RUN_USD to match, or the
// pre-flight estimate will authorise a run you can't afford.
//
// A second consideration the price doesn't show: LinkedIn's terms prohibit
// automated access, and that exposure sits with the product built on the data,
// not with Apify. The free ATS crawler exists partly for this reason and is
// the default. This implementation is here for coverage the curated company
// list can't provide.

import {
  APIFY_JOB_ACTOR,
  APIFY_PRICE_PER_RESULT_USD,
  APIFY_PRICE_PER_RUN_USD,
  CRAWL_TIMEOUT_MS,
  MAX_COST_PER_RUN_USD,
  MAX_PAGES_PER_RUN,
  MAX_RESULTS_PER_RUN,
} from "../config";
import type { CrawlOutcome, JobCrawler, JobQuery, NormalizedJob } from "../types";
import { normalizeGenericJob } from "../normalize";

/** Estimated USD for a run returning `results` items. */
export function estimateApifyCost(results: number): number {
  const capped = Math.min(results, MAX_RESULTS_PER_RUN);
  return Number((APIFY_PRICE_PER_RUN_USD + capped * APIFY_PRICE_PER_RESULT_USD).toFixed(6));
}

/** The most results affordable within the per-run budget. */
export function affordableResults(budgetUsd = MAX_COST_PER_RUN_USD): number {
  if (APIFY_PRICE_PER_RESULT_USD <= 0) return MAX_RESULTS_PER_RUN;
  const remaining = budgetUsd - APIFY_PRICE_PER_RUN_USD;
  if (remaining <= 0) return 0;
  return Math.max(0, Math.min(MAX_RESULTS_PER_RUN, Math.floor(remaining / APIFY_PRICE_PER_RESULT_USD)));
}

export const apifyCrawler: JobCrawler = {
  name: "apify",

  estimateCost(query: JobQuery): number {
    return estimateApifyCost(query.limit);
  },

  async searchJobs(query: JobQuery): Promise<CrawlOutcome> {
    const token = process.env.APIFY_TOKEN;
    const requested = Math.min(query.limit, MAX_RESULTS_PER_RUN, affordableResults());

    const base: Omit<CrawlOutcome, "jobs"> = {
      provider: "apify",
      runId: null,
      requestedResults: requested,
      returnedResults: 0,
      estimatedCostUsd: estimateApifyCost(requested),
      actualCostUsd: null,
    };

    if (!token) {
      return { ...base, jobs: [], error: "APIFY_TOKEN is not configured" };
    }
    if (requested <= 0) {
      // The per-run fee alone exceeds the budget — refuse rather than spend.
      return { ...base, jobs: [], error: "Budget too small for a single run" };
    }

    // run-sync-get-dataset-items returns items directly and, importantly,
    // bounds the run: `maxItems` caps billing on pay-per-result actors.
    const url =
      `https://api.apify.com/v2/acts/${APIFY_JOB_ACTOR}/run-sync-get-dataset-items` +
      `?token=${token}&timeout=${Math.floor(CRAWL_TIMEOUT_MS / 1000)}&maxItems=${requested}`;

    const input = {
      keyword: [query.keywords],
      locations: query.location ? [query.location] : undefined,
      location: query.location,
      // Pagination ceiling — spec §2 requires we never crawl until the actor
      // exhausts itself.
      rows: requested,
      maxItems: requested,
      maxPages: MAX_PAGES_PER_RUN,
      publishedAt: "r604800", // last 7 days: freshness matters more than volume
    };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(CRAWL_TIMEOUT_MS + 15_000),
      });

      // The run id is returned in a header on run-sync endpoints; it's what
      // makes spend auditable after the fact (spec §23).
      const runId = res.headers.get("x-apify-run-id");

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return {
          ...base,
          runId,
          jobs: [],
          error: `Apify HTTP ${res.status}: ${body.slice(0, 200)}`,
        };
      }

      const items = (await res.json()) as unknown;
      const rows = Array.isArray(items) ? items : [];

      const jobs: NormalizedJob[] = [];
      for (const row of rows) {
        if (!row || typeof row !== "object") continue;
        const job = normalizeGenericJob(row as Record<string, unknown>, "apify", APIFY_JOB_ACTOR);
        if (job) jobs.push(job);
        // Belt and braces: never exceed what we budgeted for, even if the
        // actor ignores maxItems.
        if (jobs.length >= requested) break;
      }

      return {
        ...base,
        runId,
        jobs,
        returnedResults: jobs.length,
        // Billing is per returned result, so actual cost is knowable here.
        actualCostUsd: estimateApifyCost(rows.length),
      };
    } catch (e) {
      return {
        ...base,
        jobs: [],
        error: e instanceof Error ? e.message : String(e),
      };
    }
  },
};
