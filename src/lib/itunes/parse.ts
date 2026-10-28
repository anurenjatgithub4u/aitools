import { z } from "zod";
import type { TopApp } from "@/types";

/**
 * Extracts the numeric App Store id from a link or a bare id. Accepts e.g.
 * https://apps.apple.com/us/app/some-name/id1234567890?l=en, apps.apple.com/app/id123, id123, 123.
 * Returns null for anything else.
 */
export function parseAppStoreId(input: string): number | null {
  const s = input.trim();
  if (/^\d{5,12}$/.test(s)) return Number(s);
  if (/^id\d{5,12}$/i.test(s)) return Number(s.slice(2));
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    return null;
  }
  if (!/(^|\.)(apps|itunes)\.apple\.com$/i.test(url.hostname)) return null;
  const m = url.pathname.match(/\/id(\d{5,12})(?:\/|$)/i) ?? (url.searchParams.get("id")?.match(/^(\d{5,12})$/) ?? null);
  return m ? Number(m[1]) : null;
}

/** The subset of an iTunes "software" result we use. Unknown fields are dropped. */
const ItunesApp = z.object({
  trackId: z.number().int(),
  trackName: z.string(),
  artworkUrl100: z.string().optional(),
  artworkUrl60: z.string().optional(),
  userRatingCount: z.number().optional(),
  averageUserRating: z.number().optional(),
});

export const ItunesResponse = z.object({
  resultCount: z.number(),
  results: z.array(z.unknown()),
});

/** Keeps only well-formed software results (lookups can include artist rows). */
export function toApps(results: unknown[]): TopApp[] {
  const apps: TopApp[] = [];
  for (const r of results) {
    const p = ItunesApp.safeParse(r);
    if (!p.success) continue;
    apps.push({
      trackId: p.data.trackId,
      name: p.data.trackName,
      icon: p.data.artworkUrl100 ?? p.data.artworkUrl60 ?? "",
      ratingCount: p.data.userRatingCount ?? 0,
      rating: p.data.averageUserRating ?? 0,
    });
  }
  return apps;
}

/** 1-based position of `trackId` in the result list, or null when it is not in the top 200. */
export function rankOf(resultIds: number[], trackId: number | null | undefined): number | null {
  if (trackId == null) return null;
  const i = resultIds.indexOf(trackId);
  return i === -1 ? null : i + 1;
}
