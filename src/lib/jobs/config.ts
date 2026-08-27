// Every limit, budget and weight for the resume → job matching feature.
//
// Spec §2 sets a hard application-level budget on crawler spend. That budget
// is enforced here and in cost-guard.ts, and deliberately NOT trusted to the
// crawler provider: an Actor that promises a maximum cost is still an external
// system, so the application refuses to start a run it can't afford rather
// than relying on the provider to stop.

// ---------------------------------------------------------------------------
// Feature flag
// ---------------------------------------------------------------------------

/**
 * Master switch for the whole jobs feature. Off by default.
 *
 * Set NEXT_PUBLIC_JOBS_ENABLED=true in .env.local to turn it back on — one
 * variable controls the nav link, the sitemap entry, the /jobs page and every
 * /api/jobs and /api/resume endpoint.
 *
 * The API routes are gated as well as the link, not just hidden: an ungated
 * endpoint can still be called directly, and these ones spend model tokens and
 * crawler budget on every request.
 *
 * NEXT_PUBLIC_ so the client-side nav can read the same value; there is nothing
 * secret about whether a feature is switched on.
 */
export const JOBS_FEATURE_ENABLED = process.env.NEXT_PUBLIC_JOBS_ENABLED === "true";

// ---------------------------------------------------------------------------
// Crawler budget (spec §2, §24, §37)
// ---------------------------------------------------------------------------

/** Hard ceiling on estimated spend for a single crawl operation. A crawl that
 *  would exceed this is refused before it starts, not cancelled mid-run. */
export const MAX_COST_PER_RUN_USD = Number(process.env.APIFY_MAX_COST_PER_RUN_USD ?? 0.1);

export const MAX_RESULTS_PER_RUN = Number(process.env.APIFY_MAX_RESULTS_PER_RUN ?? 100);
export const MAX_PAGES_PER_RUN = Number(process.env.APIFY_MAX_PAGES_PER_RUN ?? 10);

/** Search fan-out (spec §8). The goal is a few highly relevant fresh jobs, not
 *  a copy of the job internet. */
export const MAX_JOB_SEARCH_QUERIES = Number(process.env.MAX_JOB_SEARCH_QUERIES ?? 3);
export const MAX_JOBS_PER_QUERY = Number(process.env.MAX_JOBS_PER_QUERY ?? 30);
export const MAX_TOTAL_JOBS_PER_RUN = Number(process.env.MAX_TOTAL_JOBS_PER_RUN ?? 100);

/** Wall-clock ceiling for one crawl. A crawler that hangs still costs money on
 *  a per-run pricing model, so it gets abandoned rather than waited on. */
export const CRAWL_TIMEOUT_MS = 120_000;

// ---------------------------------------------------------------------------
// Provider selection (spec §7, §36)
// ---------------------------------------------------------------------------

/**
 * Which crawler to use.
 *
 *   "ats"    — free public ATS board APIs (Greenhouse, Lever, Ashby). $0.
 *   "apify"  — Apify actor, budget-guarded.
 *   "auto"   — ATS first; Apify only if ATS returned too few results AND the
 *              budget allows it. This is the default because it makes the
 *              common case free.
 */
export const JOB_CRAWLER = (process.env.JOB_CRAWLER || "auto").toLowerCase();

/** Below this many results from the free crawler, "auto" mode is allowed to
 *  spend budget on Apify to top up. */
export const ATS_RESULT_FLOOR = Number(process.env.ATS_RESULT_FLOOR ?? 8);

/** Apify actor for job discovery. Only the cheapest per-result actors fit the
 *  $0.10 budget at 100 results — see docs in crawler/apify.ts before changing. */
export const APIFY_JOB_ACTOR =
  process.env.APIFY_JOB_ACTOR || "cheap_scraper~linkedin-job-scraper";

/** Per-result and per-run prices used for the pre-flight estimate. These must
 *  be kept in step with the configured actor's pricing or the guard estimates
 *  the wrong number. */
