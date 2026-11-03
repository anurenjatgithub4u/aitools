import "server-only";
import { createHash } from "node:crypto";
import type { CountryCode } from "@/lib/countries";
import { rateLimitsRepo } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { ItunesError, searchApps } from "@/lib/itunes/client";
import { rankOf } from "@/lib/itunes/parse";
import { resolveApp } from "@/lib/resolve-app";
import { PUBLIC_RANK_LIMIT } from "@/lib/tools/list";
import type { TopApp } from "@/types";

export type PublicRankResult = {
  app: TopApp;
  alternatives: TopApp[];
  keyword: string;
  country: CountryCode;
  /** 1-based, or null when the app isn't in the top 200. */
  rank: number | null;
  top5: TopApp[];
  checkedAt: number;
  checksLeft: number;
};

/** The client IP from Vercel's proxy headers, hashed: we only need to tell visitors apart, not store who they are. */
export function visitorKey(req: Request): string {
  const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return createHash("sha256").update(`kp-rank:${ip}`).digest("hex").slice(0, 32);
}

export async function publicRankCheck(visitor: string, appQuery: string, keyword: string, country: CountryCode): Promise<PublicRankResult> {
  const { count, windowStart } = await rateLimitsRepo.hit(`rank:${visitor}`, PUBLIC_RANK_LIMIT.windowMs);
  if (count > PUBLIC_RANK_LIMIT.checks) {
    const retryAfterMs = Math.max(0, windowStart.getTime() + PUBLIC_RANK_LIMIT.windowMs - Date.now());
    throw new HttpError(429, "free_limit", `You've used your ${PUBLIC_RANK_LIMIT.checks} free checks this hour.`, { retryAfterMs });
  }

  const { app, alternatives } = await resolveApp(appQuery, country);
  let res;
  try {
    res = await searchApps(keyword, country, { interactive: true, failFastOnRateLimit: true });
  } catch (e) {
    if (e instanceof ItunesError && e.retryAfterMs !== undefined) {
      throw new HttpError(429, "rate_limited", "The App Store is busy. Try again in a minute.", { retryAfterMs: e.retryAfterMs });
    }
    if (e instanceof ItunesError) throw new HttpError(502, "itunes_error", e.message);
    throw e;
  }
  return {
    app,
    alternatives,
    keyword,
    country,
    rank: rankOf(
      res.apps.map((a) => a.trackId),
      app.trackId,
    ),
    top5: res.apps.slice(0, 5),
    checkedAt: res.fetchedAt.getTime(),
    checksLeft: PUBLIC_RANK_LIMIT.checks - count,
  };
}
