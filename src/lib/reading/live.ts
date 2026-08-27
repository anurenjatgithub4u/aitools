// Live (in-progress) alignment view.
//
// Alignment is designed for a finished reading: when the transcript runs out,
// every remaining passage word is reported as "skipped", which is correct at
// the end and badly wrong mid-session. Used directly while someone is still
// reading it would:
//
//   - strike through the whole unread passage, as if they'd already failed it
//   - count unread words as attempted, collapsing accuracy (20 read of 200 → 10%)
//   - inflate WPM by treating the entire passage as spoken
//
// So a live view stops at the frontier — the furthest word actually reached —
// and leaves everything beyond it untouched.
//
// It also folds in interim recognition results, which is what makes words turn
// green as they're spoken rather than a sentence at a time. Interim text is
// provisional, so it can only paint a word *correct*; red waits for the
// segment to finalise (spec: no aggressive red highlighting on interim).

import { alignTranscriptToPassage, statusByExpectedIndex, type AlignedWord, type WordStatus } from "./alignment";
import { tokenize, tokenizeForDisplay } from "./normalize";

/**
 * How far past the spoken word count the live alignment may look.
 *
 * Alignment is global: given four spoken words and a forty-word passage, a
 * common word like "of" can pair with a much later occurrence at no extra
 * cost, because the gaps have to be inserted somewhere either way. Mid-reading
 * that is badly wrong — it jumps the frontier far ahead and marks everything
 * in between as skipped.
 *
 * Reading is sequential, so someone who has said N words cannot be further
 * than roughly N words into the passage. Restricting the live comparison to a
 * window enforces that, and has the side benefit of keeping the per-keystroke
 * cost bounded no matter how long the passage is.
 */
const LOOKAHEAD_WORDS = 20;

/** The passage prefix covering the first `wordLimit` comparable words, with
 *  original punctuation intact. */
function passagePrefix(text: string, wordLimit: number): string {
  const { tokens, compareWords } = tokenizeForDisplay(text);
  if (wordLimit >= compareWords.length) return text;

  const parts: string[] = [];
  for (const token of tokens) {
    if (token.compareIndex >= wordLimit) break;
    parts.push(token.raw);
  }
  return parts.join(" ");
}

/** Highest expected index actually reached — anything past this is unread,
 *  not skipped. */
export function frontierIndex(aligned: AlignedWord[]): number {
  let frontier = -1;
  for (const word of aligned) {
    if (word.expectedIndex < 0) continue;
    if (word.status === "correct" || word.status === "incorrect" || word.status === "uncertain") {
      frontier = Math.max(frontier, word.expectedIndex);
    }
  }
  return frontier;
}

export interface LiveView {
  /** Status per expected index, truncated at the frontier. */
  statuses: WordStatus[];
  /** Words confirmed correct or uncertain so far. */
  matched: number;
  /** Words reached and judged — the denominator for live accuracy. */
  attempted: number;
  /** Index of the next word to read, for the reading cursor. */
  cursor: number;
  /** Real spoken words, for WPM. Never the passage length. */
  spokenWordCount: number;
}

/**
 * Builds the in-progress view from finalised text plus the interim buffer.
 *
 * Two alignments rather than one: the final pass establishes confirmed
 * statuses, and a second pass including interim text paints ahead of it
 * optimistically. Merging them means a word can go green the moment it's
 * heard, but only goes red once the engine has committed to what it heard.
 */
export function buildLiveView(
  passageText: string,
  finalTranscript: string,
  interimTranscript: string
): LiveView {
  const finalWords = tokenize(finalTranscript, { stripFillers: true }).length;
  const interimWords = tokenize(interimTranscript, { stripFillers: true }).length;

  // Compare against a window, not the whole passage — see LOOKAHEAD_WORDS.
  const finalWindow = passagePrefix(passageText, finalWords + LOOKAHEAD_WORDS);
  const finalAligned = alignTranscriptToPassage(finalWindow, finalTranscript);
  const finalStatuses = statusByExpectedIndex(finalAligned);
  const finalFrontier = frontierIndex(finalAligned);

  // Truncating here is what stops the unread remainder rendering as skipped.
  const statuses = finalStatuses.slice(0, finalFrontier + 1);

  let cursor = finalFrontier + 1;

  if (interimTranscript.trim()) {
    const combinedWindow = passagePrefix(passageText, finalWords + interimWords + LOOKAHEAD_WORDS);
    const combined = alignTranscriptToPassage(
      combinedWindow,
      `${finalTranscript} ${interimTranscript}`.trim()
    );
    const combinedStatuses = statusByExpectedIndex(combined);
    const interimFrontier = frontierIndex(combined);

    // Only positive statuses propagate from interim text. A word the engine
    // hasn't committed to must not be marked wrong — interim results change
    // constantly, and flickering red is worse than showing nothing yet.
    for (let i = finalFrontier + 1; i <= interimFrontier; i++) {
      const status = combinedStatuses[i];
      if (status === "correct" || status === "uncertain") statuses[i] = status;
    }

    cursor = Math.max(cursor, interimFrontier + 1);
  }

  let matched = 0;
  let attempted = 0;
  for (const status of statuses) {
    if (!status) continue;
    attempted++;
    if (status === "correct" || status === "uncertain") matched++;
  }

  return {
    statuses,
    matched,
    attempted,
    cursor,
    // Counted from the transcript itself. Deriving it from passage position
    // was the second half of the inflated-WPM bug.
    spokenWordCount: tokenize(`${finalTranscript} ${interimTranscript}`, { stripFillers: true }).length,
  };
}

/** Live accuracy over words actually reached, not the whole passage. */
export function liveAccuracy(view: LiveView): number | null {
  if (view.attempted === 0) return null;
  return Math.round((view.matched / view.attempted) * 100);
}

/** Live WPM. Suppressed for the first few seconds, where the figure is noise. */
export function liveWpm(view: LiveView, elapsedMs: number): number | null {
  if (elapsedMs < 4000 || view.spokenWordCount === 0) return null;
  return Math.round(view.spokenWordCount / (elapsedMs / 60_000));
}
