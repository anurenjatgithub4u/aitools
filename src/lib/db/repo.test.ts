import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Runs the real migrations against a throwaway SQLite file.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kp-db-"));
let repo: typeof import("./index");

beforeAll(async () => {
  process.env.DATABASE_PATH = path.join(dir, "test.db");
  repo = await import("./index");
});
afterAll(async () => {
  (await import("./client")).closeDb();
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("repository layer", () => {
  it("stores projects, keywords, localized phrases and returns the latest check per keyword × country", async () => {
    const p = await repo.appsRepo.createProject({ name: "Habit app", countries: ["US", "DE"] });
    expect(p.countries).toEqual(["US", "DE"]);

    const kws = await repo.keywordsRepo.addKeywords(p.id, [
      { term: "habit tracker", kind: "short" },
      { term: "Habit Tracker", kind: "short" },
      { term: "daily routine planner", kind: "long" },
    ]);
    expect(kws.map((k) => k.term)).toEqual(["habit tracker", "daily routine planner"]);

    await repo.keywordsRepo.upsertLocalized([{ keywordId: kws[0].id, country: "DE", phrase: "gewohnheitstracker" }]);
    await repo.keywordsRepo.upsertLocalized([{ keywordId: kws[0].id, country: "DE", phrase: "gewohnheiten app" }]);
    expect((await repo.keywordsRepo.listLocalized(p.id)).map((l) => l.phrase)).toEqual(["gewohnheiten app"]);

    const base = { keywordId: kws[0].id, country: "US" as const, term: "habit tracker", top: [] };
    await repo.rankChecksRepo.insertRankCheck({ ...base, checkedAt: new Date(1000), resultIds: [1, 2] });
    await repo.rankChecksRepo.insertRankCheck({ ...base, checkedAt: new Date(2000), resultIds: [3] });
    const latest = await repo.rankChecksRepo.latestRankChecks(p.id);
    expect(latest).toHaveLength(1);
    expect(latest[0].resultIds).toEqual([3]);

    expect((await repo.appsRepo.listProjects())[0].keywordCount).toBe(2);
    expect(await repo.appsRepo.deleteProject(p.id)).toBe(true);
    expect(await repo.rankChecksRepo.latestRankChecks(p.id)).toEqual([]);
  });
});
