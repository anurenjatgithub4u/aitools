import { sleep } from "@/lib/async";

/**
 * Spaces calls evenly: at most `rpm` acquisitions per minute, served first come first served.
 * `pause()` pushes the next slot back for everyone (used when Apple says we're rate limited).
 */
export class RateLimiter {
  private nextAt = 0;
  private pausedUntil = 0;
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

  /**
   * For interactive requests (a user waiting on a lookup): skips the queue but still honours a
   * pause and still uses up a slot, so queued jobs slow down slightly instead of the rate going up.
   */
  async acquirePriority(): Promise<void> {
    for (let delay = this.pausedUntil - this.now(); delay > 0; delay = this.pausedUntil - this.now()) await this.wait(delay);
    this.nextAt = Math.max(this.nextAt, this.now()) + this.intervalMs;
  }

  /** Blocks every caller for at least `ms` from now. */
  pause(ms: number): void {
    this.nextAt = Math.max(this.nextAt, this.now() + ms);
    this.pausedUntil = Math.max(this.pausedUntil, this.now() + ms);
  }
}
