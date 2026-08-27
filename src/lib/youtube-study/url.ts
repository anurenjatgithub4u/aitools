// YouTube URL parsing and normalisation (spec §4).
//
// The goal is to identify *what kind* of YouTube resource the user pasted, so
// a channel URL produces "that's a channel, paste a video" rather than a
// generic failure. Video IDs are extracted and rebuilt into a canonical URL —
// user input is never echoed back into a fetch.

import type { ParsedYouTubeUrl, YouTubeResourceKind } from "./types";

/** YouTube video IDs are 11 characters of URL-safe base64. Anything else is
 *  not an ID, however much it looks like one. */
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);

function stripHost(host: string): string {
  return host.toLowerCase().replace(/^www\./, "");
}

/**
 * Parses any YouTube URL into a resource kind plus, for videos, the ID.
 *
 * Returns a discriminated result rather than throwing: callers need the
 * specific `kind` to produce a useful message, and an unparseable string is an
 * expected input here, not an exceptional one.
 */
export function parseYouTubeUrl(raw: string): ParsedYouTubeUrl {
  const input = (raw || "").trim();
  if (!input) return { ok: false, kind: "unknown", errorCode: "EMPTY_INPUT" };

  // Accept bare "youtube.com/watch?v=..." without a scheme.
  const withScheme = /^https?:\/\//i.test(input) ? input : `https://${input}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return { ok: false, kind: "unknown", errorCode: "NOT_A_URL" };
  }

  const host = stripHost(url.hostname);
  if (!YOUTUBE_HOSTS.has(host) && !YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) {
    return { ok: false, kind: "unknown", errorCode: "NOT_YOUTUBE" };
  }

  const path = url.pathname.replace(/\/+$/, "");
  const segments = path.split("/").filter(Boolean);

  // A playlist parameter on a watch URL is fine — we process the single video
  // and ignore the list. A bare /playlist URL is not (spec §4).
  if (segments[0] === "playlist") {
    return { ok: false, kind: "playlist", errorCode: "PLAYLIST_UNSUPPORTED" };
  }

  if (segments[0] === "results" || url.searchParams.has("search_query")) {
    return { ok: false, kind: "search", errorCode: "SEARCH_UNSUPPORTED" };
  }

  // Channels appear as /@handle, /c/name, /channel/UC..., /user/name.
  if (
    segments[0]?.startsWith("@") ||
    ["channel", "c", "user"].includes(segments[0] ?? "")
  ) {
    return { ok: false, kind: "channel", errorCode: "CHANNEL_UNSUPPORTED" };
  }

  // youtu.be/VIDEO_ID
  if (host === "youtu.be") {
    const id = segments[0];
    return id && VIDEO_ID_PATTERN.test(id)
      ? videoResult(id, "video")
      : { ok: false, kind: "unknown", errorCode: "NOT_A_VIDEO" };
  }

  // /shorts/VIDEO_ID — a normal video with a different player, so processable.
  if (segments[0] === "shorts") {
    const id = segments[1];
    return id && VIDEO_ID_PATTERN.test(id)
      ? videoResult(id, "shorts")
      : { ok: false, kind: "unknown", errorCode: "NOT_A_VIDEO" };
  }

  // /embed/VIDEO_ID and /v/VIDEO_ID are legacy player URLs pointing at a video.
  if (segments[0] === "embed" || segments[0] === "v") {
    const id = segments[1];
    return id && VIDEO_ID_PATTERN.test(id)
      ? videoResult(id, "video")
      : { ok: false, kind: "unknown", errorCode: "NOT_A_VIDEO" };
  }

  // /watch?v=VIDEO_ID
  if (segments[0] === "watch") {
    const id = url.searchParams.get("v");
    return id && VIDEO_ID_PATTERN.test(id)
      ? videoResult(id, "video")
      : { ok: false, kind: "unknown", errorCode: "NOT_A_VIDEO" };
  }

  // Bare youtube.com or youtube.com/feed/... — the home page or a feed.
  if (segments.length === 0 || segments[0] === "feed") {
    return { ok: false, kind: "home", errorCode: "NOT_A_VIDEO" };
  }

  return { ok: false, kind: "unknown", errorCode: "NOT_A_VIDEO" };
}

function videoResult(videoId: string, kind: YouTubeResourceKind): ParsedYouTubeUrl {
  return {
    ok: true,
    kind,
    videoId,
    normalizedUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

/** Builds a deep link to a moment in a video (spec §24). */
export function timestampUrl(videoId: string, seconds: number): string {
  const t = Math.max(0, Math.floor(seconds));
  return `https://www.youtube.com/watch?v=${videoId}&t=${t}s`;
}

/** Formats seconds as h:mm:ss or m:ss, matching how YouTube itself displays
 *  durations. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

/** Longer-form duration for error messages: "1h 24m".
 *
 *  Truncates rather than rounds, so a 1h24m32s video is reported as "1h 24m"
 *  and matches what YouTube shows the user. Rounding up would overstate the
 *  duration in exactly the message that tells someone their video is too long.
 */
export function formatDurationHuman(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  // Sub-minute durations would otherwise render as a bare "0m".
  return minutes > 0 ? `${minutes}m` : `${s}s`;
}
