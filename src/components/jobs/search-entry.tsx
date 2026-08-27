"use client"

import { useRef, useState, type FormEvent } from "react"
import { AlertCircle, FileText, Loader2, Search, Sparkles, UploadCloud } from "lucide-react"
import { MAX_MANUAL_QUERY_CHARS, MAX_RESUME_BYTES } from "@/lib/jobs/config"

// The two entry points from spec §1 — resume upload (Flow A) and a free-text
// description (Flow B). Both produce a CandidateProfile server-side, so the
// rest of the page doesn't care which was used.

export type EntryMode = "resume" | "manual"

interface SearchEntryProps {
  mode: EntryMode
  onModeChange: (mode: EntryMode) => void
  onResumeSelected: (file: File) => void
  onManualSearch: (description: string) => void
  busy: boolean
  error?: { message: string; hint?: string } | null
}

const EXAMPLE =
  "Android Developer with 3 years experience in Kotlin and Jetpack Compose, looking for jobs in Bangalore or remote."

export function SearchEntry({
  mode,
  onModeChange,
  onResumeSelected,
  onManualSearch,
  busy,
  error,
}: SearchEntryProps) {
  const [dragOver, setDragOver] = useState(false)
  const [description, setDescription] = useState("")
  const [localError, setLocalError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Client-side checks are a courtesy so an obviously wrong file doesn't cost
  // an upload — the API re-validates everything before parsing.
  const handleFile = (file: File) => {
    setLocalError(null)
    const extension = file.name.toLowerCase().split(".").pop() ?? ""
    if (!["pdf", "docx", "doc"].includes(extension)) {
      setLocalError("Upload a PDF or DOCX file.")
      return
    }
    if (file.size > MAX_RESUME_BYTES) {
      setLocalError("That file is too large. Resumes must be under 8 MB.")
      return
    }
    if (file.size === 0) {
      setLocalError("That file appears to be empty.")
      return
    }
    onResumeSelected(file)
  }

  const submitManual = (e: FormEvent) => {
    e.preventDefault()
    const value = description.trim()
    if (!value || busy) return
    setLocalError(null)
    onManualSearch(value)
  }

  const shownError = localError ? { message: localError } : error

  return (
    <div className="rounded-2xl border border-border bg-background p-5 sm:p-8">
      {/* Mode switch */}
      <div
        role="tablist"
        aria-label="How to search"
        className="mb-6 inline-flex gap-1 rounded-xl border border-border/60 bg-card/40 p-1"
      >
        {(["resume", "manual"] as EntryMode[]).map((value) => (
          <button
            key={value}
            role="tab"
            type="button"
            aria-selected={mode === value}
            onClick={() => onModeChange(value)}
            disabled={busy}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              mode === value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {value === "resume" ? "Upload Resume" : "Describe Your Job"}
          </button>
        ))}
      </div>

      {mode === "resume" ? (
        <div>
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              const file = e.dataTransfer.files?.[0]
              if (file) handleFile(file)
            }}
            onClick={() => !busy && inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                if (!busy) inputRef.current?.click()
              }
            }}
            className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              busy
                ? "cursor-not-allowed border-border/50 opacity-60"
                : dragOver
                  ? "cursor-pointer border-primary bg-primary/5"
                  : "cursor-pointer border-border hover:border-primary/50 hover:bg-card/40"
            }`}
          >
            {busy ? (
              <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
            ) : (
              <UploadCloud className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            )}
            <div>
              <p className="text-base font-semibold text-foreground">
                {busy ? "Reading your resume…" : "Drop your resume here, or click to browse"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">PDF or DOCX, up to 8 MB</p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,.doc,application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
                e.target.value = ""
              }}
            />
          </div>

          <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
            <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Your resume is read on our server to build a profile, then discarded. The file itself is
            never stored.
          </p>
        </div>
      ) : (
        <form onSubmit={submitManual}>
          <label htmlFor="job-description" className="block text-sm font-semibold text-foreground mb-2">
            What job are you looking for?
          </label>
          <textarea
            id="job-description"
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, MAX_MANUAL_QUERY_CHARS))}
            placeholder={EXAMPLE}
            rows={4}
            disabled={busy}
            className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-base placeholder:text-muted-foreground/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          />

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={busy || !description.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Search className="h-4 w-4" aria-hidden="true" />
              )}
              {busy ? "Searching…" : "Find Jobs"}
            </button>

            {!description && (
              <button
                type="button"
                onClick={() => setDescription(EXAMPLE)}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Use an example
              </button>
            )}

            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
              {description.length}/{MAX_MANUAL_QUERY_CHARS}
            </span>
          </div>
        </form>
      )}

      {shownError && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
          <div>
            <p className="font-medium text-destructive">{shownError.message}</p>
            {shownError.hint && <p className="mt-0.5 text-destructive/80">{shownError.hint}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
