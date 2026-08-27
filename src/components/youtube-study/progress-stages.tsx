"use client"

import { Check, Circle, Loader2 } from "lucide-react"
import type { JobStatus } from "@/lib/youtube-study/types"

// Progress display (spec §20).
//
// Every row here corresponds to a real backend job state. There is no
// synthetic percentage and nothing advances on a timer — a stage shows as
// complete only because the server has actually moved past it. A progress bar
// that creeps to 90% and stalls is worse than an honest list of steps.

export interface StageView {
  stage: JobStatus
  state: "done" | "active" | "pending"
}

const LABELS: Partial<Record<JobStatus, string>> = {
  VALIDATING: "Video validated",
  FETCHING_TRANSCRIPT: "Transcript retrieved",
  CHECKING_TRANSCRIPT: "Transcript quality checked",
  EXTRACTING_KNOWLEDGE: "Extracting key concepts",
  GENERATING_OUTPUT: "Creating your output",
  COMPLETED: "Finalising",
}

interface ProgressStagesProps {
  stages: StageView[]
  /** Chunk counters, shown only while knowledge extraction is running. */
  chunksDone?: number
  chunksTotal?: number
  onCancel?: () => void
}

export function ProgressStages({ stages, chunksDone, chunksTotal, onCancel }: ProgressStagesProps) {
  const active = stages.find((s) => s.state === "active")

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-6 sm:p-8">
      <h2 className="text-lg font-bold tracking-tight mb-1">Analysing your video…</h2>
      <p className="text-sm text-muted-foreground mb-6">
        This usually takes 30–90 seconds, depending on the video&apos;s length.
      </p>

      {/* One spoken update per stage change rather than a list that
          re-announces itself on every poll. */}
      <p className="sr-only" role="status" aria-live="polite">
        {active ? LABELS[active.stage] : "Starting"}
      </p>

      <ol className="space-y-3">
        {stages.map(({ stage, state }) => {
          const label = LABELS[stage]
          if (!label) return null

          const showChunks =
            stage === "EXTRACTING_KNOWLEDGE" &&
            state === "active" &&
            typeof chunksTotal === "number" &&
            chunksTotal > 1

          return (
            <li key={stage} className="flex items-center gap-3">
              <span className="shrink-0">
                {state === "done" ? (
                  <Check className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                ) : state === "active" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground/40" aria-hidden="true" />
                )}
              </span>
              <span
                className={`text-sm ${
                  state === "done"
                    ? "text-foreground"
                    : state === "active"
                      ? "font-medium text-foreground"
                      : "text-muted-foreground/60"
                }`}
              >
                {label}
                {showChunks && (
                  <span className="ml-2 text-xs text-muted-foreground tabular-nums">
                    section {chunksDone ?? 0} of {chunksTotal}
                  </span>
                )}
              </span>
            </li>
          )
        })}
      </ol>

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="mt-6 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          Cancel
        </button>
      )}
    </div>
  )
}
