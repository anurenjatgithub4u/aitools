// GET /api/youtube-study/job/[jobId] — job status for the progress UI
// (spec §19, §20).
//
// Returns only real backend stages. There is no synthetic percentage here: the
// UI shows which stages have actually completed, because a fake progress bar
// that sits at 90% is worse than an honest list of steps (spec §20).

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { YoutubeJob } from "@/models/YoutubeJob";
import { YoutubeVideoKnowledge } from "@/models/YoutubeVideoKnowledge";
import { userError } from "@/lib/youtube-study/errors";
import { JOB_STAGE_ORDER, type JobStatus } from "@/lib/youtube-study/types";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  try {
    await connectDB();
    const job = await YoutubeJob.findOne({ jobId }).lean();

    if (!job) {
      return NextResponse.json({ ok: false, error: "That job no longer exists." }, { status: 404 });
    }

    const stageIndex = JOB_STAGE_ORDER.indexOf(job.status as JobStatus);
    const stages = JOB_STAGE_ORDER.filter((s) => s !== "QUEUED").map((stage) => ({
      stage,
      state:
        job.status === "FAILED"
          ? stageIndex >= JOB_STAGE_ORDER.indexOf(stage)
            ? "done"
            : "pending"
          : JOB_STAGE_ORDER.indexOf(stage) < stageIndex
            ? "done"
            : JOB_STAGE_ORDER.indexOf(stage) === stageIndex
              ? "active"
              : "pending",
    }));

    if (job.status === "FAILED") {
      const error = userError(job.errorCode ?? "UNKNOWN");
      // errorDetail stays server-side (spec §33).
      return NextResponse.json({
        ok: true,
        jobId,
        status: job.status,
        stages,
        errorCode: error.code,
        error: error.message,
        hint: error.hint,
        action: error.action,
      });
    }

    if (job.status === "COMPLETED") {
      const doc = await YoutubeVideoKnowledge.findOne({ videoId: job.videoId }).lean();
      const output = doc?.outputs?.find((o) => o.outputType === job.completedOutputType);

      return NextResponse.json({
        ok: true,
        jobId,
        status: job.status,
        stages,
        videoId: job.videoId,
        outputType: job.completedOutputType,
        content: output?.content ?? "",
        targetModel: output?.targetModel,
        // The knowledge representation goes back too, so switching output type
        // doesn't need another round trip to discover it exists (spec §18).
        knowledge: doc?.knowledge ?? null,
        contentType: doc?.contentType,
        title: doc?.title,
        durationSeconds: doc?.durationSeconds,
      });
    }

    return NextResponse.json({
      ok: true,
      jobId,
      status: job.status,
      stages,
      chunksDone: job.chunksDone,
      chunksTotal: job.chunksTotal,
    });
  } catch (e) {
    console.error("[youtube-study:job] lookup failed:", e);
    return NextResponse.json({ ok: false, error: "Couldn't check that job." }, { status: 500 });
  }
}
