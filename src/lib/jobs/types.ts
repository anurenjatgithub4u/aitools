// ---------------------------------------------------------------------------
// Candidate / search profile (spec §4, §6)
// ---------------------------------------------------------------------------

/** The structured profile both entry points converge on: a resume upload and a
 *  free-text "what I'm looking for" produce the same shape, so everything
 *  downstream has one input type. */
export interface CandidateProfile {
  professionalTitle: string;
  seniority: Seniority;
  yearsExperience: number;
  skills: string[];
  /** Titles to search for — the model suggests these, we cap and sanitise. */
  jobTitles: string[];
  preferredLocations: string[];
  employmentTypes: EmploymentType[];
  workplaceTypes: WorkplaceType[];
  education: string[];
  industries: string[];
}

export type Seniority = "Intern" | "Junior" | "Mid-level" | "Senior" | "Lead" | "Principal" | "Unknown";

export type EmploymentType = "Full-time" | "Part-time" | "Contract" | "Internship" | "Temporary" | "Unknown";

export type WorkplaceType = "Remote" | "Hybrid" | "On-site" | "Unknown";

/** Resume analysis shown in the UI (spec §5). Separate from CandidateProfile
 *  because the profile drives search while this drives advice. */
export interface ResumeAnalysis {
  resumeScore: number;
  scoreBreakdown: {
    atsCompatibility: number;
    skills: number;
    experience: number;
    keywords: number;
    formatting: number;
    impact: number;
    jobTargeting: number;
  };
  strengths: string[];
  weaknesses: string[];
  missingKeywords: string[];
  improvements: string[];
  atsAnalysis: { score: number; issues: string[] };
}

export interface ResumeAnalysisResult {
  profile: CandidateProfile;
  analysis: ResumeAnalysis;
}

// ---------------------------------------------------------------------------
// Jobs (spec §9, §10)
// ---------------------------------------------------------------------------

export type JobStatus = "ACTIVE" | "EXPIRED" | "REMOVED" | "UNKNOWN";

/** How much we trust posted_at (spec §12). "estimated" comes from relative
 *  strings like "2 days ago"; "unknown" means the source only said something
 *  vague and we refuse to invent a date. */
export type PostedAtPrecision = "exact" | "estimated" | "unknown";

export interface JobSalary {
  min: number | null;
  max: number | null;
  currency: string | null;
}

/** The normalised internal job shape every crawler must produce (spec §9). */
export interface NormalizedJob {
  title: string;
  company: string;
  companyLogo: string | null;
  description: string;

  location: string;
  country: string | null;
  city: string | null;

  employmentType: EmploymentType;
  workplaceType: WorkplaceType;

  salary: JobSalary;

  requiredSkills: string[];
  preferredSkills: string[];

  experienceMin: number | null;
  experienceMax: number | null;

  jobUrl: string;

  source: string;
  sourceName: string;
  sourceJobId: string;

  postedAt: Date | null;
  postedAtPrecision: PostedAtPrecision;
  discoveredAt: Date;

  /** Set when the source explicitly says the role is closed (spec §14). */
  sourceClosed?: boolean;
}

/** A job as stored, including lifecycle fields. */
export interface StoredJob extends NormalizedJob {
  id: string;
  lastCheckedAt: Date;
  status: JobStatus;
  isActive: boolean;
  missCount: number;
  fingerprint: string;
}

// ---------------------------------------------------------------------------
// Crawler contract (spec §7, §36)
// ---------------------------------------------------------------------------

/** One search intent. Crawlers translate this into their own query format. */
export interface JobQuery {
  /** Free-text search terms, already built from the profile. */
  keywords: string;
  location?: string;
  remoteOnly?: boolean;
  /** Upper bound on results the caller is willing to pay for. */
  limit: number;
}

export interface CrawlOutcome {
  jobs: NormalizedJob[];
  /** Provider identifier recorded on the run, e.g. "ats" or "apify". */
  provider: string;
  /** Provider run identifier where one exists (spec §23). */
  runId: string | null;
  requestedResults: number;
  returnedResults: number;
  estimatedCostUsd: number;
  actualCostUsd: number | null;
  error?: string;
}

/**
 * The seam that lets Apify be replaced without touching storage, matching,
 * saved jobs or the frontend (spec §36).
 *
 * Implementations must:
 *  - never exceed `query.limit` results
 *  - return normalised jobs, not raw provider payloads
 *  - report their own cost estimate so the guard can record it
 */
export interface JobCrawler {
  readonly name: string;
  /** Estimated USD cost of running this query. Used pre-flight by the budget
   *  guard; a free crawler returns 0. */
  estimateCost(query: JobQuery): number;
  searchJobs(query: JobQuery): Promise<CrawlOutcome>;
}

// ---------------------------------------------------------------------------
// Matching (spec §17, §18)
// ---------------------------------------------------------------------------

export interface MatchComponent {
  key: keyof typeof import("./config").MATCH_WEIGHTS;
  score: number;
  weight: number;
}

export interface JobMatch {
  jobId: string;
  /** 0–100. Labelled "FindUrAI Match Score" in the UI — never presented as a
   *  probability of being hired (spec §18). */
  score: number;
  components: MatchComponent[];
  /** Human-readable reasons, shown as "Why you match" (spec §19). */
  reasons: string[];
  /** Skills the job wants that the candidate doesn't list (spec §19). */
  missingSkills: string[];
  /** Set when the job is below the strong-match threshold. */
  weak: boolean;
}

export interface MatchedJob {
  job: StoredJob;
  match: JobMatch;
}

// ---------------------------------------------------------------------------
// Search records (spec §22)
// ---------------------------------------------------------------------------

export type SearchType = "resume" | "manual";

export interface JobSearchRecord {
  searchId: string;
  ownerKey: string;
  searchType: SearchType;
  profile: CandidateProfile;
  searchQueries: string[];
  crawlerRunIds: string[];
  jobsFound: number;
  servedFromCache: boolean;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Errors (spec §30)
// ---------------------------------------------------------------------------

export type JobsErrorCode =
  | "NO_FILE"
  | "FILE_TOO_LARGE"
  | "UNSUPPORTED_FILE_TYPE"
  | "RESUME_TOO_SHORT"
  | "RESUME_UNREADABLE"
  | "ANALYSIS_FAILED"
  | "EMPTY_QUERY"
  | "QUERY_TOO_LONG"
  | "PROFILE_INCOMPLETE"
  | "CRAWLER_UNAVAILABLE"
  | "BUDGET_EXCEEDED"
  | "SEARCH_IN_PROGRESS"
  | "QUOTA_EXCEEDED"
  | "NOT_FOUND"
  | "UNAUTHENTICATED"
  | "UNKNOWN";
