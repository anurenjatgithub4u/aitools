// Pipeline orchestration (spec §14, §17, §18, §30).
//
// The important structural decision, from spec §18: video processing and
// output generation are separate operations with separate costs.
//
//   analyzeVideo()   transcript → chunks → knowledge → cached   (expensive)
//   produceOutput()  cached knowledge → one output              (cheap)
//
// Switching output type re-runs only the second. That is the whole reason the
// knowledge representation exists.

import crypto from "crypto";
import connectDB from "@/lib/db";
import { resolvedModelName } from "@/lib/ai";
import { YoutubeVideoKnowledge } from "@/models/YoutubeVideoKnowledge";
import type {
  ContentClassification,
  GeneratedOutput,
  JobStatus,
  KnowledgeRepresentation,
  OutputType,
  ProcessingMetrics,
  Transcript,
  TranscriptQuality,
  VideoErrorCode,
  VideoMetadata,
} from "./types";
import { CHARS_PER_TOKEN_ESTIMATE, SINGLE_PASS_CHAR_LIMIT } from "./config";
import { chunkTranscript } from "./chunk";
import { classifyContent, extractChunks, extractSingleChunk, mergeKnowledge } from "./knowledge";
import { assessTranscriptQuality } from "./quality";
import { fetchTranscript } from "./transcript";
import { generateOutput } from "./outputs";
import { logInternalError } from "./errors";

/** Stable fingerprint of a transcript, so corrected captions invalidate the
 *  cache while an identical refetch reuses it (spec §17). */
export function transcriptHash(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 32);
}

export interface CachedKnowledge {
  knowledge: KnowledgeRepresentation;
  transcriptHash: string;
  transcriptStatus: string;
  contentType: string;
  outputs: Array<{ outputType: string; content: string; targetModel?: string }>;
}

/** Cache lookup by video ID (spec §17). */
export async function findCachedKnowledge(videoId: string): Promise<CachedKnowledge | null> {
  try {
    await connectDB();
    const doc = await YoutubeVideoKnowledge.findOne({ videoId }).lean();
    if (!doc?.knowledge) return null;
    return {
      knowledge: doc.knowledge as KnowledgeRepresentation,
      transcriptHash: doc.transcriptHash,
      transcriptStatus: doc.transcriptStatus,
      contentType: doc.contentType,
      outputs: (doc.outputs ?? []).map((o) => ({
        outputType: o.outputType,
        content: o.content,
        targetModel: o.targetModel,
      })),
    };
  } catch (e) {
    // A cache miss and a cache outage should behave the same way: proceed.
    logInternalError("cache", "UNKNOWN", e);
    return null;
  }
}

export type AnalyzeOutcome =
  | {
      ok: true;
      knowledge: KnowledgeRepresentation;
      quality: TranscriptQuality;
      classification: ContentClassification;
      cacheHit: boolean;
      metrics: Partial<ProcessingMetrics>;
    }
  | { ok: false; errorCode: VideoErrorCode; quality?: TranscriptQuality };

export interface AnalyzeOptions {
  /** Set when the user has explicitly accepted a POOR-quality transcript. */
  acceptPoorQuality?: boolean;
  onStage?: (stage: JobStatus, detail?: { done: number; total: number }) => void;
}

/**
 * The expensive path: transcript → knowledge, with caching either side.
 *
 * Assumes metadata validation (including the duration limit) has already
 * passed — this function is never the first line of defence.
 */
