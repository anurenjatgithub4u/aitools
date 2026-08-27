"use client"

import { Check, Loader2 } from "lucide-react"
import type { StudyMode } from "@/lib/pdf-study/types"

// Stage progress is driven by events the server emits as it works — nothing
// here advances on a timer, so a stage shown as complete really is complete.
export type StageId = "reading" | "topics" | "notes" | "flashcards" | "questions" | "quiz"

const STAGE_LABELS: Record<StageId, string> = {
  reading: "Reading your document",
  topics: "Identifying important topics",
  notes: "Writing your notes",
  flashcards: "Creating flashcards",
  questions: "Preparing questions",
  quiz: "Building your quiz",
}

export function stagesForMode(mode: StudyMode, longDocument: boolean): StageId[] {
  const base: StageId[] = longDocument ? ["reading", "topics"] : ["reading"]
  if (mode === "study-pack") return [...base, "notes", "flashcards", "questions", "quiz"]
  if (mode === "notes") return [...base, "notes"]
  if (mode === "flashcards") return [...base, "flashcards"]
  if (mode === "questions") return [...base, "questions"]
  return [...base, "quiz"]
}

interface ProgressStagesProps {
  stages: StageId[]
  /** The stage the server last reported starting. */
  currentStage: StageId | null
}

export function ProgressStages({ stages, currentStage }: ProgressStagesProps) {
  // A stage is complete once the server has moved past it — that's the only
  // completion signal we have, and it's a true one.
  const activeIndex = currentStage ? stages.indexOf(currentStage) : 0
  const safeActiveIndex = activeIndex < 0 ? 0 : activeIndex

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-6 sm:p-8">
      <h2 className="text-lg font-bold tracking-tight mb-1">Understanding your PDF…</h2>
      <p className="text-sm text-muted-foreground mb-6">
        This usually takes 15–60 seconds, depending on how long your document is.
      </p>

      {/* One spoken update per stage change, rather than a list that
          re-announces itself on every render. */}
      <p className="sr-only" role="status" aria-live="polite">
        {STAGE_LABELS[stages[safeActiveIndex]]}. Step {safeActiveIndex + 1} of {stages.length}.
      </p>

      <ol className="space-y-3">
        {stages.map((stage, index) => {
          const isDone = index < safeActiveIndex
          const isActive = index === safeActiveIndex

          return (
            <li key={stage} className="flex items-center gap-3">
              <span
                className={`h-6 w-6 shrink-0 rounded-full border flex items-center justify-center transition-colors ${
                  isDone
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : isActive
                      ? "border-primary/40 bg-primary/5 text-primary"
                      : "border-border/60 bg-secondary/40 text-muted-foreground"
                }`}
                aria-hidden="true"
              >
                {isDone ? (
                  <Check className="h-3.5 w-3.5" />
                ) : isActive ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                )}
              </span>
              <span
                className={`text-sm ${
                  isDone
                    ? "text-foreground"
                    : isActive
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                }`}
              >
                {STAGE_LABELS[stage]}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
