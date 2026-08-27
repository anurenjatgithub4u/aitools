// GET /api/saved-jobs — the signed-in user's saved jobs (spec §21, §32).

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { SavedJob } from "@/models/SavedJob";
import { Job } from "@/models/Job";
import { formatAge, formatVerified } from "@/lib/jobs/freshness";
import { jobsError, logJobsError } from "@/lib/jobs/errors";
import { verifyFirebaseIdToken } from "@/lib/pdf-study/verify-auth";

import { JOBS_FEATURE_ENABLED } from "@/lib/jobs/config";

export const runtime = "nodejs";

// Paused feature. Gated at the route, not just hidden from the nav: this
// endpoint spends model tokens and crawler budget, so an unlinked-but-live
// URL is a standing cost risk.
function featureDisabled() {
  return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
}

export async function GET(req: NextRequest) {
  if (!JOBS_FEATURE_ENABLED) return featureDisabled();

  const header = req.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : undefined;
  const uid = await verifyFirebaseIdToken(bearer).catch(() => null);

  if (!uid) {
    const e = jobsError("UNAUTHENTICATED");
    return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
  }

  try {
    await connectDB();
    const saved = await SavedJob.find({ userId: uid }).sort({ savedAt: -1 }).limit(200).lean();
    const jobs = await Job.find({ _id: { $in: saved.map((s) => s.jobId) } }).lean();

    const savedAtById = new Map(saved.map((s) => [s.jobId, s.savedAt]));

    return NextResponse.json({
      ok: true,
      jobs: jobs
        .map((job) => ({
          id: String(job._id),
          title: job.title,
          company: job.company,
          location: job.location,
          workplaceType: job.workplaceType,
          salary: { min: job.salaryMin, max: job.salaryMax, currency: job.salaryCurrency },
          jobUrl: job.jobUrl,
          postedLabel: formatAge(job.postedAt, job.postedAtPrecision),
          verifiedLabel: formatVerified(job.lastCheckedAt),
          // A saved job that later expired still shows, flagged — silently
          // dropping something the user bookmarked would be worse.
          status: job.status,
          isActive: job.isActive,
          savedAt: savedAtById.get(String(job._id)) ?? null,
        }))
        .sort((a, b) => (b.savedAt?.getTime() ?? 0) - (a.savedAt?.getTime() ?? 0)),
    });
  } catch (e) {
    logJobsError("saved-jobs", "UNKNOWN", e);
    const err = jobsError("UNKNOWN");
    return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
  }
}
