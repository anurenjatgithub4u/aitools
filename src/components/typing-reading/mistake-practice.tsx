"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { CheckCircle2, Mic, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSpeechRecognition } from "@/lib/reading/use-speech-recognition"
import { isNearWord, normalizeWord, tokenize } from "@/lib/reading/normalize"
import type { PracticeWord } from "@/lib/reading/alignment"

// Practice mode for the words that were misread.
//
// Deliberately forgiving. This is the encouraging part of the loop — someone
// who just scored 60% is retrying words they already got wrong once, and a
// strict grader here would make them quit. A near match counts, and there's no
// limit on attempts.

interface MistakePracticeProps {
  words: PracticeWord[]
  practiced: Set<string>
  onPracticed: (word: string) => void
}

type Attempt = "idle" | "listening" | "correct" | "retry"

export function MistakePractice({ words, practiced, onPracticed }: MistakePracticeProps) {
  const [activeWord, setActiveWord] = useState<string | null>(null)
  const [attempt, setAttempt] = useState<Attempt>("idle")

  const targetRef = useRef<string | null>(null)
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const judge = useCallback(
    (heard: string) => {
      const target = targetRef.current
      if (!target) return

      const spoken = tokenize(heard, { stripFillers: true })
      const wanted = normalizeWord(target)

      // Any of the words heard counts — recognition often returns a short
      // phrase for a single spoken word ("productivity" as "the productivity").
      const hit = spoken.some((word) => word === wanted || isNearWord(word, wanted))

      setAttempt(hit ? "correct" : "retry")
      if (hit) onPracticed(target)
    },
    [onPracticed]
  )

  const speech = useSpeechRecognition({ onFinalSegment: (segment) => judge(segment.text) })

  const clearTimer = () => {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current)
    stopTimerRef.current = null
  }

  useEffect(() => () => clearTimer(), [])

  const tryWord = async (word: string) => {
    clearTimer()
    speech.reset()
    targetRef.current = word
    setActiveWord(word)
    setAttempt("listening")

    const started = await speech.start()
    if (!started) {
      setAttempt("retry")
      return
    }

    // One word takes a moment, not a minute. Stopping automatically avoids
    // leaving the microphone open if the user walks away.
    stopTimerRef.current = setTimeout(() => {
      speech.stop()
      // Nothing recognised in the window — invite another go rather than
      // failing them.
      setAttempt((current) => (current === "listening" ? "retry" : current))
    }, 5000)
  }

  const doneCount = words.filter((w) => practiced.has(w.expected)).length
  const allDone = doneCount === words.length

  return (
    <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">Practise your mistakes</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {words.length} {words.length === 1 ? "word" : "words"} to practise
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-sm font-semibold tabular-nums ${
            allDone
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "border-border bg-background text-muted-foreground"
          }`}
        >
          {doneCount}/{words.length}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {words.map((word) => {
          const done = practiced.has(word.expected)
          const active = activeWord === word.expected
          return (
            <button
              key={word.expected}
              type="button"
              onClick={() => tryWord(word.expected)}
              aria-label={`Practise saying ${word.expected}`}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
                done
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-foreground hover:border-primary/40"
              }`}
            >
              {done ? (
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Mic className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {word.expected}
            </button>
          )
        })}
      </div>

      {activeWord && (
        <div className="mt-5 rounded-xl border border-border bg-background p-5 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Say this word</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{activeWord}</p>

          <div className="mt-4 min-h-[2.5rem]" role="status" aria-live="polite">
            {attempt === "listening" && (
              <span className="inline-flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400">
                <span className="relative flex h-2 w-2" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
                Listening…
              </span>
            )}
            {attempt === "correct" && (
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Nice!
              </span>
            )}
            {attempt === "retry" && (
              <div className="flex flex-col items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {speech.error ? speech.error.message : "Not quite — give it another go."}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => tryWord(activeWord)}
                  className="cursor-pointer gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  Try again
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {allDone && (
        <p className="mt-4 flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          All {words.length} practised. Try the passage again and see the difference.
        </p>
      )}
    </section>
  )
}
