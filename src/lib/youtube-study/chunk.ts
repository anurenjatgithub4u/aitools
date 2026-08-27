// Transcript normalisation and chunking (spec §14).
//
// Chunks are built from caption segments rather than by slicing the joined
// string, which means every chunk knows the time range it covers. That's what
// lets generated notes cite "[14:20]" and link back into the video (spec §24).

import type { Transcript, TranscriptChunk, TranscriptSegment } from "./types";
import { MAX_CHUNKS, TARGET_CHUNK_CHARS } from "./config";

const NOISE_MARKER = /\[(music|applause|laughter|inaudible|silence|noise|sound|clapping|cheering)[^\]]*\]/gi;

/**
 * Cleans transcript text without discarding meaning.
 *
 * Deliberately conservative: it removes sound markers and collapses the
 * stutter artefacts ASR produces, but leaves the wording alone. Aggressive
 * cleaning here would silently change what the speaker said.
 */
export function normalizeText(text: string): string {
  return text
    .replace(NOISE_MARKER, " ")
    // ">> " speaker markers from broadcast captions
    .replace(/^\s*>>+\s*/gm, "")
    // "the the the" → "the" (ASR stutter, not emphasis)
    .replace(/\b(\w+)(\s+\1\b){2,}/gi, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** Merges caption fragments into sentence-ish units for cleaner chunking. */
function mergeSegments(segments: TranscriptSegment[]): TranscriptSegment[] {
  const merged: TranscriptSegment[] = [];
  let buffer: TranscriptSegment | null = null;

  for (const segment of segments) {
    const text = normalizeText(segment.text);
    if (!text) continue;

    if (!buffer) {
      buffer = { ...segment, text };
      continue;
    }

    const endsSentence = /[.!?]"?$/.test(buffer.text);
    // Keep merging until we hit a sentence boundary, but don't build units so
    // large that a chunk boundary can't fall near its target size.
    if (endsSentence || buffer.text.length > 400) {
      merged.push(buffer);
      buffer = { ...segment, text };
    } else {
      buffer = {
        start: buffer.start,
        duration: segment.start + segment.duration - buffer.start,
        text: `${buffer.text} ${text}`,
      };
    }
  }

  if (buffer) merged.push(buffer);
  return merged;
}

/**
 * Splits a transcript into time-aware chunks.
 *
 * Chunks target TARGET_CHUNK_CHARS and are capped at MAX_CHUNKS. When a
 * transcript would exceed the cap, chunk size grows to fit rather than
 * dropping content — losing the end of a video silently would be worse than
 * a slightly larger request.
 */
export function chunkTranscript(transcript: Transcript): TranscriptChunk[] {
  const segments = mergeSegments(transcript.segments);

  if (segments.length === 0) {
    const text = normalizeText(transcript.text);
    if (!text) return [];
    return [{ index: 0, startSeconds: 0, endSeconds: 0, text, charCount: text.length }];
  }

  const totalChars = segments.reduce((sum, s) => sum + s.text.length + 1, 0);
  // Grow the target if the natural size would blow past the chunk ceiling.
  const targetSize = Math.max(TARGET_CHUNK_CHARS, Math.ceil(totalChars / MAX_CHUNKS));

  const chunks: TranscriptChunk[] = [];
  let current: TranscriptSegment[] = [];
  let currentChars = 0;

  const flush = () => {
    if (current.length === 0) return;
    const text = current.map((s) => s.text).join(" ").trim();
    const first = current[0];
    const last = current[current.length - 1];
    chunks.push({
      index: chunks.length,
      startSeconds: Math.floor(first.start),
      endSeconds: Math.ceil(last.start + last.duration),
      text,
      charCount: text.length,
    });
    current = [];
    currentChars = 0;
  };

  for (const segment of segments) {
    if (currentChars > 0 && currentChars + segment.text.length > targetSize) flush();
    current.push(segment);
    currentChars += segment.text.length + 1;
  }
  flush();

  return chunks;
}

/** Formats seconds as the [mm:ss] / [h:mm:ss] marker used inside prompts. */
export function stamp(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/**
 * Renders a chunk with periodic inline timestamps.
 *
 * The model needs time anchors to attribute concepts to moments, but stamping
 * every caption line wastes tokens and fragments the prose. One marker roughly
 * every 45 seconds is enough to place a concept accurately.
 */
export function renderChunkForPrompt(chunk: TranscriptChunk, segments: TranscriptSegment[]): string {
  const inRange = segments.filter(
    (s) => s.start >= chunk.startSeconds && s.start <= chunk.endSeconds
  );
  if (inRange.length === 0) return `[${stamp(chunk.startSeconds)}] ${chunk.text}`;

  const parts: string[] = [];
  let lastStamp = -Infinity;
  let buffer: string[] = [];

  for (const segment of inRange) {
    if (segment.start - lastStamp >= 45) {
      if (buffer.length) parts.push(buffer.join(" "));
      parts.push(`\n[${stamp(segment.start)}]`);
      lastStamp = segment.start;
      buffer = [];
    }
    const text = normalizeText(segment.text);
    if (text) buffer.push(text);
  }
  if (buffer.length) parts.push(buffer.join(" "));

  return parts.join(" ").replace(/\s+\n/g, "\n").trim();
}
