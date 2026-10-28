import { describe, expect, it } from "vitest";
import { BrainstormOutput, normalizeKeywords } from "./brainstorm";
import { safeJson } from "./structured";

const many = (n: number) => Array.from({ length: n }, (_, i) => ({ term: `keyword ${i}`, kind: "short" as const }));

describe("normalizeKeywords", () => {
  it("lowercases, collapses spaces, de-duplicates and fixes kind from word count", () => {
    expect(
      normalizeKeywords([
        { term: "  Habit   Tracker ", kind: "long" },
        { term: "habit tracker", kind: "short" },
        { term: "daily habit tracker for students", kind: "short" },
        { term: "", kind: "short" },
      ]),
    ).toEqual([
      { term: "habit tracker", kind: "short" },
      { term: "daily habit tracker for students", kind: "long" },
    ]);
  });

  it("caps at 30", () => {
    expect(normalizeKeywords(many(40))).toHaveLength(30);
  });
});

describe("BrainstormOutput via safeJson", () => {
  it("accepts a full list", () => {
    expect(safeJson(JSON.stringify({ keywords: many(30) }), BrainstormOutput).ok).toBe(true);
  });

  it("rejects too few keywords, bad JSON and wrong shapes (these trigger the retry)", () => {
    expect(safeJson(JSON.stringify({ keywords: many(5) }), BrainstormOutput).ok).toBe(false);
    expect(safeJson("{not json", BrainstormOutput)).toEqual({ ok: false, error: "not valid JSON" });
    expect(safeJson(JSON.stringify({ keywords: [{ term: 1 }] }), BrainstormOutput).ok).toBe(false);
  });
});
