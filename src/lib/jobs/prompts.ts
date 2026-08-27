// Prompts for resume analysis and manual search parsing (spec §4, §6).
//
// Both ask for JSON against a fixed shape rather than prose, because the
// output feeds search queries and scoring. Spec §4 is explicit that model
// output must never reach a database query or executable path unvalidated —
// so these prompts define the shape, and sanitize.ts enforces it. The prompt
// is a request, not a guarantee.

const GROUNDING = `
RULES:
- Base everything on the text provided. Do not infer skills, employers, dates
  or achievements that are not there.
- If the resume does not state years of experience, estimate from the work
  history and say so in weaknesses. Do not invent a number with false
  confidence.
- Never fabricate certifications, education or company names.
- Skills must be technologies, tools or methods actually named in the text.
`.trim();

export function resumeAnalysisPrompt(resumeText: string): string {
  return `${GROUNDING}

Analyse this resume and return JSON only.

RESUME:
"""
${resumeText}
"""

Return exactly this shape:
{
  "candidate_profile": {
    "professional_title": "the role this person is currently best suited to",
    "seniority": "Intern | Junior | Mid-level | Senior | Lead | Principal",
    "years_experience": 3,
    "skills": ["specific technologies named in the resume"],
    "job_titles": ["3-6 realistic titles to search for"],
    "preferred_locations": ["only if the resume states a location or preference"],
    "employment_types": ["Full-time"],
    "workplace_types": ["Remote | Hybrid | On-site, only if stated"],
    "education": ["degree and institution as written"],
    "industries": ["sectors the person has worked in"]
  },
  "resume_score": 78,
  "score_breakdown": {
    "ats_compatibility": 80,
    "skills": 75,
    "experience": 82,
    "keywords": 70,
    "formatting": 85,
    "impact": 60,
    "job_targeting": 72
  },
  "strengths": ["3-5 specific, evidenced strengths"],
  "weaknesses": ["3-5 specific weaknesses"],
  "missing_keywords": ["terms that would help for the roles above but are absent"],
  "improvements": ["3-6 concrete, actionable edits"],
  "ats_analysis": {
    "score": 80,
    "issues": ["specific parsing or formatting problems"]
  }
}

Scores are 0-100. Be honest rather than generous — an inflated score is
useless to the candidate.`;
}

export function manualSearchPrompt(description: string): string {
  return `${GROUNDING}

The user described the job they want. Convert it into a structured search
profile. Return JSON only.

USER INPUT:
"""
${description}
"""

Return exactly this shape:
{
  "candidate_profile": {
    "professional_title": "the role they are looking for",
    "seniority": "Intern | Junior | Mid-level | Senior | Lead | Principal | Unknown",
    "years_experience": 3,
    "skills": ["technologies they mentioned"],
    "job_titles": ["2-5 titles to search, including close variants"],
    "preferred_locations": ["locations they named; use 'Remote' if they said remote"],
    "employment_types": ["Full-time | Part-time | Contract | Internship"],
    "workplace_types": ["Remote | Hybrid | On-site"],
    "education": [],
    "industries": []
  }
}

If the user did not state something, use an empty array or "Unknown" rather
than guessing. Years of experience should be 0 if not stated.`;
}
