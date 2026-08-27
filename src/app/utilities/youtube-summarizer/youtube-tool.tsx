"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AlertCircle, Loader2, Sparkles } from "lucide-react"
import { useAuth } from "@/components/auth-context"
import { UrlInput } from "@/components/youtube-study/url-input"
import { VideoPreview } from "@/components/youtube-study/video-preview"
import { OutputPicker } from "@/components/youtube-study/output-picker"
import { ProgressStages, type StageView } from "@/components/youtube-study/progress-stages"
import { ResultView } from "@/components/youtube-study/result-view"
import type { OutputType, VideoMetadata } from "@/lib/youtube-study/types"

type Screen = "input" | "configure" | "processing" | "result"

interface ApiError {
  message: string
  hint?: string
  action?: string
}

/** Polling cadence for job status. Fast enough to feel live, slow enough not
 *  to hammer the endpoint through a 60-second job. */
const POLL_MS = 1500

/** Give up polling after this long. The server-side job may still finish and
 *  cache its result — this only stops the client waiting indefinitely. */
const POLL_TIMEOUT_MS = 5 * 60 * 1000

// Analytics is optional — tracking never throws and never blocks the flow.
// Only coarse settings are sent; video content and generated output never are.
function track(event: string, params: Record<string, string | number> = {}) {
  if (typeof window === "undefined") return
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag
  try {
    gtag?.("event", event, params)
  } catch {
    /* analytics must never break the tool */
  }
}

