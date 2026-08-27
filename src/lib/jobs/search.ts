// Search orchestration (spec §25, §30, §37).
//
// The order here is the cost design:
//
//   MongoDB first  →  fresh enough?  →  yes: return, spend nothing
//                                    →  no:  crawl (budget-guarded), store, return
//
// Most searches never reach a crawler. That is what makes a $0.10 per-crawl
// ceiling workable rather than restrictive — the ceiling applies to the rare
// cache miss, not to every user.

import crypto from "crypto";
import connectDB from "@/lib/db";
import { Job, type JobDoc } from "@/models/Job";
import { JobSearch } from "@/models/JobSearch";
import {
  JOB_SEARCH_CACHE_MINUTES,
  MAX_COST_PER_RUN_USD,
  MAX_JOBS_PER_QUERY,
  MAX_JOB_SEARCH_QUERIES,
  MAX_TOTAL_JOBS_PER_RUN,
} from "./config";
import { buildSearchQueries, queryKey } from "./profile";
import { runCrawl } from "./crawler";
import { dedupeJobs, fingerprint, normalizeUrl } from "./dedup";
import { isDisplayable } from "./freshness";
import { matchJobs, type MatchOutcome } from "./matcher";
import {
  acquireSearchLock,
  canStartCrawler,
  recordRunEnd,
  recordRunRejected,
  recordRunStart,
  releaseSearchLock,
} from "./cost-guard";
import type { CandidateProfile, NormalizedJob, SearchType, StoredJob } from "./types";

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

function toStoredJob(doc: JobDoc & { _id: unknown }): StoredJob {
  return {
    id: String(doc._id),
    title: doc.title,
    company: doc.company,
    companyLogo: doc.companyLogo,
    description: doc.description,
    location: doc.location,
    country: doc.country,
    city: doc.city,
    employmentType: doc.employmentType,
    workplaceType: doc.workplaceType,
    salary: { min: doc.salaryMin, max: doc.salaryMax, currency: doc.salaryCurrency },
    requiredSkills: doc.requiredSkills ?? [],
    preferredSkills: doc.preferredSkills ?? [],
    experienceMin: doc.experienceMin,
    experienceMax: doc.experienceMax,
    jobUrl: doc.jobUrl,
    source: doc.source,
    sourceName: doc.sourceName,
    sourceJobId: doc.sourceJobId,
    postedAt: doc.postedAt,
    postedAtPrecision: doc.postedAtPrecision,
    discoveredAt: doc.discoveredAt,
    lastCheckedAt: doc.lastCheckedAt,
    status: doc.status,
    isActive: doc.isActive,
    missCount: doc.missCount ?? 0,
    fingerprint: doc.fingerprint,
  };
}

/**
 * Upserts crawled jobs.
 *
 * Keyed on source + sourceJobId, which the unique index enforces — a
 * concurrent crawl of the same query updates rather than duplicating. Seeing a
 * job again is also the freshness signal, so lastCheckedAt is bumped and the
 * miss counter reset (spec §14, §15).
 */
