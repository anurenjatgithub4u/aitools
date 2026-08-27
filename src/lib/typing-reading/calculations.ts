// Pure calculation helpers — no DOM, no React — so the scoring logic stays
// easy to reason about and reuse (e.g. from a future test suite).

// Standard convention: 1 "word" = 5 characters.
export function computeWpm(charactersTyped: number, elapsedMs: number): number {
  if (elapsedMs <= 0) return 0
  const minutes = elapsedMs / 60000
  const wpm = (charactersTyped / 5) / minutes
  return Math.max(0, Math.round(wpm))
}

export function computeAccuracy(correctKeystrokes: number, totalKeystrokes: number): number {
  if (totalKeystrokes <= 0) return 100
  return Math.max(0, Math.min(100, (correctKeystrokes / totalKeystrokes) * 100))
}

// Sensible formatting: whole numbers show as "98%", everything else to one
// decimal place ("98.4%") — avoids both false precision and over-rounding.
export function formatAccuracy(value: number): string {
  if (Number.isInteger(value)) return `${value}%`
  return `${value.toFixed(1)}%`
}

export function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

export interface ConsistencyInput {
  /** Live WPM sampled at a regular interval throughout the session. */
  wpmSamples: number[]
  /** Count of gaps between keystrokes longer than the pause threshold. */
  pauseCount: number
  /** errorEvents / totalKeystrokes, 0–1. */
  errorRate: number
}

export interface ConsistencyResult {
  score: number
  label: string
}

// Transparent, data-driven consistency score (spec §10) — not an arbitrary
// AI-generated number. It combines three observable signals:
//   1. Coefficient of variation of the WPM samples (how much pace wobbled)
//   2. How often the user paused mid-test for longer than ~2s
//   3. The raw error rate
// Each signal is weighted and the result is clamped to 0–100.
export function computeConsistency({ wpmSamples, pauseCount, errorRate }: ConsistencyInput): ConsistencyResult {
  if (wpmSamples.length < 2) {
    return { score: 100, label: "Excellent" }
  }
  const mean = wpmSamples.reduce((a, b) => a + b, 0) / wpmSamples.length
  if (mean <= 0) return { score: 0, label: "Needs work" }

  const variance = wpmSamples.reduce((sum, v) => sum + (v - mean) ** 2, 0) / wpmSamples.length
  const stdDev = Math.sqrt(variance)
  const coefficientOfVariation = stdDev / mean // 0 = perfectly steady pace

  const paceScore = Math.max(0, 100 - coefficientOfVariation * 140)
  const pausePenalty = Math.min(40, pauseCount * 6)
  const errorPenalty = Math.min(30, errorRate * 100 * 0.5)

  const score = Math.round(Math.max(0, Math.min(100, paceScore - pausePenalty - errorPenalty)))
  const label = score >= 85 ? "Excellent" : score >= 70 ? "Good" : score >= 50 ? "Fair" : "Needs work"
  return { score, label }
}

export function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}
