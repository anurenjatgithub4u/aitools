"use client"

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"
import { CheckCircle2, Mic, Shuffle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PillGroup } from "./pill-group"
import { MetricTile } from "./metric-tile"
import { PassageRenderer } from "./passage-renderer"
import { SpeechControls, type SessionState } from "./speech-controls"
import { ReadingResults } from "./reading-results"
import { pickReadingPassage, readingWordCount } from "@/lib/typing-reading/reading-passages"
import { formatTime } from "@/lib/typing-reading/calculations"
import {
  CATEGORIES,
  DIFFICULTIES,
  type Category,
  type Difficulty,
  type ReadingPassage,
} from "@/lib/typing-reading/types"
import {
  alignTranscriptToPassage,
  summarizeAlignment,
  type AlignedWord,
  type AlignmentSummary,
} from "@/lib/reading/alignment"
import { calculateMetrics, type ReadingMetrics } from "@/lib/reading/scoring"
import { PauseTracker, summarizePauses, type PauseEvent, type PauseSummary } from "@/lib/reading/pauses"
import { tokenize } from "@/lib/reading/normalize"
import { buildLiveView, liveAccuracy, liveWpm, type LiveView } from "@/lib/reading/live"
import { useSpeechRecognition } from "@/lib/reading/use-speech-recognition"
import { useAudioRecorder } from "@/lib/reading/use-audio-recorder"
import type { CoachFeedback } from "@/lib/reading/coach"
import {
  getPersonalBest,
  getStreak,
  saveReadAloudRecord,
  serverPersonalBest,
  serverStreak,
  subscribeHistory,
} from "@/lib/reading/history"

// Read-aloud practice.
//
// Replaces the silent timed read with a spoken one. The passage, comprehension
// questions and configuration card are the existing ones — what changed is
// that the reader now speaks, and every word is compared against the passage.
//
// Flow: setup → reading → analysing → questions → results.
// Comprehension sits before results so it can feed the final score.

type Screen = "setup" | "reading" | "analyzing" | "questions" | "results"

const LANGUAGES = [
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "en-IN", label: "English (India)" },
]

interface FinalResults {
  aligned: AlignedWord[]
  summary: AlignmentSummary
  metrics: ReadingMetrics
  pauses: PauseSummary
  feedback: CoachFeedback | null
  transcript: string
}

