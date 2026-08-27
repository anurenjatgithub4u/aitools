// Job matching (spec §17, §18).
//
// Two stages, for cost reasons that are the whole point of the design:
//
//   Stage 1 — cheap structured filtering. Free, runs on every job, removes
//             obvious mismatches (wrong seniority, wrong continent).
//   Stage 2 — weighted scoring on what survives, still without an LLM call
//             per job. Spec §17 is explicit that per-job model calls would
//             make this uneconomic, so similarity here is lexical.
//
// The score is labelled "FindUrAI Match Score" and never presented as a
// probability of being hired (spec §18).

import { EXPERIENCE_TOLERANCE_YEARS, MATCH_WEIGHTS, STAGE1_MIN_SCORE, WEAK_MATCH_THRESHOLD } from "./config";
import type { CandidateProfile, JobMatch, MatchComponent, Seniority, StoredJob } from "./types";

// ---------------------------------------------------------------------------
// Normalisation helpers
// ---------------------------------------------------------------------------

/** Skill aliases, so "js" and "javascript" aren't treated as different skills. */
const SKILL_ALIASES: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  reactjs: "react",
  "react.js": "react",
  nodejs: "node.js",
  node: "node.js",
  golang: "go",
  postgres: "postgresql",
  "next.js": "nextjs",
  k8s: "kubernetes",
  gcp: "google cloud",
  ml: "machine learning",
  "rest apis": "rest api",
  restful: "rest api",
  compose: "jetpack compose",
};

export function canonicalSkill(skill: string): string {
  const cleaned = skill.toLowerCase().trim().replace(/\s+/g, " ");
  return SKILL_ALIASES[cleaned] ?? cleaned;
}

function skillSet(skills: string[]): Set<string> {
  return new Set(skills.map(canonicalSkill).filter(Boolean));
}

const SENIORITY_RANK: Record<Seniority, number> = {
  Intern: 0,
  Junior: 1,
  "Mid-level": 2,
  Senior: 3,
  Lead: 4,
  Principal: 5,
  Unknown: 2,
};

/** Infers a job's seniority from its title, since few postings state it. */
export function inferJobSeniority(title: string): Seniority {
  const t = title.toLowerCase();
  if (/\b(intern|internship|trainee)\b/.test(t)) return "Intern";
  if (/\b(principal|distinguished|architect)\b/.test(t)) return "Principal";
  if (/\b(staff|lead|head of|manager|director)\b/.test(t)) return "Lead";
  if (/\b(senior|sr\.?|iii)\b/.test(t)) return "Senior";
  if (/\b(junior|jr\.?|entry|graduate|associate|i)\b/.test(t)) return "Junior";
  return "Unknown";
}

