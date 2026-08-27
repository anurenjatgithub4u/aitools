// AI coaching and language analysis (server-side only).
//
// Two rules shape everything here:
//
// 1. The model never decides which words were right or wrong. Alignment is
//    deterministic and already done — the model is given the result and asked
//    to explain it. Asking a model to re-judge word matches would be slower,
//    costlier and less accurate than the algorithm.
//
// 2. The model must not invent mistakes. It only sees mistakes the alignment
//    actually found, and it is told explicitly not to add others. A coach that
//    fabricates errors is worse than no coach.

import { callAI } from "@/lib/ai";
import type { AlignedWord, AlignmentSummary } from "./alignment";
import type { ReadingMetrics } from "./scoring";
import type { PauseSummary } from "./pauses";
import { paceComment } from "./scoring";

export interface GrammarNote {
  /** What was expected in the passage. */
  expected: string;
  /** What the reader said. */
  spoken: string;
  /** Why it matters, in one short sentence. */
  note: string;
}

export interface CoachFeedback {
  summary: string;
  strengths: string[];
  improvements: string[];
  focusArea: string;
  encouragement: string;
  /** Only genuine grammatical shifts — not every transcription mismatch. */
  grammarNotes: GrammarNote[];
}

/** Shown when the model is unavailable. Built from the real numbers, so it's
 *  specific rather than a generic apology — the user still gets useful
 *  feedback if the AI call fails. */
export function fallbackFeedback(
  metrics: ReadingMetrics,
  summary: AlignmentSummary,
  pauses: PauseSummary
): CoachFeedback {
  const strengths: string[] = [];
  const improvements: string[] = [];

  if (summary.accuracy >= 90) strengths.push(`You read ${summary.accuracy}% of the words accurately.`);
  if (metrics.wpm >= 90 && metrics.wpm <= 190) strengths.push("Your pace was natural and easy to follow.");
  if (pauses.long === 0) strengths.push("You read without long hesitations.");
  if (summary.completion === 100) strengths.push("You finished the whole passage.");

  if (summary.endingSlips > 0) {
    improvements.push("Watch your word endings — a few were dropped on longer words.");
  }
  if (summary.skipped > 2) improvements.push(`You skipped ${summary.skipped} words. Try slowing down slightly.`);
  if (pauses.long > 2) improvements.push("Pause at punctuation rather than mid-sentence.");
  if (metrics.wpm > 200) improvements.push("Slow down a little so every word stays clear.");
  if (metrics.wpm > 0 && metrics.wpm < 80) improvements.push("Build up your pace gradually as you get more comfortable.");

  return {
    summary:
      summary.accuracy >= 85
        ? "A strong, accurate read with only a few slips."
        : "A solid attempt — there are a few specific things to work on.",
    strengths: strengths.length > 0 ? strengths : ["You completed the reading."],
    improvements: improvements.length > 0 ? improvements : ["Keep practising to build consistency."],
    focusArea: summary.endingSlips > 0 ? "Word endings" : summary.skipped > 2 ? "Reading every word" : "Consistency",
    encouragement: "Read it again and see if you can beat your score.",
    grammarNotes: [],
  };
}

function parseJson(raw: string): Record<string, unknown> | null {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

function strList(value: unknown, max: number, maxLen = 200): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim().slice(0, maxLen))
    .filter(Boolean)
    .slice(0, max);
}

/**
 * Validates model output against what the alignment actually found.
 *
 * A grammar note naming a word pair the alignment never produced is discarded
 * — that's the model inventing a mistake, which rule 2 forbids.
 */
