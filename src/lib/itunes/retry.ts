/** Apple answers 403 (not just 429) when the Search API rate limit is hit; 5xx are transient. */
export function isRetryable(status: number): boolean {
  return status === 403 || status === 429 || status >= 500;
}

export const RETRY = { attempts: 4, baseMs: 5_000, maxMs: 60_000 } as const;

/**
 * Exponential backoff: 5s, 10s, 20s, … capped at 60s, plus up to 20% jitter so parallel servers
 * don't retry in lockstep. A Retry-After header (seconds) wins when present.
 */
export function backoffMs(attempt: number, retryAfterHeader?: string | null, random: () => number = Math.random): number {
  const retryAfter = Number(retryAfterHeader);
  if (retryAfterHeader && Number.isFinite(retryAfter) && retryAfter >= 0) return Math.min(retryAfter * 1000, RETRY.maxMs);
  const base = Math.min(RETRY.baseMs * 2 ** attempt, RETRY.maxMs);
  return Math.round(base * (1 + 0.2 * random()));
}