export function YoutubeTool() {
  const { user } = useAuth()

  const [screen, setScreen] = useState<Screen>("input")
  const [url, setUrl] = useState("")
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null)
  const [cached, setCached] = useState(false)
  const [isShort, setIsShort] = useState(false)
  const [readyOutputs, setReadyOutputs] = useState<OutputType[]>([])

  const [outputType, setOutputType] = useState<OutputType>("smart-notes")
  const [analyzing, setAnalyzing] = useState(false)
  const [generating, setGenerating] = useState(false)

  const [stages, setStages] = useState<StageView[]>([])
  const [chunks, setChunks] = useState<{ done: number; total: number }>({ done: 0, total: 0 })

  const [result, setResult] = useState<{
    content: string
    outputType: OutputType
    targetModel?: "chatgpt" | "claude"
    contentType?: string
  } | null>(null)

  const [error, setError] = useState<ApiError | null>(null)

  // Guards a double-submit racing past the disabled button.
  const inFlight = useRef(false)
  const abandoned = useRef(false)

  useEffect(() => {
    track("youtube_study_page_view")
  }, [])

  // Stop any in-flight poll loop when the component goes away.
  useEffect(() => () => {
    abandoned.current = true
  }, [])

  const idToken = useCallback(async () => {
    if (!user) return undefined
    return user.getIdToken().catch(() => undefined)
  }, [user])

  // ---- step 1: validate + metadata (no AI work) ---------------------------
  const analyze = async (value: string) => {
    if (inFlight.current) return
    inFlight.current = true
    setAnalyzing(true)
    setError(null)
    setResult(null)
    setMetadata(null)
    track("youtube_study_analyze")

    try {
      const res = await fetch("/api/youtube-study/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: value, idToken: await idToken() }),
      })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        setError({ message: data.error ?? "We couldn't check that video.", hint: data.hint, action: data.action })
        return
      }

      setUrl(value)
      setMetadata(data.metadata)
      setCached(!!data.cached)
      setIsShort(!!data.isShort)
      setReadyOutputs([])
      setScreen("configure")
    } catch {
      setError({ message: "We couldn't reach the server.", hint: "Check your connection and try again." })
    } finally {
      setAnalyzing(false)
      inFlight.current = false
    }
  }

  // ---- step 2: generate (the expensive path, as a polled job) -------------
  //
  // A plain async loop rather than a self-recursive callback: the job has a
  // clear terminal state, and looping avoids re-entering through a changing
  // callback identity. `abandoned` is the stop signal; the deadline is a
  // backstop so a job that never reports a terminal state can't spin forever.
  const pollUntilDone = async (jobId: string, requested: OutputType) => {
    const deadline = Date.now() + POLL_TIMEOUT_MS

    while (!abandoned.current) {
      await new Promise((r) => setTimeout(r, POLL_MS))
      if (abandoned.current) return

      if (Date.now() > deadline) {
        setError({
          message: "This is taking longer than expected.",
          hint: "The video may still be processing — try again in a moment.",
        })
        setScreen("configure")
        setGenerating(false)
        return
      }

      try {
        const res = await fetch(`/api/youtube-study/job/${jobId}`)
        const data = await res.json()

        if (!res.ok || !data.ok) {
          setError({ message: data.error ?? "We lost track of that job.", hint: data.hint })
          setScreen("configure")
          setGenerating(false)
          return
        }

        if (Array.isArray(data.stages)) setStages(data.stages)
        if (typeof data.chunksTotal === "number") {
          setChunks({ done: data.chunksDone ?? 0, total: data.chunksTotal })
        }

        if (data.status === "FAILED") {
          setError({ message: data.error, hint: data.hint, action: data.action })
          setScreen("configure")
          setGenerating(false)
          track("youtube_study_generation_failed", { outputType: requested })
          return
        }

        if (data.status === "COMPLETED") {
          const produced = (data.outputType ?? requested) as OutputType
          setResult({
            content: data.content ?? "",
            outputType: produced,
            targetModel: data.targetModel,
            contentType: data.contentType,
          })
          setReadyOutputs((prev) => (prev.includes(produced) ? prev : [...prev, produced]))
          setScreen("result")
          setGenerating(false)
          track("youtube_study_generation_completed", { outputType: requested })
          return
        }
      } catch {
        // A transient network blip shouldn't kill a job that's still running
        // server-side — keep looping rather than failing the whole flow.
      }
    }
  }

  const generate = async () => {
    if (!metadata || inFlight.current) return
    inFlight.current = true
    abandoned.current = false
    setGenerating(true)
    setError(null)
    setResult(null)
    setStages([])
    setChunks({ done: 0, total: 0 })
    setScreen("processing")
    track("youtube_study_generation_started", { outputType })

    try {
      const requestId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`

      const res = await fetch("/api/youtube-study/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, outputType, requestId, idToken: await idToken() }),
      })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        setError({ message: data.error ?? "We couldn't start processing.", hint: data.hint, action: data.action })
        setScreen("configure")
        setGenerating(false)
        return
      }

      void pollUntilDone(data.jobId, outputType)
    } catch {
      setError({ message: "We couldn't reach the server.", hint: "Check your connection and try again." })
      setScreen("configure")
      setGenerating(false)
    } finally {
      inFlight.current = false
    }
  }

  const cancel = () => {
    // The server-side job keeps running to completion — its result is cached,
    // so the work isn't wasted if the user comes back to the same video.
    abandoned.current = true
    setGenerating(false)
    setScreen("configure")
  }

  const reset = () => {
    abandoned.current = true
    setScreen("input")
    setUrl("")
    setMetadata(null)
    setResult(null)
    setError(null)
    setStages([])
    setReadyOutputs([])
    setGenerating(false)
  }

  // ---- processing ---------------------------------------------------------
  if (screen === "processing" && metadata) {
    return (
      <ProgressStages
        stages={stages}
        chunksDone={chunks.done}
        chunksTotal={chunks.total}
        onCancel={cancel}
      />
    )
  }

  // ---- result -------------------------------------------------------------
  if (screen === "result" && result && metadata) {
    return (
      <ResultView
        metadata={metadata}
        outputType={result.outputType}
        content={result.content}
        targetModel={result.targetModel}
        contentTypeLabel={result.contentType ? formatContentType(result.contentType) : undefined}
        onBack={reset}
        onRegenerate={generate}
        onChangeOutput={() => setScreen("configure")}
        busy={generating}
      />
    )
  }

  // ---- input + configure --------------------------------------------------
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-background p-5 sm:p-8">
        {screen === "input" || !metadata ? (
          <UrlInput onAnalyze={analyze} busy={analyzing} error={error} onReset={() => setError(null)} />
        ) : (
          <VideoPreview
            metadata={metadata}
            cached={cached}
            isShort={isShort}
            onReplace={reset}
          />
        )}
      </div>

      {screen === "configure" && metadata && (
        <div className="rounded-2xl border border-border bg-background p-5 sm:p-8 space-y-7">
          <OutputPicker
            value={outputType}
            onChange={setOutputType}
            disabled={generating}
            ready={readyOutputs}
          />

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-destructive" aria-hidden="true" />
              <div>
                <p className="font-medium text-destructive">{error.message}</p>
                {error.hint && <p className="mt-0.5 text-destructive/80">{error.hint}</p>}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={generate}
              disabled={generating}
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
                ? "Signed in — 15 videos per day."
                : "3 videos per day. Sign in for 15."}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

/** TECHNICAL → "Technical", SELF_HELP → "Self Help". */
function formatContentType(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}
