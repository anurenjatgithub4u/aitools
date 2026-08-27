// Local history for read-aloud sessions.
//
// Kept in its own storage key rather than extending the existing reading
// records: the silent-reading history feeds the progress dashboard, and mixing
// a different metric set into it would corrupt those charts. This is additive
// and leaves the typing/reading history untouched.

const STORAGE_KEY = "findurai:read-aloud:v1"
const MAX_RECORDS = 50

export interface ReadAloudRecord {
  date: string
  passageId: string
  score: number
  wpm: number
  accuracy: number
  fluency: number
  comprehensionCorrect: number | null
  comprehensionTotal: number | null
  difficulty: string
  category: string
}

// useSyncExternalStore calls getSnapshot on every render, so the parsed value
// is cached and only recomputed when a record is actually written. Returning a
// freshly parsed array each time would also break the store's identity check.
let cache: ReadAloudRecord[] | null = null
const listeners = new Set<() => void>()

/** Subscribes to history changes. Paired with the getters below for
 *  useSyncExternalStore. */
export function subscribeHistory(callback: () => void): () => void {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

function invalidate(): void {
  cache = null
  for (const listener of listeners) listener()
}

function read(): ReadAloudRecord[] {
  if (cache) return cache
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    cache = Array.isArray(parsed) ? (parsed as ReadAloudRecord[]) : []
    return cache
  } catch {
    // Corrupt or unavailable storage must never break a reading session.
    cache = []
    return cache
  }
}

export function saveReadAloudRecord(record: ReadAloudRecord): void {
  if (typeof window === "undefined") return
  try {
    const next = [record, ...read()].slice(0, MAX_RECORDS)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    invalidate()
  } catch {
    /* private browsing or a full quota — history is a nicety, not a feature */
  }
}

export function getReadAloudRecords(): ReadAloudRecord[] {
  return read()
}

/** Best score so far, or null on a first attempt. Read before saving the
 *  current run so "you beat your best" compares against the right number. */
export function getPersonalBest(): number | null {
  const records = read()
  if (records.length === 0) return null
  return records.reduce((best, r) => Math.max(best, r.score), 0)
}

/** Consecutive days with at least one session, counting back from today. */
export function getStreak(): number {
  const records = read()
  if (records.length === 0) return 0

  const days = new Set(records.map((r) => r.date.slice(0, 10)))
  const day = new Date()
  let streak = 0

  // Today not being present is fine — the streak is still alive until
  // tomorrow, so start from yesterday in that case.
  if (!days.has(day.toISOString().slice(0, 10))) {
    day.setDate(day.getDate() - 1)
  }

  while (days.has(day.toISOString().slice(0, 10))) {
    streak++
    day.setDate(day.getDate() - 1)
  }

  return streak
}

/** Server snapshots — no localStorage during SSR, so both render "no history"
 *  and hydration matches. */
export const serverPersonalBest = (): number | null => null
export const serverStreak = (): number => 0
