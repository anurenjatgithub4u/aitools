// GET /api/jobs/:id — full job detail (spec §32).

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Job } from "@/models/Job";
import { formatAge, formatVerified } from "@/lib/jobs/freshness";
import { jobsError, logJobsError } from "@/lib/jobs/errors";

import { JOBS_FEATURE_ENABLED } from "@/lib/jobs/config";

export const runtime = "nodejs";

// Paused feature. Gated at the route, not just hidden from the nav: this
// endpoint spends model tokens and crawler budget, so an unlinked-but-live
// URL is a standing cost risk.
function featureDisabled() {
  return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!JOBS_FEATURE_ENABLED) return featureDisabled();

  const { id } = await params;
  try {
    await connectDB();
    const job = await Job.findById(id).lean();
    if (!job) {
      const e = jobsError("NOT_FOUND");
      return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    }

    return NextResponse.json({
      ok: true,
      job: {
        id: String(job._id),
        title: job.title,
        company: job.company,
        companyLogo: job.companyLogo,
        description: job.description,
        location: job.location,
        workplaceType: job.workplaceType,
        employmentType: job.employmentType,
        salary: { min: job.salaryMin, max: job.salaryMax, currency: job.salaryCurrency },
        requiredSkills: job.requiredSkills,
        experienceMin: job.experienceMin,
        experienceMax: job.experienceMax,
        jobUrl: job.jobUrl,
        sourceName: job.sourceName,
        postedLabel: formatAge(job.postedAt, job.postedAtPrecision),
        verifiedLabel: formatVerified(job.lastCheckedAt),
        status: job.status,
        isActive: job.isActive,
      },
    });
  } catch (e) {
    logJobsError("job-detail", "UNKNOWN", e);
    const err = jobsError("UNKNOWN");
    return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
  }
}
