import { getCountry } from "@/lib/countries";
import { rankOf } from "@/lib/itunes/parse";
import { difficultyScore, verdictFor, volumeScore } from "@/lib/scoring";
import type { BoardRow, Competitor, Keyword, LocalizedKeyword, Project, RankCheck } from "@/types";

/**
 * Joins keywords × the project's countries with the latest check of each, and derives ranks
 * (mine and competitors') and scores. Pure, so the board logic is testable without a database.
 */
export function buildBoardRows(
  project: Project,
  keywords: Keyword[],
  localized: LocalizedKeyword[],
  latestChecks: RankCheck[],
  competitors: Competitor[],
): BoardRow[] {
  const key = (keywordId: number, country: string) => `${keywordId}:${country}`;
  const phrases = new Map(localized.map((l) => [key(l.keywordId, l.country), l.phrase]));
  const checks = new Map(latestChecks.map((c) => [key(c.keywordId, c.country), c]));

  return keywords.flatMap((k) =>
    project.countries.map((country): BoardRow => {
      const check = checks.get(key(k.id, country));
      const base = { keywordId: k.id, keyword: k.term, kind: k.kind, country, phrase: phrases.get(key(k.id, country)) ?? null };
      if (!check) {
        return { ...base, checkedAt: null, rank: null, competitorRanks: {}, volume: null, difficulty: null, verdict: null, verdictWhy: null, top5: [] };
      }
      const rank = rankOf(check.resultIds, project.itunesId);
      const { ratingShare } = getCountry(country);
      const volume = volumeScore(check.top, check.resultIds.length, ratingShare);
      const difficulty = difficultyScore(check.top, ratingShare);
      const { verdict, why } = verdictFor({ rank, volume, difficulty });
      return {
        ...base,
        checkedAt: check.checkedAt.getTime(),
        rank,
        competitorRanks: Object.fromEntries(competitors.map((c) => [c.id, rankOf(check.resultIds, c.itunesId)])),
        volume,
        difficulty,
        verdict,
        verdictWhy: why,
        top5: check.top.slice(0, 5),
      };
    }),
  );
}
