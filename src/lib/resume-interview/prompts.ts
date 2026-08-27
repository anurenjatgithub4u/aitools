import type { InterviewQuestion, InterviewTurn, QuestionType, ResumeProfile } from "./types"

// ---------------------------------------------------------------------------
// Resume analysis + extraction
// ---------------------------------------------------------------------------

export function buildAnalyzePrompt(resumeText: string): string {
  return `You are an experienced technical recruiter and resume reviewer. Analyze the following resume text and return structured JSON only — no commentary outside the JSON.

RESUME TEXT:
"""
${resumeText}
"""

Do two things:

1. EXTRACT a structured knowledge base from the resume ("profile"). Only include information that is actually present in the text — never invent companies, projects, technologies, numbers, or responsibilities. If a section is genuinely absent (e.g. no certifications), return an empty array for it.

2. ANALYZE the resume ("analysis") like a recruiter screening it for relevance and quality. Every score must be defensible from the actual text — do not give a score without a reason grounded in what's written.

Return JSON matching exactly this shape:
{
  "profile": {
    "experience": [{ "company": "", "title": "", "duration": "", "responsibilities": ["..."] }],
    "projects": [{ "name": "", "technologies": ["..."], "role": "", "features": ["..."], "challenges": ["..."], "claimedResults": ["..."] }],
    "skills": {
      "primary": ["core skills the resume emphasizes most"],
      "secondary": ["supporting skills mentioned less prominently"],
      "tools": [], "frameworks": [], "languages": [], "platforms": [], "databases": [], "cloud": [], "other": []
    },
    "education": ["degree, institution, year if present"],
    "certifications": [],
    "achievements": ["notable achievements not already captured under experience/projects"],
    "claims": [
      { "id": "claim-1", "statement": "the exact or lightly paraphrased claim, e.g. 'Improved API response time by 40%'", "sourceContext": "which project or role this came from" }
    ],
    "suggestedRole": "the job title/role this resume is most clearly aimed at, based on its content — your best inference, one short label like 'Android Developer'"
  },
  "analysis": {
    "overallScore": 0-100,
    "breakdown": {
      "atsReadiness": 0-100,
      "clarity": 0-100,
      "experiencePresentation": 0-100,
      "technicalSkills": 0-100,
      "achievementStrength": 0-100,
      "projectQuality": 0-100,
      "relevanceToRole": 0-100,
      "formatting": 0-100
    },
    "strengths": [{ "title": "short label", "detail": "1-2 sentences citing specific evidence from the resume" }],
    "weaknesses": [{ "title": "short label", "detail": "1-2 sentences citing specific evidence from the resume" }],
    "suggestions": [
      {
        "problem": "what's weak, quoting or closely paraphrasing the actual resume line where relevant",
        "whyItMatters": "how this affects how a recruiter or interviewer reads it",
        "suggestedImprovement": "a concrete, practical way to improve it",
        "example": "optional — a short before/after style example"
      }
    ]
  }
}

Rules:
- "claims" should capture measurable or notable statements a skeptical interviewer might reasonably question — performance numbers, scale claims, leadership claims, "led", "improved", "reduced", "built from scratch", etc. Extract 3-8 of the strongest ones. If the resume genuinely has none, return an empty array — do not invent claims.
- Give 3-5 strengths and 3-6 weaknesses, each with real evidence.
- Give 3-6 suggestions, ordered by importance. Diagnose and recommend — do not rewrite the whole resume.
- Do not criticize the absence of something unless it's genuinely relevant (e.g. don't penalize a student resume for lacking 5 years of leadership experience).
- "relevanceToRole" should be scored against "suggestedRole" since no target role has been chosen yet.
- overallScore should roughly reflect the breakdown average, weighted toward relevanceToRole, technicalSkills, and achievementStrength.`
}

// ---------------------------------------------------------------------------
// Interview question generation + answer evaluation
//
// These are deliberately two separate prompts, called sequentially, rather
// than one combined call: whether the NEXT turn should be a follow-up
// depends on the evaluation of the current answer (see schedule.ts), so the
// evaluation has to come back before we know what to ask the model to
// generate next.
// ---------------------------------------------------------------------------

function summarizeProfile(profile: ResumeProfile): string {
  return JSON.stringify(
    {
      experience: profile.experience,
      projects: profile.projects,
      skills: profile.skills,
      education: profile.education,
      certifications: profile.certifications,
      achievements: profile.achievements,
      claims: profile.claims,
    },
    null,
    2
  )
}

export function buildEvaluationPrompt(question: InterviewQuestion, answer: string): string {
  return `You are a real, honest technical interviewer evaluating a candidate's answer. Do not be generous by default — evaluate it the way a skeptical but fair interviewer would.

Question asked:
"${question.text}"

Candidate's answer:
"${answer}"

Return JSON only, matching exactly this shape:
{
  "relevance": 0-100 — did they actually answer what was asked?,
  "technicalAccuracy": 0-100 — is what they said correct, to the extent it can be judged?,
  "depth": 0-100 — does the answer show real understanding, or is it surface-level?,
  "specificity": 0-100 — concrete details and examples, or vague generalities?,
  "communication": 0-100 — is it clearly structured and easy to follow?
}

If the answer is empty, off-topic, or just "I don't know," score honestly low rather than assuming good intent.`
}

interface NextQuestionPromptInput {
  profile: ResumeProfile
  targetRole: string
  type: QuestionType
  isFollowUp: boolean
  history: InterviewTurn[]
  questionNumber: number
  totalQuestions: number
}

