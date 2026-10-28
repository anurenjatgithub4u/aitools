import { describe, expect, it } from "vitest";
import { difficultyScore, ratingStrength, volumeScore } from "./scores";
import { matches, VERDICT_RULES, verdictFor } from "./verdict";

const apps = (counts: number[], rating = 4.5) => counts.map((ratingCount) => ({ ratingCount, rating }));

describe("ratingStrength", () => {
  it("is a log scale capped at 1M ratings", () => {
    expect(ratingStrength(0)).toBe(0);
    expect(ratingStrength(-5)).toBe(0);
    expect(ratingStrength(999_999)).toBeCloseTo(1, 5);
    expect(ratingStrength(50_000_000)).toBe(1);
    expect(ratingStrength(9_999)).toBeCloseTo(4 / 6, 5);
  });
});

describe("volumeScore", () => {
  it("is 0 with no results", () => expect(volumeScore([], 0)).toBe(0));

  it("is high for a crowded search full of big apps", () => {
    expect(volumeScore(apps(Array(10).fill(1_000_000)), 200)).toBe(100);
  });

  it("is low for a niche term with tiny apps and few results", () => {
    expect(volumeScore(apps([12, 3, 0]), 3)).toBeLessThan(15);
  });

  it("weights the first results more than later ones", () => {
    const bigFirst = volumeScore(apps([1_000_000, 10, 10, 10, 10]), 200);
    const bigLast = volumeScore(apps([10, 10, 10, 10, 1_000_000]), 200);
    expect(bigFirst).toBeGreaterThan(bigLast);
  });

  it("scales down when Apple returns few results", () => {
    const top = apps([50_000, 20_000, 10_000]);
    expect(volumeScore(top, 3)).toBeLessThan(volumeScore(top, 200));
  });

  it("stays within 0..100", () => {
    for (const n of [0, 1, 100, 1e4, 1e8]) {
      const v = volumeScore(apps([n, n, n]), 50);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
});

describe("difficultyScore", () => {
  it("is 100 when the top 10 are all 1M+ ratings at 5 stars", () => {
    expect(difficultyScore(apps(Array(10).fill(2_000_000), 5))).toBe(100);
  });

  it("is 0 with no results", () => expect(difficultyScore([])).toBe(0));

  it("drops when there are open slots in the top 10", () => {
    const full = difficultyScore(apps(Array(10).fill(100_000)));
    const half = difficultyScore(apps(Array(5).fill(100_000)));
    expect(half).toBeLessThan(full);
  });

  it("drops when top apps are poorly rated", () => {
    expect(difficultyScore(apps(Array(10).fill(100_000), 2.5))).toBeLessThan(difficultyScore(apps(Array(10).fill(100_000), 4.8)));
  });

  it("drops when one weak app is in the top 10", () => {
    const strong = difficultyScore(apps(Array(10).fill(100_000)));
    const oneWeak = difficultyScore(apps([...Array(9).fill(100_000), 5]));
    expect(oneWeak).toBeLessThan(strong);
  });
});

describe("storefront size (ratingShare)", () => {
  // The same search in a store with 10% of the US's ratings: every app has a tenth of the ratings.
  const us = apps([200_000, 80_000, 30_000, 10_000, 5_000, 2_000, 1_000, 500, 200, 100]);
  const small = us.map((a) => ({ ...a, ratingCount: a.ratingCount * 0.1 }));

  it("scores a smaller store's results like the equivalent US results", () => {
    expect(volumeScore(small, 200, 0.1)).toBe(volumeScore(us, 200));
    expect(difficultyScore(small, 0.1)).toBe(difficultyScore(us));
  });

  it("without the adjustment, the smaller store is under-scored", () => {
    expect(volumeScore(small, 200)).toBeLessThan(volumeScore(us, 200) - 10);
    expect(difficultyScore(small)).toBeLessThan(difficultyScore(us) - 10);
  });

  it("defaults to the US scale and keeps 0 ratings at 0", () => {
    expect(volumeScore(us, 200, 1)).toBe(volumeScore(us, 200));
    expect(difficultyScore(apps([0, 0, 0]), 0.05)).toBe(0);
  });

  it("every supported country has a share in (0, 1]", async () => {
    const { COUNTRIES } = await import("@/lib/countries");
    for (const c of COUNTRIES) expect(c.ratingShare > 0 && c.ratingShare <= 1).toBe(true);
  });
});

describe("verdict rules", () => {
  const v = (rank: number | null, volume: number, difficulty: number) => verdictFor({ rank, volume, difficulty }).verdict;

  it("Dead when nobody searches, even if ranking #1", () => expect(v(1, 5, 10)).toBe("Dead"));
  it("Target when already top 10", () => expect(v(3, 60, 90)).toBe("Target"));
  it("Push when 11–50 and beatable", () => expect(v(25, 50, 60)).toBe("Push"));
  it("not Push when 11–50 but very hard", () => expect(v(25, 50, 80)).toBe("Maybe"));
  it("Target an unranked keyword with volume and easy top 10", () => expect(v(null, 55, 40)).toBe("Target"));
  it("Swap when hard and far off", () => {
    expect(v(120, 70, 85)).toBe("Swap");
    expect(v(null, 70, 85)).toBe("Swap");
  });
  it("Swap when low volume for the difficulty", () => expect(v(null, 20, 55)).toBe("Swap"));
  it("Maybe otherwise", () => expect(v(null, 30, 40)).toBe("Maybe"));

  it("the last rule is a catch-all, so every input gets a verdict", () => {
    expect(VERDICT_RULES.at(-1)!.when).toEqual({});
  });

  it("rank conditions never match an unranked keyword", () => {
    expect(matches({ rankMax: 10 }, { rank: null, volume: 50, difficulty: 50 })).toBe(false);
    expect(matches({ unranked: false }, { rank: 5, volume: 50, difficulty: 50 })).toBe(true);
  });

  it("uses custom rules when given", () => {
    expect(verdictFor({ rank: null, volume: 1, difficulty: 1 }, [{ verdict: "Push", when: {}, why: "x" }]).verdict).toBe("Push");
  });
});
