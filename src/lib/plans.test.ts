import { describe, expect, it } from "vitest";
import { canCreateProject, PLAN_LIMITS, projectsLeft } from "./plans";
import { safeNext } from "./safe-next";

describe("plans", () => {
  it("Free gets 2 projects, counting ones created before (even if deleted)", () => {
    expect(PLAN_LIMITS.free.projects).toBe(2);
    expect(projectsLeft("free", 0)).toBe(2);
    expect(projectsLeft("free", 1)).toBe(1);
    expect(projectsLeft("free", 2)).toBe(0);
    expect(projectsLeft("free", 5)).toBe(0);
    expect(canCreateProject("free", 1)).toBe(true);
    expect(canCreateProject("free", 2)).toBe(false);
  });

  it("Premium is unlimited", () => {
    expect(canCreateProject("premium", 10_000)).toBe(true);
  });
});

describe("safeNext", () => {
  it("only allows same-site paths", () => {
    expect(safeNext("/app/3?x=1")).toBe("/app/3?x=1");
    for (const bad of [undefined, null, "", "https://evil.com", "//evil.com", "/\\evil.com", "app/3"]) expect(safeNext(bad)).toBe("/");
  });
});
