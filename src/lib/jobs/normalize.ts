// Job normalisation (spec §9, §12, §16).
//
// Every crawler funnels through here, so storage, matching and the UI only
// ever see one shape. Provider payloads are untrusted input (spec §29):
// everything is length-capped, HTML-stripped and type-checked on the way in.

import type {
  EmploymentType,
  NormalizedJob,
  PostedAtPrecision,
  WorkplaceType,
} from "./types";
import type { CompanyBoard } from "./crawler/companies";

const MAX_DESCRIPTION_CHARS = 12_000;
const MAX_TITLE_CHARS = 200;

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

function str(v: unknown, max = 500): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function pick(o: Record<string, unknown>, ...keys: string[]): unknown {
  const norm = (s: string) => s.toLowerCase().replace(/[_\-\s]/g, "");
  const map = new Map<string, unknown>();
  for (const [k, val] of Object.entries(o)) map.set(norm(k), val);
  for (const k of keys) {
    const val = map.get(norm(k));
    if (val !== undefined && val !== null) return val;
  }
  return undefined;
}

/** Strips markup and collapses whitespace. ATS descriptions are HTML. */
export function stripHtml(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ---------------------------------------------------------------------------
// Field inference
// ---------------------------------------------------------------------------

const REMOTE_RE = /\b(remote|work from home|wfh|distributed|anywhere)\b/i;
const HYBRID_RE = /\bhybrid\b/i;
const ONSITE_RE = /\b(on-?site|in-?office|in-?person)\b/i;

export function inferWorkplaceType(...sources: string[]): WorkplaceType {
  const text = sources.join(" ");
  if (HYBRID_RE.test(text)) return "Hybrid";
  if (REMOTE_RE.test(text)) return "Remote";
  if (ONSITE_RE.test(text)) return "On-site";
  return "Unknown";
}

export function inferEmploymentType(...sources: string[]): EmploymentType {
  const text = sources.join(" ").toLowerCase();
  if (/\bintern(ship)?\b/.test(text)) return "Internship";
  if (/\bpart[- ]time\b/.test(text)) return "Part-time";
  if (/\b(contract|contractor|freelance)\b/.test(text)) return "Contract";
  if (/\btemporary\b/.test(text)) return "Temporary";
  if (/\bfull[- ]time\b/.test(text)) return "Full-time";
  return "Unknown";
}

/**
 * Parses a posted date, recording how much we trust it (spec §12).
 *
 * An exact timestamp is stored as exact. A relative phrase ("2 days ago")
 * becomes an estimate. Anything vague ("recently posted") returns null with
 * precision "unknown" rather than inventing a date.
 */
export function parsePostedAt(value: unknown): { at: Date | null; precision: PostedAtPrecision } {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return { at: value, precision: "exact" };
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    // Heuristic: values below ~1e12 are seconds, above are milliseconds.
    const ms = value < 1e12 ? value * 1000 : value;
    const date = new Date(ms);
    return Number.isNaN(date.getTime())
      ? { at: null, precision: "unknown" }
      : { at: date, precision: "exact" };
  }

  const text = str(value, 100);
  if (!text) return { at: null, precision: "unknown" };

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return { at: parsed, precision: "exact" };

  const relative = /(\d+)\s*(minute|hour|day|week|month|year)s?\s*ago/i.exec(text);
  if (relative) {
    const amount = Number(relative[1]);
    const unitMs: Record<string, number> = {
      minute: 60_000,
      hour: 3_600_000,
      day: 86_400_000,
      week: 604_800_000,
      month: 2_592_000_000,
      year: 31_536_000_000,
    };
    const ms = unitMs[relative[2].toLowerCase()] * amount;
    return { at: new Date(Date.now() - ms), precision: "estimated" };
  }

  if (/\b(today|just posted|new)\b/i.test(text)) {
    return { at: new Date(), precision: "estimated" };
  }
  if (/\byesterday\b/i.test(text)) {
    return { at: new Date(Date.now() - 86_400_000), precision: "estimated" };
  }

  // "Recently posted" and similar — real but unquantified.
  return { at: null, precision: "unknown" };
}

