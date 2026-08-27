// Defensive coercion of AI JSON output into our typed shapes. AI responses
// are usually well-formed given the schema in the prompt, but "usually"
// isn't good enough for something a user is relying on — every field here
// falls back to a safe default rather than letting a malformed response
// crash the route or corrupt interview state.

import type {
  AnswerEvaluation,
  InterviewQuestion,
  InterviewReport,
  QuestionType,
  ResumeAnalysis,
  ResumeClaim,
  ResumeExperience,
  ResumeProfile,
  ResumeProject,
  ResumeSkills,
} from "./types"

function str(v: unknown, max = 500): string {
  return typeof v === "string" ? v.trim().slice(0, max) : ""
}

function strArray(v: unknown, max = 20, itemMax = 300): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim().slice(0, itemMax)).slice(0, max)
}

function num(v: unknown, fallback = 50): number {
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : fallback
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function sanitizeSkills(v: unknown): ResumeSkills {
  const o = (v ?? {}) as Record<string, unknown>
  return {
    primary: strArray(o.primary, 15, 60),
    secondary: strArray(o.secondary, 15, 60),
    tools: strArray(o.tools, 20, 60),
    frameworks: strArray(o.frameworks, 20, 60),
    languages: strArray(o.languages, 15, 60),
    platforms: strArray(o.platforms, 15, 60),
    databases: strArray(o.databases, 15, 60),
    cloud: strArray(o.cloud, 15, 60),
    other: strArray(o.other, 20, 60),
  }
}

export function sanitizeProfile(v: unknown): ResumeProfile {
  const o = (v ?? {}) as Record<string, unknown>

  const experience: ResumeExperience[] = Array.isArray(o.experience)
    ? o.experience.slice(0, 15).map((e) => {
        const ex = (e ?? {}) as Record<string, unknown>
        return {
          company: str(ex.company, 120),
          title: str(ex.title, 120),
          duration: str(ex.duration, 60),
          responsibilities: strArray(ex.responsibilities, 10, 300),
        }
      })
    : []

  const projects: ResumeProject[] = Array.isArray(o.projects)
    ? o.projects.slice(0, 15).map((p) => {
        const pr = (p ?? {}) as Record<string, unknown>
        return {
          name: str(pr.name, 120),
          technologies: strArray(pr.technologies, 15, 60),
          role: str(pr.role, 120),
          features: strArray(pr.features, 10, 200),
          challenges: strArray(pr.challenges, 10, 200),
          claimedResults: strArray(pr.claimedResults, 10, 200),
        }
      })
    : []

  const claims: ResumeClaim[] = Array.isArray(o.claims)
    ? o.claims.slice(0, 12).map((c, i) => {
        const cl = (c ?? {}) as Record<string, unknown>
        return {
          id: str(cl.id, 40) || `claim-${i + 1}`,
          statement: str(cl.statement, 300),
          sourceContext: str(cl.sourceContext, 150),
        }
      }).filter((c) => c.statement.length > 0)
    : []

  return {
    experience,
    projects,
    skills: sanitizeSkills(o.skills),
    education: strArray(o.education, 10, 200),
    certifications: strArray(o.certifications, 10, 200),
    achievements: strArray(o.achievements, 10, 300),
    claims,
    suggestedRole: str(o.suggestedRole, 60) || "Software Engineer",
  }
}

export function sanitizeAnalysis(v: unknown): ResumeAnalysis {
  const o = (v ?? {}) as Record<string, unknown>
  const b = (o.breakdown ?? {}) as Record<string, unknown>

  const breakdown = {
    atsReadiness: num(b.atsReadiness),
    clarity: num(b.clarity),
    experiencePresentation: num(b.experiencePresentation),
    technicalSkills: num(b.technicalSkills),
    achievementStrength: num(b.achievementStrength),
    projectQuality: num(b.projectQuality),
    relevanceToRole: num(b.relevanceToRole),
    formatting: num(b.formatting),
  }

  const avg = Math.round(Object.values(breakdown).reduce((a, x) => a + x, 0) / Object.values(breakdown).length)

  return {
    overallScore: num(o.overallScore, avg),
    breakdown,
    strengths: Array.isArray(o.strengths)
      ? o.strengths.slice(0, 6).map((s) => {
          const x = (s ?? {}) as Record<string, unknown>
          return { title: str(x.title, 80), detail: str(x.detail, 400) }
        }).filter((s) => s.title)
      : [],
    weaknesses: Array.isArray(o.weaknesses)
      ? o.weaknesses.slice(0, 8).map((s) => {
          const x = (s ?? {}) as Record<string, unknown>
          return { title: str(x.title, 80), detail: str(x.detail, 400) }
        }).filter((s) => s.title)
      : [],
    suggestions: Array.isArray(o.suggestions)
      ? o.suggestions.slice(0, 8).map((s) => {
          const x = (s ?? {}) as Record<string, unknown>
          return {
            problem: str(x.problem, 400),
            whyItMatters: str(x.whyItMatters, 400),
            suggestedImprovement: str(x.suggestedImprovement, 400),
            example: x.example ? str(x.example, 400) : undefined,
          }
        }).filter((s) => s.problem)
      : [],
  }
}

export function sanitizeEvaluation(v: unknown): AnswerEvaluation {
  const o = (v ?? {}) as Record<string, unknown>
  return {
    relevance: num(o.relevance),
    technicalAccuracy: num(o.technicalAccuracy),
    depth: num(o.depth),
    specificity: num(o.specificity),
    communication: num(o.communication),
  }
}

export function sanitizeQuestion(v: unknown, type: QuestionType, isFollowUp: boolean): InterviewQuestion {
  const o = (v ?? {}) as Record<string, unknown>
  return {
    id: makeId("q"),
    text: str(o.text, 500) || "Tell me more about your experience relevant to this role.",
    type,
    topic: str(o.topic, 80) || (type === "resume" ? "Experience" : "General knowledge"),
    isFollowUp,
    relatedClaimId: o.relatedClaimId ? str(o.relatedClaimId, 40) : undefined,
  }
}

export function sanitizeReport(v: unknown): InterviewReport {
  const o = (v ?? {}) as Record<string, unknown>
  const b = (o.breakdown ?? {}) as Record<string, unknown>

  const breakdown = {
    resumeKnowledge: num(b.resumeKnowledge),
    technicalKnowledge: num(b.technicalKnowledge),
    problemSolving: num(b.problemSolving),
    communication: num(b.communication),
    answerDepth: num(b.answerDepth),
  }
  const avg = Math.round(Object.values(breakdown).reduce((a, x) => a + x, 0) / Object.values(breakdown).length)

  return {
    overallScore: num(o.overallScore, avg),
    breakdown,
    strongestAreas: Array.isArray(o.strongestAreas)
      ? o.strongestAreas.slice(0, 5).map((s) => {
          const x = (s ?? {}) as Record<string, unknown>
          return { title: str(x.title, 80), detail: str(x.detail, 400) }
        }).filter((s) => s.title)
      : [],
    weakestAreas: Array.isArray(o.weakestAreas)
      ? o.weakestAreas.slice(0, 5).map((s) => {
          const x = (s ?? {}) as Record<string, unknown>
          return { title: str(x.title, 80), detail: str(x.detail, 400) }
        }).filter((s) => s.title)
      : [],
    struggledQuestions: Array.isArray(o.struggledQuestions)
      ? o.struggledQuestions.slice(0, 6).map((s) => {
          const x = (s ?? {}) as Record<string, unknown>
          return {
            question: str(x.question, 400),
            answerSummary: str(x.answerSummary, 300),
            whatWasMissing: str(x.whatWasMissing, 300),
            betterApproach: str(x.betterApproach, 400),
          }
        }).filter((s) => s.question)
      : [],
    resumeRiskAreas: Array.isArray(o.resumeRiskAreas)
      ? o.resumeRiskAreas.slice(0, 6).map((s) => {
          const x = (s ?? {}) as Record<string, unknown>
          return {
            claim: str(x.claim, 300),
            issue: str(x.issue, 300),
            recommendation: str(x.recommendation, 400),
          }
        }).filter((s) => s.claim)
      : [],
    practicePlan: strArray(o.practicePlan, 6, 200),
  }
}
