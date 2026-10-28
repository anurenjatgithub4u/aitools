import { describe, expect, it } from "vitest";
import { buildBoardRows } from "./board";
import type { Project, RankCheck } from "@/types";

const project: Project = { id: 1, name: "P", niche: null, audience: null, itunesId: 42, icon: null, countries: ["US", "DE"], createdAt: new Date() };
const keywords = [{ id: 10, appId: 1, term: "habit tracker", kind: "short" as const, createdAt: new Date() }];
const top = Array.from({ length: 10 }, (_, i) => ({ trackId: 100 + i, name: `A${i}`, icon: "", ratingCount: 1000, rating: 4.5 }));
const check: RankCheck = { id: 1, keywordId: 10, country: "US", term: "habit tracker", checkedAt: new Date(5000), resultIds: [7, 8, 42, 99], top };

describe("buildBoardRows", () => {
  const rows = buildBoardRows(
    project,
    keywords,
    [{ id: 1, keywordId: 10, country: "DE", phrase: "gewohnheitstracker", note: null }],
    [check],
    [
      { id: 3, appId: 1, itunesId: 99, name: "Rival", icon: null },
      { id: 4, appId: 1, itunesId: 555, name: "Absent", icon: null },
    ],
  );

  it("makes one row per keyword × project country", () => {
    expect(rows.map((r) => r.country)).toEqual(["US", "DE"]);
  });

  it("derives my rank and competitor ranks from the stored result order", () => {
    expect(rows[0].rank).toBe(3);
    expect(rows[0].competitorRanks).toEqual({ 3: 4, 4: null });
    expect(rows[0].top5).toHaveLength(5);
    expect(rows[0].verdict).not.toBeNull();
    expect(rows[0].checkedAt).toBe(5000);
  });

  it("leaves unchecked rows empty but keeps the localized phrase", () => {
    expect(rows[1]).toMatchObject({ phrase: "gewohnheitstracker", checkedAt: null, rank: null, volume: null, verdict: null });
  });
});
