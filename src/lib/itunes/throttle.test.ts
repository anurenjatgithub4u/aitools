import { describe, expect, it } from "vitest";
import { RateLimiter } from "./throttle";

// A fake clock: wait() advances time instantly so the test is fast and deterministic.
function fakeClock() {
  let t = 0;
  return { now: () => t, wait: async (ms: number) => void (t += ms) };
}

describe("RateLimiter", () => {
  it("spaces calls by 60s / rpm", async () => {
    const c = fakeClock();
    const rl = new RateLimiter(15, c.now, c.wait);
    const times: number[] = [];
    await Promise.all([0, 1, 2].map(() => rl.acquire().then(() => times.push(c.now()))));
    expect(times).toEqual([0, 4000, 8000]);
  });

  it("pause() delays the next slot for everyone", async () => {
    const c = fakeClock();
    const rl = new RateLimiter(60, c.now, c.wait);
    await rl.acquire();
    rl.pause(30_000);
    await rl.acquire();
    expect(c.now()).toBe(30_000);
  });

  it("acquirePriority() skips the queue but uses up a slot and honours pause()", async () => {
    const c = fakeClock();
    const rl = new RateLimiter(15, c.now, c.wait);
    await rl.acquire(); // t=0, next slot 4000
    await rl.acquirePriority(); // immediate, pushes next slot to 8000
    expect(c.now()).toBe(0);
    await rl.acquire();
    expect(c.now()).toBe(8000);
    rl.pause(20_000);
    await rl.acquirePriority();
    expect(c.now()).toBe(28_000);
  });
});
