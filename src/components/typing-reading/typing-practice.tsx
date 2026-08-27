"use client"

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react"
import { RotateCcw, Square, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PillGroup } from "./pill-group"
import { MetricTile } from "./metric-tile"
import { PerformanceBar } from "./performance-bar"
import { TypingTextDisplay } from "./typing-text-display"
import { buildTypingText, extendTypingText } from "@/lib/typing-reading/typing-passages"
import { computeAccuracy, computeConsistency, computeWpm, formatAccuracy, formatTime } from "@/lib/typing-reading/calculations"
import { saveTypingRecord, getTypingWpmStats } from "@/lib/typing-reading/storage"
import {
  CATEGORIES,
  DIFFICULTIES,
  TYPING_WORDS_OPTIONS,
  type Category,
  type Difficulty,
  type TypingResult,
  type TypingTestMode,
  type TypingWordsOption,
} from "@/lib/typing-reading/types"

type Screen = "setup" | "active" | "results"

const TIME_PILLS: { value: string; label: string }[] = [
  { value: "15", label: "15s" },
  { value: "30", label: "30s" },
  { value: "60", label: "60s" },
  { value: "120", label: "2 min" },
  { value: "custom", label: "Custom" },
]

const MODE_PILLS: { value: TypingTestMode; label: string }[] = [
  { value: "time", label: "Timed" },
  { value: "words", label: "Word Count" },
]

const PAUSE_THRESHOLD_MS = 2000
// A speed bar needs some reference point to fill against — 130 WPM is a
// commonly cited "excellent" benchmark. The actual number is always shown
// alongside it so the bar never pretends to be more than a visual aid.
const SPEED_BAR_REFERENCE_WPM = 130

