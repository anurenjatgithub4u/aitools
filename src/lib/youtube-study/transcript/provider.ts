// The transcript provider contract (spec §8).
//
// YouTube has no official API for reading captions of videos you don't own —
// the Data API's captions.download endpoint requires the video owner's OAuth
// token. Every practical option is therefore a trade-off between cost and
// reliability, so this file defines the seam and the concrete providers live
// beside it.
//
// Swapping providers is a one-line change in resolveProvider(); nothing
// upstream in the pipeline knows which one is in use.

import type { Transcript, TranscriptSource, VideoErrorCode } from "../types";

export type TranscriptResult =
  | { ok: true; transcript: Transcript }
  | { ok: false; errorCode: VideoErrorCode };

export interface TranscriptProvider {
  /** Stable identifier, recorded in metrics so we can compare providers. */
  readonly name: string;

  /**
   * Fetches the best available transcript for a video.
   *
   * Implementations must honour the priority order in spec §8:
   *   1. human-created captions
   *   2. YouTube-generated captions
   *   3. any other supported source
   *
   * Must return NO_TRANSCRIPT (not an empty transcript) when nothing usable
   * exists, so the caller can show the honest "we couldn't find one" message
   * rather than generating from thin air.
   */
  fetch(videoId: string): Promise<TranscriptResult>;
}

/** Ranks caption tracks by the spec's preference order. */
export function scoreTrack(track: { kind?: string; languageCode?: string }): number {
  // "asr" marks automatic speech recognition; anything else is human-authored.
  const isAuto = track.kind === "asr";
  const isEnglish = (track.languageCode || "").toLowerCase().startsWith("en");
  let score = isAuto ? 10 : 20;
  if (isEnglish) score += 5;
  return score;
}

export function sourceForTrack(kind?: string): TranscriptSource {
  return kind === "asr" ? "auto" : "human";
}
