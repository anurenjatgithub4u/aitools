// User-facing error messages (spec §7, §33).
//
// The rule: never leak a raw upstream error, and never fall back to "something
// went wrong" for a state we actually understand. Every known failure has a
// specific message and, where useful, a suggested next action.
//
// Technical detail is logged server-side via logInternalError() and never
// crosses the API boundary.

import type { VideoErrorCode } from "./types";
import { MAX_VIDEO_SECONDS } from "./config";
import { formatDurationHuman } from "./url";

export interface UserFacingError {
  code: VideoErrorCode;
  /** Shown as the headline. Complete sentence, no error jargon. */
  message: string;
  /** Optional second line explaining what the user can do next. */
  hint?: string;
  /** Label for the primary recovery action, when one makes sense. */
  action?: string;
  /** HTTP status to return alongside. */
  status: number;
}

const CATALOGUE: Record<VideoErrorCode, Omit<UserFacingError, "code">> = {
  EMPTY_INPUT: {
    message: "Paste a YouTube video URL to get started.",
    status: 400,
  },
  NOT_A_URL: {
    message: "That doesn't look like a link.",
    hint: "Paste a full YouTube video URL, for example https://www.youtube.com/watch?v=…",
    status: 400,
  },
  NOT_YOUTUBE: {
    message: "That link isn't from YouTube.",
    hint: "FindUrAI currently works with YouTube videos only.",
    status: 400,
  },
  NOT_A_VIDEO: {
    message: "This URL isn't a supported YouTube video.",
    hint: "Open the video on YouTube and copy the link from the address bar.",
    status: 400,
  },
  PLAYLIST_UNSUPPORTED: {
    message: "That's a playlist, not a single video.",
    hint: "Open one video from the playlist and paste its link instead.",
    status: 400,
  },
  CHANNEL_UNSUPPORTED: {
    message: "That's a channel, not a video.",
    hint: "Open a video on the channel and paste its link instead.",
    status: 400,
  },
  SEARCH_UNSUPPORTED: {
    message: "That's a YouTube search page, not a video.",
    hint: "Open the video you want and paste its link.",
    status: 400,
  },
  VIDEO_NOT_FOUND: {
    message: "This video is unavailable.",
    hint: "It may have been deleted or the link may be incorrect.",
    action: "Try Another Video",
    status: 404,
  },
  VIDEO_PRIVATE: {
    message: "This video is private and cannot be processed.",
    hint: "Only publicly viewable videos can be analysed.",
    action: "Try Another Video",
    status: 403,
  },
  VIDEO_REGION_BLOCKED: {
    message: "This video cannot be accessed from the current environment.",
    hint: "The uploader has restricted where it can be played.",
    action: "Try Another Video",
    status: 403,
  },
  VIDEO_AGE_RESTRICTED: {
    message: "This video cannot currently be processed.",
    hint: "Age-restricted videos aren't supported.",
    action: "Try Another Video",
    status: 403,
  },
  VIDEO_IS_LIVE: {
    message: "This video is currently live.",
    hint: "Try again after the livestream has ended and captions are available.",
    action: "Try Another Video",
    status: 409,
  },
  VIDEO_TOO_LONG: {
    // The caller appends the actual duration — see tooLongError().
    message: "This video is too long.",
    hint: `FindUrAI currently supports videos up to ${formatDurationHuman(MAX_VIDEO_SECONDS)}.`,
    action: "Choose Another Video",
    status: 413,
  },
  VIDEO_TOO_SHORT: {
    message: "This video is too short to analyse.",
    hint: "There isn't enough spoken content to build reliable notes from.",
    action: "Try Another Video",
    status: 400,
  },
  NO_TRANSCRIPT: {
    message: "We couldn't find a usable transcript for this video.",
    hint: "Without enough spoken content, FindUrAI can't reliably generate notes.",
    action: "Try Another Video",
    status: 422,
  },
  TRANSCRIPT_UNUSABLE: {
    message: "This video's transcript isn't usable.",
    hint: "It contains too little intelligible speech to summarise honestly.",
    action: "Try Another Video",
    status: 422,
  },
  TRANSCRIPT_FETCH_FAILED: {
    message: "We couldn't access the transcript for this video.",
    hint: "Try another public YouTube video with captions available.",
    action: "Try Another Video",
    status: 502,
  },
  METADATA_UNAVAILABLE: {
    message: "We couldn't load this video's details.",
    hint: "Check the link is correct, or try again in a moment.",
    status: 502,
  },
  QUOTA_EXCEEDED: {
    message: "You've reached your daily limit.",
    hint: "Sign in for a higher allowance, or come back tomorrow.",
    status: 429,
  },
  TOO_MANY_JOBS: {
    message: "You already have videos processing.",
    hint: "Wait for those to finish before starting another.",
    status: 429,
  },
  RATE_LIMITED: {
    message: "That's a lot of requests in a short time.",
    hint: "Give it a moment and try again.",
    status: 429,
  },
  AI_UNAVAILABLE: {
    message: "Our AI service isn't responding right now.",
    hint: "This is on our side — please try again shortly.",
    status: 503,
  },
  UNKNOWN: {
    message: "Something went wrong.",
    hint: "Please try again. If it keeps happening, try a different video.",
    status: 500,
  },
};

export function userError(code: VideoErrorCode): UserFacingError {
  return { code, ...(CATALOGUE[code] ?? CATALOGUE.UNKNOWN) };
}

/**
 * The too-long error, with the detected duration filled in so the user can see
 * exactly how far over the limit they are (spec §5).
 */
export function tooLongError(durationSeconds: number): UserFacingError {
  const base = userError("VIDEO_TOO_LONG");
  return {
    ...base,
    hint: `Video duration: ${formatDurationHuman(durationSeconds)} · Maximum supported: ${formatDurationHuman(
      MAX_VIDEO_SECONDS
    )}`,
  };
}

/**
 * Logs technical detail server-side. Anything passed here stays internal —
 * the client only ever receives the catalogue message above.
 */
export function logInternalError(scope: string, code: VideoErrorCode, detail: unknown): void {
  const message = detail instanceof Error ? detail.message : String(detail);
  console.error(`[youtube-study:${scope}] ${code}: ${message}`);
}
