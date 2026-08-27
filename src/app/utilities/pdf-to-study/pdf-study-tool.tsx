"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AlertCircle, ArrowLeft, Loader2, Sparkles } from "lucide-react"
import { useAuth } from "@/components/auth-context"
import { PdfUpload } from "@/components/pdf-study/pdf-upload"
import { ModePicker } from "@/components/pdf-study/mode-picker"
import { GenerationSettings } from "@/components/pdf-study/generation-settings"
import { ProgressStages, stagesForMode, type StageId } from "@/components/pdf-study/progress-stages"
import { ResultsWorkspace } from "@/components/pdf-study/results-workspace"
import {
  DEFAULT_FLASHCARD_QUANTITY,
  DEFAULT_QUESTION_QUANTITY,
  DEFAULT_QUIZ_QUANTITY,
  SINGLE_PASS_CHAR_LIMIT,
} from "@/lib/pdf-study/config"
import type {
  DetailLevel,
  Difficulty,
  ExtractResponse,
  PdfMeta,
  PdfPage,
  StudyMode,
  StudyPackResult,
} from "@/lib/pdf-study/types"

type Screen = "upload" | "generating" | "results"

function defaultQuantityFor(mode: StudyMode): number {
  if (mode === "quiz") return DEFAULT_QUIZ_QUANTITY
  if (mode === "flashcards") return DEFAULT_FLASHCARD_QUANTITY
  return DEFAULT_QUESTION_QUANTITY
}

// Analytics is optional — the utility works whether or not it's wired up, so
// tracking never throws and never blocks the flow. Only the event name and
// coarse settings are sent; PDF contents and generated material never are.
function track(event: string, params: Record<string, string | number> = {}) {
  if (typeof window === "undefined") return
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag
  try {
    gtag?.("event", event, params)
  } catch {
    /* analytics must never break the tool */
  }
}

