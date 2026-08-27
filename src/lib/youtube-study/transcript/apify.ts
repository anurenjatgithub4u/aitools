// Apify-backed transcript provider.
//
// WHY THIS EXISTS
// ---------------
// YouTube's timedtext endpoint no longer returns caption bodies to ordinary
// clients: the watch page still lists caption tracks, but every fetch of a
// track URL returns HTTP 200 with an empty body — verified from a residential
// IP, so this is not datacenter blocking. The free provider is kept for the
// day that changes, but it cannot be the primary path.
//
// This provider calls an Apify actor that handles the access problem
// (rotating proxies, and optionally Whisper transcription for videos with no
// captions at all). Cost at the time of writing is ~$0.001 per transcript plus
// a small per-run charge, which is negligible next to the model spend the
// transcript then feeds.
//
// Configure with:
//   APIFY_TOKEN=...                        (required)
//   YOUTUBE_TRANSCRIPT_PROVIDER=apify      (to make this the primary)
//   APIFY_TRANSCRIPT_ACTOR=...             (optional, to swap actors)
//   ENABLE_AUDIO_TRANSCRIPTION_FALLBACK=true  (optional, costs more)

import type { Transcript, TranscriptSegment } from "../types";
import { ENABLE_AUDIO_TRANSCRIPTION_FALLBACK, MAX_VIDEO_SECONDS } from "../config";
import { logInternalError } from "../errors";
import { buildTranscript } from "./timedtext";
import type { TranscriptProvider, TranscriptResult } from "./provider";

const DEFAULT_ACTOR = "codepoetry~youtube-transcript-ai-scraper";

/** run-sync returns dataset items directly, which is what we want for a single
 *  video. Its ceiling is generous but finite, so we bound it ourselves too. */
const RUN_TIMEOUT_SECONDS = 180;

type Unknown = Record<string, unknown>;

const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

const str = (v: unknown): string => (typeof v === "string" ? v : "");

/**
 * Case- and separator-insensitive field lookup.
 *
 * Actors are written by different authors with no shared output convention —
 * the current one emits snake_case (`transcript_json`), others use camelCase
 * (`transcriptJson`). Normalising the key once means a provider swap doesn't
 * turn into a bug hunt over spelling.
 */
function pick(item: Unknown, ...names: string[]): unknown {
  const normalize = (s: string) => s.toLowerCase().replace(/[_\-\s]/g, "");
  const lookup = new Map<string, unknown>();
  for (const [key, value] of Object.entries(item)) lookup.set(normalize(key), value);
  for (const name of names) {
    const value = lookup.get(normalize(name));
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

/**
 * Normalises one segment from whatever shape the actor emits.
 *
 * Actor output schemas are not standardised across the Apify store, and this
 * one publishes no output schema, so several plausible key spellings are
 * accepted rather than assuming one. Times are normalised to seconds.
 */
function normalizeSegment(raw: unknown): TranscriptSegment | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Unknown;

  const text = str(o.text || o.utf8 || o.content || o.segment).trim();
  if (!text) return null;

  // Start: seconds first, then milliseconds variants.
  let start =
    num(o.start) ?? num(o.startTime) ?? num(o.offset) ?? num(o.startSeconds);
  if (start === null) {
    const ms = num(o.tStartMs) ?? num(o.startMs) ?? num(o.offsetMs);
    if (ms !== null) start = ms / 1000;
  }
  if (start === null) return null;

  // Duration: seconds, then ms, then derive from an end time.
  let duration = num(o.duration) ?? num(o.dur) ?? num(o.durationSeconds);
  if (duration === null) {
    const ms = num(o.dDurationMs) ?? num(o.durationMs);
    if (ms !== null) duration = ms / 1000;
  }
  if (duration === null) {
    const end = num(o.end) ?? num(o.endTime) ?? num(o.endSeconds);
    if (end !== null) duration = Math.max(0, end - start);
    else {
      const endMs = num(o.endMs) ?? num(o.tEndMs);
      if (endMs !== null) duration = Math.max(0, endMs / 1000 - start);
    }
  }

  return { start, duration: duration ?? 0, text };
}

/** Finds the timestamped segment array wherever the actor put it. */
function findSegments(item: Unknown): TranscriptSegment[] {
  const candidates = [
    // Verified against codepoetry/youtube-transcript-ai-scraper, which emits
    // transcript_json as [{start, end, text}].
    pick(item, "transcript_json", "transcriptSegments", "segments", "captions", "json"),
    item.transcript,
    (item.data as Unknown)?.transcript,
  ];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    const segments = candidate.map(normalizeSegment).filter((s): s is TranscriptSegment => !!s);
    if (segments.length > 0) return segments;
  }
  return [];
}

