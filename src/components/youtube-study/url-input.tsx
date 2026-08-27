"use client"

import { useState, type FormEvent } from "react"
import { AlertCircle, Link2, Loader2, Search } from "lucide-react"

// The Analyze button deliberately does no AI work (spec §3). It validates the
// URL shape client-side for instant feedback, then asks the server for
// metadata — which is one cheap API call, not a pipeline run.

interface UrlInputProps {
  onAnalyze: (url: string) => void
  busy: boolean
  error?: { message: string; hint?: string; action?: string } | null
  onReset?: () => void
}

export function UrlInput({ onAnalyze, busy, error, onReset }: UrlInputProps) {
  const [url, setUrl] = useState("")

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed || busy) return
    onAnalyze(trimmed)
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 min-w-0">
          <Link2
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="url"
            inputMode="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste YouTube video URL..."
            aria-label="YouTube video URL"
            aria-invalid={!!error}
            disabled={busy}
            className="w-full h-14 rounded-2xl border border-border bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          />
        </div>
        <button
          type="submit"
          disabled={busy || !url.trim()}
          className="inline-flex h-14 shrink-0 items-center justify-center gap-2 rounded-2xl bg-primary px-7 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <Search className="h-5 w-5" aria-hidden="true" />
          )}
          {busy ? "Checking…" : "Analyze Video"}
        </button>
      </form>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3.5"
        >
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-destructive" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-destructive">{error.message}</p>
            {error.hint && <p className="mt-1 text-sm text-destructive/80">{error.hint}</p>}
            {error.action && onReset && (
              <button
                type="button"
                onClick={() => {
                  setUrl("")
                  onReset()
                }}
                className="mt-2.5 text-sm font-semibold text-destructive underline underline-offset-2 cursor-pointer"
              >
                {error.action}
              </button>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Works with youtube.com/watch, youtu.be and Shorts links. Videos up to 1 hour.
      </p>
    </div>
  )
}
