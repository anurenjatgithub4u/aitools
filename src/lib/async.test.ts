import { describe, expect, it } from "vitest";
import { mapLimit, sleep } from "./async";

describe("mapLimit", () => {
  it("keeps order and never exceeds the limit", async () => {
    let running = 0;
    let peak = 0;
    const out = await mapLimit([30, 10, 20, 5, 15], 2, async (ms, i) => {
      peak = Math.max(peak, ++running);
      await sleep(ms);
      running--;
      return i;
    });
    expect(out).toEqual([0, 1, 2, 3, 4]);
    expect(peak).toBe(2);
  });
});