export async function storeJobs(jobs: NormalizedJob[], keys: string[]): Promise<StoredJob[]> {
  if (jobs.length === 0) return [];
  await connectDB();

  // Mongoose's bulkWrite generic rejects a mixed $set/$setOnInsert/$addToSet
  // payload even though it is valid MongoDB, so the operation list is cast at
  // this one boundary. The shape is exercised by the store tests.
  type BulkOps = Parameters<typeof Job.bulkWrite>[0];

  const operations = jobs.map((job) => ({
    updateOne: {
      filter: { source: job.source, sourceJobId: job.sourceJobId },
      update: {
        $set: {
          title: job.title,
          company: job.company,
          companyLogo: job.companyLogo,
          description: job.description,
          location: job.location,
          country: job.country,
          city: job.city,
          employmentType: job.employmentType,
          workplaceType: job.workplaceType,
          salaryMin: job.salary.min,
          salaryMax: job.salary.max,
          salaryCurrency: job.salary.currency,
          requiredSkills: job.requiredSkills,
          preferredSkills: job.preferredSkills,
          experienceMin: job.experienceMin,
          experienceMax: job.experienceMax,
          jobUrl: job.jobUrl,
          canonicalUrl: normalizeUrl(job.jobUrl),
          sourceName: job.sourceName,
          fingerprint: fingerprint(job),
          lastCheckedAt: new Date(),
          // Seen in this crawl, so it is live regardless of prior state.
          status: job.sourceClosed ? "EXPIRED" : "ACTIVE",
          isActive: !job.sourceClosed,
          missCount: 0,
        },
        $setOnInsert: {
          source: job.source,
          sourceJobId: job.sourceJobId,
          discoveredAt: job.discoveredAt,
          postedAt: job.postedAt,
          postedAtPrecision: job.postedAtPrecision,
        },
        // Union of every query that has surfaced this job — the cache index.
        $addToSet: { queryKeys: { $each: keys } },
      },
      upsert: true,
    },
  }));

  try {
    await Job.bulkWrite(operations as unknown as BulkOps, { ordered: false });
  } catch (e) {
    // Duplicate-key races are expected under concurrency and are harmless —
    // the row exists, which is the desired end state.
    const code = (e as { code?: number })?.code;
    if (code !== 11000) console.error("[jobs:store] bulk write failed:", e);
  }

  const stored = await Job.find({
    $or: jobs.map((j) => ({ source: j.source, sourceJobId: j.sourceJobId })),
  }).lean();

  return (stored as (JobDoc & { _id: unknown })[]).map(toStoredJob);
}

/** Jobs already known for these queries, recent enough to be worth serving. */
export async function findCachedJobs(keys: string[], limit: number): Promise<StoredJob[]> {
  await connectDB();
  const docs = await Job.find({
    queryKeys: { $in: keys },
    isActive: true,
    status: { $in: ["ACTIVE", "UNKNOWN"] },
  })
    .sort({ postedAt: -1, discoveredAt: -1 })
    .limit(limit)
    .lean();

  const jobs = (docs as (JobDoc & { _id: unknown })[]).map(toStoredJob).filter(isDisplayable);

  // Dedup again on read, not just before writing. Each posting is its own row
  // (unique on source + sourceJobId), so a role a company lists once per
  // region is several rows that only collapse at display time — and rows
  // written before a change to the normalisation rules would otherwise keep
  // surfacing as duplicates forever. Spec §16 is a guarantee about what the
  // user sees.
  return dedupeJobs(jobs).unique;
}

