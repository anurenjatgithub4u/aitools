"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Flame, Lightbulb, RotateCcw, Shuffle, Sparkles, Target, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PassageRenderer, StatusLegend } from "./passage-renderer"
import { MistakePractice } from "./mistake-practice"
import type { AlignedWord, AlignmentSummary, PracticeWord } from "@/lib/reading/alignment"
import { statusByExpectedIndex, wordsToPractice } from "@/lib/reading/alignment"
import type { ReadingMetrics } from "@/lib/reading/scoring"
import { paceComment, scoreBand } from "@/lib/reading/scoring"
import { pauseComment, type PauseSummary } from "@/lib/reading/pauses"
import type { CoachFeedback } from "@/lib/reading/coach"

// Results screen (spec: results → review → practice → coach → try again).
//
// Kept to one headline number and four tiles. The spec is explicit that this
// must not become a dashboard — a wall of metrics tells a learner less than
// one clear score plus specific advice.

interface ReadingResultsProps {
  passageTitle: string
  passageText: string
  aligned: AlignedWord[]
  summary: AlignmentSummary
  metrics: ReadingMetrics
  pauses: PauseSummary
  feedback: CoachFeedback | null
  transcript: string
  comprehension: { correct: number; total: number } | null
  personalBest: number | null
  onTryAgain: () => void
  onNewPassage: () => void
}

/** Counts up to the final score. Short and easing-out so it reads as polish
 *  rather than a delay. */
function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(0)

  useEffect(() => {
    // A zero target needs no animation, and the initial state is already 0 —
    // so there's nothing to set, avoiding a synchronous setState here.
    if (target <= 0) return

    let frame = 0
    const start = performance.now()

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(target * eased))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, durationMs])

  return value
}

function MetricCard({
  label,
  value,
  caption,
}: {
  label: string
  value: string
  caption?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-foreground">{value}</p>
      {caption && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{caption}</p>}
    </div>
  )
}

export function ReadingResults({
  passageTitle,
  passageText,
  aligned,
  summary,
  metrics,
  pauses,
  feedback,
  transcript,
  comprehension,
  personalBest,
  onTryAgain,
  onNewPassage,
}: ReadingResultsProps) {
  const displayScore = useCountUp(metrics.score)
  const band = scoreBand(metrics.score)
  const statuses = statusByExpectedIndex(aligned)
  const practiceWords: PracticeWord[] = wordsToPractice(aligned)

  const [practiced, setPracticed] = useState<Set<string>>(new Set())
  const beatBest = personalBest !== null && metrics.score > personalBest
  const shortOfBest = personalBest !== null && !beatBest ? personalBest - metrics.score : null

  return (
    <div className="space-y-8">
      {/* ---- headline ---- */}
      <div>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <div>
            <p className="text-sm font-semibold text-primary">
              {beatBest ? "New personal best!" : metrics.score >= 70 ? "Great work!" : "Nice effort"}
            </p>
            <p className="text-sm text-muted-foreground">Your reading score</p>
            <p className="mt-1 text-6xl font-black tabular-nums tracking-tight text-foreground">
              {displayScore}
              <span className="ml-1 text-2xl font-semibold text-muted-foreground">/100</span>
            </p>
            <p
              className={`text-sm font-semibold ${
                band.tone === "good"
                  ? "text-emerald-500"
                  : band.tone === "ok"
                    ? "text-amber-500"
                    : "text-muted-foreground"
              }`}
            >
              {band.label}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pb-1">
            {summary.bestStreak >= 5 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
                <Flame className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
                <span className="font-semibold tabular-nums">{summary.bestStreak}</span>
                <span className="text-muted-foreground">word streak</span>
              </span>
            )}
            {beatBest && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
                Beat {personalBest}
              </span>
            )}
          </div>
        </div>

        {shortOfBest !== null && shortOfBest > 0 && shortOfBest <= 15 && (
          <p className="mt-3 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground tabular-nums">{shortOfBest}</span>{" "}
            {shortOfBest === 1 ? "point" : "points"} away from your personal best of {personalBest}.
          </p>
        )}
      </div>

      {/* ---- four metrics, no more ---- */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Reading speed" value={`${metrics.wpm} WPM`} caption={paceComment(metrics.wpm)} />
        <MetricCard
          label="Speech accuracy"
          value={`${metrics.accuracy}%`}
          caption={`${summary.correct} of ${summary.totalExpected} words`}
        />
        <MetricCard label="Fluency" value={`${metrics.fluency}%`} caption={pauseComment(pauses)} />
        <MetricCard
          label="Comprehension"
          value={comprehension ? `${comprehension.correct}/${comprehension.total}` : "—"}
          caption={comprehension ? "Questions answered" : "Not answered yet"}
        />
      </div>

      {/* ---- AI coach ---- */}
      {feedback && (
        <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
            <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">AI Coach</h3>
          </div>

          <p className="text-base leading-relaxed text-foreground/90">{feedback.summary}</p>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {feedback.strengths.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  What went well
                </p>
                <ul className="space-y-1.5">
                  {feedback.strengths.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {feedback.improvements.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Focus next time
                </p>
                <ul className="space-y-1.5">
                  {feedback.improvements.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {feedback.grammarNotes.length > 0 && (
            <div className="mt-5 border-t border-border/60 pt-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
                Grammar worth noting
              </p>
              <ul className="space-y-2">
                {feedback.grammarNotes.map((note) => (
                  <li key={`${note.expected}-${note.spoken}`} className="text-sm text-muted-foreground">
                    <span className="text-red-600 line-through dark:text-red-400">{note.spoken}</span>
                    {" → "}
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">{note.expected}</span>
                    <span className="ml-2">{note.note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {feedback.encouragement && (
            <p className="mt-5 text-sm italic text-muted-foreground">{feedback.encouragement}</p>
          )}
        </section>
      )}

      {/* ---- word-by-word review ---- */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">Your reading</h3>
          <StatusLegend />
        </div>

        <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <h4 className="mb-3 text-sm font-semibold text-muted-foreground">{passageTitle}</h4>
          <PassageRenderer text={passageText} statuses={statuses} size="review" />
        </div>

        {transcript && (
          <details className="mt-3 group">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
              What we heard
            </summary>
            <p className="mt-2 rounded-lg border border-border/60 bg-card/50 p-3 text-sm italic leading-relaxed text-muted-foreground">
              &ldquo;{transcript}&rdquo;
            </p>
          </details>
        )}
      </section>

      {/* ---- practice ---- */}
      {practiceWords.length > 0 && (
        <MistakePractice
          words={practiceWords}
          practiced={practiced}
          onPracticed={(word) => setPracticed((prev) => new Set(prev).add(word))}
        />
      )}

      {/* ---- always a next step ---- */}
      <div className="flex flex-wrap gap-3 border-t border-border/60 pt-6">
        <Button size="lg" onClick={onTryAgain} className="cursor-pointer gap-2">
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Try Again
        </Button>
        <Button size="lg" variant="outline" onClick={onNewPassage} className="cursor-pointer gap-2">
          <Shuffle className="h-4 w-4" aria-hidden="true" />
          New Passage
        </Button>
      </div>
    </div>
  )
}
