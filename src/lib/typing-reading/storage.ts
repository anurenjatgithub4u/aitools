// Local persistence for the free tier (spec §21/§36) — no login, no server
// upload. Everything lives in localStorage under one namespaced key.
// All functions are guarded for SSR since this is only ever called from
// client components, but Next can still evaluate the module on the server.

import type { ReadingRecord, TypingRecord } from "./types"
import { average } from "./calculations"

const STORAGE_KEY = "findurai:typing-reading:v1"
const MAX_RECORDS = 200 // keep history bounded
const UPDATE_EVENT = "findurai:typing-reading:updated"

interface StoreShape {
  typing: TypingRecord[]
  reading: ReadingRecord[]
}

function isBrowser(): boolean {
  return typeof window !== "undefined"
}

function readStore(): StoreShape {
  if (!isBrowser()) return { typing: [], reading: [] }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { typing: [], reading: [] }
    const parsed = JSON.parse(raw)
    return {
      typing: Array.isArray(parsed.typing) ? parsed.typing : [],
      reading: Array.isArray(parsed.reading) ? parsed.reading : [],
    }
  } catch {
    return { typing: [], reading: [] }
  }
}

function writeStore(store: StoreShape) {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT))
  } catch {
    // localStorage can throw in private-browsing/quota-exceeded situations —
    // practice still works for the current session, it just won't persist.
  }
}

// Lets the progress dashboard react to a new session being saved without
// prop-drilling a refresh callback through the practice components.
export function subscribeToHistoryUpdates(callback: () => void): () => void {
  if (!isBrowser()) return () => {}
  window.addEventListener(UPDATE_EVENT, callback)
  return () => window.removeEventListener(UPDATE_EVENT, callback)
}

export function saveTypingRecord(record: TypingRecord) {
  const store = readStore()
  store.typing = [record, ...store.typing].slice(0, MAX_RECORDS)
  writeStore(store)
}

export function saveReadingRecord(record: ReadingRecord) {
  const store = readStore()
  store.reading = [record, ...store.reading].slice(0, MAX_RECORDS)
  writeStore(store)
}

export function getTypingHistory(): TypingRecord[] {
  return readStore().typing
}

export function getReadingHistory(): ReadingRecord[] {
  return readStore().reading
}

export interface StatSummary {
  current: number
  best: number
  average: number
  hasData: boolean
}

function summarize(values: number[], preferHigher = true): StatSummary {
  if (values.length === 0) return { current: 0, best: 0, average: 0, hasData: false }
  const current = values[0]
  const best = preferHigher ? Math.max(...values) : Math.min(...values)
  return { current, best, average: Math.round(average(values)), hasData: true }
}

export function getTypingWpmStats(): StatSummary {
  return summarize(getTypingHistory().map((r) => r.wpm))
}

export function getTypingAccuracyStats(): StatSummary {
  const history = getTypingHistory()
  if (history.length === 0) return { current: 0, best: 0, average: 0, hasData: false }
  return {
    current: Math.round(history[0].accuracy * 10) / 10,
    best: Math.round(Math.max(...history.map((r) => r.accuracy)) * 10) / 10,
    average: Math.round(average(history.map((r) => r.accuracy)) * 10) / 10,
    hasData: true,
  }
}

export function getReadingWpmStats(): StatSummary {
  return summarize(getReadingHistory().map((r) => r.wpm))
}

export function getReadingComprehensionStats(): StatSummary {
  const history = getReadingHistory()
  if (history.length === 0) return { current: 0, best: 0, average: 0, hasData: false }
  return {
    current: Math.round(history[0].comprehension),
    best: Math.round(Math.max(...history.map((r) => r.comprehension))),
    average: Math.round(average(history.map((r) => r.comprehension))),
    hasData: true,
  }
}

export interface PersonalBests {
  fastestTyping: number | null
  bestTypingAccuracy: number | null
  fastestReading: number | null
  bestComprehension: number | null
}

export function getPersonalBests(): PersonalBests {
  const typing = getTypingHistory()
  const reading = getReadingHistory()
  return {
    fastestTyping: typing.length ? Math.max(...typing.map((r) => r.wpm)) : null,
    bestTypingAccuracy: typing.length ? Math.max(...typing.map((r) => r.accuracy)) : null,
    fastestReading: reading.length ? Math.max(...reading.map((r) => r.wpm)) : null,
    bestComprehension: reading.length ? Math.max(...reading.map((r) => r.comprehension)) : null,
  }
}

export function clearHistory() {
  writeStore({ typing: [], reading: [] })
}
