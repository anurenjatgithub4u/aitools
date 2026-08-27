// Word-level alignment between the expected passage and what was actually
// said.
//
// This is the core of the utility. Index-by-index comparison is not good
// enough: skip one word and every later word would be reported wrong, which is
// both incorrect and demoralising. So this uses Needleman-Wunsch alignment —
// the same dynamic-programming approach used for sequence comparison — which
// tolerates insertions and deletions and finds the best overall pairing.
//
// Example the naive approach gets wrong:
//   expected: "I really enjoy reading books every evening"
//   spoken:   "I enjoy reading books every evening"
// Naive: 6 of 7 words wrong. Aligned: one skipped word ("really"), rest correct.

import { areHomophones, isEndingSlip, isNearWord, tokenize } from "./normalize";

export type WordStatus = "correct" | "incorrect" | "skipped" | "uncertain" | "extra";

export interface AlignedWord {
  /** The passage word, or null for something said that isn't in the passage. */
  expected: string | null;
  /** What the speaker said, or null for a passage word they didn't say. */
  spoken: string | null;
  status: WordStatus;
  /** Position in the expected token stream; -1 for extra words. */
  expectedIndex: number;
  /** Set when the mismatch has a recognisable shape, which the coach uses to
   *  give specific advice rather than "you made mistakes". */
  slip?: "ending" | "homophone" | "near";
}

// Alignment costs. A near-miss is cheaper than an unrelated substitution so
// the algorithm prefers pairing "employee" with "employees" over treating it
// as one deletion plus one insertion.
const COST_MATCH = 0;
const COST_NEAR = 0.4;
const COST_SUBSTITUTE = 1;
const COST_GAP = 0.9;

type Move = "diag" | "up" | "left";

function pairCost(expected: string, spoken: string): { cost: number; slip?: AlignedWord["slip"] } {
  if (expected === spoken) return { cost: COST_MATCH };
  if (areHomophones(expected, spoken)) return { cost: COST_NEAR, slip: "homophone" };
  if (isEndingSlip(expected, spoken)) return { cost: COST_NEAR, slip: "ending" };
  if (isNearWord(expected, spoken)) return { cost: COST_NEAR, slip: "near" };
  return { cost: COST_SUBSTITUTE };
}

/**
 * Aligns a spoken transcript against the expected passage.
 *
 * Returns one entry per expected word plus any extra words that were said,
 * in reading order.
 */
export function alignTranscriptToPassage(expectedText: string, transcriptText: string): AlignedWord[] {
  const expected = tokenize(expectedText);
  // Fillers are dropped from the spoken side only — "um" is not a reading
  // mistake, and counting it as an extra word would punish natural speech.
  const spoken = tokenize(transcriptText, { stripFillers: true });

  if (expected.length === 0) return [];

  if (spoken.length === 0) {
    return expected.map((word, index) => ({
      expected: word,
      spoken: null,
      status: "skipped" as const,
      expectedIndex: index,
    }));
  }

  // --- score matrix ------------------------------------------------------
  const rows = expected.length + 1;
  const cols = spoken.length + 1;
  const score = new Float64Array(rows * cols);
  const move = new Uint8Array(rows * cols); // 0 diag, 1 up, 2 left
  const at = (r: number, c: number) => r * cols + c;

  for (let r = 1; r < rows; r++) {
    score[at(r, 0)] = r * COST_GAP;
    move[at(r, 0)] = 1;
  }
  for (let c = 1; c < cols; c++) {
    score[at(0, c)] = c * COST_GAP;
    move[at(0, c)] = 2;
  }

  for (let r = 1; r < rows; r++) {
    for (let c = 1; c < cols; c++) {
      const { cost } = pairCost(expected[r - 1], spoken[c - 1]);
      const diagonal = score[at(r - 1, c - 1)] + cost;
      const up = score[at(r - 1, c)] + COST_GAP; // expected word not spoken
      const left = score[at(r, c - 1)] + COST_GAP; // extra spoken word

      let best = diagonal;
      let chosen: Move = "diag";
      if (up < best) {
        best = up;
        chosen = "up";
      }
      if (left < best) {
        best = left;
        chosen = "left";
      }

      score[at(r, c)] = best;
      move[at(r, c)] = chosen === "diag" ? 0 : chosen === "up" ? 1 : 2;
    }
  }

  // --- backtrack ---------------------------------------------------------
  const reversed: AlignedWord[] = [];
  let r = expected.length;
  let c = spoken.length;

  while (r > 0 || c > 0) {
    const step = r === 0 ? 2 : c === 0 ? 1 : move[at(r, c)];

    if (step === 0) {
      const expectedWord = expected[r - 1];
      const spokenWord = spoken[c - 1];
      const { slip } = pairCost(expectedWord, spokenWord);

      let status: WordStatus;
      if (expectedWord === spokenWord) status = "correct";
      // A homophone is the engine's ambiguity, not the reader's error, so it
      // never shows as wrong.
      else if (slip === "homophone") status = "uncertain";
      else status = "incorrect";

      reversed.push({
        expected: expectedWord,
        spoken: spokenWord,
        status,
        expectedIndex: r - 1,
        slip,
      });
      r--;
      c--;
    } else if (step === 1) {
      reversed.push({
        expected: expected[r - 1],
        spoken: null,
        status: "skipped",
        expectedIndex: r - 1,
      });
      r--;
    } else {
      reversed.push({
        expected: null,
        spoken: spoken[c - 1],
        status: "extra",
        expectedIndex: -1,
      });
      c--;
    }
  }

  return reversed.reverse();
}