/** Token overlap between two titles, ignoring seniority words. */
function titleSimilarity(candidateTitles: string[], jobTitle: string): number {
  const strip = (s: string) =>
    s
      .toLowerCase()
      .replace(/\b(senior|sr|junior|jr|lead|staff|principal|i{1,3}|iv)\b/g, " ")
      .replace(/[^a-z0-9+# ]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1);

  const jobTokens = new Set(strip(jobTitle));
  if (jobTokens.size === 0) return 0;

  let best = 0;
  for (const candidate of candidateTitles) {
    const tokens = strip(candidate);
    if (tokens.length === 0) continue;
    const hits = tokens.filter((t) => jobTokens.has(t)).length;
    best = Math.max(best, hits / Math.max(tokens.length, jobTokens.size));
  }
  return best;
}

function locationScore(profile: CandidateProfile, job: StoredJob): number {
  // A remote job satisfies any location preference.
  if (job.workplaceType === "Remote") return 1;
  if (profile.preferredLocations.length === 0) return 0.6; // no stated preference

  const wanted = profile.preferredLocations.map((l) => l.toLowerCase().trim());
  // Remote roles already returned 1 above, so reaching here with a
  // remote-only preference means the job is on-site or hybrid.
  if (wanted.some((w) => w === "remote" || w === "anywhere")) return 0.2;

  const where = `${job.location} ${job.city ?? ""} ${job.country ?? ""}`.toLowerCase();
  if (wanted.some((w) => w && where.includes(w))) return 1;
  if (job.workplaceType === "Hybrid") return 0.3;
  return 0.1;
}

function experienceScore(profile: CandidateProfile, job: StoredJob): number {
  const { experienceMin, experienceMax } = job;
  if (experienceMin === null && experienceMax === null) return 0.7; // unstated

  const years = profile.yearsExperience;
  const min = experienceMin ?? 0;
  const max = experienceMax ?? min + 4;

  if (years >= min && years <= max) return 1;
  // Over-qualified is a softer penalty than under-qualified.
  if (years > max) return Math.max(0.35, 1 - (years - max) * 0.12);
  const shortfall = min - years;
  if (shortfall <= EXPERIENCE_TOLERANCE_YEARS) return Math.max(0.4, 1 - shortfall * 0.25);
  return Math.max(0, 0.4 - (shortfall - EXPERIENCE_TOLERANCE_YEARS) * 0.15);
}

// ---------------------------------------------------------------------------
// Stage 1 — cheap filtering (spec §17)
// ---------------------------------------------------------------------------

export interface Stage1Result {
  passed: boolean;
  reason?: string;
}

/**
 * Removes jobs that are obviously wrong before any scoring work.
 *
 * Deliberately conservative: this is about excluding a senior architect role
 * from a graduate's results, not about ranking. Anything arguable survives to
 * stage 2 and gets scored.
 */
export function stage1Filter(profile: CandidateProfile, job: StoredJob): Stage1Result {
  if (!job.isActive) return { passed: false, reason: "inactive" };

  const jobSeniority = inferJobSeniority(job.title);
  const gap = SENIORITY_RANK[jobSeniority] - SENIORITY_RANK[profile.seniority];
  // Two full levels above the candidate is not a realistic application.
  if (jobSeniority !== "Unknown" && gap >= 2) {
    return { passed: false, reason: "seniority far above candidate" };
  }
  if (jobSeniority === "Intern" && profile.seniority !== "Intern" && profile.yearsExperience >= 2) {
    return { passed: false, reason: "internship, candidate is experienced" };
  }

  if (job.experienceMin !== null && profile.yearsExperience + EXPERIENCE_TOLERANCE_YEARS < job.experienceMin) {
    return { passed: false, reason: "experience requirement far above candidate" };
  }

  const titleFit = titleSimilarity(
    [profile.professionalTitle, ...profile.jobTitles],
    job.title
  );
  const skills = skillSet(profile.skills);
  const jobSkills = skillSet(job.requiredSkills);
  const skillHits = [...jobSkills].filter((s) => skills.has(s)).length;

  // No title overlap AND no shared skills means it isn't the same field.
  if (titleFit === 0 && skillHits === 0) {
    return { passed: false, reason: "no title or skill overlap" };
  }

  return { passed: true };
}

// ---------------------------------------------------------------------------
// Stage 2 — weighted scoring (spec §18)
// ---------------------------------------------------------------------------

export function scoreJob(profile: CandidateProfile, job: StoredJob): JobMatch {
  const candidateSkills = skillSet(profile.skills);
  const jobSkills = skillSet(job.requiredSkills);

  const matchedSkills = [...jobSkills].filter((s) => candidateSkills.has(s));
  const missingSkills = [...jobSkills].filter((s) => !candidateSkills.has(s));

  // Score against what the job asks for, not against everything the candidate
  // knows — extra unrelated skills shouldn't inflate a match.
  const skills = jobSkills.size === 0 ? 0.5 : matchedSkills.length / jobSkills.size;
  const experience = experienceScore(profile, job);
  const title = titleSimilarity([profile.professionalTitle, ...profile.jobTitles], job.title);
  const location = locationScore(profile, job);

  const jobSeniority = inferJobSeniority(job.title);
  const seniorityGap = Math.abs(SENIORITY_RANK[jobSeniority] - SENIORITY_RANK[profile.seniority]);
  const seniority = jobSeniority === "Unknown" ? 0.6 : Math.max(0, 1 - seniorityGap * 0.35);

  // Education rarely appears in a parseable form; a neutral score avoids
  // penalising every job for a field we usually can't read.
  const education = profile.education.length > 0 ? 0.7 : 0.5;

  // Freshness stands in for "other" — a job posted today is a better lead
  // than one from six weeks ago, all else equal.
  const ageDays = job.postedAt ? (Date.now() - job.postedAt.getTime()) / 86_400_000 : 30;
  const other = Math.max(0, 1 - ageDays / 60);

  const components: MatchComponent[] = [
    { key: "skills", score: skills, weight: MATCH_WEIGHTS.skills },
    { key: "experience", score: experience, weight: MATCH_WEIGHTS.experience },
    { key: "title", score: title, weight: MATCH_WEIGHTS.title },
    { key: "location", score: location, weight: MATCH_WEIGHTS.location },
    { key: "seniority", score: seniority, weight: MATCH_WEIGHTS.seniority },
    { key: "education", score: education, weight: MATCH_WEIGHTS.education },
    { key: "other", score: other, weight: MATCH_WEIGHTS.other },
  ];

  const weighted = components.reduce((sum, c) => sum + c.score * c.weight, 0);
  const totalWeight = components.reduce((sum, c) => sum + c.weight, 0) || 1;
  const score = Math.round((weighted / totalWeight) * 100);

  return {
    jobId: job.id,
    score,
    components,
    reasons: buildReasons(profile, job, matchedSkills, experience, location),
    missingSkills: missingSkills.slice(0, 6),
    weak: score < WEAK_MATCH_THRESHOLD,
  };
}

/** "Why you match" lines (spec §19). Only claims backed by the data above. */
function buildReasons(
  profile: CandidateProfile,
  job: StoredJob,
  matchedSkills: string[],
  experienceScoreValue: number,
  locationScoreValue: number
): string[] {
  const reasons: string[] = [];

  if (matchedSkills.length > 0) {
    const shown = matchedSkills.slice(0, 4).join(", ");
    reasons.push(`Matches ${matchedSkills.length} required skill${matchedSkills.length > 1 ? "s" : ""}: ${shown}`);
  }
  if (experienceScoreValue >= 0.9 && job.experienceMin !== null) {
    reasons.push(`Your ${profile.yearsExperience} years fits the ${job.experienceMin}+ year requirement`);
  }
  if (job.workplaceType === "Remote") {
    reasons.push("Remote role");
  } else if (locationScoreValue >= 1) {
    reasons.push(`Located in ${job.city ?? job.location}`);
  }
  const titleFit = titleSimilarity([profile.professionalTitle, ...profile.jobTitles], job.title);
  if (titleFit >= 0.5) {
    reasons.push(`Job title aligns with ${profile.professionalTitle}`);
  }
  return reasons.slice(0, 4);
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

export interface MatchOutcome {
  matches: { job: StoredJob; match: JobMatch }[];
  /** Below the strong threshold — shown as "nearby matches" (spec §34). */
  weak: { job: StoredJob; match: JobMatch }[];
  filteredOut: number;
}

export function matchJobs(profile: CandidateProfile, jobs: StoredJob[]): MatchOutcome {
  const matches: { job: StoredJob; match: JobMatch }[] = [];
  const weak: { job: StoredJob; match: JobMatch }[] = [];
  let filteredOut = 0;

  for (const job of jobs) {
    if (!stage1Filter(profile, job).passed) {
      filteredOut++;
      continue;
    }
    const match = scoreJob(profile, job);
    if (match.score < STAGE1_MIN_SCORE) {
      filteredOut++;
      continue;
    }
    (match.weak ? weak : matches).push({ job, match });
  }

  matches.sort((a, b) => b.match.score - a.match.score);
  weak.sort((a, b) => b.match.score - a.match.score);

  return { matches, weak, filteredOut };
}
