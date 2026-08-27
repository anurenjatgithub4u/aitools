// Reading metrics and scoring.
//
// The governing rule from the spec: speed must never buy a good score. Reading
// fast with many errors is worse practice than reading carefully, so accuracy
// gates the speed component rather than simply averaging with it.

import type { AlignmentSummary } from "./alignment";
import type { PauseSummary } from "./pauses";

/** Comfortable read-aloud pace. Silent reading is much faster, but speaking
 *  is bounded by articulation — 150 wpm is an unhurried, clear delivery. */
export const TARGET_WPM = 150;

/** Below this, speech is laboured; above it, clarity usually suffers. */
export const MIN_COMFORTABLE_WPM = 90;
export const MAX_COMFORTABLE_WPM = 190;

export interface ReadingMetrics {
  wpm: number;
  accuracy: number;
  completion: number;
  fluency: number;
  /** 0–100 overall. The number shown large on the results screen. */
  score: number;
  elapsedMs: number;
  spokenWordCount: number;
}

/** Words per minute, from words actually spoken over elapsed time. */
export function calculateWpm(spokenWordCount: number, elapsedMs: number): number {
  const minutes = Math.max(elapsedMs, 1000) / 60_000;
  return Math.max(0, Math.round(spokenWordCount / minutes));
}

/**
 * How close the pace is to comfortable, as 0–1.
 *
 * Deliberately a plateau rather than a peak: anything inside the comfortable
 * band scores full marks. Reading at 140 is not worse than 150, and rewarding
 * a single exact number would push people to rush.
 */
export function paceScore(wpm: number): number {
  if (wpm <= 0) return 0;
  if (wpm >= MIN_COMFORTABLE_WPM && wpm <= MAX_COMFORTABLE_WPM) return 1;
  if (wpm < MIN_COMFORTABLE_WPM) return Math.max(0, wpm / MIN_COMFORTABLE_WPM);
  // Over-fast decays gently; being quick isn't a sin, being unintelligible is.
  return Math.max(0.4, 1 - (wpm - MAX_COMFORTABLE_WPM) / 200);
}

/**
 * Fluency: pace, continuity and completion combined.
 *
 * Long pauses reduce it slightly. Ordinary breathing pauses do not — the spec
 * is explicit that natural pauses must not be punished.
 */
export function calculateFluency(
  wpm: number,
  completion: number,
  pauses: PauseSummary
): number {
  const pace = paceScore(wpm);
  const continuity = pauses.continuity;
  const coverage = Math.min(1, completion / 100);

  const raw = pace * 0.45 + continuity * 0.35 + coverage * 0.2;
  return Math.round(Math.max(0, Math.min(1, raw)) * 100);
}

/**
 * Overall score.
 *
 * Weighted accuracy 45 / fluency 30 / speed 25, then gated: the speed and
 * fluency components are scaled by accuracy, so racing through a passage with
 * half the words wrong cannot produce a high number. Comprehension, when the
 * user answered questions, replaces part of the weight.
 */
export function calculateScore(params: {
  accuracy: number;
  fluency: number;
  wpm: number;
  comprehension?: number | null;
}): number {
  const accuracy = clamp01(params.accuracy / 100);
  const fluency = clamp01(params.fluency / 100);
  const pace = paceScore(params.wpm);

  // The gate. At 50% accuracy, speed and fluency contribute at half value.
  const gate = accuracy;

  let score = accuracy * 0.45 + fluency * gate * 0.3 + pace * gate * 0.25;

  if (typeof params.comprehension === "number") {
    // Comprehension takes a fifth of the weight when it exists, since
    // understanding what you read is part of reading well.
    score = score * 0.8 + clamp01(params.comprehension / 100) * 0.2;
  }

  return Math.round(clamp01(score) * 100);
}

export function calculateMetrics(params: {
  summary: AlignmentSummary;
  pauses: PauseSummary;
  spokenWordCount: number;
  elapsedMs: number;
  comprehension?: number | null;
}): ReadingMetrics {
  const wpm = calculateWpm(params.spokenWordCount, params.elapsedMs);
  const fluency = calculateFluency(wpm, params.summary.completion, params.pauses);
  const score = calculateScore({
    accuracy: params.summary.accuracy,
    fluency,
    wpm,
    comprehension: params.comprehension,
  });

  return {
    wpm,
    accuracy: params.summary.accuracy,
    completion: params.summary.completion,
    fluency,
    score,
    elapsedMs: params.elapsedMs,
    spokenWordCount: params.spokenWordCount,
  };
}

/** Plain-language band for the headline score. */
export function scoreBand(score: number): { label: string; tone: "good" | "ok" | "low" } {
  if (score >= 85) return { label: "Excellent", tone: "good" };
  if (score >= 70) return { label: "Strong", tone: "good" };
  if (score >= 55) return { label: "Getting there", tone: "ok" };
  if (score >= 40) return { label: "Keep practising", tone: "ok" };
  return { label: "Early days", tone: "low" };
}

/** One honest sentence about pace, used under the speed tile. */
export function paceComment(wpm: number): string {
  if (wpm === 0) return "No speech detected.";
  if (wpm < 70) return "Quite slow — that's fine while you build confidence.";
  if (wpm < MIN_COMFORTABLE_WPM) return "A little slow, but clear.";
  if (wpm <= MAX_COMFORTABLE_WPM) return "A natural, comfortable pace.";
  if (wpm <= 220) return "Fast — check that every word stays clear.";
  return "Very fast. Slowing down will improve clarity.";
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}
