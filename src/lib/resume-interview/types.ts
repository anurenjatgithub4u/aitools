// Shared types for the AI Resume Analyzer + Mock Interview utility.
// Everything here is framework-agnostic — used by both the API routes
// (server) and the client components that drive the multi-step flow.

export type QuestionType = "resume" | "role"

export interface ResumeExperience {
  company: string
  title: string
  duration: string
  responsibilities: string[]
}

export interface ResumeProject {
  name: string
  technologies: string[]
  role: string
  features: string[]
  challenges: string[]
  claimedResults: string[]
}

export interface ResumeSkills {
  primary: string[]
  secondary: string[]
  tools: string[]
  frameworks: string[]
  languages: string[]
  platforms: string[]
  databases: string[]
  cloud: string[]
  other: string[]
}

// A statement worth challenging in the interview — measurable claims,
// leadership claims, impact claims. This is what the "resume risk areas"
// section of the final report is built from.
export interface ResumeClaim {
  id: string
  statement: string
  sourceContext: string // where in the resume this came from (project/experience name)
}

export interface ResumeProfile {
  experience: ResumeExperience[]
  projects: ResumeProject[]
  skills: ResumeSkills
  education: string[]
  certifications: string[]
  achievements: string[]
  claims: ResumeClaim[]
  suggestedRole: string
}

export interface ScoreBreakdown {
  atsReadiness: number
  clarity: number
  experiencePresentation: number
  technicalSkills: number
  achievementStrength: number
  projectQuality: number
  relevanceToRole: number
  formatting: number
}

export interface ResumeStrength {
  title: string
  detail: string
}

export interface ResumeWeakness {
  title: string
  detail: string
}

export interface ResumeSuggestion {
  problem: string
  whyItMatters: string
  suggestedImprovement: string
  example?: string
}

export interface ResumeAnalysis {
  overallScore: number
  breakdown: ScoreBreakdown
  strengths: ResumeStrength[]
  weaknesses: ResumeWeakness[]
  suggestions: ResumeSuggestion[]
}

export type InterviewMode = "quick" | "standard" | "deep"

export const INTERVIEW_MODES: { value: InterviewMode; label: string; questionCount: number; duration: string }[] = [
  { value: "quick", label: "Quick Interview", questionCount: 5, duration: "~5 minutes" },
  { value: "standard", label: "Standard Interview", questionCount: 10, duration: "~10–15 minutes" },
  { value: "deep", label: "Deep Interview", questionCount: 20, duration: "~20–30 minutes" },
]

export type InterviewDifficulty = "beginner" | "intermediate" | "advanced"

export interface InterviewQuestion {
  id: string
  text: string
  type: QuestionType
  topic: string
  isFollowUp: boolean
  relatedClaimId?: string
}

export interface AnswerEvaluation {
  relevance: number
  technicalAccuracy: number
  depth: number
  specificity: number
  communication: number
}

export interface InterviewTurn {
  question: InterviewQuestion
  answer: string
  evaluation: AnswerEvaluation
}

export interface ReportBreakdown {
  resumeKnowledge: number
  technicalKnowledge: number
  problemSolving: number
  communication: number
  answerDepth: number
}

export interface ReportArea {
  title: string
  detail: string
}

export interface StruggledQuestion {
  question: string
  answerSummary: string
  whatWasMissing: string
  betterApproach: string
}

export interface ResumeRiskArea {
  claim: string
  issue: string
  recommendation: string
}

export interface InterviewReport {
  overallScore: number
  breakdown: ReportBreakdown
  strongestAreas: ReportArea[]
  weakestAreas: ReportArea[]
  struggledQuestions: StruggledQuestion[]
  resumeRiskAreas: ResumeRiskArea[]
  practicePlan: string[]
}

export const COMMON_ROLES = [
  "Software Engineer",
  "Android Developer",
  "iOS Developer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Data Analyst",
  "Data Scientist",
  "Product Manager",
  "UI/UX Designer",
  "DevOps Engineer",
  "QA Engineer",
]
