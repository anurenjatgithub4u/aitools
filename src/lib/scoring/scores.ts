// Pure scoring functions. No I/O, so they run on the server and in the browser and are unit-tested.
//
// Both scores use "strength" from rating counts on a log scale: 1M+ ratings ≈ 1.0, 10k ≈ 0.67,
// 100 ≈ 0.33, 0 = 0. A log scale because rating counts span six orders of magnitude.

export type ScoredApp = { ratingCount: number; rating: number };

const LOG_CAP = 6; // log10(1,000,000)

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** log10(1 + ratings) / 6, clamped to 0..1. */
export const ratingStrength = (ratingCount: number) => clamp01(Math.log10(1 + Math.max(0, ratingCount)) / LOG_CAP);

/**
 * VOLUME (0–100), an ESTIMATE, not Apple's search volume (Apple doesn't publish it).
 * Popular searches are dominated by heavily-rated apps, and Apple returns fewer results for
 * niche terms. So:
 *   weighted = Σ strength(ratings of result i) × (1 / i)  /  Σ (1 / i)    over the top 10, i = 1..10
 *   breadth  = 0.6 + 0.4 × min(1, resultCount / 100)
 *   volume   = round(100 × weighted × breadth)
 * Position weights (1/i) make the first results count most, as they do for searchers.
 */
export function volumeScore(top: ScoredApp[], resultCount: number): number {
  const apps = top.slice(0, 10);
  if (!apps.length) return 0;
  let sum = 0;
  let weights = 0;
  apps.forEach((a, i) => {
    const w = 1 / (i + 1);
    sum += ratingStrength(a.ratingCount) * w;
    weights += w;
  });
  const breadth = 0.6 + 0.4 * Math.min(1, resultCount / 100);
  return Math.round(100 * (sum / weights) * breadth);
}

/**
 * DIFFICULTY (0–100): how hard it is to get into the top 10.
 * Each of the top 10 apps gets a strength = ratingStrength × quality, where
 *   quality = 0.5 + 0.5 × clamp((averageRating − 3) / 2)     (3★ or less → 0.5, 5★ → 1)
 * Empty slots (fewer than 10 results) count as 0, since an empty slot is free to take.
 *   difficulty = round(100 × (0.6 × median strength + 0.4 × weakest strength))
 * The median says how strong a typical top-10 app is; the weakest is the one you'd displace.
 */
export function difficultyScore(top: ScoredApp[]): number {
  const strengths = top.slice(0, 10).map((a) => ratingStrength(a.ratingCount) * (0.5 + 0.5 * clamp01((a.rating - 3) / 2)));
  while (strengths.length < 10) strengths.push(0);
  strengths.sort((a, b) => a - b);
  const median = (strengths[4] + strengths[5]) / 2;
  return Math.round(100 * (0.6 * median + 0.4 * strengths[0]));
}

/** Plain-language versions of the formulas for UI tooltips. */
export const FORMULA_HELP = {
  volume:
    "Estimate, not Apple's real search volume. Based on how many ratings the top 10 apps have (log scale, top results weighted more), scaled down when Apple returns few results for the term.",
  difficulty:
    "How hard it is to reach the top 10. 60% the median and 40% the weakest of the top 10 apps' strength, where strength = rating count (log scale) × average rating. Fewer than 10 results makes it easier.",
  rank: "Your app's position in App Store search for this phrase in this country. 200+ means not in the first 200 results.",
} as const;
