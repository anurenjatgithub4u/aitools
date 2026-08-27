// Pause detection between speech segments.
//
// Recognition engines emit results in bursts, and the gap between the end of
// one final result and the start of the next is a usable proxy for a pause.
// It is not precise — the engine's own latency is folded into it — so the
// thresholds are deliberately generous and only long pauses count against
// fluency.
//
// The spec is explicit: normal breathing pauses must not be punished. Someone
// taking a breath at a full stop is reading well, not badly.

/** Under this, it's the gap between words, not a pause at all. */
const SHORT_PAUSE_MS = 700;

/** A natural breath or a beat at punctuation. Expected, not penalised. */
const NORMAL_PAUSE_MS = 1_800;

/** Beyond this the reader has stopped — lost their place, or stuck on a word. */
const LONG_PAUSE_MS = 3_000;

export type PauseKind = "short" | "normal" | "long";

export interface PauseEvent {
  /** Milliseconds of silence. */
  durationMs: number;
  kind: PauseKind;
  /** When it happened, relative to the session start. */
  atMs: number;
}

export interface PauseSummary {
  total: number;
  short: number;
  normal: number;
  long: number;
  longestMs: number;
  /** 0–1. How continuous the delivery was; feeds the fluency score. */
  continuity: number;
}

export function classifyPause(durationMs: number): PauseKind | null {
  if (durationMs < SHORT_PAUSE_MS) return null;
  if (durationMs < NORMAL_PAUSE_MS) return "short";
  if (durationMs < LONG_PAUSE_MS) return "normal";
  return "long";
}

/**
 * Tracks gaps between recognition segments over a session.
 *
 * Stateful because it's fed live as results arrive, then summarised at the end.
 */
export class PauseTracker {
  private events: PauseEvent[] = [];
  private lastSpeechAt: number | null = null;
  private startedAt: number;

  constructor(startedAt: number = Date.now()) {
    this.startedAt = startedAt;
  }

  /** Called whenever a speech segment is recognised. */
  mark(now: number = Date.now()): void {
    if (this.lastSpeechAt !== null) {
      const gap = now - this.lastSpeechAt;
      const kind = classifyPause(gap);
      if (kind) {
        this.events.push({ durationMs: gap, kind, atMs: now - this.startedAt });
      }
    }
    this.lastSpeechAt = now;
  }

  /** Excludes a paused stretch, so a deliberate pause isn't read as hesitation. */
  skip(now: number = Date.now()): void {
    this.lastSpeechAt = now;
  }

  reset(startedAt: number = Date.now()): void {
    this.events = [];
    this.lastSpeechAt = null;
    this.startedAt = startedAt;
  }

  getEvents(): PauseEvent[] {
    return [...this.events];
  }

  summarize(): PauseSummary {
    return summarizePauses(this.events);
  }
}

export function summarizePauses(events: PauseEvent[]): PauseSummary {
  let short = 0;
  let normal = 0;
  let long = 0;
  let longestMs = 0;

  for (const event of events) {
    if (event.kind === "short") short++;
    else if (event.kind === "normal") normal++;
    else long++;
    longestMs = Math.max(longestMs, event.durationMs);
  }

  // Only long pauses reduce continuity, and each one costs a little. Five long
  // pauses lands around 0.5 — noticeably hesitant, but not zero, because the
  // reader still finished.
  const continuity = Math.max(0, Math.min(1, 1 - long * 0.1));

  return { total: events.length, short, normal, long, longestMs, continuity };
}

/** One sentence about pacing for the results screen. Says something specific
 *  or says nothing — a vague comment is worse than none. */
export function pauseComment(summary: PauseSummary): string {
  if (summary.total === 0) return "You read straight through without stopping.";
  if (summary.long === 0) return "You kept a steady pace with only natural pauses.";
  if (summary.long === 1) return "Steady overall, with one longer pause.";
  if (summary.long <= 3) return `You kept a good pace with ${summary.long} longer pauses.`;
  return "You paused often — reading the passage through silently first can help.";
}
