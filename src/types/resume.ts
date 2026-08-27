export interface ResumeBasics {
  name: string
  title: string
  email: string
  phone: string
  location: string
  linkedin: string
  portfolio: string
  github?: string
}

export interface ResumeExperience {
  id: string
  company: string
  position: string
  location: string
  startDate: string
  endDate: string
  current: boolean
  bullets: string[]
}

export interface ResumeEducation {
  id: string
  institution: string
  degree: string
  field: string
  startDate: string
  endDate: string
  details: string
}

export interface ResumeSkillCategory {
  id: string
  category: string
  items: string[]
}

export interface ResumeProject {
  id: string
  name: string
  description: string
  technologies: string[]
  url?: string
}

export interface ResumeSettings {
  templateId: string
  fontFamily: string
  fontSize: 'sm' | 'md' | 'lg'
  fontSizeNumeric?: number
  fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold'
  isItalic?: boolean
  isUnderline?: boolean
  isStrikethrough?: boolean
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize'
  textAlign?: 'left' | 'center' | 'right' | 'justify'
  spacing: 'compact' | 'normal' | 'spacious'
  lineHeight?: 'tight' | 'normal' | 'relaxed'
  letterSpacing?: 'tight' | 'normal' | 'wide'
  textEffect?: 'none' | 'shadow' | 'outline' | 'subtle'
  accentColor: string
}

export interface ResumeScoreSuggestion {
  id: string
  category: 'content' | 'relevance' | 'structure' | 'clarity' | 'formatting'
  title: string
  description: string
  fixPrompt: string
}

export interface ResumeScore {
  total: number
  breakdown: {
    content: number
    relevance: number
    structure: number
    clarity: number
    formatting: number
  }
  suggestions: ResumeScoreSuggestion[]
}

export interface JobMatchAnalysis {
  matchScore: number
  matchingSkills: string[]
  missingKeywords: string[]
  recommendations: string[]
}

export interface ResumeData {
  id: string
  userId?: string
  title: string
  targetRole: string
  experienceLevel?: string
  resumeType?: string
  sourcePrompt?: string
  referenceContext?: string
  jobDescription?: string
  basics: ResumeBasics
  summary: string
  experience: ResumeExperience[]
  education: ResumeEducation[]
  skills: ResumeSkillCategory[]
  projects: ResumeProject[]
  certifications: string[]
  achievements: string[]
  languages: string[]
  settings: ResumeSettings
  score?: ResumeScore
  jobMatch?: JobMatchAnalysis
  createdAt: string
  updatedAt: string
}
