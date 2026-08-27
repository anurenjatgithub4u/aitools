"use client"

import { AlertCircle, Mic, MicOff, Pause, Play, Square } from "lucide-react"
import { Button } from "@/components/ui/button"

// Microphone status and session controls.
//
// The spec's rule: the UI must never get stuck on "Listening…". Every state
// here is either actively doing something or offers a way forward, and any
// error surfaces a concrete action rather than a dead end.

export type SessionState = "idle" | "listening" | "paused" | "finishing" | "error"

interface SpeechControlsProps {
  state: SessionState
  /** True when falling back to recording instead of live recognition. */
  recordingMode: boolean
  error: { message: string } | null
  onPause: () => void
  onResume: () => void
  onFinish: () => void
  onRetry: () => void
}

export function SpeechControls({
  state,
  recordingMode,
  error,
  onPause,
  onResume,
  onFinish,
  onRetry,
}: SpeechControlsProps) {
  const listening = state === "listening"

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Status indicator. Deliberately modest — the passage is the focus,
            not the microphone. */}
        <span
          role="status"
          aria-live="polite"
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
            listening
              ? "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400"
              : state === "paused"
                ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                : state === "error"
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : "border-border bg-card text-muted-foreground"
          }`}
        >
          {listening ? (
            <>
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
              {recordingMode ? "Recording…" : "Listening…"}
            </>
          ) : state === "paused" ? (
            <>
              <Pause className="h-3.5 w-3.5" aria-hidden="true" />
              Paused
            </>
          ) : state === "finishing" ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
              Analysing…
            </>
          ) : state === "error" ? (
            <>
              <MicOff className="h-3.5 w-3.5" aria-hidden="true" />
              Microphone problem
            </>
          ) : (
            <>
              <Mic className="h-3.5 w-3.5" aria-hidden="true" />
              Ready
            </>
          )}
        </span>

        <div className="ml-auto flex items-center gap-2">
          {state === "listening" && (
            <Button
              variant="outline"
              size="sm"
              onClick={onPause}
              className="cursor-pointer gap-1.5"
              aria-label="Pause reading"
            >
              <Pause className="h-3.5 w-3.5" aria-hidden="true" />
              Pause
            </Button>
          )}

          {state === "paused" && (
            <Button
              variant="outline"
              size="sm"
              onClick={onResume}
              className="cursor-pointer gap-1.5"
              aria-label="Resume reading"
            >
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
              Resume
            </Button>
          )}

          {state === "error" && (
            <Button size="sm" onClick={onRetry} className="cursor-pointer" aria-label="Try the microphone again">
              Try again
            </Button>
          )}

          {(state === "listening" || state === "paused") && (
            <Button size="sm" onClick={onFinish} className="cursor-pointer gap-1.5" aria-label="Finish reading">
              <Square className="h-3.5 w-3.5" aria-hidden="true" />
              Finish Reading
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
          <div className="flex-1">
            <p className="text-destructive">{error.message}</p>
          </div>
          {/* An error is never a dead end — there is always a next step. */}
          <Button variant="outline" size="sm" onClick={onFinish} className="cursor-pointer shrink-0">
            Finish anyway
          </Button>
        </div>
      )}
    </div>
  )
}