function sanitizeFeedback(raw: Record<string, unknown>, mistakes: AlignedWord[]): CoachFeedback {
  const realPairs = new Set(
    mistakes
      .filter((m) => m.expected && m.spoken)
      .map((m) => `${m.expected}|${m.spoken}`)
  );

  const grammarNotes: GrammarNote[] = Array.isArray(raw.grammar_notes)
    ? raw.grammar_notes
        .map((entry) => {
          const o = (entry ?? {}) as Record<string, unknown>;
          return {
            expected: typeof o.expected === "string" ? o.expected.trim().slice(0, 80) : "",
            spoken: typeof o.spoken === "string" ? o.spoken.trim().slice(0, 80) : "",
            note: typeof o.note === "string" ? o.note.trim().slice(0, 200) : "",
          };
        })
        .filter((n) => n.expected && n.spoken && n.note && realPairs.has(`${n.expected}|${n.spoken}`))
        .slice(0, 4)
    : [];

  return {
    summary: typeof raw.summary === "string" ? raw.summary.trim().slice(0, 400) : "",
    strengths: strList(raw.strengths, 3),
    improvements: strList(raw.improvements, 3),
    focusArea: typeof raw.focus_area === "string" ? raw.focus_area.trim().slice(0, 60) : "",
    encouragement: typeof raw.encouragement === "string" ? raw.encouragement.trim().slice(0, 200) : "",
    grammarNotes,
  };
}

export interface CoachInput {
  passageTitle: string;
  expectedText: string;
  transcript: string;
  metrics: ReadingMetrics;
  summary: AlignmentSummary;
  pauses: PauseSummary;
  mistakes: AlignedWord[];
}

export async function generateCoaching(input: CoachInput): Promise<CoachFeedback> {
  const { metrics, summary, pauses, mistakes } = input;

  // Only the mistakes go to the model, not the whole transcript — it's all the
  // model needs, and it keeps the request small.
  const mistakeLines = mistakes
    .slice(0, 25)
    .map((m) =>
      m.status === "skipped"
        ? `- skipped: "${m.expected}"`
        : `- said "${m.spoken}" instead of "${m.expected}"${m.slip === "ending" ? " (word ending)" : ""}`
    )
    .join("\n");

  const prompt = `You are a warm, specific English reading coach. A learner has just read a passage aloud.

The word-by-word comparison has ALREADY been done for you. Do not re-judge it,
and do not mention any mistake that is not listed below.

Passage: "${input.passageTitle}"

Their results:
- Reading accuracy: ${summary.accuracy}%
- Words read correctly: ${summary.correct} of ${summary.totalExpected}
- Words skipped: ${summary.skipped}
- Word-ending slips: ${summary.endingSlips}
- Pace: ${metrics.wpm} words per minute — ${paceComment(metrics.wpm)}
  (for reference: under 90 wpm is slow, 90-190 is a natural speaking pace,
   over 190 is fast. Do not praise a pace that is outside that band.)
- Long pauses: ${pauses.long}
- Passage completed: ${summary.completion}%

Their mistakes:
${mistakeLines || "(none)"}

Write coaching that is specific to these numbers. Never invent a mistake.
If a word pair shows a real grammatical shift (for example "she work" instead
of "she works"), note it as grammar. A dropped plural or past-tense ending
while reading aloud is a READING slip, not a grammar error — do not list those
as grammar.

Return JSON only:
{
  "summary": "two sentences on how the reading went, referencing their actual numbers",
  "strengths": ["1-3 specific things they did well"],
  "improvements": ["1-3 specific, actionable things to work on"],
  "focus_area": "a short label, e.g. 'Word endings'",
  "encouragement": "one warm closing sentence",
  "grammar_notes": [{"expected": "works", "spoken": "work", "note": "short explanation"}]
}

Be encouraging but honest. If accuracy was low, say so kindly rather than
pretending otherwise. Never describe a slow pace as good or a low accuracy as
strong — false praise is useless to someone trying to improve. Praise only what
the numbers actually support.`;

  try {
    const raw = await callAI(prompt, { json: true, tier: "fast", retries: 2 });
    const parsed = parseJson(raw);
    if (!parsed) throw new Error("unparseable coaching response");

    const feedback = sanitizeFeedback(parsed, mistakes);
    // A response missing the parts that matter is no better than no response.
    if (!feedback.summary || feedback.strengths.length === 0) {
      return fallbackFeedback(metrics, summary, pauses);
    }
    return feedback;
  } catch (e) {
    console.error("[reading:coach] falling back to computed feedback:", e);
    return fallbackFeedback(metrics, summary, pauses);
  }
}
