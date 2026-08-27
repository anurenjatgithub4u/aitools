"use client"

import { useCallback, useMemo, useState } from "react"
import { marked } from "marked"
import { ArrowLeft, ExternalLink, RefreshCw } from "lucide-react"
import { CopyButton, DownloadButton } from "@/components/pdf-study/result-actions"
import type { OutputType, VideoMetadata } from "@/lib/youtube-study/types"
import { OUTPUT_LABELS } from "@/lib/youtube-study/outputs"
import { formatDuration } from "@/lib/youtube-study/url"

// The result view (spec §25). Document-style rather than chat-style: this is
// something you read and keep, so it gets a title, a byline and clean
// typography instead of a message bubble.

interface ResultViewProps {
  metadata: VideoMetadata
  outputType: OutputType
  content: string
  targetModel?: "chatgpt" | "claude"
  contentTypeLabel?: string
  onBack: () => void
  onRegenerate: () => void
  onChangeOutput: () => void
  busy?: boolean
}

/** Prompt outputs are plain text meant for copying; notes are Markdown. */
function isPromptOutput(outputType: OutputType): boolean {
  return outputType === "chatgpt-prompt" || outputType === "claude-prompt"
}

/**
 * Ceiling on the URL-encoded prompt we'll put in a query string.
 *
 * Both ChatGPT and Claude accept a `?q=` parameter that pre-fills the composer,
 * but a long prompt roughly doubles once encoded (newlines become %0A) and an
 * over-long URL gets silently truncated — which is worse than not pre-filling,
 * because the user would paste half a prompt without noticing. Past this
 * length we open a blank chat instead and rely on the clipboard.
 */
const PREFILL_MAX_ENCODED = 6000

function composerUrl(target: "chatgpt" | "claude", prompt: string): string {
  const base = target === "claude" ? "https://claude.ai/new" : "https://chatgpt.com/"
  const encoded = encodeURIComponent(prompt)
  if (encoded.length > PREFILL_MAX_ENCODED) return base
  return `${base}?q=${encoded}`
}

export function ResultView({
  metadata,
  outputType,
  content,
  targetModel,
  contentTypeLabel,
  onBack,
  onRegenerate,
  onChangeOutput,
  busy,
}: ResultViewProps) {
  const [opened, setOpened] = useState<"chatgpt" | "claude" | null>(null)

  // Whether the prompt will actually fit in a query string, so the hint below
  // can tell the truth rather than promising a pre-fill that won't happen.
  const willPrefill = useMemo(
    () => encodeURIComponent(content).length <= PREFILL_MAX_ENCODED,
    [content]
  )

  // marked.parse is synchronous here, so this is a plain derivation rather
  // than effect-driven state.
  const html = useMemo(
    () => (isPromptOutput(outputType) ? "" : (marked.parse(content) as string)),
    [content, outputType]
  )

  const filename = `${
    metadata.title.slice(0, 60).replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").toLowerCase() ||
    "youtube"
  }-${outputType}.md`

  const openInAssistant = useCallback(
    (target: "chatgpt" | "claude") => {
      const url = composerUrl(target, content)
      // window.open must run synchronously inside the click handler, before
      // any await, or the browser treats it as a programmatic popup.
      window.open(url, "_blank", "noopener,noreferrer")
      // Copy regardless: if the prompt was too long to pre-fill, or the
      // service ignores ?q=, the user can still paste immediately.
      navigator.clipboard?.writeText(content).catch(() => {
        /* clipboard unavailable over plain HTTP — the visible text is still there */
      })
      setOpened(target)
      window.setTimeout(() => setOpened(null), 2500)
    },
    [content]
  )

  const download = useCallback(() => {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }, [content, filename])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 print:hidden">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Start over with a new video
        </button>
        <button
          type="button"
          onClick={onChangeOutput}
          className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          Generate something else from this video
        </button>
      </div>

      <article className="rounded-2xl border border-border bg-background p-5 sm:p-8">
        <header className="border-b border-border/60 pb-5 mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{metadata.title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {formatDuration(metadata.durationSeconds)}
            {contentTypeLabel && <> · {contentTypeLabel}</>}
            {" · "}
            {OUTPUT_LABELS[outputType]}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <CopyButton getText={() => content} />
            <DownloadButton onDownload={download} label="Download" />
            <button
              type="button"
              onClick={onRegenerate}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/60 px-3.5 py-2 text-sm font-medium transition-colors hover:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} aria-hidden="true" />
              Regenerate
            </button>
            {targetModel && (
              <button
                type="button"
                onClick={() => openInAssistant(targetModel)}
                className="inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3.5 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/15 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                {opened === targetModel
                  ? "Opened — also copied"
                  : `Open in ${targetModel === "claude" ? "Claude" : "ChatGPT"}`}
              </button>
            )}
          </div>

          {targetModel && (
            <p className="mt-3 text-xs text-muted-foreground">
              {willPrefill
                ? `Opens ${targetModel === "claude" ? "Claude" : "ChatGPT"} with the prompt already filled in. It's copied to your clipboard too, just in case.`
                : `This prompt is too long to pass through a link, so it's copied to your clipboard — paste it into the new ${targetModel === "claude" ? "Claude" : "ChatGPT"} conversation.`}
            </p>
          )}
        </header>

        {isPromptOutput(outputType) ? (
          // Prompts are shown verbatim in a monospace block — they're meant to
          // be copied exactly, so rendering them as Markdown would be wrong.
          <pre className="whitespace-pre-wrap break-words rounded-xl bg-secondary/40 p-4 text-sm leading-relaxed text-foreground font-mono">
            {content}
          </pre>
        ) : (
          <div
            className="prose prose-sm sm:prose-base dark:prose-invert max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-primary prose-a:no-underline hover:prose-a:underline"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </article>
    </div>
  )
}