export async function analyzeVideo(
  metadata: VideoMetadata,
  options: AnalyzeOptions = {}
): Promise<AnalyzeOutcome> {
  const startedAt = Date.now();
  const { onStage } = options;

  onStage?.("FETCHING_TRANSCRIPT");
  const transcriptResult = await fetchTranscript(metadata.videoId);
  if (!transcriptResult.ok) {
    return { ok: false, errorCode: transcriptResult.errorCode };
  }
  const transcript: Transcript = transcriptResult.transcript;

  onStage?.("CHECKING_TRANSCRIPT");
  const quality = assessTranscriptQuality(transcript);

  // UNUSABLE is a hard stop — generating from it would mean inventing content
  // (spec §10).
  if (quality.rating === "UNUSABLE") {
    return { ok: false, errorCode: "TRANSCRIPT_UNUSABLE", quality };
  }
  // POOR requires explicit user consent, gathered before this call.
  if (quality.rating === "POOR" && !options.acceptPoorQuality) {
    return { ok: false, errorCode: "TRANSCRIPT_UNUSABLE", quality };
  }

  const hash = transcriptHash(transcript.text);

  // Cache hit only counts when the transcript itself is unchanged.
  const cached = await findCachedKnowledge(metadata.videoId);
  if (cached && cached.transcriptHash === hash) {
    return {
      ok: true,
      knowledge: cached.knowledge,
      quality,
      classification: {
        contentType: cached.knowledge.contentType,
        confidence: 1,
        lowInformation: false,
        reason: "Loaded from cache.",
      },
      cacheHit: true,
      metrics: { cacheHit: true, processingMs: Date.now() - startedAt },
    };
  }

  onStage?.("EXTRACTING_KNOWLEDGE");
  const classification = await classifyContent(metadata.title, metadata.channelTitle, transcript);

  const chunks = chunkTranscript(transcript);
  if (chunks.length === 0) return { ok: false, errorCode: "NO_TRANSCRIPT", quality };

  let knowledge: KnowledgeRepresentation;
  try {
    // Short transcripts skip the map-reduce entirely — one strong call instead
    // of N fast calls plus a merge (spec §14).
    if (chunks.length === 1 && transcript.charCount <= SINGLE_PASS_CHAR_LIMIT) {
      knowledge = await extractSingleChunk(
        chunks[0],
        transcript,
        classification.contentType,
        metadata.title
      );
    } else {
      const { states, partials } = await extractChunks(
        chunks,
        transcript,
        classification.contentType,
        metadata.title,
        (done, total) => onStage?.("EXTRACTING_KNOWLEDGE", { done, total })
      );

      // Partial success is acceptable — losing one section of an hour-long
      // video is better than failing the whole request. Total failure is not.
      if (partials.length === 0) {
        logInternalError("pipeline", "AI_UNAVAILABLE", `all ${states.length} chunks failed`);
        return { ok: false, errorCode: "AI_UNAVAILABLE", quality };
      }

      knowledge = await mergeKnowledge(metadata.title, classification.contentType, partials);

      const failed = states.filter((s) => s.status === "failed").length;
      if (failed > 0) {
        knowledge.gaps = [
          ...knowledge.gaps,
          `${failed} section${failed > 1 ? "s" : ""} of the video could not be processed.`,
        ];
      }
    }
  } catch (e) {
    logInternalError("pipeline", "AI_UNAVAILABLE", e);
    return { ok: false, errorCode: "AI_UNAVAILABLE", quality };
  }

  await cacheKnowledge(metadata, transcript, hash, quality, knowledge);

  return {
    ok: true,
    knowledge,
    quality,
    classification,
    cacheHit: false,
    metrics: {
      videoId: metadata.videoId,
      videoDurationSeconds: metadata.durationSeconds,
      transcriptChars: transcript.charCount,
      inputTokensEstimate: Math.round(transcript.charCount / CHARS_PER_TOKEN_ESTIMATE),
      processingMs: Date.now() - startedAt,
      modelUsed: resolvedModelName("strong"),
      cacheHit: false,
      contentType: classification.contentType,
    },
  };
}

async function cacheKnowledge(
  metadata: VideoMetadata,
  transcript: Transcript,
  hash: string,
  quality: TranscriptQuality,
  knowledge: KnowledgeRepresentation
): Promise<void> {
  try {
    await connectDB();
    await YoutubeVideoKnowledge.findOneAndUpdate(
      { videoId: metadata.videoId },
      {
        $set: {
          videoId: metadata.videoId,
          title: metadata.title,
          channelTitle: metadata.channelTitle,
          durationSeconds: metadata.durationSeconds,
          thumbnailUrl: metadata.thumbnailUrl,
          transcriptHash: hash,
          transcriptStatus: quality.rating,
          transcriptChars: transcript.charCount,
          transcriptSource: transcript.source,
          contentType: knowledge.contentType,
          knowledge,
          modelUsed: resolvedModelName("strong"),
          // A changed transcript invalidates previously generated outputs.
          outputs: [],
        },
      },
      { upsert: true }
    );
  } catch (e) {
    // Caching is an optimisation. Failing to write it must not fail the
    // request the user is waiting on.
    logInternalError("cache-write", "UNKNOWN", e);
  }
}

/**
 * The cheap path: one output from already-extracted knowledge (spec §18).
 *
 * Checks the per-video output cache first, so asking for Smart Notes twice
 * costs one model call, not two.
 */
export async function produceOutput(
  videoId: string,
  durationSeconds: number,
  outputType: OutputType,
  knowledge: KnowledgeRepresentation
): Promise<GeneratedOutput> {
  const cached = await findCachedKnowledge(videoId);
  const hit = cached?.outputs.find((o) => o.outputType === outputType);
  if (hit) {
    return {
      outputType,
      content: hit.content,
      targetModel: hit.targetModel as GeneratedOutput["targetModel"],
      generatedAt: new Date().toISOString(),
    };
  }

  const output = await generateOutput(outputType, knowledge, { videoId, durationSeconds });

  try {
    await connectDB();
    await YoutubeVideoKnowledge.updateOne(
      { videoId },
      {
        $push: {
          outputs: {
            outputType: output.outputType,
            content: output.content,
            targetModel: output.targetModel,
            generatedAt: new Date(),
          },
        },
      }
    );
  } catch (e) {
    logInternalError("cache-output", "UNKNOWN", e);
  }

  return output;
}

/**
 * Emits one structured metrics line per processed video (spec §30).
 *
 * Logged rather than stored: a log aggregator is the right home for this, and
 * writing a metrics document per request would cost more than it's worth
 * before we know the traffic shape.
 */
export function recordMetrics(metrics: ProcessingMetrics): void {
  console.log("[youtube-study:metrics]", JSON.stringify(metrics));
}

/**
 * Rough per-video cost estimate for the economics dashboard (spec §30).
 *
 * Deliberately provider-agnostic and approximate — its purpose is to make the
 * relative cost of cache hits versus misses visible, not to reconcile a bill.
 * Update the rates when the configured models change.
 */
export function estimateCostUsd(inputTokens: number, outputTokens: number): number {
  const INPUT_PER_MILLION = 0.15;
  const OUTPUT_PER_MILLION = 0.6;
  const cost = (inputTokens / 1_000_000) * INPUT_PER_MILLION + (outputTokens / 1_000_000) * OUTPUT_PER_MILLION;
  return Number(cost.toFixed(6));
}
