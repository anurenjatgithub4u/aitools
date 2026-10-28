import { describe, expect, it } from "vitest";
import { backoffMs, isRetryable } from "./retry";

describe("isRetryable", () => {
  it("retries rate limits (403/429) and server errors only", () => {
    expect([403, 429, 500, 503].every(isRetryable)).toBe(true);
    expect([400, 404].some(isRetryable)).toBe(false);
  });
});

describe("backoffMs", () => {
  const noJitter = () => 0;
  it("doubles from 5s and caps at 60s", () => {
    expect([0, 1, 2, 3, 4, 5].map((a) => backoffMs(a, null, noJitter))).toEqual([5000, 10000, 20000, 40000, 60000, 60000]);
  });
  it("adds at most 20% jitter", () => {
    expect(backoffMs(0, null, () => 1)).toBe(6000);
  });
  it("honours Retry-After seconds, capped", () => {
    expect(backoffMs(0, "7")).toBe(7000);
    expect(backoffMs(0, "600")).toBe(60000);
    expect(backoffMs(1, "soon", noJitter)).toBe(10000);
  });
});