// ---------------------------------------------------------------------------
// Derived views
// ---------------------------------------------------------------------------

/** Status per expected word, indexed for the passage renderer. Extra words are
 *  omitted — they have no position in the passage to colour. */
export function statusByExpectedIndex(aligned: AlignedWord[]): WordStatus[] {
  const statuses: WordStatus[] = [];
  for (const word of aligned) {
    if (word.expectedIndex >= 0) statuses[word.expectedIndex] = word.status;
  }
  return statuses;
}

export interface AlignmentSummary {
  totalExpected: number;
  correct: number;
  incorrect: number;
  skipped: number;
  uncertain: number;
  extra: number;
  /** Correct plus uncertain, over total expected. Uncertain counts as correct
   *  because the reader probably said the right word. */
  accuracy: number;
  /** How much of the passage was reached at all. */
  completion: number;
  /** Longest unbroken run of correct words — the streak shown in the UI. */
  bestStreak: number;
  endingSlips: number;
}

export function summarizeAlignment(aligned: AlignedWord[]): AlignmentSummary {
  let correct = 0, incorrect = 0, skipped = 0, uncertain = 0, extra = 0, endingSlips = 0;
  let streak = 0, bestStreak = 0;

  for (const word of aligned) {
    switch (word.status) {
      case "correct":
        correct++;
        streak++;
        bestStreak = Math.max(bestStreak, streak);
        break;
      case "uncertain":
        uncertain++;
        // An uncertain word doesn't break a streak; the reader most likely
        // said it correctly.
        streak++;
        bestStreak = Math.max(bestStreak, streak);
        break;
      case "incorrect":
        incorrect++;
        streak = 0;
        break;
      case "skipped":
        skipped++;
        streak = 0;
        break;
      case "extra":
        extra++;
        break;
    }
    if (word.slip === "ending") endingSlips++;
  }

  const totalExpected = correct + incorrect + skipped + uncertain;
  const attempted = correct + incorrect + uncertain;

  return {
    totalExpected,
    correct,
    incorrect,
    skipped,
    uncertain,
    extra,
    accuracy: totalExpected === 0 ? 0 : Math.round(((correct + uncertain) / totalExpected) * 100),
    completion: totalExpected === 0 ? 0 : Math.round((attempted / totalExpected) * 100),
    bestStreak,
    endingSlips,
  };
}

export interface PracticeWord {
  expected: string;
  spoken: string | null;
  status: WordStatus;
  slip?: AlignedWord["slip"];
}

/**
 * The words worth practising, most useful first.
 *
 * Deduplicated and capped: a list of forty words is a wall, not a lesson.
 * Longer words are prioritised because they carry more information and are
 * where readers actually stumble.
 */
export function wordsToPractice(aligned: AlignedWord[], limit = 6): PracticeWord[] {
  const seen = new Set<string>();
  const candidates: PracticeWord[] = [];

  for (const word of aligned) {
    if (!word.expected) continue;
    if (word.status !== "incorrect" && word.status !== "skipped") continue;
    if (seen.has(word.expected)) continue;
    // Function words ("the", "a", "of") are rarely a real pronunciation
    // problem and make the practice list feel pointless.
    if (word.expected.length <= 3) continue;

    seen.add(word.expected);
    candidates.push({
      expected: word.expected,
      spoken: word.spoken,
      status: word.status,
      slip: word.slip,
    });
  }

  return candidates.sort((a, b) => b.expected.length - a.expected.length).slice(0, limit);
}