export function TypingPractice() {
  const [screen, setScreen] = useState<Screen>("setup")
  const [mode, setMode] = useState<TypingTestMode>("time")
  const [timeChoice, setTimeChoice] = useState("30")
  const [customSeconds, setCustomSeconds] = useState(45)
  const [wordsOption, setWordsOption] = useState<TypingWordsOption>("medium")
  const [difficulty, setDifficulty] = useState<Difficulty>("intermediate")
  const [category, setCategory] = useState<Category>("general")

  const [targetText, setTargetText] = useState("")
  const [typed, setTyped] = useState("")
  const [startedAt, setStartedAt] = useState<number | null>(null)
  // Mirrors of ref-tracked counters, kept in state purely so the render body
  // can read them — reading a ref's .current during render isn't safe.
  const [elapsedMs, setElapsedMs] = useState(0)
  const [liveErrorCount, setLiveErrorCount] = useState(0)
  const [liveAccuracy, setLiveAccuracy] = useState(100)
  const [focused, setFocused] = useState(false)
  const [result, setResult] = useState<TypingResult | null>(null)
  const [bestWpmBefore, setBestWpmBefore] = useState<number | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const typedRef = useRef("")
  const targetTextRef = useRef("")
  const erroredIndices = useRef<Set<number>>(new Set())
  const errorEventsRef = useRef(0)
  const totalKeystrokesRef = useRef(0)
  const correctKeystrokesRef = useRef(0)
  const wpmSamplesRef = useRef<number[]>([])
  const lastKeystrokeAtRef = useRef<number | null>(null)
  const pauseCountRef = useRef(0)
  const finishedRef = useRef(false)
  const sampleAccumulatorRef = useRef(0)

  useEffect(() => { typedRef.current = typed }, [typed])
  useEffect(() => { targetTextRef.current = targetText }, [targetText])

  const durationSeconds = timeChoice === "custom" ? customSeconds : Number(timeChoice)

  const resetCounters = () => {
    erroredIndices.current = new Set()
    errorEventsRef.current = 0
    totalKeystrokesRef.current = 0
    correctKeystrokesRef.current = 0
    wpmSamplesRef.current = []
    lastKeystrokeAtRef.current = null
    pauseCountRef.current = 0
    finishedRef.current = false
    sampleAccumulatorRef.current = 0
  }

  const finishTest = useCallback(
    (finalTyped: string, finalTargetText: string, elapsedMs: number) => {
      if (finishedRef.current) return
      finishedRef.current = true

      let correctChars = 0
      let incorrectChars = 0
      for (let i = 0; i < finalTyped.length; i++) {
        if (finalTyped[i] === finalTargetText[i]) correctChars++
        else incorrectChars++
      }

      let corrected = 0
      let uncorrected = 0
      erroredIndices.current.forEach((idx) => {
        if (finalTyped[idx] === finalTargetText[idx]) corrected++
        else uncorrected++
      })

      const wpm = computeWpm(finalTyped.length, elapsedMs)
      const accuracy = computeAccuracy(correctKeystrokesRef.current, totalKeystrokesRef.current)
      const errorRate = totalKeystrokesRef.current > 0 ? errorEventsRef.current / totalKeystrokesRef.current : 0
      const consistency = computeConsistency({
        wpmSamples: wpmSamplesRef.current,
        pauseCount: pauseCountRef.current,
        errorRate,
      })

      const finalResult: TypingResult = {
        wpm,
        accuracy,
        elapsedMs,
        errorEvents: errorEventsRef.current,
        correctedErrors: corrected,
        uncorrectedErrors: uncorrected,
        correctCharacters: correctChars,
        incorrectCharacters: incorrectChars,
        totalCharacters: finalTyped.length,
        totalWords: Math.round(finalTyped.length / 5),
        consistencyScore: consistency.score,
        consistencyLabel: consistency.label,
      }

      setResult(finalResult)
      saveTypingRecord({
        date: new Date().toISOString(),
        wpm,
        accuracy,
        errors: errorEventsRef.current,
        elapsedMs,
        difficulty,
        category,
        mode,
      })
      setScreen("results")
    },
    [difficulty, category, mode]
  )

  const startTest = useCallback(() => {
    const wordsTarget =
      mode === "time"
        ? Math.max(60, Math.round(durationSeconds * 2.5))
        : TYPING_WORDS_OPTIONS.find((o) => o.value === wordsOption)!.approxWords
    const text = buildTypingText(difficulty, category, wordsTarget)
    const wpmStats = getTypingWpmStats()
    setTargetText(text)
    setTyped("")
    setStartedAt(null)
    setElapsedMs(0)
    setLiveErrorCount(0)
    setLiveAccuracy(100)
    setResult(null)
    resetCounters()
    setBestWpmBefore(wpmStats.hasData ? wpmStats.best : null)
    setScreen("active")
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [mode, durationSeconds, wordsOption, difficulty, category])

  // Live clock + periodic WPM sampling (for the consistency score) + the
  // automatic stop for fixed-duration tests.
  useEffect(() => {
    if (screen !== "active" || startedAt === null) return
    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt
      setElapsedMs(elapsed)
      sampleAccumulatorRef.current += 250
      if (sampleAccumulatorRef.current >= 1000) {
        sampleAccumulatorRef.current = 0
        wpmSamplesRef.current.push(computeWpm(typedRef.current.length, elapsed))
      }
      if (mode === "time" && elapsed >= durationSeconds * 1000) {
        finishTest(typedRef.current, targetTextRef.current, durationSeconds * 1000)
      }
    }, 250)
    return () => clearInterval(interval)
  }, [screen, startedAt, mode, durationSeconds, finishTest])

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (screen !== "active" || finishedRef.current) return
    const newValue = e.target.value
    const now = Date.now()

    let effectiveStartedAt = startedAt
    if (startedAt === null) {
      effectiveStartedAt = now
      setStartedAt(now)
      lastKeystrokeAtRef.current = now
    } else {
      const gap = now - (lastKeystrokeAtRef.current ?? now)
      if (gap > PAUSE_THRESHOLD_MS) pauseCountRef.current += 1
      lastKeystrokeAtRef.current = now
    }
    setElapsedMs(now - (effectiveStartedAt ?? now))

    if (newValue.length > typed.length) {
      const added = newValue.slice(typed.length)
      for (let k = 0; k < added.length; k++) {
        const idx = typed.length + k
        totalKeystrokesRef.current += 1
        if (added[k] === targetText[idx]) {
          correctKeystrokesRef.current += 1
        } else {
          errorEventsRef.current += 1
          erroredIndices.current.add(idx)
        }
      }
      setLiveErrorCount(errorEventsRef.current)
      setLiveAccuracy(computeAccuracy(correctKeystrokesRef.current, totalKeystrokesRef.current))
    }

    // Extend the text on the fly for timed mode so a fast typist never runs out.
    let effectiveTarget = targetText
    if (mode === "time" && targetText.length - newValue.length < 40) {
      effectiveTarget = extendTypingText(targetText, difficulty, category)
      setTargetText(effectiveTarget)
    }

    const clamped = mode === "words" ? newValue.slice(0, targetText.length) : newValue
    setTyped(clamped)

    if (mode === "words" && targetText.length > 0 && clamped.length >= targetText.length) {
      const elapsed = Date.now() - (startedAt ?? now) || 1
      finishTest(clamped, targetText, elapsed)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault()
      setScreen("setup")
    }
  }

  const stopEarly = () => {
    setScreen("setup")
  }

  const liveWpm = computeWpm(typed.length, elapsedMs)
  const remainingMs = Math.max(0, durationSeconds * 1000 - elapsedMs)
  const timeDisplay = mode === "time" ? formatTime(remainingMs) : formatTime(elapsedMs)

  // ---------------------------------------------------------------------
  // Setup
  // ---------------------------------------------------------------------
  if (screen === "setup") {
    return (
      <div className="space-y-8">
        <div>
          <p className="text-sm font-semibold text-foreground mb-3">Mode</p>
          <PillGroup options={MODE_PILLS} value={mode} onChange={setMode} ariaLabel="Test mode" />
        </div>

        {mode === "time" ? (
          <div>
            <p className="text-sm font-semibold text-foreground mb-3">Duration</p>
            <PillGroup options={TIME_PILLS} value={timeChoice} onChange={setTimeChoice} ariaLabel="Test duration" />
            {timeChoice === "custom" && (
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="number"
                  min={5}
                  max={600}
                  value={customSeconds}
                  onChange={(e) => setCustomSeconds(Math.max(5, Math.min(600, Number(e.target.value) || 5)))}
                  className="h-9 w-24 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  aria-label="Custom duration in seconds"
                />
                <span className="text-sm text-muted-foreground">seconds</span>
              </div>
            )}
          </div>
        ) : (
          <div>
            <p className="text-sm font-semibold text-foreground mb-3">Length</p>
            <PillGroup
              options={TYPING_WORDS_OPTIONS.map((o) => ({ value: o.value, label: `${o.label} (~${o.approxWords}w)` }))}
              value={wordsOption}
              onChange={setWordsOption}
              ariaLabel="Text length"
            />
          </div>
        )}

        <div>
          <p className="text-sm font-semibold text-foreground mb-3">Difficulty</p>
          <PillGroup options={DIFFICULTIES} value={difficulty} onChange={setDifficulty} ariaLabel="Difficulty" />
        </div>

        <div className="max-w-xs">
          <p className="text-sm font-semibold text-foreground mb-3">Category</p>
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

        <div className="pt-2">
          <Button size="lg" onClick={startTest} className="cursor-pointer px-6">
            Start Test
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">
            Typing speed is measured most accurately with a physical keyboard. On a touchscreen device, results may be less precise.
          </p>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------
  // Active
  // ---------------------------------------------------------------------
  if (screen === "active") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="grid grid-cols-4 gap-6 sm:gap-10">
            <MetricTile label="WPM" value={String(liveWpm)} emphasize />
            <MetricTile label="Accuracy" value={formatAccuracy(liveAccuracy)} />
            <MetricTile label="Errors" value={String(liveErrorCount)} />
            <MetricTile label="Time" value={timeDisplay} />
          </div>
          <Button variant="outline" size="sm" onClick={stopEarly} className="gap-1.5 cursor-pointer shrink-0">
            <Square className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Stop</span>
          </Button>
        </div>

        <div
          onClick={() => inputRef.current?.focus()}
          className="relative cursor-text rounded-xl border border-border bg-card p-6 sm:p-8"
        >
          <TypingTextDisplay text={targetText} typed={typed} />
          <input
            ref={inputRef}
            value={typed}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            autoFocus
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            aria-label="Typing input — type the text shown above"
            className="absolute inset-0 h-full w-full cursor-text opacity-0"
          />
          {!focused && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/70 text-sm font-medium text-muted-foreground pointer-events-none">
              Click here or press any key to continue typing
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">Press Esc to stop the test.</p>
      </div>
    )
  }

  // ---------------------------------------------------------------------
  // Results
  // ---------------------------------------------------------------------
  if (screen === "results" && result) {
    const isNewBest = bestWpmBefore !== null && result.wpm > bestWpmBefore
    const speedPercent = Math.min(100, (result.wpm / SPEED_BAR_REFERENCE_WPM) * 100)

    return (
      <div className="space-y-8">
        <div>
          <p className="text-sm font-semibold text-primary mb-1">Typing Complete</p>
          <div className="flex flex-wrap items-baseline gap-x-10 gap-y-4">
            <div>
              <span className="text-4xl sm:text-5xl font-bold tabular-nums tracking-tight">{result.wpm}</span>
              <span className="ml-2 text-lg text-muted-foreground">WPM</span>
            </div>
            <div>
              <span className="text-4xl sm:text-5xl font-bold tabular-nums tracking-tight">{formatAccuracy(result.accuracy)}</span>
              <span className="ml-2 text-lg text-muted-foreground">Accuracy</span>
            </div>
          </div>
          {isNewBest && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
              <Trophy className="h-4 w-4" />
              New personal best
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 py-6 border-y border-border/60">
          <MetricTile label="Time" value={formatTime(result.elapsedMs)} />
          <MetricTile label="Errors" value={String(result.errorEvents)} />
          <MetricTile label="Characters" value={result.totalCharacters.toLocaleString()} />
          <MetricTile label="Words" value={String(result.totalWords)} />
        </div>

        <div className="grid sm:grid-cols-2 gap-x-10 gap-y-2 text-sm">
          <div className="flex justify-between border-b border-border/40 py-2">
            <span className="text-muted-foreground">Correct characters</span>
            <span className="font-medium tabular-nums">{result.correctCharacters.toLocaleString()}</span>
          </div>
          <div className="flex justify-between border-b border-border/40 py-2">
            <span className="text-muted-foreground">Incorrect characters</span>
            <span className="font-medium tabular-nums">{result.incorrectCharacters.toLocaleString()}</span>
          </div>
          <div className="flex justify-between border-b border-border/40 py-2">
            <span className="text-muted-foreground">Corrected errors</span>
            <span className="font-medium tabular-nums">{result.correctedErrors}</span>
          </div>
          <div className="flex justify-between border-b border-border/40 py-2">
            <span className="text-muted-foreground">Uncorrected errors</span>
            <span className="font-medium tabular-nums">{result.uncorrectedErrors}</span>
          </div>
        </div>

        <div className="space-y-5">
          <PerformanceBar label="Speed" value={`${result.wpm} WPM`} percent={speedPercent} />
          <PerformanceBar label="Accuracy" value={formatAccuracy(result.accuracy)} percent={result.accuracy} />
          <PerformanceBar label="Consistency" value={result.consistencyLabel} percent={result.consistencyScore} />
          <p className="text-xs text-muted-foreground">
            Speed is shown relative to {SPEED_BAR_REFERENCE_WPM} WPM for scale. Accuracy and consistency are calculated directly from this session&apos;s keystrokes — consistency reflects how steady your pace stayed, how often you paused, and how often you made mistakes.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button size="lg" onClick={startTest} className="gap-2 cursor-pointer">
            <RotateCcw className="h-4 w-4" />
            Try Again
          </Button>
          <Button size="lg" variant="outline" onClick={() => setScreen("setup")} className="cursor-pointer">
            New Test
          </Button>
        </div>
      </div>
    )
  }

  return null
}
