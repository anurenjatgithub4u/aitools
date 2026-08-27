// Extension points for future Premium AI features (spec §29).
// Intentionally inert: no network calls, no AI logic, not wired into any UI.
// This just gives the free-tier engine stable shapes to hand data to later,
// so Premium can be layered on without reworking TypingPractice/ReadingPractice.
//
// Not implemented yet:
//   - Typing AI Coach (recurring mistakes, targeted drills, consistency analysis)
//   - Reading AI Coach (personalized passages, adaptive difficulty, generated questions)
//   - Speech practice (speaking speed, filler words, pronunciation)
//   - Writing analysis (grammar, readability, rewrites)

import type { ReadingRecord, TypingRecord } from "./types"

export interface TypingCoachInsights {
  frequentlyMistypedKeys: string[]
  recommendedFocus: string
  suggestedDrillId: string | null
}

export interface ReadingCoachInsights {
  recommendedDifficulty: string
  recommendedCategory: string
  suggestedPassageId: string | null
}

// Returns null in the free tier. A Premium implementation would analyze
// `history` (already collected locally, see storage.ts) and return coaching
// output — the free engine doesn't need to change to support that.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- signature documents the future Premium input shape
export function getTypingCoachInsights(_history: TypingRecord[]): TypingCoachInsights | null {
  return null
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- signature documents the future Premium input shape
export function getReadingCoachInsights(_history: ReadingRecord[]): ReadingCoachInsights | null {
  return null
}
