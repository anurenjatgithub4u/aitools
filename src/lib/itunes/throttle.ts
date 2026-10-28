import { sleep } from "@/lib/async";

/**
 * Spaces calls evenly: at most `rpm` acquisitions per minute, served first come first served.
 * `pause()` pushes the next slot back for everyone (used when Apple says we're rate limited).
 */
export class RateLimiter {
  private nextAt = 0;
  private chain: Promise<void> = Promise.resolve();
  readonly intervalMs: number;

  constructor(
    rpm: number,
    private now: () => number = Date.now,
    private wait: (ms: number) => Promise<void> = sleep,
  ) {
    this.intervalMs = Math.ceil(60_000 / rpm);
  }

  /** Resolves when the caller may make its request. */
  acquire(): Promise<void> {
    const turn = this.chain.then(async () => {
      // re-check after waking: a pause() may have moved the slot while we slept
      for (let delay = this.nextAt - this.now(); delay > 0; delay = this.nextAt - this.now()) await this.wait(delay);
      this.nextAt = this.now() + this.intervalMs;
    });
    this.chain = turn.catch(() => {});
    return turn;
  }

  /** Blocks every caller for at least `ms` from now. */
  pause(ms: number): void {
    this.nextAt = Math.max(this.nextAt, this.now() + ms);
  }
}
