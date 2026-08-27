// POST /api/jobs/:id/apply-click — records that the apply link was opened
// (spec §20, §32).
//
// Deliberately named for what it measures. Clicking through to a job board is
// not the same as applying, and the spec is explicit that we must not claim
// otherwise without an integration that can confirm it.

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Job } from "@/models/Job";
import { logJobsError } from "@/lib/jobs/errors";

import { JOBS_FEATURE_ENABLED } from "@/lib/jobs/config";

export const runtime = "nodejs";

// Paused feature. Gated at the route, not just hidden from the nav: this
// endpoint spends model tokens and crawler budget, so an unlinked-but-live
// URL is a standing cost risk.
function featureDisabled() {
  return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!JOBS_FEATURE_ENABLED) return featureDisabled();

  const { id } = await params;
  try {
    await connectDB();
    await Job.updateOne({ _id: id }, { $inc: { applyClicks: 1 } });
  } catch (e) {
    // Analytics must never block the user reaching the job.
    logJobsError("apply-click", "UNKNOWN", e);
  }
  return NextResponse.json({ ok: true });
}
