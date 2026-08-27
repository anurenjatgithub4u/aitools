// POST/DELETE /api/jobs/:id/save — save and unsave (spec §21, §32).
//
// Saving requires an account: a saved list keyed to a hashed IP would be lost
// the moment the address changed, which is worse than asking people to sign in.

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { SavedJob } from "@/models/SavedJob";
import { Job } from "@/models/Job";
import { jobsError, logJobsError } from "@/lib/jobs/errors";
import { verifyFirebaseIdToken } from "@/lib/pdf-study/verify-auth";
import type { JobsErrorCode } from "@/lib/jobs/types";

import { JOBS_FEATURE_ENABLED } from "@/lib/jobs/config";

export const runtime = "nodejs";

// Paused feature. Gated at the route, not just hidden from the nav: this
// endpoint spends model tokens and crawler budget, so an unlinked-but-live
// URL is a standing cost risk.
function featureDisabled() {
  return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
}

function fail(code: JobsErrorCode) {
  const e = jobsError(code);
  return NextResponse.json({ ok: false, errorCode: e.code, error: e.message, hint: e.hint }, { status: e.status });
}

async function requireUser(req: NextRequest): Promise<string | null> {
  const header = req.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : undefined;
  return verifyFirebaseIdToken(bearer).catch(() => null);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!JOBS_FEATURE_ENABLED) return featureDisabled();

  const uid = await requireUser(req);
  if (!uid) return fail("UNAUTHENTICATED");

  const { id } = await params;
  try {
    await connectDB();
    const job = await Job.findById(id).select("_id").lean();
    if (!job) return fail("NOT_FOUND");

    // Upsert rather than insert so a double-click is idempotent — the unique
    // index would otherwise throw on the second save (spec §21).
    await SavedJob.updateOne(
      { userId: uid, jobId: id },
      { $setOnInsert: { userId: uid, jobId: id, savedAt: new Date() } },
      { upsert: true }
    );
    return NextResponse.json({ ok: true, saved: true });
  } catch (e) {
    logJobsError("save", "UNKNOWN", e);
    return fail("UNKNOWN");
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!JOBS_FEATURE_ENABLED) return featureDisabled();

  const uid = await requireUser(req);
  if (!uid) return fail("UNAUTHENTICATED");

  const { id } = await params;
  try {
    await connectDB();
    await SavedJob.deleteOne({ userId: uid, jobId: id });
    return NextResponse.json({ ok: true, saved: false });
  } catch (e) {
    logJobsError("unsave", "UNKNOWN", e);
    return fail("UNKNOWN");
  }
}