/** True when these queries were crawled recently enough to skip the crawler. */
async function isCacheFresh(keys: string[]): Promise<boolean> {
  await connectDB();
  const cutoff = new Date(Date.now() - JOB_SEARCH_CACHE_MINUTES * 60_000);
  const recent = await JobSearch.findOne({
    searchQueries: { $in: keys },
    createdAt: { $gte: cutoff },
  })
    .select("_id")
    .lean();
  return !!recent;
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export interface SearchOptions {
  profile: CandidateProfile;
  ownerKey: string;
  userId: string | null;
  searchType: SearchType;
  /** Skips the cache check. Used by a deliberate "search again". */
  force?: boolean;
}

export interface SearchResult {
  searchId: string;
  queries: string[];
  servedFromCache: boolean;
  crawlAttempted: boolean;
  crawlError: string | null;
  totalCostUsd: number;
  matches: MatchOutcome["matches"];
  weak: MatchOutcome["weak"];
  jobsConsidered: number;
}

/**
 * Runs a full search: cache → crawl if stale → store → dedupe → match.
 *
 * Spec §30: a crawler failure must never produce an empty page when the
 * database already holds relevant jobs. Every failure path here falls through
 * to cached results rather than surfacing an error.
 */
export async function searchJobs(options: SearchOptions): Promise<SearchResult> {
  const { profile, ownerKey, userId, searchType } = options;

  const queries = buildSearchQueries(profile, MAX_JOB_SEARCH_QUERIES);
  const keys = queries.map(queryKey);
  const searchId = crypto.randomUUID();

  let servedFromCache = false;
  let crawlAttempted = false;
  let crawlError: string | null = null;
  let totalCostUsd = 0;
  const runIds: string[] = [];

  const fresh = !options.force && (await isCacheFresh(keys));

  if (fresh) {
    servedFromCache = true;
  } else if (acquireSearchLock(keys.join("|"))) {
    // The lock is keyed on the queries, not the search id: two users running
    // the same search concurrently should not both pay for it (spec §24).
    try {
      crawlAttempted = true;
      const perQuery = Math.min(MAX_JOBS_PER_QUERY, Math.ceil(MAX_TOTAL_JOBS_PER_RUN / queries.length));
      const collected: NormalizedJob[] = [];

      for (const query of queries) {
        if (collected.length >= MAX_TOTAL_JOBS_PER_RUN) break;

        const remainingBudget = Math.max(0, budgetPerSearch() - totalCostUsd);
        const { jobs, outcomes } = await runCrawl(
          {
            keywords: query,
            location: profile.preferredLocations[0],
            remoteOnly: profile.workplaceTypes.includes("Remote") && profile.preferredLocations.length === 0,
            limit: Math.min(perQuery, MAX_TOTAL_JOBS_PER_RUN - collected.length),
          },
          { budgetUsd: remainingBudget }
        );

        for (const outcome of outcomes) {
          if (outcome.estimatedCostUsd > 0) {
            const decision = canStartCrawler(outcome.estimatedCostUsd);
            if (!decision.allowed) {
              await recordRunRejected({
                provider: outcome.provider,
                searchId,
                query,
                estimatedCostUsd: outcome.estimatedCostUsd,
                reason: decision.reason ?? "budget",
              });
              continue;
            }
          }
          const ledgerId = await recordRunStart({
            provider: outcome.provider,
            searchId,
            query,
            requestedResults: outcome.requestedResults,
            estimatedCostUsd: outcome.estimatedCostUsd,
          });
          await recordRunEnd(ledgerId, outcome);
          if (outcome.runId) runIds.push(outcome.runId);
          if (outcome.error) crawlError = outcome.error;
          totalCostUsd += outcome.actualCostUsd ?? outcome.estimatedCostUsd;
        }

        collected.push(...jobs);
      }

      const { unique } = dedupeJobs(collected);
      if (unique.length > 0) await storeJobs(unique, keys);

      await JobSearch.create({
        searchId,
        ownerKey,
        userId,
        searchType,
        profile,
        searchQueries: keys,
        crawlerRunIds: runIds,
        jobsFound: unique.length,
        servedFromCache: false,
      }).catch(() => {
        /* history is useful, not load-bearing */
      });
    } catch (e) {
      // Fall through to cached results rather than failing the request.
      crawlError = e instanceof Error ? e.message : String(e);
      console.error("[jobs:search] crawl failed, serving cached jobs:", e);
    } finally {
      releaseSearchLock(keys.join("|"));
    }
  } else {
    // Another request is already crawling these queries — serve what exists
    // rather than paying twice.
    servedFromCache = true;
  }

  const candidates = await findCachedJobs(keys, MAX_TOTAL_JOBS_PER_RUN * 2);
  const outcome = matchJobs(profile, candidates);

  return {
    searchId,
    queries,
    servedFromCache,
    crawlAttempted,
    crawlError,
    totalCostUsd: Number(totalCostUsd.toFixed(6)),
    matches: outcome.matches,
    weak: outcome.weak,
    jobsConsidered: candidates.length,
  };
}

/** Budget for one user-facing search, across all its queries.
 *
 *  Deliberately the per-crawl ceiling rather than a per-query allowance: a
 *  search fanning out to three queries must not spend three times the limit.
 */
function budgetPerSearch(): number {
  return MAX_COST_PER_RUN_USD;
}