/** Falls back to plain text when no timestamped segments came back. */
function findPlainText(item: Unknown): string {
  const value = pick(
    item,
    "transcript_text", "llm_text", "plain_text", "full_text", "text", "llm"
  );
  if (typeof value === "string" && value.trim()) return value.trim();
  // Some actors put the plain text under the transcript key as a string.
  if (typeof item.transcript === "string" && item.transcript.trim()) return item.transcript.trim();
  return "";
}

function isAutoGenerated(item: Unknown): boolean {
  const auto = pick(item, "is_auto_generated", "isGenerated");
  if (typeof auto === "boolean" && auto) return true;
  // Whisper output is closer to auto captions than to human-authored ones.
  const ai = pick(item, "is_ai_generated");
  if (typeof ai === "boolean" && ai) return true;
  if (typeof auto === "boolean") return auto;

  const kind = str(pick(item, "subType", "kind", "captionType")).toLowerCase();
  if (kind.includes("manual")) return false;
  return kind.includes("auto") || kind.includes("asr") || kind.includes("ai") || kind.includes("whisper");
}

export const apifyProvider: TranscriptProvider = {
  name: "apify",

  async fetch(videoId: string): Promise<TranscriptResult> {
    const token = process.env.APIFY_TOKEN;
    if (!token) {
      logInternalError("transcript", "TRANSCRIPT_FETCH_FAILED", "APIFY_TOKEN is not configured");
      return { ok: false, errorCode: "TRANSCRIPT_FETCH_FAILED" };
    }

    const actor = process.env.APIFY_TRANSCRIPT_ACTOR || DEFAULT_ACTOR;
    const url = `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${token}&timeout=${RUN_TIMEOUT_SECONDS}`;

    const input = {
      startUrls: [{ url: `https://www.youtube.com/watch?v=${videoId}` }],
      languages: ["en"],
      // Human captions preferred, auto-generated accepted — the priority order
      // in spec §8, expressed in this actor's vocabulary.
      subType: "both",
      outputFormats: ["json", "text"],
      wordLevel: false,
      // Whisper fallback stays behind our own flag: it is roughly ten times the
      // cost of reading captions, and the MVP deliberately doesn't depend on it.
      enableAiFallback: ENABLE_AUDIO_TRANSCRIPTION_FALLBACK,
      maxAiMinutes: ENABLE_AUDIO_TRANSCRIPTION_FALLBACK ? Math.ceil(MAX_VIDEO_SECONDS / 60) : 0,
      skipAiFallbackIfLongerThan: Math.ceil(MAX_VIDEO_SECONDS / 60),
    };

    let items: Unknown[];
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout((RUN_TIMEOUT_SECONDS + 20) * 1000),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        logInternalError(
          "transcript",
          "TRANSCRIPT_FETCH_FAILED",
          `apify HTTP ${res.status}: ${body.slice(0, 300)}`
        );
        return { ok: false, errorCode: "TRANSCRIPT_FETCH_FAILED" };
      }

      const data = await res.json();
      items = Array.isArray(data) ? data : [];
    } catch (e) {
      logInternalError("transcript", "TRANSCRIPT_FETCH_FAILED", e);
      return { ok: false, errorCode: "TRANSCRIPT_FETCH_FAILED" };
    }

    if (items.length === 0) return { ok: false, errorCode: "NO_TRANSCRIPT" };

    const item = items[0];

    // The actor reports its own failures in-band rather than via HTTP status.
    const errorCode = str(pick(item, "error_code", "errorCode", "error"));
    if (errorCode && !findPlainText(item) && findSegments(item).length === 0) {
      const noCaptions = /no.?(caption|transcript|subtitle)/i.test(errorCode);
      logInternalError("transcript", "TRANSCRIPT_FETCH_FAILED", `apify item error: ${errorCode}`);
      return { ok: false, errorCode: noCaptions ? "NO_TRANSCRIPT" : "TRANSCRIPT_FETCH_FAILED" };
    }

    const auto = isAutoGenerated(item);
    const language = str(pick(item, "language", "languageCode", "lang")) || "en";

    const segments = findSegments(item);
    if (segments.length > 0) {
      return {
        ok: true,
        transcript: buildTranscript(segments, {
          kind: auto ? "asr" : undefined,
          languageCode: language,
        }),
      };
    }

    // No timestamps available — usable, but timestamped output degrades to
    // none, so downstream links simply won't appear (spec §24).
    const plain = findPlainText(item);
    if (!plain) return { ok: false, errorCode: "NO_TRANSCRIPT" };

    const words = plain.split(/\s+/).filter(Boolean);
    const transcript: Transcript = {
      segments: [{ start: 0, duration: 0, text: plain }],
      source: auto ? "auto" : "human",
      languageCode: language,
      text: plain,
      charCount: plain.length,
      wordCount: words.length,
    };
    return { ok: true, transcript };
  },
};
