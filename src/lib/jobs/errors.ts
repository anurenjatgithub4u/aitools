// User-facing errors (spec §30, §33-equivalent).
//
// Upstream failures are logged internally and translated here. Spec §30 is
// specific about the crawler case: a crawl failure must degrade to cached
// results, not to an error page — so CRAWLER_UNAVAILABLE is worded as a
// notice, not a failure.

import type { JobsErrorCode } from "./types";

export interface UserFacingError {
  code: JobsErrorCode;
  message: string;
  hint?: string;
  status: number;
}

const CATALOGUE: Record<JobsErrorCode, Omit<UserFacingError, "code">> = {
  NO_FILE: { message: "Choose a resume to upload.", status: 400 },
  FILE_TOO_LARGE: {
    message: "That file is too large.",
    hint: "Resumes must be under 8 MB.",
    status: 413,
  },
  UNSUPPORTED_FILE_TYPE: {
    message: "That file type isn't supported.",
    hint: "Upload a PDF or DOCX.",
    status: 415,
  },
  RESUME_TOO_SHORT: {
    message: "We couldn't read enough text from that resume.",
    hint: "Scanned or image-only PDFs have no readable text. Try a text-based file.",
    status: 422,
  },
  RESUME_UNREADABLE: {
    message: "We couldn't read that file.",
    hint: "It may be password-protected or corrupted.",
    status: 422,
  },
  ANALYSIS_FAILED: {
    message: "Resume analysis failed. Please try again.",
    status: 503,
  },
  EMPTY_QUERY: { message: "Describe the job you're looking for.", status: 400 },
  QUERY_TOO_LONG: {
    message: "That description is too long.",
    hint: "Keep it under 1,500 characters.",
    status: 400,
  },
  PROFILE_INCOMPLETE: {
    message: "We need a bit more to search with.",
    hint: "Include a role and, ideally, a couple of skills or a location.",
    status: 400,
  },
  CRAWLER_UNAVAILABLE: {
    message: "We couldn't refresh jobs right now.",
    hint: "Showing recently discovered jobs instead.",
    status: 200,
  },
  BUDGET_EXCEEDED: {
    message: "We couldn't refresh jobs right now.",
    hint: "Showing recently discovered jobs instead.",
    status: 200,
  },
  SEARCH_IN_PROGRESS: {
    message: "That search is already running.",
    hint: "Give it a moment.",
    status: 409,
  },
  QUOTA_EXCEEDED: {
    message: "You've reached your daily limit.",
    hint: "Sign in for a higher allowance, or come back tomorrow.",
    status: 429,
  },
  NOT_FOUND: { message: "We couldn't find that job.", status: 404 },
  UNAUTHENTICATED: {
    message: "Sign in to save jobs.",
    hint: "Saved jobs are tied to your account.",
    status: 401,
  },
  UNKNOWN: { message: "Something went wrong. Please try again.", status: 500 },
};

export function jobsError(code: JobsErrorCode): UserFacingError {
  return { code, ...(CATALOGUE[code] ?? CATALOGUE.UNKNOWN) };
}

export function logJobsError(scope: string, code: JobsErrorCode, detail: unknown): void {
  const message = detail instanceof Error ? detail.message : String(detail);
  console.error(`[jobs:${scope}] ${code}: ${message}`);
}
