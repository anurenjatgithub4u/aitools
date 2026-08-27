// Transcript provider resolution (spec §8, §9).
//
// Adding another provider means writing one file implementing
// TranscriptProvider and registering it below — nothing else in the pipeline
// changes.
//
// Default is "auto": try the free method first, fall back to Apify when it
// can't retrieve the captions. As of writing, YouTube returns empty caption
// bodies to ordinary clients, so in practice the free path fails and Apify
// serves the request — but the order costs nothing to keep, and means the
// paid call is skipped automatically if YouTube ever reopens the endpoint.

import { ENABLE_AUDIO_TRANSCRIPTION_FALLBACK, TRANSCRIPT_PROVIDER } from "../config";
import { logInternalError } from "../errors";
import type { TranscriptProvider, TranscriptResult } from "./provider";
import { timedTextProvider } from "./timedtext";
import { apifyProvider } from "./apify";

const PROVIDERS: Record<string, TranscriptProvider> = {
  timedtext: timedTextProvider,
  apify: apifyProvider,
};

/** Whether a paid provider is even available to fall back to. */
export function hasPaidProvider(): boolean {
  return !!process.env.APIFY_TOKEN;
}

/**
 * Fetches a transcript, with a free-first fallback chain.
 *
 * Only infrastructure failures fall through to the paid provider. A genuine
 * NO_TRANSCRIPT — the video really has no captions — is returned as-is,
 * because paying a second time to be told the same thing is waste.
 */
export async function fetchTranscript(videoId: string): Promise<TranscriptResult> {
  const configured = TRANSCRIPT_PROVIDER.toLowerCase();

  // An explicit choice is honoured exactly, with no fallback — useful for
  // testing one path in isolation.
  if (configured !== "auto" && PROVIDERS[configured]) {
    return runProvider(PROVIDERS[configured], videoId);
  }

  const free = await runProvider(timedTextProvider, videoId);
  if (free.ok) return free;

  if (free.errorCode === "TRANSCRIPT_FETCH_FAILED" && hasPaidProvider()) {
    console.log("[youtube-study:transcript] free extraction failed, falling back to apify");
    return runProvider(apifyProvider, videoId);
  }

  return free;
}

async function runProvider(provider: TranscriptProvider, videoId: string): Promise<TranscriptResult> {
  const result = await provider.fetch(videoId);

  if (!result.ok && result.errorCode === "NO_TRANSCRIPT" && ENABLE_AUDIO_TRANSCRIPTION_FALLBACK) {
    // The Apify provider performs its own Whisper fallback when the flag is
    // on; the free provider has no equivalent, so this only warns.
    if (provider.name !== "apify") {
      console.warn(
        "[youtube-study:transcript] audio fallback is enabled but the active provider cannot perform it"
      );
    }
  }

  if (!result.ok) {
    logInternalError("transcript", result.errorCode, `provider=${provider.name} video=${videoId}`);
  }
  return result;
}

export type { TranscriptProvider, TranscriptResult } from "./provider";
