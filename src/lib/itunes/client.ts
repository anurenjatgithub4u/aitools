import "server-only";
import { sleep } from "@/lib/async";
import { getCountry, type CountryCode } from "@/lib/countries";
import { itunesCacheRepo } from "@/lib/db";
import { serverEnv } from "@/lib/env";
import type { TopApp } from "@/types";
import { ItunesResponse, toApps } from "./parse";
import { backoffMs, isRetryable, RETRY } from "./retry";
import { RateLimiter } from "./throttle";

export class ItunesError extends Error {
  constructor(
    message: string,
    public status?: number,
    /** Set when rate limited with failFastOnRateLimit: how long to wait before trying again. */
    public retryAfterMs?: number,
  ) {
    super(message);
  }
}

export type WaitInfo = { ms: number; reason: string };
export type SearchResult = { apps: TopApp[]; fetchedAt: Date; cached: boolean };

// One limiter per server process, shared by every job and route.
const g = globalThis as unknown as { __kpLimiter?: RateLimiter };
const limiter = () => (g.__kpLimiter ??= new RateLimiter(serverEnv().ITUNES_RPM));

type FetchOpts = {
  force?: boolean;
  onWait?: (w: WaitInfo) => void;
  /** A user is waiting: jump the job queue and give up after one retry instead of three. */
  interactive?: boolean;
  /**
   * On a rate limit, throw at once (with `retryAfterMs`) instead of waiting inside the request.
   * Used when the browser drives checks: it shows the countdown and retries, and no serverless
   * function sits idle for a minute.
   */
  failFastOnRateLimit?: boolean;
};

/** Search the App Store: up to 200 apps in ranked order for `term` in `country`. */
export function searchApps(term: string, country: CountryCode, opts: FetchOpts = {}) {
  const url = new URL("https://itunes.apple.com/search");
  url.search = new URLSearchParams({ term, country: getCountry(country).store, entity: "software", limit: "200" }).toString();
  return fetchApps(url, opts);
}

/** A few apps matching a name, for picking "my app" or a competitor. */
export async function findAppsByName(name: string, country: CountryCode = "US"): Promise<TopApp[]> {
  const url = new URL("https://itunes.apple.com/search");
  url.search = new URLSearchParams({ term: name, country: getCountry(country).store, entity: "software", limit: "8" }).toString();
  return (await fetchApps(url, { interactive: true })).apps;
}

/** Look up one app by its numeric id (used for "my app" and competitors). */
export async function lookupApp(id: number, country: CountryCode = "US"): Promise<TopApp | null> {
  const url = new URL("https://itunes.apple.com/lookup");
  url.search = new URLSearchParams({ id: String(id), country: getCountry(country).store, entity: "software" }).toString();
  return (await fetchApps(url, { interactive: true })).apps[0] ?? null;
}

async function fetchApps(url: URL, opts: FetchOpts): Promise<SearchResult> {
  const maxAttempts = opts.interactive ? 2 : RETRY.attempts;
  const key = url.toString();
  const ttlMs = serverEnv().ITUNES_CACHE_TTL_MINUTES * 60_000;
  if (!opts.force && ttlMs > 0) {
    const hit = await itunesCacheRepo.getCached(key, ttlMs);
    if (hit) {
      const { body, fetchedAt } = JSON.parse(hit) as { body: unknown[]; fetchedAt: number };
      return { apps: toApps(body), fetchedAt: new Date(fetchedAt), cached: true };
    }
  }

  for (let attempt = 0; ; attempt++) {
    await (opts.interactive ? limiter().acquirePriority() : limiter().acquire());
    let res: Response;
    try {
      res = await fetch(key, { signal: AbortSignal.timeout(20_000), headers: { accept: "application/json" } });
    } catch (e) {
      // network error or timeout: treat like a 5xx
      if (attempt + 1 >= maxAttempts) throw new ItunesError(`iTunes request failed: ${e instanceof Error ? e.message : e}`);
      await waitBeforeRetry(attempt, null, "network error", opts.onWait);
      continue;
    }
    if (res.ok) {
      const parsed = ItunesResponse.safeParse(await res.json().catch(() => null));
      if (!parsed.success) throw new ItunesError("Unexpected iTunes response", res.status);
      const fetchedAt = new Date();
      if (ttlMs > 0) await itunesCacheRepo.setCached(key, JSON.stringify({ body: parsed.data.results, fetchedAt: fetchedAt.getTime() }));
      return { apps: toApps(parsed.data.results), fetchedAt, cached: false };
    }
    const limited = res.status === 403 || res.status === 429;
    if (limited && opts.failFastOnRateLimit) {
      const ms = backoffMs(attempt, res.headers.get("retry-after"));
      limiter().pause(ms);
      throw new ItunesError("Rate limited by Apple", res.status, ms);
    }
    if (!isRetryable(res.status) || attempt + 1 >= maxAttempts) {
      throw new ItunesError(limited ? "Rate limited by Apple; try again in a few minutes" : `iTunes returned ${res.status}`, res.status);
    }
    await waitBeforeRetry(attempt, res.headers.get("retry-after"), limited ? "rate limited" : `server error ${res.status}`, opts.onWait, limited);
  }
}

async function waitBeforeRetry(attempt: number, retryAfter: string | null, reason: string, onWait?: (w: WaitInfo) => void, pauseAll = false) {
  const ms = backoffMs(attempt, retryAfter);
  // a rate limit applies to the whole server, so hold every queued request, not just this one
  if (pauseAll) limiter().pause(ms);
  onWait?.({ ms, reason });
  await sleep(ms);
}
