// POST /api/youtube-study/generate — starts an analysis job (spec §19).
//
// Returns a jobId immediately rather than holding the HTTP request open for
// the whole pipeline. An hour-long transcript can take longer than a
// serverless function's response budget, and a progress UI needs something to
// poll (spec §20).
//
// Quota is reserved BEFORE the work starts, and refunded if the job fails
// before producing anything.

import { NextRequest, NextResponse, after } from "next/server";
import crypto from "crypto";
import connectDB from "@/lib/db";
import { YoutubeJob } from "@/models/YoutubeJob";
import { parseYouTubeUrl } from "@/lib/youtube-study/url";
import { fetchVideoMetadata } from "@/lib/youtube-study/metadata";
import { analyzeVideo, produceOutput, findCachedKnowledge, estimateCostUsd, recordMetrics } from "@/lib/youtube-study/pipeline";
import { isMvpOutput } from "@/lib/youtube-study/outputs";
import { logInternalError, tooLongError, userError } from "@/lib/youtube-study/errors";
import { consume, refund, hasJobCapacity, clientIdentifier, ownerKey, type Identity } from "@/lib/youtube-study/rate-limit";
import { verifyFirebaseIdToken } from "@/lib/pdf-study/verify-auth";
import { CHARS_PER_TOKEN_ESTIMATE } from "@/lib/youtube-study/config";
import type { JobStatus, OutputType, VideoErrorCode } from "@/lib/youtube-study/types";

export const runtime = "nodejs";
export const maxDuration = 300;

function fail(code: VideoErrorCode, durationSeconds?: number) {
  const error =
    code === "VIDEO_TOO_LONG" && durationSeconds ? tooLongError(durationSeconds) : userError(code);
  return NextResponse.json(
    { ok: false, errorCode: error.code, error: error.message, hint: error.hint, action: error.action },
    { status: error.status }
  );
}

async function setStatus(jobId: string, status: JobStatus, extra: Record<string, unknown> = {}) {
  try {
    await YoutubeJob.updateOne({ jobId }, { $set: { status, ...extra, updatedAt: new Date() } });
  } catch (e) {
    logInternalError("job", "UNKNOWN", e);
  }
}

export async function POST(req: NextRequest) {
  let body: {
    url?: string;
    outputType?: string;
    idToken?: string;
    requestId?: string;
    acceptPoorQuality?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return fail("NOT_A_URL");
  }

  // ---- validate the requested output --------------------------------------
  const outputType = body.outputType ?? "";
  if (!isMvpOutput(outputType)) {
    return NextResponse.json(
      { ok: false, errorCode: "UNKNOWN", error: "That output type isn't available yet." },
      { status: 400 }
    );
  }

  // ---- re-validate the URL and metadata server-side (spec §32) -------------
  // The client already called /analyze, but we never trust that it did, or
  // that what it sends back matches what it was told.
  const parsed = parseYouTubeUrl(body.url ?? "");
  if (!parsed.ok || !parsed.videoId) return fail(parsed.errorCode ?? "NOT_A_VIDEO");

  const meta = await fetchVideoMetadata(parsed.videoId);
  if (!meta.ok) return fail(meta.errorCode, meta.durationSeconds);

  // ---- identity, quota, concurrency ---------------------------------------
  const uid = await verifyFirebaseIdToken(body.idToken).catch(() => null);
  const identity: Identity = uid
    ? { tier: "authenticated", id: uid }
    : { tier: "anonymous", id: clientIdentifier(req.headers) };

  if (!(await hasJobCapacity(identity))) return fail("TOO_MANY_JOBS");

  // A cached video costs an output credit, not a video credit — the expensive
  // step is already paid for (spec §18, §27).
  const cachedBefore = await findCachedKnowledge(parsed.videoId);
  const meter = cachedBefore ? "output" : "video";

  const requestId = body.requestId || crypto.randomUUID();
  const quota = await consume(identity, meter, requestId);
  if (!quota.allowed) {
    return fail(quota.duplicate ? "RATE_LIMITED" : "QUOTA_EXCEEDED");
  }

  // ---- create the job record ----------------------------------------------
  const jobId = crypto.randomUUID();
  try {
    await connectDB();
    await YoutubeJob.create({
      jobId,
      videoId: parsed.videoId,
      ownerKey: ownerKey(identity),
      status: "QUEUED",
      outputType: outputType as OutputType,
      startedAt: new Date(),
    });
  } catch (e) {
    logInternalError("job-create", "UNKNOWN", e);
    await refund(identity, meter);
    return fail("UNKNOWN");
  }

  // ---- run the pipeline after the response is sent -------------------------
  // Next's after() keeps the work alive past the response without holding the
  // client's connection open.
  after(async () => {
    const startedAt = Date.now();
    try {
      await setStatus(jobId, "VALIDATING");

      const outcome = await analyzeVideo(meta.metadata, {
        acceptPoorQuality: body.acceptPoorQuality,
        onStage: (stage, detail) =>
          setStatus(jobId, stage, detail ? { chunksDone: detail.done, chunksTotal: detail.total } : {}),
      });

      if (!outcome.ok) {
        await refund(identity, meter);
        await setStatus(jobId, "FAILED", {
          errorCode: outcome.errorCode,
          finishedAt: new Date(),
        });
        return;
      }

      await setStatus(jobId, "GENERATING_OUTPUT");
      const output = await produceOutput(
        parsed.videoId!,
        meta.metadata.durationSeconds,
        outputType as OutputType,
        outcome.knowledge
      );

      await setStatus(jobId, "COMPLETED", {
        completedOutputType: output.outputType,
        finishedAt: new Date(),
      });

      const inputTokens = Math.round((outcome.metrics.transcriptChars ?? 0) / CHARS_PER_TOKEN_ESTIMATE);
      const outputTokens = Math.round(output.content.length / CHARS_PER_TOKEN_ESTIMATE);
      recordMetrics({
        videoId: parsed.videoId!,
        videoDurationSeconds: meta.metadata.durationSeconds,
        transcriptChars: outcome.metrics.transcriptChars ?? 0,
        inputTokensEstimate: inputTokens,
        outputTokensEstimate: outputTokens,
        processingMs: Date.now() - startedAt,
        modelUsed: outcome.metrics.modelUsed ?? "unknown",
        cacheHit: outcome.cacheHit,
        status: "COMPLETED",
        contentType: outcome.classification.contentType,
        outputType: outputType as OutputType,
        estimatedCostUsd: estimateCostUsd(inputTokens, outputTokens),
      });
    } catch (e) {
      logInternalError("job-run", "UNKNOWN", e);
      await refund(identity, meter);
      await setStatus(jobId, "FAILED", {
        errorCode: "UNKNOWN",
        errorDetail: e instanceof Error ? e.message : String(e),
        finishedAt: new Date(),
      });
    }
  });

  return NextResponse.json({
    ok: true,
    jobId,
    status: "QUEUED" as JobStatus,
    videoId: parsed.videoId,
    cached: !!cachedBefore,
    quota: { used: quota.used, limit: quota.limit, meter },
  });
}
