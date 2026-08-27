// AI profile extraction and validation (spec §4, §6, §29).
//
// The security rule from §4: model output never reaches a database query or
// any executable path unvalidated. Everything the model returns is treated as
// untrusted input — coerced to the expected type, length-capped, and clamped
// to allowed enum values. A malformed response degrades to a usable profile
// rather than throwing.

import { callAI } from "@/lib/ai";
import type {
  CandidateProfile,
  EmploymentType,
  ResumeAnalysis,
  ResumeAnalysisResult,
  Seniority,
  WorkplaceType,
} from "./types";
import { manualSearchPrompt, resumeAnalysisPrompt } from "./prompts";
import { MAX_RESUME_CHARS } from "./config";

const SENIORITIES: Seniority[] = ["Intern", "Junior", "Mid-level", "Senior", "Lead", "Principal", "Unknown"];
const EMPLOYMENT_TYPES: EmploymentType[] = ["Full-time", "Part-time", "Contract", "Internship", "Temporary", "Unknown"];
const WORKPLACE_TYPES: WorkplaceType[] = ["Remote", "Hybrid", "On-site", "Unknown"];

// ---------------------------------------------------------------------------
// Sanitisers
// ---------------------------------------------------------------------------

function str(v: unknown, max = 200): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function strList(v: unknown, maxItems = 25, maxLen = 120): string[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of v) {
    if (typeof item !== "string") continue;
    const cleaned = item.trim().slice(0, maxLen);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
    if (out.length >= maxItems) break;
  }
  return out;
}

