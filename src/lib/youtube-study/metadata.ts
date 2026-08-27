// Video metadata via the YouTube Data API v3 (spec §6, §7, §32).
//
// This module is the security boundary for duration. The frontend may display
// a duration, but only the value fetched here is ever used to decide whether
// processing is allowed — a client claiming "30 minutes" is ignored entirely.
//
// One videos.list call costs 1 unit against a 10,000/day free quota and
// returns everything we need: title, channel, duration, thumbnail, privacy and
// upload status, live-stream details, and region restrictions.

import type { VideoMetadata, VideoErrorCode } from "./types";
import { MAX_VIDEO_SECONDS, MIN_VIDEO_SECONDS } from "./config";
import { logInternalError } from "./errors";

const API_URL = "https://www.googleapis.com/youtube/v3/videos";

export type MetadataResult =
  | { ok: true; metadata: VideoMetadata }
  | { ok: false; errorCode: VideoErrorCode; durationSeconds?: number };

/**
 * Parses an ISO 8601 duration (PT1H24M32S) into seconds.
 *
 * YouTube returns durations in this format and omits zero components, so
 * "PT48M32S", "PT2H" and "PT45S" are all valid inputs.
 */
export function parseIsoDuration(iso: string): number {
  const match = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso || "");
  if (!match) return 0;
  const [, d, h, m, s] = match;
  return (
    Number(d || 0) * 86400 + Number(h || 0) * 3600 + Number(m || 0) * 60 + Number(s || 0)
  );
}

interface YouTubeApiItem {
  id: string;
  snippet?: {
    title?: string;
    channelTitle?: string;
    publishedAt?: string;
    liveBroadcastContent?: string;
    thumbnails?: Record<string, { url?: string }>;
  };
  contentDetails?: {
    duration?: string;
    caption?: string;
    contentRating?: { ytRating?: string };
    regionRestriction?: { blocked?: string[]; allowed?: string[] };
  };
  status?: {
    privacyStatus?: string;
    uploadStatus?: string;
  };
  liveStreamingDetails?: {
    actualEndTime?: string;
    actualStartTime?: string;
  };
}

function pickThumbnail(thumbs: Record<string, { url?: string }> | undefined, videoId: string): string {
  // Prefer the largest available; fall back to the predictable i.ytimg URL,
  // which exists for every public video.
  const preference = ["maxres", "standard", "high", "medium", "default"];
  for (const key of preference) {
    const url = thumbs?.[key]?.url;
    if (url) return url;
  }
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * Fetches and validates metadata for a video ID.
 *
 * Returns a specific error code for every unprocessable state rather than
 * throwing, so the route can map it straight to a user-facing message.
 */
export async function fetchVideoMetadata(videoId: string): Promise<MetadataResult> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    logInternalError("metadata", "METADATA_UNAVAILABLE", "YOUTUBE_API_KEY is not configured");
    return { ok: false, errorCode: "METADATA_UNAVAILABLE" };
  }

  const params = new URLSearchParams({
    id: videoId,
    key,
    part: "snippet,contentDetails,status,liveStreamingDetails",
  });

  let item: YouTubeApiItem | undefined;
  try {
    const res = await fetch(`${API_URL}?${params}`, {
      // Metadata is stable; let the platform cache briefly to soften bursts.
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      logInternalError("metadata", "METADATA_UNAVAILABLE", `HTTP ${res.status}: ${body.slice(0, 300)}`);
      return { ok: false, errorCode: "METADATA_UNAVAILABLE" };
    }

    const data = (await res.json()) as { items?: YouTubeApiItem[] };
    item = data.items?.[0];
  } catch (e) {
    logInternalError("metadata", "METADATA_UNAVAILABLE", e);
    return { ok: false, errorCode: "METADATA_UNAVAILABLE" };
  }

  // An empty items array is how the API reports deleted, private, or
  // non-existent videos — it does not 404.
  if (!item) return { ok: false, errorCode: "VIDEO_NOT_FOUND" };

  const privacy = item.status?.privacyStatus;
  if (privacy === "private") return { ok: false, errorCode: "VIDEO_PRIVATE" };

  const uploadStatus = item.status?.uploadStatus;
  if (uploadStatus === "deleted" || uploadStatus === "rejected") {
    return { ok: false, errorCode: "VIDEO_NOT_FOUND" };
  }

  // Age restriction surfaces as a content rating, not a status field.
  const ageRestricted = item.contentDetails?.contentRating?.ytRating === "ytAgeRestricted";
  if (ageRestricted) return { ok: false, errorCode: "VIDEO_AGE_RESTRICTED" };

  // A blocked-region list that we can't evaluate per-user is treated as
  // unavailable, since our server may well be in a blocked region.
  const blocked = item.contentDetails?.regionRestriction?.blocked ?? [];
  const allowed = item.contentDetails?.regionRestriction?.allowed;
  const regionBlocked = blocked.length > 0 || (Array.isArray(allowed) && allowed.length > 0);

  const broadcast = item.snippet?.liveBroadcastContent;
  if (broadcast === "live") return { ok: false, errorCode: "VIDEO_IS_LIVE" };
  if (broadcast === "upcoming") return { ok: false, errorCode: "VIDEO_IS_LIVE" };

  const durationSeconds = parseIsoDuration(item.contentDetails?.duration || "");

  // A live stream still in progress reports a zero duration.
  if (durationSeconds === 0 && item.liveStreamingDetails && !item.liveStreamingDetails.actualEndTime) {
    return { ok: false, errorCode: "VIDEO_IS_LIVE" };
  }

  // ---- the hard limit (spec §5) --------------------------------------------
  // Enforced here, before any transcript fetch or model call happens. Note the
  // comparison is strictly greater-than, so a video of exactly 60:00 passes.
  if (durationSeconds > MAX_VIDEO_SECONDS) {
    return { ok: false, errorCode: "VIDEO_TOO_LONG", durationSeconds };
  }
  if (durationSeconds > 0 && durationSeconds < MIN_VIDEO_SECONDS) {
    return { ok: false, errorCode: "VIDEO_TOO_SHORT", durationSeconds };
  }
  if (durationSeconds === 0) {
    return { ok: false, errorCode: "METADATA_UNAVAILABLE" };
  }

  const liveStatus: VideoMetadata["liveStatus"] = item.liveStreamingDetails?.actualEndTime
    ? "completed"
    : "none";

  return {
    ok: true,
    metadata: {
      videoId: item.id || videoId,
      title: item.snippet?.title?.trim() || "Untitled video",
      channelTitle: item.snippet?.channelTitle?.trim() || "Unknown channel",
      durationSeconds,
      thumbnailUrl: pickThumbnail(item.snippet?.thumbnails, videoId),
      publishedAt: item.snippet?.publishedAt || null,
      liveStatus,
      ageRestricted: false,
      regionBlocked,
      captionsDeclared: item.contentDetails?.caption === "true",
    },
  };
}
