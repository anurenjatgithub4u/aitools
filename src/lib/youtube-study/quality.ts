// Transcript quality assessment (spec §10).
//
// This runs *before* any model call. Its job is to stop us spending tokens on
// content that can't produce honest output — a music video's auto-captions, a
// transcript that's 90% "[Music]", or a 40-word fragment.
//
// Pure functions, no I/O: the thresholds live in config.ts and every decision
// here is reproducible from the transcript text alone.

import type { Transcript, TranscriptQuality, TranscriptQualityRating } from "./types";
import {
  MAX_NOISE_RATIO,
  MAX_REPETITION_RATIO,
  MIN_AVG_WORD_LENGTH,
  MIN_USABLE_WORDS,
  POOR_WORD_THRESHOLD,
} from "./config";

/** Bracketed sound markers YouTube's ASR emits for non-speech audio. */
const NOISE_MARKER = /\[(music|applause|laughter|inaudible|silence|noise|sound|foreign|clapping|cheering)[^\]]*\]/gi;

/** Filler tokens that carry no information for note-taking purposes. */
const FILLER_WORDS = new Set([
  "uh", "um", "erm", "hmm", "mhm", "uhh", "umm", "ah", "eh", "oh", "hm",
]);

/**
 * Share of the transcript made up of repeated n-grams.
 *
 * Music captions and stuck ASR both manifest the same way: the same short
 * phrase repeating far more than natural speech would. A 5-gram window is
 * long enough to ignore ordinary repetition ("you know", "so the") and short
 * enough to catch a looping chorus.
 */
export function repetitionRatio(words: string[], n = 5): number {
  if (words.length < n * 2) return 0;

  const counts = new Map<string, number>();
  const total = words.length - n + 1;
  for (let i = 0; i < total; i++) {
    const gram = words.slice(i, i + n).join(" ");
    counts.set(gram, (counts.get(gram) ?? 0) + 1);
  }

  // Every occurrence beyond the first is treated as repeated material.
  let repeated = 0;
  for (const count of counts.values()) if (count > 1) repeated += count - 1;
  return repeated / total;
}

/** Share of tokens that are sound markers, filler, or non-lexical noise. */
export function noiseRatio(text: string, words: string[]): number {
  if (words.length === 0) return 1;

  const markerMatches = text.match(NOISE_MARKER) ?? [];
  // Each marker stands in for roughly the words it replaced; counting the
  // marker's own words understates how much of the runtime it covers.
  const markerWeight = markerMatches.length * 3;

  const filler = words.filter((w) => FILLER_WORDS.has(w)).length;
  const nonLexical = words.filter((w) => /^[^a-z0-9]+$/i.test(w)).length;

  return Math.min(1, (markerWeight + filler + nonLexical) / words.length);
}

/** Words with the noise markers and punctuation stripped out. */
export function usableWords(text: string): string[] {
  return text
    .replace(NOISE_MARKER, " ")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0 && !FILLER_WORDS.has(w));
}

/**
 * Classifies a transcript as GOOD / ACCEPTABLE / POOR / UNUSABLE.
 *
 * UNUSABLE is the only rating that blocks processing outright. POOR warns but
 * lets the user decide, because a low score sometimes reflects an unusual
 * speaking style rather than genuinely unusable content.
 */
export function assessTranscriptQuality(transcript: Transcript): TranscriptQuality {
  const text = transcript.text || "";
  const words = usableWords(text);
  const wordCount = words.length;
  const reasons: string[] = [];

  if (wordCount === 0) {
    return {
      rating: "UNUSABLE",
      wordCount: 0,
      repetitionRatio: 0,
      noiseRatio: 1,
      averageWordLength: 0,
      reasons: ["The transcript is empty."],
      canProceed: false,
    };
  }

  const repetition = repetitionRatio(words);
  const noise = noiseRatio(text, words);
  const averageWordLength = words.reduce((sum, w) => sum + w.length, 0) / wordCount;

  // Severity is tracked as an index rather than a string so a rating can only
  // ever move downwards, and so the compiler doesn't narrow it away as the
  // checks below accumulate.
  const SEVERITY: TranscriptQualityRating[] = ["GOOD", "ACCEPTABLE", "POOR", "UNUSABLE"];
  let severity = 0;

  const demote = (to: TranscriptQualityRating, reason: string) => {
    severity = Math.max(severity, SEVERITY.indexOf(to));
    reasons.push(reason);
  };

  if (wordCount < MIN_USABLE_WORDS) {
    demote("UNUSABLE", `Only ${wordCount} usable words — too little to summarise reliably.`);
  } else if (wordCount < POOR_WORD_THRESHOLD) {
    demote("POOR", "The video contains very little spoken content.");
  }

  if (repetition > MAX_REPETITION_RATIO) {
    // Heavy repetition plus a short transcript is the signature of a music
    // video, where no amount of processing will produce useful notes.
    const severe = repetition > MAX_REPETITION_RATIO * 1.5;
    demote(
      severe ? "UNUSABLE" : "POOR",
      "Large parts of the transcript repeat the same phrases."
    );
  }

  if (noise > MAX_NOISE_RATIO) {
    const severe = noise > 0.6;
    demote(
      severe ? "UNUSABLE" : "POOR",
      "Much of the audio is music or unintelligible rather than speech."
    );
  } else if (noise > MAX_NOISE_RATIO * 0.6) {
    demote("ACCEPTABLE", "Some parts of the transcript may contain transcription errors.");
  }

  if (averageWordLength < MIN_AVG_WORD_LENGTH) {
    demote("POOR", "The transcript text appears fragmented or garbled.");
  }

  // Auto-captions are workable but worth flagging once, not penalising twice.
  if (severity === 0 && transcript.source === "auto") {
    demote("ACCEPTABLE", "Captions were auto-generated, so some wording may be imprecise.");
  }

  const rating = SEVERITY[severity];

  return {
    rating,
    wordCount,
    repetitionRatio: Number(repetition.toFixed(3)),
    noiseRatio: Number(noise.toFixed(3)),
    averageWordLength: Number(averageWordLength.toFixed(2)),
    reasons,
    canProceed: rating !== "UNUSABLE",
  };
}

/** The warning to surface for a given rating, or null when none is needed. */
export function qualityWarning(quality: TranscriptQuality): string | null {
  switch (quality.rating) {
    case "GOOD":
      return null;
    case "ACCEPTABLE":
      return "Some parts of the transcript may contain transcription errors.";
    case "POOR":
      return "The transcript quality appears low. Generated results may be incomplete.";
    case "UNUSABLE":
      return "This video's transcript isn't usable for reliable notes.";
  }
}
