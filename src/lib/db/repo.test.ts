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
  // Windows can hold the file briefly after close; it is only a temp dir, so retry then give up
  try {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  } catch {}
});

describe("repository layer", () => {
  it("stores projects, keywords, localized phrases and returns the latest check per keyword × country", async () => {
    const p = await repo.appsRepo.createProject("alice", { name: "Habit app", countries: ["US", "DE"] });
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

    expect((await repo.appsRepo.listProjects("alice"))[0].keywordCount).toBe(2);
    expect(await repo.appsRepo.deleteProject(p.id, "alice")).toBe(true);
    expect(await repo.rankChecksRepo.latestRankChecks(p.id)).toEqual([]);
  });

  it("keeps projects private to their owner", async () => {
    const p = await repo.appsRepo.createProject("alice", { name: "Alice's app" });
    expect(await repo.appsRepo.getProject(p.id, "alice")).not.toBeNull();
    // someone else can't see, list, change or delete it
    expect(await repo.appsRepo.getProject(p.id, "mallory")).toBeNull();
    expect(await repo.appsRepo.listProjects("mallory")).toEqual([]);
    expect(await repo.appsRepo.updateProject(p.id, "mallory", { name: "pwned" })).toBeNull();
    expect(await repo.appsRepo.deleteProject(p.id, "mallory")).toBe(false);
    expect((await repo.appsRepo.getProject(p.id, "alice"))?.name).toBe("Alice's app");
  });

  it("enforces the project quota atomically and keeps profile updates from resetting it", async () => {
    await repo.usersRepo.upsertUser({ id: "bob", email: "bob@example.com" });
    const tries = await Promise.all([1, 2, 3, 4].map(() => repo.usersRepo.takeProjectSlot("bob", 2)));
    expect(tries.filter(Boolean)).toHaveLength(2);

    await repo.usersRepo.upsertUser({ id: "bob", email: "bob@new.com", name: "Bob" });
    const bob = await repo.usersRepo.getUser("bob");
    expect(bob).toMatchObject({ email: "bob@new.com", name: "Bob", plan: "free", projectsCreated: 2 });

    await repo.usersRepo.returnProjectSlot("bob");
    expect(await repo.usersRepo.takeProjectSlot("bob", 2)).toBe(true);
    expect(await repo.usersRepo.takeProjectSlot("nobody", 2)).toBe(false);
    expect(await repo.usersRepo.takeProjectSlot("bob", Number.POSITIVE_INFINITY)).toBe(true);
  });
});
