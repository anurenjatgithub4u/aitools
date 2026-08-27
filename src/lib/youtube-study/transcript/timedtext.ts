// Free transcript provider using YouTube's own timedtext endpoint.
//
// IMPORTANT OPERATIONAL NOTE
// --------------------------
// This is not a documented public API. It is the endpoint the YouTube web
// player itself calls, and it is what every "youtube-transcript" npm package
// wraps. Two consequences worth knowing before this reaches production:
//
//   1. It can change without notice. If transcripts start failing across the
//      board, this file is the first place to look.
//   2. YouTube frequently blocks datacenter IP ranges. This provider is
//      reliable from a local machine and materially less so from serverless
//      platforms. If deployment shows a high TRANSCRIPT_FETCH_FAILED rate,
//      that is the cause, and the fix is a paid provider behind the same
//      interface — not more retries here.
//
// It is the default because it costs nothing and needs no key, which is the
// right trade for validating whether people use the feature at all.

import type { Transcript, TranscriptSegment } from "../types";
import { MAX_TRANSCRIPT_CHARS } from "../config";
import { logInternalError } from "../errors";
import { scoreTrack, sourceForTrack, type TranscriptProvider, type TranscriptResult } from "./provider";

// A browser UA materially improves the odds of a usable response.
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

interface CaptionTrack {
  baseUrl: string;
  languageCode?: string;
  kind?: string;
  name?: { simpleText?: string };
}

/** Decodes the XML entities that appear in timedtext payloads. */
function decodeEntities(text: string): string {
  return text
    .replace(/&amp;#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/** Pulls the caption track list out of the watch page's embedded player JSON. */
function extractTracks(html: string): CaptionTrack[] {
  const marker = '"captionTracks":';
  const start = html.indexOf(marker);
  if (start === -1) return [];

  // The value is a JSON array; walk it to find the matching bracket rather
  // than regexing, because track names can contain escaped brackets.
  const arrayStart = html.indexOf("[", start);
  if (arrayStart === -1) return [];

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = arrayStart; i < html.length; i++) {
    const ch = html[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') inString = !inString;
    if (inString) continue;
    if (ch === "[") depth++;
    if (ch === "]") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(arrayStart, i + 1)) as CaptionTrack[];
        } catch {
          return [];
        }
      }
    }
  }
  return [];
}

/** Parses timedtext XML into timestamped segments. */
function parseTimedText(xml: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  const pattern = /<text([^>]*)>([\s\S]*?)<\/text>/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(xml)) !== null) {
    const attrs = match[1];
    const start = Number(/\bstart="([\d.]+)"/.exec(attrs)?.[1] ?? NaN);
    const duration = Number(/\bdur="([\d.]+)"/.exec(attrs)?.[1] ?? 0);

    const text = decodeEntities(match[2])
      .replace(/<[^>]+>/g, "") // inline formatting tags
      .replace(/\s+/g, " ")
      .trim();

    if (!text || Number.isNaN(start)) continue;
    segments.push({ start, duration, text });
  }
  return segments;
}

export const timedTextProvider: TranscriptProvider = {
  name: "timedtext",

  async fetch(videoId: string): Promise<TranscriptResult> {
    let html: string;
    try {
      const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
      });
      if (!res.ok) {
        logInternalError("transcript", "TRANSCRIPT_FETCH_FAILED", `watch page HTTP ${res.status}`);
        return { ok: false, errorCode: "TRANSCRIPT_FETCH_FAILED" };
      }
      html = await res.text();
    } catch (e) {
      logInternalError("transcript", "TRANSCRIPT_FETCH_FAILED", e);
      return { ok: false, errorCode: "TRANSCRIPT_FETCH_FAILED" };
    }

    const tracks = extractTracks(html);
    if (tracks.length === 0) {
      // No caption tracks at all is a legitimate "no transcript" answer, not
      // an infrastructure failure — the distinction matters for the message
      // the user sees and for our metrics.
      return { ok: false, errorCode: "NO_TRANSCRIPT" };
    }

    // Spec §8 priority: human captions first, then auto, English preferred.
    const best = [...tracks].sort((a, b) => scoreTrack(b) - scoreTrack(a))[0];
    if (!best?.baseUrl) return { ok: false, errorCode: "NO_TRANSCRIPT" };

    let xml: string;
    try {
      const res = await fetch(decodeEntities(best.baseUrl), {
        headers: { "User-Agent": UA },
      });
      if (!res.ok) {
        logInternalError("transcript", "TRANSCRIPT_FETCH_FAILED", `timedtext HTTP ${res.status}`);
        return { ok: false, errorCode: "TRANSCRIPT_FETCH_FAILED" };
      }
      xml = await res.text();
    } catch (e) {
      logInternalError("transcript", "TRANSCRIPT_FETCH_FAILED", e);
      return { ok: false, errorCode: "TRANSCRIPT_FETCH_FAILED" };
    }

    const segments = parseTimedText(xml);
    if (segments.length === 0) {
      // We found caption tracks listed on the page but couldn't retrieve their
      // contents. That is an extraction failure, NOT "this video has no
      // captions" — reporting it as NO_TRANSCRIPT would tell the user their
      // video is unsuitable when the problem is on our side, and would corrupt
      // the very metric used to decide whether a paid provider is worth it.
      logInternalError(
        "transcript",
        "TRANSCRIPT_FETCH_FAILED",
        `${tracks.length} track(s) listed but caption body was empty (${xml.length} bytes)`
      );
      return { ok: false, errorCode: "TRANSCRIPT_FETCH_FAILED" };
    }

    return { ok: true, transcript: buildTranscript(segments, best) };
  },
};

/** Assembles segments into the Transcript shape, applying the size ceiling. */
export function buildTranscript(
  segments: TranscriptSegment[],
  track: { kind?: string; languageCode?: string }
): Transcript {
  let text = segments.map((s) => s.text).join(" ").replace(/\s+/g, " ").trim();

  // Truncate at the ceiling rather than rejecting: a pathological caption
  // track still usually has usable content at the start (spec §16).
  let kept = segments;
  if (text.length > MAX_TRANSCRIPT_CHARS) {
    kept = [];
    let running = 0;
    for (const segment of segments) {
      if (running + segment.text.length > MAX_TRANSCRIPT_CHARS) break;
      kept.push(segment);
      running += segment.text.length + 1;
    }
    text = kept.map((s) => s.text).join(" ").replace(/\s+/g, " ").trim();
  }

  return {
    segments: kept,
    source: sourceForTrack(track.kind),
    languageCode: track.languageCode || "unknown",
    text,
    charCount: text.length,
    wordCount: text ? text.split(/\s+/).length : 0,
  };
}