/** Pulls an experience range out of prose: "2-4 years", "5+ years". */
export function parseExperienceRange(text: string): { min: number | null; max: number | null } {
  const range = /(\d+)\s*[-–to]+\s*(\d+)\s*\+?\s*years?/i.exec(text);
  if (range) return { min: Number(range[1]), max: Number(range[2]) };

  const plus = /(\d+)\s*\+\s*years?/i.exec(text);
  if (plus) return { min: Number(plus[1]), max: null };

  const atLeast = /(?:at least|minimum(?: of)?)\s*(\d+)\s*years?/i.exec(text);
  if (atLeast) return { min: Number(atLeast[1]), max: null };

  const single = /(\d+)\s*years?(?:\s+of)?\s+(?:relevant\s+)?experience/i.exec(text);
  if (single) return { min: Number(single[1]), max: null };

  return { min: null, max: null };
}

/** A conservative skill lexicon. Deliberately explicit rather than model-based:
 *  running an LLM over every job would defeat the cost design in spec §17. */
const SKILL_LEXICON = [
  "javascript", "typescript", "python", "java", "kotlin", "swift", "go", "golang", "rust", "ruby",
  "php", "c++", "c#", ".net", "scala", "elixir", "dart",
  "react", "react native", "next.js", "nextjs", "vue", "angular", "svelte", "node.js", "nodejs",
  "express", "django", "flask", "fastapi", "spring", "rails", "laravel", "flutter",
  "jetpack compose", "swiftui", "android", "ios",
  "postgresql", "postgres", "mysql", "mongodb", "redis", "elasticsearch", "dynamodb", "sqlite",
  "firebase", "supabase", "graphql", "rest api", "grpc", "websockets", "kafka", "rabbitmq",
  "aws", "gcp", "azure", "docker", "kubernetes", "terraform", "ansible", "jenkins", "github actions",
  "ci/cd", "linux", "nginx",
  "machine learning", "deep learning", "pytorch", "tensorflow", "llm", "rag", "langchain",
  "nlp", "computer vision", "data science", "pandas", "numpy", "spark", "airflow", "dbt",
  "figma", "git", "jira", "agile", "scrum", "microservices", "system design", "tdd",
];

/** Extracts known skills from job text. Returns canonical lowercase forms. */
export function extractSkills(text: string, limit = 25): string[] {
  const haystack = text.toLowerCase();
  const found = new Set<string>();
  for (const skill of SKILL_LEXICON) {
    // Word-boundary match so "go" doesn't match "going" and "r" never matches.
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`(^|[^a-z0-9+#.])${escaped}([^a-z0-9+#.]|$)`, "i").test(haystack)) {
      found.add(skill);
    }
    if (found.size >= limit) break;
  }
  return [...found];
}

/** Splits "Bangalore, India" into city and country where possible. */
export function splitLocation(location: string): { city: string | null; country: string | null } {
  const parts = location.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return { city: null, country: null };
  if (parts.length === 1) return { city: parts[0], country: null };
  return { city: parts[0], country: parts[parts.length - 1] };
}

// ---------------------------------------------------------------------------
// ATS normalisation
// ---------------------------------------------------------------------------

/**
 * Converts one raw ATS posting into the internal schema.
 *
 * Returns null when the payload lacks the fields that make a job usable — a
 * record with no title or no apply URL is not worth storing.
 */
