"use client"

import { useEffect, useState } from "react"
import { Award, BookOpenCheck, Brain, Keyboard } from "lucide-react"
import { MiniBarChart } from "./mini-bar-chart"
import {
  getPersonalBests,
  getReadingComprehensionStats,
  getReadingHistory,
  getReadingWpmStats,
  getTypingAccuracyStats,
  getTypingHistory,
  getTypingWpmStats,
  subscribeToHistoryUpdates,
  type StatSummary,
} from "@/lib/typing-reading/storage"
import { formatAccuracy } from "@/lib/typing-reading/calculations"

function StatRow({ label, stats, suffix = "" }: { label: string; stats: StatSummary; suffix?: string }) {
  if (!stats.hasData) {
    return (
      <div>
        <p className="text-sm font-semibold text-foreground mb-2">{label}</p>
        <p className="text-sm text-muted-foreground">No sessions yet — complete a practice run to see your stats.</p>
      </div>
    )
  }
  return (
    <div>
      <p className="text-sm font-semibold text-foreground mb-2">{label}</p>
      <div className="flex flex-wrap gap-x-8 gap-y-1 text-sm">
        <span className="text-muted-foreground">
          Current: <span className="font-medium text-foreground tabular-nums">{stats.current}{suffix}</span>
        </span>
        <span className="text-muted-foreground">
          Best: <span className="font-medium text-foreground tabular-nums">{stats.best}{suffix}</span>
        </span>
        <span className="text-muted-foreground">
          Average: <span className="font-medium text-foreground tabular-nums">{stats.average}{suffix}</span>
        </span>
      </div>
    </div>
  )
}

export function ProgressDashboard() {
  const [mounted, setMounted] = useState(false)
  const [refreshTick, setRefreshTick] = useState(0)

  // localStorage only exists client-side, so the server render (and the
  // client's very first paint, which must match it for hydration) can never
  // know a device's practice history in advance. This is the standard,
  // deliberate exception to "avoid setState in an effect": mounted flips to
  // true right after that first paint, once it's safe to diverge from SSR.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- required to sync with an SSR-inaccessible browser API; see comment above
    setMounted(true)
    return subscribeToHistoryUpdates(() => setRefreshTick((t) => t + 1))
  }, [])

  if (!mounted) return null

  const typingWpm = getTypingWpmStats()
  const typingAccuracy = getTypingAccuracyStats()
  const readingWpm = getReadingWpmStats()
  const readingComprehension = getReadingComprehensionStats()
  const bests = getPersonalBests()
  const typingHistory = getTypingHistory()
  const readingHistory = getReadingHistory()

  const hasAnyData = typingHistory.length > 0 || readingHistory.length > 0

  return (
    <div key={refreshTick} className="space-y-10">
      <div>
        <h2 className="text-xl font-bold tracking-tight mb-1">Your Progress</h2>
        <p className="text-sm text-muted-foreground">Based on sessions saved on this device.</p>
      </div>

      {!hasAnyData ? (
        <p className="text-sm text-muted-foreground rounded-xl border border-dashed border-border/60 p-6">
          Complete a typing or reading session to start building your progress history.
        </p>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 gap-x-10 gap-y-8">
            <StatRow label="Typing — WPM" stats={typingWpm} />
            <StatRow label="Typing — Accuracy" stats={typingAccuracy} suffix="%" />
            <StatRow label="Reading — WPM" stats={readingWpm} />
            <StatRow label="Reading — Comprehension" stats={readingComprehension} suffix="%" />
          </div>

          <div className="grid sm:grid-cols-2 gap-x-10 gap-y-8">
            <div>
              <p className="text-sm font-semibold text-foreground mb-3">Typing WPM over time</p>
              <MiniBarChart values={typingHistory.map((r) => r.wpm)} emptyLabel="No typing sessions yet" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground mb-3">Typing accuracy over time</p>
              <MiniBarChart values={typingHistory.map((r) => Math.round(r.accuracy))} suffix="%" emptyLabel="No typing sessions yet" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground mb-3">Reading WPM over time</p>
              <MiniBarChart values={readingHistory.map((r) => r.wpm)} emptyLabel="No reading sessions yet" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground mb-3">Reading comprehension over time</p>
              <MiniBarChart values={readingHistory.map((r) => Math.round(r.comprehension))} suffix="%" emptyLabel="No reading sessions yet" />
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground mb-4">Personal Bests</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {bests.fastestTyping !== null && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <Keyboard className="h-4 w-4 text-primary mb-2" />
                  <p className="text-xs text-muted-foreground">Fastest Typing</p>
                  <p className="text-lg font-bold tabular-nums">{bests.fastestTyping} WPM</p>
                </div>
              )}
              {bests.bestTypingAccuracy !== null && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <Award className="h-4 w-4 text-primary mb-2" />
                  <p className="text-xs text-muted-foreground">Best Accuracy</p>
                  <p className="text-lg font-bold tabular-nums">{formatAccuracy(bests.bestTypingAccuracy)}</p>
                </div>
              )}
              {bests.fastestReading !== null && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <BookOpenCheck className="h-4 w-4 text-primary mb-2" />
                  <p className="text-xs text-muted-foreground">Fastest Reading</p>
                  <p className="text-lg font-bold tabular-nums">{bests.fastestReading} WPM</p>
                </div>
              )}
              {bests.bestComprehension !== null && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <Brain className="h-4 w-4 text-primary mb-2" />
                  <p className="text-xs text-muted-foreground">Best Comprehension</p>
                  <p className="text-lg font-bold tabular-nums">{Math.round(bests.bestComprehension)}%</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
