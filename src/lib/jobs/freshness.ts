// Job age, freshness and expiry (spec §11, §12, §13, §14, §15, §27).
//
// The governing principle from §14: a posting date alone tells you nothing
// about whether a role is open. A job posted 30 days ago may still be live; a
// job posted yesterday may already be closed. So status is derived from three
// signals together — when it was posted, when we last saw it, and what the
// source said — never from age alone.

import { MAX_JOB_AGE_DAYS, MISSES_BEFORE_EXPIRED, RECHECK_AFTER_HOURS } from "./config";
import type { JobStatus, PostedAtPrecision, StoredJob } from "./types";

// ---------------------------------------------------------------------------
// Display (spec §13, §15)
// ---------------------------------------------------------------------------

/** "Posted 3 hours ago" / "Posted 21 days ago". */
export function formatAge(date: Date | null, precision: PostedAtPrecision = "exact"): string {
  if (!date) return "Posting date unknown";

  const ms = Date.now() - date.getTime();
  if (ms < 0) return "Posted recently";

  const minutes = Math.floor(ms / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  let phrase: string;
  if (minutes < 1) phrase = "just now";
  else if (minutes < 60) phrase = `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  else if (hours < 24) phrase = `${hours} hour${hours === 1 ? "" : "s"} ago`;
  else if (days < 30) phrase = `${days} day${days === 1 ? "" : "s"} ago`;
  else {
    const months = Math.floor(days / 30);
    phrase = `${months} month${months === 1 ? "" : "s"} ago`;
  }

  // "About" signals an estimate derived from a relative string, so the UI
  // never implies precision the source didn't give us (spec §12).
  return precision === "estimated" ? `Posted about ${phrase}` : `Posted ${phrase}`;
}

/** "Verified 18 minutes ago" — distinct from the posting date (spec §15). */
export function formatVerified(lastCheckedAt: Date | null): string {
  if (!lastCheckedAt) return "Not yet verified";

  const ms = Date.now() - lastCheckedAt.getTime();
  const minutes = Math.floor(ms / 60_000);
  const hours = Math.floor(minutes / 60);

  if (minutes < 1) return "Verified just now";
  if (minutes < 60) return `Verified ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  if (hours < 24) return `Verified ${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "Verified yesterday" : `Verified ${days} days ago`;
}

export function ageInDays(date: Date | null): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - date.getTime()) / 86_400_000);
}

// ---------------------------------------------------------------------------
// Status transitions (spec §11, §14)
// ---------------------------------------------------------------------------

export interface StatusInput {
  currentStatus: JobStatus;
  missCount: number;
  /** True when the source explicitly said the role is closed. */
  sourceClosed: boolean;
  /** True when this job appeared in the latest crawl of its source. */
  seenInLatestCrawl: boolean;
  /** False when the source itself failed — a fetch error is not evidence
   *  about the job (spec §11). */
  sourceReachable: boolean;
}

export interface StatusOutcome {
  status: JobStatus;
  isActive: boolean;
  missCount: number;
}

/**
 * Decides a job's next status.
 *
 * The important cases:
 *  - source says closed          → EXPIRED immediately, that's authoritative
 *  - source unreachable          → unchanged, a failed fetch proves nothing
 *  - seen again                  → ACTIVE, miss counter reset
 *  - missing once or twice       → UNKNOWN, still shown, keeps counting
 *  - missing MISSES_BEFORE_EXPIRED times → EXPIRED
 */
export function nextStatus(input: StatusInput): StatusOutcome {
  const { currentStatus, sourceClosed, seenInLatestCrawl, sourceReachable } = input;

  if (sourceClosed) {
    return { status: "EXPIRED", isActive: false, missCount: input.missCount };
  }

  if (currentStatus === "REMOVED") {
    return { status: "REMOVED", isActive: false, missCount: input.missCount };
  }

  // A source outage must not cascade into marking live jobs expired.
  if (!sourceReachable) {
    return {
      status: currentStatus,
      isActive: currentStatus === "ACTIVE" || currentStatus === "UNKNOWN",
      missCount: input.missCount,
    };
  }

  if (seenInLatestCrawl) {
    return { status: "ACTIVE", isActive: true, missCount: 0 };
  }

  const missCount = input.missCount + 1;
  if (missCount >= MISSES_BEFORE_EXPIRED) {
    return { status: "EXPIRED", isActive: false, missCount };
  }

  // Vanished, but not enough times to be sure. Still shown — a job briefly
  // absent from a paginated result set is common.
  return { status: "UNKNOWN", isActive: true, missCount };
}

/**
 * Whether a job should be excluded from active results on age alone.
 *
 * This is separate from status: a very old posting is unlikely to be open even
 * if nothing has told us it closed (spec §25 MAX_JOB_AGE_DAYS).
 */
export function isStale(job: Pick<StoredJob, "postedAt" | "discoveredAt">): boolean {
  const reference = job.postedAt ?? job.discoveredAt;
  const days = ageInDays(reference);
  return days !== null && days > MAX_JOB_AGE_DAYS;
}

/** Jobs due for re-verification, oldest check first (spec §27). */
export function needsRecheck(job: Pick<StoredJob, "lastCheckedAt" | "status">): boolean {
  if (job.status === "EXPIRED" || job.status === "REMOVED") return false;
  const hours = (Date.now() - job.lastCheckedAt.getTime()) / 3_600_000;
  return hours >= RECHECK_AFTER_HOURS;
}

/** Whether a job belongs in active search results (spec §14). */
export function isDisplayable(job: Pick<StoredJob, "status" | "isActive" | "postedAt" | "discoveredAt">): boolean {
  if (!job.isActive) return false;
  if (job.status === "EXPIRED" || job.status === "REMOVED") return false;
  return !isStale(job);
}