export function buildNextQuestionPrompt(input: NextQuestionPromptInput): string {
  const { profile, targetRole, type, isFollowUp, history, questionNumber, totalQuestions } = input

  const askedSoFar = history.map((t) => `- (${t.question.type}${t.question.isFollowUp ? ", follow-up" : ""}) ${t.question.text}`).join("\n") || "(none yet)"
  const unaskedClaims = profile.claims.filter((c) => !history.some((t) => t.question.relatedClaimId === c.id))
  const lastTurn = history[history.length - 1]

  const instruction = isFollowUp && lastTurn
    ? `The candidate's last answer was somewhat vague or shallow. Generate ONE follow-up question that digs deeper into it specifically — probe for the detail, specificity, or reasoning that was missing. Do not just repeat the same question differently; push them one level deeper (e.g. "what was the baseline you measured against?", "why did you choose that approach over an alternative?").

Their last question was: "${lastTurn.question.text}"
Their last answer was: "${lastTurn.answer}"`
    : type === "resume"
      ? `Generate the next interview question. It must be a RESUME-BASED question, built only from the candidate's actual resume content below — reference something specific and real (a project, a responsibility, a technology, or ideally an unaddressed claim if one exists). Prefer challenging an unaddressed claim if the list below is non-empty. Do not invent details not present in the resume. Do not repeat a topic already asked (see list below).`
      : `Generate the next interview question. It must be a ROLE-BASED question testing general knowledge relevant to the target role "${targetRole}" — a fundamental, practical, or scenario-based question a real interviewer would ask for this role, appropriate to the candidate's apparent seniority based on their resume. This question does not need to reference the resume at all. Do not repeat a topic already asked.`

  return `You are conducting a realistic technical mock interview. You are generating question ${questionNumber} of ${totalQuestions}.

CANDIDATE'S RESUME PROFILE (only source of truth for resume-based questions):
${summarizeProfile(profile)}

TARGET ROLE: ${targetRole}

QUESTIONS ALREADY ASKED THIS INTERVIEW:
${askedSoFar}

UNADDRESSED CLAIMS WORTH CHALLENGING (prefer these for resume-based questions when relevant):
${unaskedClaims.length ? unaskedClaims.map((c) => `- [${c.id}] "${c.statement}" (from ${c.sourceContext})`).join("\n") : "(none remaining)"}

${instruction}

Return JSON only, matching exactly this shape:
{
  "text": "the question, phrased naturally the way an interviewer would actually say it",
  "topic": "short topic label, e.g. 'API error handling' or 'Android lifecycle'",
  "relatedClaimId": "the claim id this question challenges, if applicable, otherwise omit this field"
}

Never invent resume details that aren't in the profile above. For a role-based question, treat it clearly as general domain knowledge, not something claimed from the resume.`
}

// ---------------------------------------------------------------------------
// Final report
// ---------------------------------------------------------------------------

export function buildReportPrompt(profile: ResumeProfile, targetRole: string, history: InterviewTurn[]): string {
  const transcript = history
    .map(
      (t, i) =>
        `Q${i + 1} [${t.question.type}${t.question.isFollowUp ? ", follow-up" : ""}${t.question.relatedClaimId ? `, challenges ${t.question.relatedClaimId}` : ""}]: ${t.question.text}\nAnswer: ${t.answer}\nEvaluation: relevance ${t.evaluation.relevance}, accuracy ${t.evaluation.technicalAccuracy}, depth ${t.evaluation.depth}, specificity ${t.evaluation.specificity}, communication ${t.evaluation.communication}`
    )
    .join("\n\n")

  return `You are summarizing a completed mock interview for a candidate targeting the role of "${targetRole}". Below is the full transcript with per-answer evaluation scores already computed. Use these scores as ground truth — do not re-score from scratch, but you may weigh them into an overall judgment.

CANDIDATE'S RESUME CLAIMS (for the "resume risk areas" section):
${JSON.stringify(profile.claims, null, 2)}

FULL TRANSCRIPT:
${transcript}

Return JSON only, matching exactly this shape:
{
  "overallScore": 0-100,
  "breakdown": {
    "resumeKnowledge": 0-100,
    "technicalKnowledge": 0-100,
    "problemSolving": 0-100,
    "communication": 0-100,
    "answerDepth": 0-100
  },
  "strongestAreas": [{ "title": "short label", "detail": "1-2 sentences citing what they did well, referencing a specific answer" }],
  "weakestAreas": [{ "title": "short label", "detail": "1-2 sentences citing where they struggled, referencing a specific answer" }],
  "struggledQuestions": [
    {
      "question": "the question text",
      "answerSummary": "1 sentence summarizing what they actually said",
      "whatWasMissing": "what a strong answer would have included that theirs didn't",
      "betterApproach": "practical guidance on how to answer this kind of question well next time"
    }
  ],
  "resumeRiskAreas": [
    {
      "claim": "the resume claim, quoted",
      "issue": "why this claim looks weak based on how they defended it (or didn't) in the interview",
      "recommendation": "what they should be ready to explain about this claim next time"
    }
  ],
  "practicePlan": ["3-5 short, specific next practice areas, ordered by priority"]
}

Rules:
- Base struggledQuestions only on questions where the evaluation scores were genuinely low (below ~60 on depth or specificity) — 2-5 questions, not every question.
- Base resumeRiskAreas only on claims that were actually asked about and defended poorly, or claims never tested that seem risky given how thin the surrounding evidence is. If nothing qualifies, return an empty array — do not invent risk.
- Ground every section in the actual transcript. Do not generate generic career advice unconnected to what happened in this interview.`
}