export const APIFY_PRICE_PER_RESULT_USD = Number(process.env.APIFY_PRICE_PER_RESULT_USD ?? 0.0007);
export const APIFY_PRICE_PER_RUN_USD = Number(process.env.APIFY_PRICE_PER_RUN_USD ?? 0.005);

// ---------------------------------------------------------------------------
// Caching (spec §25, §37)
// ---------------------------------------------------------------------------

/** How long a search's results stay fresh enough to serve from Mongo without
 *  re-crawling. This is the single biggest lever on cost. */
export const JOB_SEARCH_CACHE_MINUTES = Number(process.env.JOB_SEARCH_CACHE_MINUTES ?? 30);

/** Jobs older than this are excluded from active results regardless of status
 *  — a six-month-old posting is rarely still open. */
export const MAX_JOB_AGE_DAYS = Number(process.env.MAX_JOB_AGE_DAYS ?? 60);

// ---------------------------------------------------------------------------
// Freshness and expiry (spec §11, §14, §15, §27)
// ---------------------------------------------------------------------------

/** A job not seen since this long ago is due for re-verification. */
export const RECHECK_AFTER_HOURS = Number(process.env.RECHECK_AFTER_HOURS ?? 12);

/**
 * Consecutive verification failures before a job is called EXPIRED.
 *
 * Spec §14: a job vanishing once means the source hiccuped, not that the role
 * closed. Requiring repeated misses avoids hiding live jobs on a bad fetch.
 */
export const MISSES_BEFORE_EXPIRED = Number(process.env.MISSES_BEFORE_EXPIRED ?? 3);

// ---------------------------------------------------------------------------
// Matching (spec §17, §18)
// ---------------------------------------------------------------------------

/** Score weights. Configurable per spec §18; must sum to 1. */
export const MATCH_WEIGHTS = {
  skills: Number(process.env.MATCH_WEIGHT_SKILLS ?? 0.4),
  experience: Number(process.env.MATCH_WEIGHT_EXPERIENCE ?? 0.2),
  title: Number(process.env.MATCH_WEIGHT_TITLE ?? 0.15),
  location: Number(process.env.MATCH_WEIGHT_LOCATION ?? 0.1),
  seniority: Number(process.env.MATCH_WEIGHT_SENIORITY ?? 0.05),
  education: Number(process.env.MATCH_WEIGHT_EDUCATION ?? 0.05),
  other: Number(process.env.MATCH_WEIGHT_OTHER ?? 0.05),
} as const;

/** Stage-1 filtering: jobs below this are dropped before any expensive work
 *  (spec §17). Deliberately low — stage 1 removes the obviously wrong, it
 *  doesn't rank. */
export const STAGE1_MIN_SCORE = 25;

/** Results below this are shown only as "nearby matches" (spec §34). */
export const WEAK_MATCH_THRESHOLD = 50;

/** How far outside the candidate's experience band a job can sit before it's
 *  treated as an obvious mismatch. */
export const EXPERIENCE_TOLERANCE_YEARS = 2;

// ---------------------------------------------------------------------------
// Upload limits (spec §29)
// ---------------------------------------------------------------------------

export const MAX_RESUME_BYTES = 8 * 1024 * 1024;
export const MIN_RESUME_CHARS = 200;
export const MAX_RESUME_CHARS = 30_000;

/** Free-text job description in manual mode (spec §6). */
export const MAX_MANUAL_QUERY_CHARS = 1_500;

// ---------------------------------------------------------------------------
// Rate limits (spec §29)
// ---------------------------------------------------------------------------

export const MAX_ANONYMOUS_SEARCHES_PER_DAY = 3;
export const MAX_AUTH_SEARCHES_PER_DAY = 20;

export const MAX_ANONYMOUS_RESUME_UPLOADS_PER_DAY = 3;
export const MAX_AUTH_RESUME_UPLOADS_PER_DAY = 15;

/** Concurrent crawls per identity — stops one caller queuing many searches. */
export const MAX_CONCURRENT_SEARCHES = 1;
