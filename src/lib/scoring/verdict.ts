import type { Rank, Verdict } from "@/types";

export type VerdictInput = {
  /** My app's rank; null = 200+ or no app id. */
  rank: Rank;
  volume: number;
  difficulty: number;
};

type Condition = {
  rankMax?: number;
  rankMin?: number;
  /** true: only when not ranking in the top 200 (or no app id). */
  unranked?: boolean;
  volumeMin?: number;
  volumeMax?: number;
  difficultyMin?: number;
  difficultyMax?: number;
};

export type VerdictRule = { verdict: Verdict; when: Condition; why: string };

/**
 * Verdict rules, checked top to bottom; the first match wins. Edit here to retune.
 *   Target: keep or go for it. Push: close, worth optimizing. Maybe: borderline.
 *   Swap: replace with an easier keyword. Dead: nobody searches it.
 */
export const VERDICT_RULES: VerdictRule[] = [
  { verdict: "Dead", when: { volumeMax: 9 }, why: "Almost no one searches this" },
  { verdict: "Target", when: { rankMax: 10, volumeMin: 20 }, why: "You're in the top 10 for a searched term; keep it" },
  { verdict: "Push", when: { rankMin: 11, rankMax: 50, difficultyMax: 70 }, why: "Ranking 11–50 and the top 10 is beatable" },
  { verdict: "Target", when: { unranked: true, volumeMin: 40, difficultyMax: 50 }, why: "Good volume and an easy top 10" },
  { verdict: "Swap", when: { difficultyMin: 75, rankMin: 51 }, why: "Top 10 is dominated by giants and you're far off" },
  { verdict: "Swap", when: { difficultyMin: 75, unranked: true }, why: "Top 10 is dominated by giants and you're not ranking" },
  { verdict: "Swap", when: { volumeMax: 24, difficultyMin: 50 }, why: "Low volume for how hard it is" },
  { verdict: "Maybe", when: {}, why: "Mixed signals; test it or keep watching" },
];

export function matches(c: Condition, x: VerdictInput): boolean {
  if (c.unranked !== undefined && c.unranked !== (x.rank === null)) return false;
  if ((c.rankMin !== undefined || c.rankMax !== undefined) && x.rank === null) return false;
  if (c.rankMin !== undefined && x.rank! < c.rankMin) return false;
  if (c.rankMax !== undefined && x.rank! > c.rankMax) return false;
  if (c.volumeMin !== undefined && x.volume < c.volumeMin) return false;
  if (c.volumeMax !== undefined && x.volume > c.volumeMax) return false;
  if (c.difficultyMin !== undefined && x.difficulty < c.difficultyMin) return false;
  if (c.difficultyMax !== undefined && x.difficulty > c.difficultyMax) return false;
  return true;
}

export function verdictFor(x: VerdictInput, rules: VerdictRule[] = VERDICT_RULES): { verdict: Verdict; why: string } {
  const rule = rules.find((r) => matches(r.when, x));
  return rule ? { verdict: rule.verdict, why: rule.why } : { verdict: "Maybe", why: "No rule matched" };
}
