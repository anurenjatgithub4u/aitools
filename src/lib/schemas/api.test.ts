import { describe, expect, it } from "vitest";
import { BrainstormInput, CheckInput, CreateProjectInput, LocalizeInput } from "./api";

describe("CreateProjectInput", () => {
  it("trims, defaults countries to US and drops empty optionals", () => {
    expect(CreateProjectInput.parse({ name: "  Habit app ", niche: "  ", appStore: "" })).toEqual({
      name: "Habit app",
      niche: undefined,
      audience: undefined,
      appStore: undefined,
      countries: ["US"],
    });
  });
  it("rejects an empty name and unknown countries", () => {
    expect(CreateProjectInput.safeParse({ name: "   " }).success).toBe(false);
    expect(CreateProjectInput.safeParse({ name: "x", countries: ["XX"] }).success).toBe(false);
    expect(CreateProjectInput.safeParse({ name: "x", countries: [] }).success).toBe(false);
  });
});

describe("BrainstormInput", () => {
  it("requires name and description", () => {
    expect(BrainstormInput.safeParse({ name: "Calm", description: "meditation app" }).success).toBe(true);
    expect(BrainstormInput.safeParse({ name: "Calm" }).success).toBe(false);
    expect(BrainstormInput.safeParse({ name: "Calm", description: "x".repeat(1001) }).success).toBe(false);
  });
});

describe("LocalizeInput / CheckInput", () => {
  it("accept ids and supported countries only", () => {
    expect(LocalizeInput.safeParse({ appId: 1, countries: ["DE", "JP"] }).success).toBe(true);
    expect(LocalizeInput.safeParse({ appId: 1, countries: ["de"] }).success).toBe(false);
    expect(CheckInput.safeParse({ appId: 0 }).success).toBe(false);
    expect(CheckInput.safeParse({ appId: 2, keywordIds: [1.5] }).success).toBe(false);
    expect(CheckInput.parse({ appId: 2, keywordIds: [3], force: true })).toEqual({ appId: 2, keywordIds: [3], force: true });
  });
});
