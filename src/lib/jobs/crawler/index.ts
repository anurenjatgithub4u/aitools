// Crawler resolution (spec §7, §36, §37).
//
// Everything downstream — storage, dedup, matching, saved jobs, the UI —
// depends only on the JobCrawler interface, never on Apify. Replacing the
// provider later means adding one file here and changing one env var.

import { ATS_RESULT_FLOOR, JOB_CRAWLER, MAX_COST_PER_RUN_USD } from "../config";
import type { CrawlOutcome, JobCrawler, JobQuery, NormalizedJob } from "../types";
import { atsCrawler } from "./ats";
import { apifyCrawler } from "./apify";

const CRAWLERS: Record<string, JobCrawler> = {
  ats: atsCrawler,
  apify: apifyCrawler,
};

export function resolveCrawler(name = JOB_CRAWLER): JobCrawler | null {
  return CRAWLERS[name] ?? null;
}

export interface RunCrawlOptions {
  /** Remaining budget for this crawl. A paid crawler is skipped when the
   *  estimate exceeds it (spec §24). */
  budgetUsd?: number;
}

/**
 * Executes a query using the configured strategy.
 *
 * "auto" is free-first: the ATS crawler costs nothing, so it always runs, and
 * Apify is only consulted when the free source returned too little AND there
 * is budget for it. That ordering is what makes the $0.10 ceiling comfortable
 * rather than tight — most searches never spend anything at all.
 */
export async function runCrawl(
  query: JobQuery,
  options: RunCrawlOptions = {}
): Promise<{ jobs: NormalizedJob[]; outcomes: CrawlOutcome[] }> {
  const budget = options.budgetUsd ?? MAX_COST_PER_RUN_USD;
  const outcomes: CrawlOutcome[] = [];

  if (JOB_CRAWLER !== "auto") {
    const crawler = resolveCrawler(JOB_CRAWLER);
    if (!crawler) return { jobs: [], outcomes };

    // Even a pinned crawler is budget-checked — pinning selects a provider, it
    // doesn't waive the spending limit.
    if (crawler.estimateCost(query) > budget) {
      outcomes.push({
        jobs: [],
        provider: crawler.name,
        runId: null,
        requestedResults: query.limit,
        returnedResults: 0,
        estimatedCostUsd: crawler.estimateCost(query),
        actualCostUsd: null,
        error: "Estimated cost exceeds the configured budget",
      });
      return { jobs: [], outcomes };
    }

    const outcome = await crawler.searchJobs(query);
    outcomes.push(outcome);
    return { jobs: outcome.jobs, outcomes };
  }

  // --- auto: free first ----------------------------------------------------
  const free = await atsCrawler.searchJobs(query);
  outcomes.push(free);

  if (free.jobs.length >= ATS_RESULT_FLOOR) {
    return { jobs: free.jobs, outcomes };
  }

  // --- top up with the paid crawler, only if affordable ---------------------
  const remaining = query.limit - free.jobs.length;
  if (remaining <= 0) return { jobs: free.jobs, outcomes };

  const topUpQuery: JobQuery = { ...query, limit: remaining };
  const estimate = apifyCrawler.estimateCost(topUpQuery);

  if (estimate > budget) {
    outcomes.push({
      jobs: [],
      provider: "apify",
      runId: null,
      requestedResults: remaining,
      returnedResults: 0,
      estimatedCostUsd: estimate,
      actualCostUsd: null,
      error: "Skipped: estimated cost exceeds remaining budget",
    });
    return { jobs: free.jobs, outcomes };
  }

  const paid = await apifyCrawler.searchJobs(topUpQuery);
  outcomes.push(paid);

  return { jobs: [...free.jobs, ...paid.jobs], outcomes };
}

export { atsCrawler, apifyCrawler };