export function ReadingPractice() {
  const [screen, setScreen] = useState<Screen>("setup")
  const [difficulty, setDifficulty] = useState<Difficulty>("intermediate")
  const [category, setCategory] = useState<Category>("general")
  const [language, setLanguage] = useState("en-US")
  const [passage, setPassage] = useState<ReadingPassage | null>(() =>
    pickReadingPassage("intermediate", "general")
  )
  const [passageFilters, setPassageFilters] = useState({ difficulty, category })

  // Display copy of the transcript. The ref below stays authoritative for
  // alignment; this exists because render must not read a ref.
  const [liveTranscript, setLiveTranscript] = useState("")
  // In-progress view: statuses truncated at the frontier, plus live counts.
  // The finished-reading view is derived separately from the final alignment,
  // because mid-reading and finished answer different questions — unread words
  // are "not yet reached", not "skipped".
  const [live, setLive] = useState<LiveView | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>([])
  const [results, setResults] = useState<FinalResults | null>(null)
  // Read through useSyncExternalStore rather than an effect: localStorage is
  // external state that differs between server and client, and the store gives
  // a correct server snapshot so hydration matches.
  const personalBest = useSyncExternalStore(subscribeHistory, getPersonalBest, serverPersonalBest)
  const streak = useSyncExternalStore(subscribeHistory, getStreak, serverStreak)

  // The best score BEFORE this run, captured when the session starts. Without
  // it the results screen would compare against the score just saved and could
  // never report beating a personal best.
  const [bestBeforeRun, setBestBeforeRun] = useState<number | null>(null)

  const startedAtRef = useRef<number | null>(null)
  const pauseTrackerRef = useRef<PauseTracker>(new PauseTracker())
  const transcriptRef = useRef("")
  const finishingRef = useRef(false)

  // ---- live alignment ------------------------------------------------------
  // Re-aligns the whole transcript on each finalised segment rather than
  // appending. Alignment is global by nature — a word skipped early changes how
  // everything after it pairs up — so incremental patching would drift.
  const handleSegment = useCallback(
    (segment: { text: string; at: number }) => {
      if (!passage) return
      pauseTrackerRef.current.mark(segment.at)
      const next = `${transcriptRef.current} ${segment.text}`.trim()
      transcriptRef.current = next
      setLiveTranscript(next)
      // Interim is cleared by the engine once a segment finalises, so the
      // view is rebuilt from the confirmed text alone.
      setLive(buildLiveView(passage.text, next, ""))
    },
    [passage]
  )

  const speech = useSpeechRecognition({ lang: language, onFinalSegment: handleSegment })
  const recorder = useAudioRecorder()

  // Live recognition is preferred; recording is the fallback for browsers
  // without it (Firefox, some Safari versions).
  const recordingMode = !speech.supported

  // React's documented "adjust state when a prop changes" pattern, matching
  // how the previous version handled filter changes.
  if (passageFilters.difficulty !== difficulty || passageFilters.category !== category) {
    setPassageFilters({ difficulty, category })
    setPassage(pickReadingPassage(difficulty, category))
  }

  useEffect(() => {
    if (screen !== "reading" || startedAtRef.current === null) return
    const id = setInterval(() => {
      if (startedAtRef.current !== null) setElapsedMs(Date.now() - startedAtRef.current)
    }, 500)
    return () => clearInterval(id)
  }, [screen])

  const reroll = (excludeId?: string) => {
    setPassage(pickReadingPassage(difficulty, category, excludeId))
    setPassageFilters({ difficulty, category })
  }

  // ---- session lifecycle ---------------------------------------------------
  const startReading = async () => {
    if (!passage) return

    transcriptRef.current = ""
    finishingRef.current = false
    setLiveTranscript("")
    setLive(null)
    setResults(null)
    setElapsedMs(0)
    setAnswers(new Array(passage.questions.length).fill(null))

    setBestBeforeRun(getPersonalBest())

    const now = Date.now()
    startedAtRef.current = now
    pauseTrackerRef.current.reset(now)
    setScreen("reading")

    const started = recordingMode ? await recorder.start() : await speech.start()
    if (!started) {
      // Stay on the reading screen — SpeechControls shows the error and a way
      // forward, which is better than bouncing back to setup with no context.
      startedAtRef.current = now
    }
  }

  /** Fetches coaching and merges it into the results already on screen. */
  const loadCoaching = useCallback(
    async (
      forPassage: ReadingPassage,
      transcript: string,
      elapsed: number,
      pauseEvents: PauseEvent[],
      comprehension: number | null
    ) => {
      try {
        const res = await fetch("/api/reading/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            passageTitle: forPassage.title,
            expectedText: forPassage.text,
            transcript,
            elapsedMs: elapsed,
            pauses: pauseEvents,
            comprehension,
          }),
        })
        const data = await res.json()
        if (data.ok) {
          setResults((prev) =>
            prev ? { ...prev, metrics: data.metrics ?? prev.metrics, feedback: data.feedback } : prev
          )
        }
      } catch {
        // Coaching is an enhancement — the score and word review stand alone.
      }
    },
    []
  )

  const finishReading = useCallback(async () => {
    if (!passage || finishingRef.current) return
    finishingRef.current = true

    const elapsed = startedAtRef.current ? Date.now() - startedAtRef.current : 0
    setElapsedMs(elapsed)
    setScreen("analyzing")

    let transcript = transcriptRef.current

    if (recordingMode) {
      const blob = await recorder.stop()
      if (blob) {
        try {
          const form = new FormData()
          form.append("audio", blob, "reading.webm")
          form.append("passage", passage.text.slice(0, 800))
          form.append("language", language)
          const res = await fetch("/api/reading/transcribe", { method: "POST", body: form })
          const data = await res.json()
          if (data.ok && data.transcript) transcript = data.transcript
        } catch {
          /* fall through with whatever we have; the run still produces a result */
        }
      }
    } else {
      speech.stop()
    }

    const pauseEvents: PauseEvent[] = pauseTrackerRef.current.getEvents()
    const aligned = alignTranscriptToPassage(passage.text, transcript)
    const summary = summarizeAlignment(aligned)
    const pauses = summarizePauses(pauseEvents)
    const metrics = calculateMetrics({
      summary,
      pauses,
      spokenWordCount: tokenize(transcript, { stripFillers: true }).length,
      elapsedMs: elapsed,
      comprehension: null,
    })
    setResults({ aligned, summary, metrics, pauses, feedback: null, transcript })

    // Comprehension next, so it can feed the final score. Skipped entirely for
    // a passage without questions.
    setScreen(passage.questions.length > 0 ? "questions" : "results")

    if (passage.questions.length === 0) {
      void loadCoaching(passage, transcript, elapsed, pauseEvents, null)
    }
  }, [passage, recordingMode, recorder, speech, language, loadCoaching])

  const submitAnswers = () => {
    if (!passage || !results) return

    const correct = passage.questions.reduce(
      (total, q, i) => total + (answers[i] === q.correctIndex ? 1 : 0),
      0
    )
    const total = passage.questions.length
    const comprehension = total > 0 ? (correct / total) * 100 : null

    const metrics = calculateMetrics({
      summary: results.summary,
      pauses: results.pauses,
      spokenWordCount: tokenize(results.transcript, { stripFillers: true }).length,
      elapsedMs,
      comprehension,
    })

    setResults({ ...results, metrics })
    setScreen("results")

    saveReadAloudRecord({
      date: new Date().toISOString(),
      passageId: passage.id,
      score: metrics.score,
      wpm: metrics.wpm,
      accuracy: metrics.accuracy,
      fluency: metrics.fluency,
      comprehensionCorrect: correct,
      comprehensionTotal: total,
      difficulty,
      category,
    })

    void loadCoaching(passage, results.transcript, elapsedMs, pauseTrackerRef.current.getEvents(), comprehension)
  }

  const resetToSetup = (newPassage: boolean) => {
    speech.reset()
    recorder.reset()
    finishingRef.current = false
    transcriptRef.current = ""
    startedAtRef.current = null
    setLiveTranscript("")
    setLive(null)
    setResults(null)
    setElapsedMs(0)
    if (newPassage && passage) reroll(passage.id)
    setScreen("setup")
  }

  const sessionState: SessionState = speech.error
    ? "error"
    : screen === "analyzing"
      ? "finishing"
      : speech.paused
        ? "paused"
        : speech.listening || recorder.recording
          ? "listening"
          : "idle"

  // ---------------------------------------------------------------------
  // Setup
  // ---------------------------------------------------------------------
  if (screen === "setup") {
    return (
      <div className="space-y-8">
        <div>
          <p className="mb-3 text-sm font-semibold text-foreground">Difficulty</p>
          <PillGroup options={DIFFICULTIES} value={difficulty} onChange={setDifficulty} ariaLabel="Difficulty" />
        </div>

        <div className="flex flex-wrap gap-6">
          <div className="w-full max-w-xs">
            <p className="mb-3 text-sm font-semibold text-foreground">Category</p>
            <Select value={category} onValueChange={(v) => v && setCategory(v as Category)}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue>{(v: Category) => CATEGORIES.find((c) => c.value === v)?.label ?? v}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full max-w-[12rem]">
            <p className="mb-3 text-sm font-semibold text-foreground">Accent</p>
            <Select value={language} onValueChange={(v) => v && setLanguage(v)}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue>{(v: string) => LANGUAGES.find((l) => l.value === v)?.label ?? v}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {passage && (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-5">
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Passage</p>
              <p className="font-semibold text-foreground">{passage.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {readingWordCount(passage.text)} words · {passage.questions.length} questions
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => reroll(passage.id)}
              className="shrink-0 cursor-pointer gap-1.5"
            >
              <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
              New passage
            </Button>
          </div>
        )}

        {streak > 1 && (
          <p className="text-sm text-muted-foreground">
            🔥 <span className="font-semibold text-foreground">{streak}-day</span> practice streak
            {personalBest !== null && <> · personal best {personalBest}</>}
          </p>
        )}

        <div className="pt-2">
          <Button size="lg" onClick={startReading} disabled={!passage} className="cursor-pointer gap-2 px-6">
            <Mic className="h-4 w-4" aria-hidden="true" />
            Start Reading Aloud
          </Button>
          <p className="mt-3 max-w-lg text-xs text-muted-foreground">
            Read naturally into your microphone. Don&apos;t worry about mistakes — you&apos;ll see exactly
            where you can improve.
            {recordingMode && " Your browser doesn't support live recognition, so we'll record and transcribe instead."}
          </p>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------
  // Reading
  // ---------------------------------------------------------------------
  if (screen === "reading" && passage) {
    // Interim text is folded in on every render so words turn green as they
    // are spoken, rather than a sentence at a time when a segment finalises.
    const view = speech.interimTranscript
      ? buildLiveView(passage.text, liveTranscript, speech.interimTranscript)
      : (live ?? buildLiveView(passage.text, liveTranscript, ""))

    const accuracy = liveAccuracy(view)
    const wpm = liveWpm(view, elapsedMs)

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-6 sm:gap-10">
          <MetricTile label="Time" value={formatTime(elapsedMs)} emphasize />
          <MetricTile label="Speed" value={wpm !== null ? `${wpm} WPM` : "—"} />
          <MetricTile label="Accuracy" value={accuracy !== null ? `${accuracy}%` : "—"} />
        </div>

        <SpeechControls
          state={sessionState}
          recordingMode={recordingMode}
          error={speech.error ?? recorder.error}
          onPause={() => {
            speech.pause()
            pauseTrackerRef.current.skip()
          }}
          onResume={() => {
            pauseTrackerRef.current.skip()
            void speech.resume()
          }}
          onFinish={finishReading}
          onRetry={() => void speech.start()}
        />

        <div className="max-w-3xl rounded-xl border border-border bg-card p-6 sm:p-10">
          <h3 className="mb-5 text-lg font-semibold text-foreground">{passage.title}</h3>
          <PassageRenderer text={passage.text} statuses={view.statuses} currentIndex={view.cursor} />
        </div>

        {(speech.interimTranscript || liveTranscript) && (
          <div className="max-w-3xl">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              What we heard
            </p>
            <p className="line-clamp-2 text-sm italic text-muted-foreground">
              {speech.interimTranscript || liveTranscript.slice(-160)}
            </p>
          </div>
        )}
      </div>
    )
  }

  // ---------------------------------------------------------------------
  // Analysing
  // ---------------------------------------------------------------------
  if (screen === "analyzing") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden="true" />
        <p className="text-base font-medium text-foreground" role="status" aria-live="polite">
          Analysing your reading…
        </p>
        <p className="text-sm text-muted-foreground">Comparing every word against the passage.</p>
      </div>
    )
  }

  // ---------------------------------------------------------------------
  // Comprehension — unchanged from the existing utility
  // ---------------------------------------------------------------------
  if (screen === "questions" && passage) {
    const allAnswered = answers.every((a) => a !== null)
    return (
      <div className="max-w-2xl space-y-8">
        <div>
          <p className="mb-1 text-sm font-semibold text-primary">Quick check</p>
          <h3 className="text-xl font-bold tracking-tight">A few questions about what you just read</h3>
        </div>

        <div className="space-y-8">
          {passage.questions.map((q, qi) => (
            <fieldset key={q.id}>
              <legend className="mb-3 text-sm font-medium text-foreground">
                {qi + 1}. {q.question}
              </legend>
              <div className="space-y-2">
                {q.options.map((option, oi) => {
                  const selected = answers[qi] === oi
                  return (
                    <button
                      key={oi}
                      type="button"
                      onClick={() =>
                        setAnswers((prev) => {
                          const next = [...prev]
                          next[qi] = oi
                          return next
                        })
                      }
                      aria-pressed={selected}
                      className={`w-full rounded-lg border px-4 py-2.5 text-left text-sm transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
                        selected
                          ? "border-foreground bg-foreground/5 text-foreground"
                          : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                      }`}
                    >
                      {option}
                    </button>
                  )
                })}
              </div>
            </fieldset>
          ))}
        </div>

        <Button size="lg" onClick={submitAnswers} disabled={!allAnswered} className="cursor-pointer px-6">
          See My Results
        </Button>
      </div>
    )
  }

  // ---------------------------------------------------------------------
  // Results
  // ---------------------------------------------------------------------
  if (screen === "results" && passage && results) {
    const correct = passage.questions.reduce(
      (total, q, i) => total + (answers[i] === q.correctIndex ? 1 : 0),
      0
    )

    return (
      <ReadingResults
        passageTitle={passage.title}
        passageText={passage.text}
        aligned={results.aligned}
        summary={results.summary}
        metrics={results.metrics}
        pauses={results.pauses}
        feedback={results.feedback}
        transcript={results.transcript}
        comprehension={
          passage.questions.length > 0 ? { correct, total: passage.questions.length } : null
        }
        personalBest={bestBeforeRun}
        onTryAgain={() => resetToSetup(false)}
        onNewPassage={() => resetToSetup(true)}
      />
    )
  }

  // Any unexpected state still offers a way forward rather than a blank panel.
  return (
    <div className="flex flex-col items-start gap-4 py-12">
      <p className="text-sm text-muted-foreground">That session ended unexpectedly.</p>
      <Button onClick={() => resetToSetup(false)} className="cursor-pointer">
        Start again
      </Button>
    </div>
  )
}

/** Kept for the comprehension review markup below. */
export { CheckCircle2, XCircle }
