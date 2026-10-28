import "server-only";
import { isEnglish, type CountryCode } from "@/lib/countries";
import { keywordsRepo, rankChecksRepo } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { ItunesError, searchApps } from "@/lib/itunes/client";
import { rankOf } from "@/lib/itunes/parse";
import type { CheckTaskResult, Project } from "@/types";

/**
 * The phrase searched for a keyword in a country: its localized phrase; English storefronts fall
 * back to the English keyword; other storefronts have none until the keyword is localized.
 */
export async function searchTermFor(project: Project, keywordId: number, country: CountryCode): Promise<string | null> {
  const [keyword] = await keywordsRepo.getKeywordsByIds(project.id, [keywordId]);
  if (!keyword) throw new HttpError(404, "keyword_not_found", "Keyword not found");
  const localized = (await keywordsRepo.listLocalized(project.id)).find((l) => l.keywordId === keywordId && l.country === country);
  return localized?.phrase ?? (isEnglish(country) ? keyword.term : null);
}

/**
 * Runs ONE rank check (keyword × country) and stores it. The browser calls this once per task,
 * spaced for Apple's rate limit, so no request outlives a serverless function. A rate limit is
 * answered right away as 429 with `retryAfterMs`; the browser waits and retries.
 */
export async function runCheck(project: Project, keywordId: number, country: CountryCode, force: boolean): Promise<CheckTaskResult> {
  const term = await searchTermFor(project, keywordId, country);
  if (!term) throw new HttpError(400, "not_localized", "Localize this keyword for this country first");

  let res;
  try {
    res = await searchApps(term, country, { force, failFastOnRateLimit: true });
  } catch (e) {
    if (e instanceof ItunesError && e.retryAfterMs !== undefined) {
      throw new HttpError(429, "rate_limited", "Rate limited by Apple", { retryAfterMs: e.retryAfterMs });
    }
    if (e instanceof ItunesError) throw new HttpError(502, "itunes_error", e.message);
    throw e;
  }

  const resultIds = res.apps.map((a) => a.trackId);
  // a cache hit for the same fetch isn't a new observation; don't duplicate it in the history
  const [last] = await rankChecksRepo.rankHistory(keywordId, country, 1);
  if (!res.cached || last?.checkedAt.getTime() !== res.fetchedAt.getTime()) {
    await rankChecksRepo.insertRankCheck({ keywordId, country, term, checkedAt: res.fetchedAt, resultIds, top: res.apps.slice(0, 10) });
  }
  return {
    keywordId,
    country,
    term,
    rank: rankOf(resultIds, project.itunesId),
    top5: res.apps.slice(0, 5),
    checkedAt: res.fetchedAt.getTime(),
  };
}
