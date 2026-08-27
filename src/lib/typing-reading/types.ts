// Shared types for the Typing & Reading Speed utility.
// Kept framework-agnostic (no React imports) so calculations/storage stay
// easily testable and reusable if the tool ever needs a non-DOM entry point.

export type Difficulty = "beginner" | "intermediate" | "advanced"

export type Category =
  | "general"
  | "technology"
  | "business"
  | "education"
  | "science"
  | "productivity"
  | "career"

export const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
]

export const CATEGORIES: { value: Category; label: string }[] = [
  { value: "general", label: "General" },
  { value: "technology", label: "Technology" },
  { value: "business", label: "Business" },
  { value: "education", label: "Education" },
  { value: "science", label: "Science" },
  { value: "productivity", label: "Productivity" },
  { value: "career", label: "Career" },
]

// ---------------------------------------------------------------------------
// Typing
// ---------------------------------------------------------------------------

export interface TypingPassage {
  id: string
  text: string
  difficulty: Difficulty
  category: Category
}

export type TypingTestMode = "time" | "words"

export type TypingTimeOption = 15 | 30 | 60 | 120
export type TypingWordsOption = "short" | "medium" | "long"

export const TYPING_TIME_OPTIONS: { value: TypingTimeOption; label: string }[] = [
  { value: 15, label: "15s" },
  { value: 30, label: "30s" },
  { value: 60, label: "60s" },
  { value: 120, label: "2 min" },
]

export const TYPING_WORDS_OPTIONS: { value: TypingWordsOption; label: string; approxWords: number }[] = [
  { value: "short", label: "Short", approxWords: 50 },
  { value: "medium", label: "Medium", approxWords: 100 },
  { value: "long", label: "Long", approxWords: 250 },
]

export interface TypingResult {
  wpm: number
  accuracy: number
  elapsedMs: number
  errorEvents: number
  correctedErrors: number
  uncorrectedErrors: number
  correctCharacters: number
  incorrectCharacters: number
  totalCharacters: number
  totalWords: number
  consistencyScore: number
  consistencyLabel: string
}

export interface TypingRecord {
  date: string // ISO string
  wpm: number
  accuracy: number
  errors: number
  elapsedMs: number
  difficulty: Difficulty
  category: Category
  mode: TypingTestMode
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

export interface ReadingQuestion {
  id: string
  question: string
  options: string[]
  correctIndex: number
}

export interface ReadingPassage {
  id: string
  title: string
  text: string
  difficulty: Difficulty
  category: Category
  questions: ReadingQuestion[]
}

export interface ReadingResult {
  wpm: number
  comprehension: number
  readingTimeMs: number
  wordCount: number
  correctAnswers: number
  totalQuestions: number
}

export interface ReadingRecord {
  date: string // ISO string
  wpm: number
  comprehension: number
  readingTimeMs: number
  difficulty: Difficulty
  category: Category
  correctAnswers: number
  totalQuestions: number
}
