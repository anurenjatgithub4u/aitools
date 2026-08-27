// POST /api/jobs/search — find and rank jobs (spec §32).
//
// Accepts either a profile from a prior resume analysis, or a free-text
// description which is converted into one. Everything after that is identical,
// which is the point of both entry points producing a CandidateProfile.

import { NextRequest, NextResponse } from "next/server";
import { parseManualQuery, sanitizeProfile } from "@/lib/jobs/profile";
import { searchJobs } from "@/lib/jobs/search";
import { formatAge, formatVerified } from "@/lib/jobs/freshness";
import { jobsError, logJobsError } from "@/lib/jobs/errors";
import { clientIdentifier, consume, ownerKey, type Identity } from "@/lib/jobs/rate-limit";
import { verifyFirebaseIdToken } from "@/lib/pdf-study/verify-auth";
import { MAX_MANUAL_QUERY_CHARS } from "@/lib/jobs/config";
import type { CandidateProfile, JobsErrorCode } from "@/lib/jobs/types";

import { JOBS_FEATURE_ENABLED } from "@/lib/jobs/config";

export const runtime = "nodejs";
export const maxDuration = 180;

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

export async function POST(req: NextRequest) {
  if (!JOBS_FEATURE_ENABLED) return featureDisabled();

  let body: { profile?: unknown; description?: string; idToken?: string; force?: boolean };
  try {
    body = await req.json();
  } catch {
    return fail("EMPTY_QUERY");
  }

  const uid = await verifyFirebaseIdToken(body.idToken).catch(() => null);
  const identity: Identity = uid
    ? { tier: "authenticated", id: uid }
    : { tier: "anonymous", id: clientIdentifier(req.headers) };

  // --- resolve a profile from whichever entry point was used ---------------
  let profile: CandidateProfile;
  let searchType: "resume" | "manual";

  if (body.profile) {
    // Re-sanitised even though it came from our own analyse endpoint: the
    // client could have altered it in between (spec §29).
    profile = sanitizeProfile(body.profile);
    searchType = "resume";
  } else {
    const description = (body.description ?? "").trim();
    if (!description) return fail("EMPTY_QUERY");
    if (description.length > MAX_MANUAL_QUERY_CHARS) return fail("QUERY_TOO_LONG");
    try {
      profile = await parseManualQuery(description);
    } catch (e) {
      logJobsError("search", "ANALYSIS_FAILED", e);
      return fail("ANALYSIS_FAILED");
    }
    searchType = "manual";
  }

  if (!profile.professionalTitle || profile.professionalTitle === "Unknown") {
    if (profile.jobTitles.length === 0) return fail("PROFILE_INCOMPLETE");
  }

  const quota = await consume(identity, "search");
  if (!quota.allowed) return fail("QUOTA_EXCEEDED");

  try {
    const result = await searchJobs({
      profile,
      ownerKey: ownerKey(identity),
      userId: uid,
      searchType,
      force: body.force === true,
    });

    const shape = ({ job, match }: (typeof result.matches)[number]) => ({
      id: job.id,
      title: job.title,
      company: job.company,
      companyLogo: job.companyLogo,
      location: job.location,
      workplaceType: job.workplaceType,
      employmentType: job.employmentType,
      salary: job.salary,
      jobUrl: job.jobUrl,
      sourceName: job.sourceName,
      requiredSkills: job.requiredSkills.slice(0, 8),
      postedAt: job.postedAt,
      postedLabel: formatAge(job.postedAt, job.postedAtPrecision),
      verifiedLabel: formatVerified(job.lastCheckedAt),
      status: job.status,
      matchScore: match.score,
      reasons: match.reasons,
      missingSkills: match.missingSkills,
    });

    return NextResponse.json({
      ok: true,
      searchId: result.searchId,
      profile,
      queries: result.queries,
      servedFromCache: result.servedFromCache,
      // Surfaced so the UI can show the §30 notice rather than an error page.
      refreshFailed: !!result.crawlError,
      jobs: result.matches.map(shape),
      nearbyJobs: result.weak.slice(0, 10).map(shape),
      jobsConsidered: result.jobsConsidered,
      quota: { used: quota.used, limit: quota.limit },
    });
  } catch (e) {
    logJobsError("search", "UNKNOWN", e);
    return fail("UNKNOWN");
  }
}