export function PdfStudyTool() {
  const { user } = useAuth()

  const [screen, setScreen] = useState<Screen>("upload")
  const [meta, setMeta] = useState<PdfMeta | null>(null)
  const [pages, setPages] = useState<PdfPage[]>([])
  const [uploadBusy, setUploadBusy] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const [mode, setMode] = useState<StudyMode>("notes")
  const [detail, setDetail] = useState<DetailLevel>("standard")
  const [difficulty, setDifficulty] = useState<Difficulty>("medium")
  const [quantity, setQuantity] = useState(DEFAULT_QUESTION_QUANTITY)

  const [generating, setGenerating] = useState(false)
  const [currentStage, setCurrentStage] = useState<StageId | null>(null)
  const [generateError, setGenerateError] = useState<string | null>(null)

  const [results, setResults] = useState<StudyPackResult | null>(null)
  const [partial, setPartial] = useState<string[]>([])

  // Guards against a double-submit racing past the disabled button — the server
  // rejects a replayed requestId too, this just avoids the round trip.
  const inFlight = useRef(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    track("pdf_study_page_view")
  }, [])

  useEffect(() => () => abortRef.current?.abort(), [])

  const changeMode = (next: StudyMode) => {
    setMode(next)
    setQuantity(defaultQuantityFor(next))
  }

  const resetAll = useCallback(() => {
    abortRef.current?.abort()
    inFlight.current = false
    setScreen("upload")
    setMeta(null)
    setPages([])
    setResults(null)
    setPartial([])
    setUploadError(null)
    setGenerateError(null)
    setCurrentStage(null)
    setGenerating(false)
  }, [])

  const handleFileSelected = async (file: File) => {
    abortRef.current?.abort()
    setUploadError(null)
    setGenerateError(null)
    setResults(null)
    setPartial([])
    setMeta(null)
    setPages([])
    setUploadBusy(true)
    track("pdf_study_upload")

    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/pdf-study/extract", { method: "POST", body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "We couldn't read this PDF. Please try another PDF.")

      const extracted = data as ExtractResponse
      setMeta(extracted.meta)
      setPages(extracted.pages)
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "We couldn't read this PDF. Please try another PDF.")
    } finally {
      setUploadBusy(false)
    }
  }

  const generate = async () => {
    if (!meta || inFlight.current) return

    inFlight.current = true
    setGenerating(true)
    setGenerateError(null)
    setResults(null)
    setPartial([])
    setCurrentStage(null)
    setScreen("generating")
    track("pdf_study_generation_started", { mode, detail, difficulty, quantity })

    const controller = new AbortController()
    abortRef.current = controller

    try {
      // A fresh id per attempt: a retry is a new generation, but an accidental
      // double-submit of the same attempt is rejected server-side.
      const requestId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`

      // Sent so signed-in users get their higher daily allowance. The server
      // verifies the token's signature — it never trusts a claimed identity.
      const idToken = user ? await user.getIdToken().catch(() => undefined) : undefined

      const res = await fetch("/api/pdf-study/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          mode,
          detail,
          difficulty,
          quantity,
          requestId,
          idToken,
          meta: {
            fileName: meta.fileName,
            pageCount: meta.pageCount,
            pageMappingReliable: meta.pageMappingReliable,
          },
          pages,
        }),
      })

      // Failures raised before the stream opens come back as ordinary JSON.
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "We couldn't generate your study materials. Please try again.")
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let finished = false

      const handleEvent = (event: Record<string, unknown>) => {
        if (event.type === "stage") {
          setCurrentStage(event.stage as StageId)
        } else if (event.type === "result") {
          setResults(event.results as StudyPackResult)
          setPartial(Array.isArray(event.partial) ? (event.partial as string[]) : [])
          finished = true
        } else if (event.type === "error") {
          throw new Error(String(event.error))
        }
      }

      // NDJSON: one JSON object per line, so a partially received line is held
      // in the buffer until its newline arrives.
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""
        for (const line of lines) {
          if (line.trim()) handleEvent(JSON.parse(line))
        }
      }
      if (buffer.trim()) handleEvent(JSON.parse(buffer))

      if (!finished) {
        throw new Error("The connection ended before your materials were ready. Please try again.")
      }

      setScreen("results")
      track("pdf_study_generation_completed", { mode })
      if (mode === "notes" || mode === "study-pack") track("pdf_study_notes_generated")
      if (mode === "flashcards" || mode === "study-pack") track("pdf_study_flashcards_generated")
      if (mode === "questions" || mode === "study-pack") track("pdf_study_questions_generated")
      if (mode === "quiz" || mode === "study-pack") track("pdf_study_quiz_generated")
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return
      setGenerateError(
        e instanceof Error ? e.message : "We couldn't generate your study materials. Please try again."
      )
      setScreen("upload")
      track("pdf_study_generation_failed", { mode })
    } finally {
      inFlight.current = false
      setGenerating(false)
      abortRef.current = null
    }
  }

  const canGenerate = !!meta && meta.hasExtractableText && !uploadBusy && !generating

  // ---- generating ----
  if (screen === "generating" && meta) {
    const longDocument = pages.reduce((sum, p) => sum + p.text.length, 0) > SINGLE_PASS_CHAR_LIMIT
    return (
      <div className="space-y-4">
        <ProgressStages stages={stagesForMode(mode, longDocument)} currentStage={currentStage} />
        <button
          type="button"
          onClick={resetAll}
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          Cancel
        </button>
      </div>
    )
  }

  // ---- results ----
  if (screen === "results" && results && meta) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-4 print:hidden">
          <button
            type="button"
            onClick={resetAll}
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Start over with a new PDF
          </button>
          <button
            type="button"
            onClick={() => {
              setScreen("upload")
              setResults(null)
              setPartial([])
            }}
            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            Generate something else from this PDF
          </button>
        </div>

        <ResultsWorkspace results={results} fileName={meta.fileName} partial={partial} />
      </div>
    )
  }

  // ---- upload + options ----
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-background p-5 sm:p-8">
        <PdfUpload
          onFileSelected={handleFileSelected}
          onRemove={resetAll}
          meta={meta}
          busy={uploadBusy}
          error={uploadError}
        />
      </div>

      {meta && meta.hasExtractableText && (
        <div className="rounded-2xl border border-border bg-background p-5 sm:p-8 space-y-7">
          <ModePicker value={mode} onChange={changeMode} disabled={generating} />

          <GenerationSettings
            mode={mode}
            detail={detail}
            onDetailChange={setDetail}
            difficulty={difficulty}
            onDifficultyChange={setDifficulty}
            quantity={quantity}
            onQuantityChange={setQuantity}
            disabled={generating}
          />

          {generateError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{generateError}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={generate}
              disabled={!canGenerate}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              )}
              {generating ? "Generating…" : "Generate"}
            </button>
            <p className="text-xs text-muted-foreground">
              {user
                ? "Signed in — 20 generations per day."
                : "5 generations per day. Sign in for 20."}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
