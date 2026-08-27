// POST /api/resume/analyze — upload and analyse a resume (spec §3, §4, §32).
//
// The uploaded file never touches disk: it's read into memory, text is
// extracted, and the buffer is discarded when the request ends (spec §3).
// Only the derived analysis is returned.

import { NextRequest, NextResponse } from "next/server";
import { extractResumeText } from "@/lib/resume-interview/extract-text";
import { analyzeResume } from "@/lib/jobs/profile";
import { jobsError, logJobsError } from "@/lib/jobs/errors";
import { clientIdentifier, consume, type Identity } from "@/lib/jobs/rate-limit";
import { verifyFirebaseIdToken } from "@/lib/pdf-study/verify-auth";
import { MAX_RESUME_BYTES, MIN_RESUME_CHARS } from "@/lib/jobs/config";
import type { JobsErrorCode } from "@/lib/jobs/types";

import { JOBS_FEATURE_ENABLED } from "@/lib/jobs/config";

export const runtime = "nodejs";
export const maxDuration = 120;

// Paused feature. Gated at the route, not just hidden from the nav: this
// endpoint spends model tokens and crawler budget, so an unlinked-but-live
// URL is a standing cost risk.
function featureDisabled() {
  return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
}

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
]);

function fail(code: JobsErrorCode) {
  const e = jobsError(code);
  return NextResponse.json({ ok: false, errorCode: e.code, error: e.message, hint: e.hint }, { status: e.status });
}

export async function POST(req: NextRequest) {
  if (!JOBS_FEATURE_ENABLED) return featureDisabled();

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("NO_FILE");
  }

  const file = form.get("file");
  if (!(file instanceof File)) return fail("NO_FILE");
  if (file.size > MAX_RESUME_BYTES) return fail("FILE_TOO_LARGE");

  // Filenames are untrusted (spec §29) — the declared MIME type and the
  // extension are checked, and the name itself is never used for anything.
  const extension = (file.name.split(".").pop() ?? "").toLowerCase();
  if (!ALLOWED_TYPES.has(file.type) && !["pdf", "docx", "doc"].includes(extension)) {
    return fail("UNSUPPORTED_FILE_TYPE");
  }

  const idToken = form.get("idToken");
  const uid = await verifyFirebaseIdToken(typeof idToken === "string" ? idToken : undefined).catch(() => null);
  const identity: Identity = uid
    ? { tier: "authenticated", id: uid }
    : { tier: "anonymous", id: clientIdentifier(req.headers) };

  const quota = await consume(identity, "resume");
  if (!quota.allowed) return fail("QUOTA_EXCEEDED");

  let text: string;
  try {
    text = await extractResumeText(file);
  } catch (e) {
    logJobsError("resume", "RESUME_UNREADABLE", e);
    return fail("RESUME_UNREADABLE");
  }

  // A scanned PDF parses without error but yields almost nothing — say so
  // rather than analysing an empty string.
  if (!text || text.trim().length < MIN_RESUME_CHARS) return fail("RESUME_TOO_SHORT");

  try {
    const result = await analyzeResume(text);
    return NextResponse.json({
      ok: true,
      profile: result.profile,
      analysis: result.analysis,
      quota: { used: quota.used, limit: quota.limit },
    });
  } catch (e) {
    logJobsError("resume", "ANALYSIS_FAILED", e);
    return fail("ANALYSIS_FAILED");
  }
}