export function normalizeAtsJob(raw: Record<string, unknown>, board: CompanyBoard): NormalizedJob | null {
  const title = str(pick(raw, "title", "text", "name"), MAX_TITLE_CHARS);
  if (!title) return null;

  // Each ATS nests location differently.
  const locationValue =
    str((pick(raw, "location") as Record<string, unknown>)?.name) ||
    str(pick(raw, "location")) ||
    str((pick(raw, "categories") as Record<string, unknown>)?.location) ||
    str(pick(raw, "locationName", "address")) ||
    "";

  const descriptionRaw =
    str(pick(raw, "content", "description", "descriptionPlain", "descriptionHtml"), 40_000) ||
    str((pick(raw, "descriptionPlain") as unknown) ?? "", 40_000);
  const description = stripHtml(descriptionRaw).slice(0, MAX_DESCRIPTION_CHARS);

  const jobUrl =
    str(pick(raw, "absolute_url", "hostedUrl", "jobUrl", "applyUrl", "url"), 1000) ||
    str(pick(raw, "applyUrl"), 1000);
  if (!jobUrl || !/^https?:\/\//i.test(jobUrl)) return null;

  const sourceJobId = str(pick(raw, "id", "jobId", "internal_job_id", "requisition_id"), 100) || jobUrl;

  const posted = parsePostedAt(
    pick(raw, "updated_at", "publishedAt", "createdAt", "published", "first_published", "publishedDate")
  );

  const combined = `${title} ${locationValue} ${description}`;
  const experience = parseExperienceRange(description);
  const { city, country } = splitLocation(locationValue);

  return {
    title,
    company: str(
      (pick(raw, "company") as Record<string, unknown>)?.name ?? pick(raw, "companyName"),
      200
    ) || board.name,
    companyLogo: null,
    description,
    location: locationValue || "Not specified",
    city,
    country,
    employmentType: inferEmploymentType(
      combined,
      str((pick(raw, "categories") as Record<string, unknown>)?.commitment)
    ),
    workplaceType: inferWorkplaceType(combined),
    salary: { min: null, max: null, currency: null },
    requiredSkills: extractSkills(`${title} ${description}`),
    preferredSkills: [],
    experienceMin: experience.min,
    experienceMax: experience.max,
    jobUrl,
    source: "ats",
    sourceName: `${board.name} (${board.ats})`,
    sourceJobId: String(sourceJobId),
    postedAt: posted.at,
    postedAtPrecision: posted.precision,
    discoveredAt: new Date(),
  };
}

// ---------------------------------------------------------------------------
// Generic provider normalisation (Apify and future crawlers)
// ---------------------------------------------------------------------------

/** Best-effort normalisation of an arbitrary provider payload. */
export function normalizeGenericJob(
  raw: Record<string, unknown>,
  source: string,
  sourceName: string
): NormalizedJob | null {
  const title = str(pick(raw, "title", "jobTitle", "position", "name"), MAX_TITLE_CHARS);
  const jobUrl = str(pick(raw, "jobUrl", "url", "link", "applyUrl", "jobPostingUrl"), 1000);
  if (!title || !/^https?:\/\//i.test(jobUrl)) return null;

  const description = stripHtml(
    str(pick(raw, "description", "descriptionText", "jobDescription", "content"), 40_000)
  ).slice(0, MAX_DESCRIPTION_CHARS);

  const location = str(pick(raw, "location", "jobLocation", "place", "city"), 300);
  const posted = parsePostedAt(
    pick(raw, "postedAt", "publishedAt", "postedDate", "datePosted", "listedAt", "postedTime")
  );
  const experience = parseExperienceRange(description);
  const { city, country } = splitLocation(location);
  const combined = `${title} ${location} ${description}`;

  const salaryText = str(pick(raw, "salary", "salaryText", "compensation"), 200);
  const salaryNumbers = salaryText.match(/\d[\d,]*/g)?.map((n) => Number(n.replace(/,/g, ""))) ?? [];

  return {
    title,
    company: str(pick(raw, "company", "companyName", "employer", "organization"), 200) || "Unknown",
    companyLogo: str(pick(raw, "companyLogo", "logo", "companyLogoUrl"), 1000) || null,
    description,
    location: location || "Not specified",
    city,
    country,
    employmentType: inferEmploymentType(combined, str(pick(raw, "employmentType", "jobType"))),
    workplaceType: inferWorkplaceType(combined, str(pick(raw, "workplaceType", "remote"))),
    salary: {
      min: salaryNumbers[0] ?? null,
      max: salaryNumbers[1] ?? null,
      currency: /₹|inr/i.test(salaryText) ? "INR" : /\$|usd/i.test(salaryText) ? "USD" : null,
    },
    requiredSkills: extractSkills(`${title} ${description}`),
    preferredSkills: [],
    experienceMin: experience.min,
    experienceMax: experience.max,
    jobUrl,
    source,
    sourceName,
    sourceJobId: str(pick(raw, "id", "jobId", "sourceJobId"), 120) || jobUrl,
    postedAt: posted.at,
    postedAtPrecision: posted.precision,
    discoveredAt: new Date(),
    sourceClosed: /\b(closed|expired|no longer accepting)\b/i.test(
      str(pick(raw, "status", "state"), 100)
    ),
  };
}
