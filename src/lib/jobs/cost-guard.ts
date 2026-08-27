// Central crawler cost guard (spec §2, §23, §24).
//
// Every crawl goes through here. The rules it enforces:
//
//  1. Estimate before spending. A run whose estimate exceeds the budget is
//     refused, not started and cancelled.
//  2. One crawl per search. A per-search lock stops a double-submit or a
//     retry from paying twice for the same work.
//  3. Record everything. Estimated and actual cost land in crawler_runs so
//     spend is auditable rather than inferred.
//
// Deliberate design note: the budget is treated as an application-level limit,
// not a promise extracted from the provider. Spec §2 is explicit that $0.10
// only holds if we enforce it ourselves — so the guard caps what it asks for
// rather than trusting an actor to stop.

import connectDB from "@/lib/db";
import { CrawlerRun } from "@/models/CrawlerRun";
import { MAX_COST_PER_RUN_USD } from "./config";
import type { CrawlOutcome } from "./types";

export interface BudgetDecision {
  allowed: boolean;
  reason?: string;
  budgetUsd: number;
}

/**
 * Pre-flight check (spec §24 `canStartCrawler`).
 *
 * `estimatedCostUsd` of 0 (the free ATS crawler) always passes — there is
 * nothing to ration.
 */
export function canStartCrawler(estimatedCostUsd: number): BudgetDecision {
  if (estimatedCostUsd <= 0) return { allowed: true, budgetUsd: MAX_COST_PER_RUN_USD };

  if (estimatedCostUsd > MAX_COST_PER_RUN_USD) {
    return {
      allowed: false,
      reason: `Estimated $${estimatedCostUsd.toFixed(4)} exceeds the $${MAX_COST_PER_RUN_USD.toFixed(2)} per-crawl budget`,
      budgetUsd: MAX_COST_PER_RUN_USD,
    };
  }
  return { allowed: true, budgetUsd: MAX_COST_PER_RUN_USD };
}

// ---------------------------------------------------------------------------
// Per-search lock (spec §24)
// ---------------------------------------------------------------------------

/**
 * In-process lock preventing concurrent crawls for one search.
 *
 * Per-instance rather than distributed: the durable guard is the unique index
 * on crawler_runs plus the cache check that runs first, and a serverless
 * deployment would need a shared lock to be airtight. This closes the common
 * case — a user double-clicking Search — cheaply.
 */
const activeSearches = new Set<string>();

export function acquireSearchLock(searchId: string): boolean {
  if (activeSearches.has(searchId)) return false;
  activeSearches.add(searchId);
  return true;
}

export function releaseSearchLock(searchId: string): void {
  activeSearches.delete(searchId);
}

// ---------------------------------------------------------------------------
// Run ledger (spec §23)
// ---------------------------------------------------------------------------

export async function recordRunStart(params: {
  provider: string;
  searchId: string;
  query: string;
  requestedResults: number;
  estimatedCostUsd: number;
}): Promise<string | null> {
  try {
    await connectDB();
    const doc = await CrawlerRun.create({
      provider: params.provider,
      searchId: params.searchId,
      query: params.query.slice(0, 300),
      requestedResults: params.requestedResults,
      estimatedCostUsd: params.estimatedCostUsd,
      status: "STARTED",
      startedAt: new Date(),
    });
    return String(doc._id);
  } catch (e) {
    // Never block a crawl because the ledger write failed — but say so loudly,
    // since unlogged spend is the thing this system exists to prevent.
    console.error("[jobs:cost-guard] could not record run start:", e);
    return null;
  }
}

export async function recordRunEnd(
  ledgerId: string | null,
  outcome: CrawlOutcome
): Promise<void> {
  const line = {
    provider: outcome.provider,
    runId: outcome.runId,
    requested: outcome.requestedResults,
    returned: outcome.returnedResults,
    estimatedUsd: outcome.estimatedCostUsd,
    actualUsd: outcome.actualCostUsd,
    error: outcome.error ?? null,
  };
  console.log("[jobs:crawl]", JSON.stringify(line));

  if (!ledgerId) return;
  try {
    await connectDB();
    await CrawlerRun.updateOne(
      { _id: ledgerId },
      {
        $set: {
          status: outcome.error ? "FAILED" : "SUCCEEDED",
          runId: outcome.runId,
          returnedResults: outcome.returnedResults,
          actualCostUsd: outcome.actualCostUsd,
          error: outcome.error ?? null,
          completedAt: new Date(),
        },
      }
    );
  } catch (e) {
    console.error("[jobs:cost-guard] could not record run end:", e);
  }
}

export async function recordRunRejected(params: {
  provider: string;
  searchId: string;
  query: string;
  estimatedCostUsd: number;
  reason: string;
}): Promise<void> {
  console.warn("[jobs:crawl] rejected —", params.reason);
  try {
    await connectDB();
    await CrawlerRun.create({
      provider: params.provider,
      searchId: params.searchId,
      query: params.query.slice(0, 300),
      estimatedCostUsd: params.estimatedCostUsd,
      status: "REJECTED",
      error: params.reason,
      completedAt: new Date(),
    });
  } catch (e) {
    console.error("[jobs:cost-guard] could not record rejection:", e);
  }
}

/** Total spend over a window — for monitoring the budget in aggregate. */
export async function spendSince(since: Date): Promise<{ estimated: number; actual: number; runs: number }> {
  try {
    await connectDB();
    const rows = await CrawlerRun.find({ createdAt: { $gte: since }, status: "SUCCEEDED" })
      .select("estimatedCostUsd actualCostUsd")
      .lean();
    return {
      estimated: rows.reduce((sum, r) => sum + (r.estimatedCostUsd ?? 0), 0),
      actual: rows.reduce((sum, r) => sum + (r.actualCostUsd ?? r.estimatedCostUsd ?? 0), 0),
      runs: rows.length,
    };
  } catch {
    return { estimated: 0, actual: 0, runs: 0 };
  }
}