function clampScore(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function oneOf<T extends string>(v: unknown, allowed: T[], fallback: T): T {
  const s = str(v, 40);
  const hit = allowed.find((a) => a.toLowerCase() === s.toLowerCase());
  return hit ?? fallback;
}

function enumList<T extends string>(v: unknown, allowed: T[], max = 4): T[] {
  if (!Array.isArray(v)) return [];
  const out: T[] = [];
  for (const item of v) {
    const hit = allowed.find((a) => a.toLowerCase() === str(item, 40).toLowerCase());
    if (hit && !out.includes(hit)) out.push(hit);
    if (out.length >= max) break;
  }
  return out;
}

function parseJson(raw: string): Record<string, unknown> | null {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

/**
 * Case- and separator-insensitive field lookup.
 *
 * This function has two callers with different conventions: the model returns
 * snake_case (`professional_title`), while the browser posts the already-
 * camelCased profile back from our own API (`professionalTitle`). Matching on
 * a normalised key handles both, so a round-trip through the client doesn't
 * silently produce an empty profile.
 */
function field(o: Record<string, unknown>, ...names: string[]): unknown {
  const normalize = (s: string) => s.toLowerCase().replace(/[_\-\s]/g, "");
  const lookup = new Map<string, unknown>();
  for (const [key, value] of Object.entries(o)) lookup.set(normalize(key), value);
  for (const name of names) {
    const value = lookup.get(normalize(name));
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

/** Validates a profile into a shape the rest of the system can trust, whether
 *  it came from the model or was posted back by the client. Never throws — bad
 *  input yields a usable, if empty, profile. */
export function sanitizeProfile(raw: unknown): CandidateProfile {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const years = Number(field(o, "years_experience"));
  return {
    professionalTitle: str(field(o, "professional_title"), 120) || "Unknown",
    seniority: oneOf(field(o, "seniority"), SENIORITIES, "Unknown"),
    // Capped at 50: a model occasionally returns a birth year here.
    yearsExperience: Number.isFinite(years) ? Math.max(0, Math.min(50, Math.round(years))) : 0,
    skills: strList(field(o, "skills"), 40, 60),
    jobTitles: strList(field(o, "job_titles"), 8, 120),
    preferredLocations: strList(field(o, "preferred_locations"), 6, 80),
    employmentTypes: enumList(field(o, "employment_types"), EMPLOYMENT_TYPES),
    workplaceTypes: enumList(field(o, "workplace_types"), WORKPLACE_TYPES),
    education: strList(field(o, "education"), 8, 200),
    industries: strList(field(o, "industries"), 8, 80),
  };
}

function sanitizeAnalysis(raw: Record<string, unknown>): ResumeAnalysis {
  const breakdown = (raw.score_breakdown ?? {}) as Record<string, unknown>;
  const ats = (raw.ats_analysis ?? {}) as Record<string, unknown>;

  return {
    resumeScore: clampScore(raw.resume_score, 50),
    scoreBreakdown: {
      atsCompatibility: clampScore(breakdown.ats_compatibility, 50),
      skills: clampScore(breakdown.skills, 50),
      experience: clampScore(breakdown.experience, 50),
      keywords: clampScore(breakdown.keywords, 50),
      formatting: clampScore(breakdown.formatting, 50),
      impact: clampScore(breakdown.impact, 50),
      jobTargeting: clampScore(breakdown.job_targeting, 50),
    },
    strengths: strList(raw.strengths, 6, 240),
    weaknesses: strList(raw.weaknesses, 6, 240),
    missingKeywords: strList(raw.missing_keywords, 12, 60),
    improvements: strList(raw.improvements, 8, 300),
    atsAnalysis: {
      score: clampScore(ats.score, 50),
      issues: strList(ats.issues, 8, 240),
    },
  };
}

// ---------------------------------------------------------------------------
// Entry points
// ---------------------------------------------------------------------------

export async function analyzeResume(resumeText: string): Promise<ResumeAnalysisResult> {
  const text = resumeText.slice(0, MAX_RESUME_CHARS);
  const raw = await callAI(resumeAnalysisPrompt(text), { json: true, tier: "strong", retries: 2 });

  const parsed = parseJson(raw);
  if (!parsed) throw new Error("Could not parse the resume analysis");

  return {
    profile: sanitizeProfile(parsed.candidate_profile),
    analysis: sanitizeAnalysis(parsed),
  };
}

export async function parseManualQuery(description: string): Promise<CandidateProfile> {
  // Cheap tier: turning one sentence into a few fields doesn't need the
  // strong model, and this runs on every manual search (spec §16 cost intent).
  const raw = await callAI(manualSearchPrompt(description), { json: true, tier: "fast", retries: 2 });

  const parsed = parseJson(raw);
  if (!parsed) throw new Error("Could not parse the search description");

  return sanitizeProfile(parsed.candidate_profile);
}

// ---------------------------------------------------------------------------
// Query building (spec §8)
// ---------------------------------------------------------------------------

/**
 * Builds a small set of targeted search queries from a profile.
 *
 * Capped hard: spec §8 wants a few highly relevant queries, not a sweep. Each
 * additional query is another crawler run and another per-run fee.
 */
export function buildSearchQueries(profile: CandidateProfile, maxQueries: number): string[] {
  const titles = [profile.professionalTitle, ...profile.jobTitles]
    .map((t) => t.trim())
    .filter(Boolean);
  const topSkills = profile.skills.slice(0, 3);
  const locations = profile.preferredLocations.filter(Boolean);

  const queries: string[] = [];
  const push = (q: string) => {
    const cleaned = q.replace(/\s+/g, " ").trim();
    const key = cleaned.toLowerCase();
    if (cleaned && !queries.some((existing) => existing.toLowerCase() === key)) {
      queries.push(cleaned);
    }
  };

  // Most specific first — title plus the strongest skill, in the first
  // preferred location.
  if (titles[0]) {
    push([titles[0], topSkills[0], locations[0]].filter(Boolean).join(" "));
  }
  if (titles[1]) {
    push([titles[1], topSkills[1] ?? topSkills[0], locations[0]].filter(Boolean).join(" "));
  }
  if (titles[0] && locations[1]) {
    push([titles[0], locations[1]].filter(Boolean).join(" "));
  }
  // Fall back to a bare title so a profile with no skills or location still
  // produces something searchable.
  if (queries.length === 0 && titles[0]) push(titles[0]);

  return queries.slice(0, Math.max(1, maxQueries));
}

/** Stable cache key for a query (spec §25). */
export function queryKey(query: string): string {
  return query.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}
