"use client"

import { useRef, useState } from "react"
import { AlertCircle, FileText, Loader2, RefreshCw, ShieldCheck, Trash2, UploadCloud } from "lucide-react"
import { MAX_PDF_BYTES, MAX_PDF_PAGES } from "@/lib/pdf-study/config"
import type { PdfMeta } from "@/lib/pdf-study/types"

interface PdfUploadProps {
  onFileSelected: (file: File) => void
  onRemove: () => void
  meta: PdfMeta | null
  busy: boolean
  error: string | null
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function PdfUpload({ onFileSelected, onRemove, meta, busy, error }: PdfUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Client-side checks are a courtesy so an obviously invalid file doesn't cost
  // an upload — the API re-checks all of this before parsing anything.
  const handleFile = (file: File) => {
    setLocalError(null)

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    if (!isPdf) {
      setLocalError("Please upload a PDF file.")
      return
    }
    if (file.size > MAX_PDF_BYTES) {
      setLocalError("This PDF is too large. Please upload a PDF smaller than 25 MB.")
      return
    }
    if (file.size === 0) {
      setLocalError("This PDF appears to be empty.")
      return
    }
    onFileSelected(file)
  }

  const openPicker = () => inputRef.current?.click()
  const shownError = localError || error

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept="application/pdf,.pdf"
      onChange={(e) => {
        const file = e.target.files?.[0]
        if (file) handleFile(file)
        // Reset so re-picking the same file still fires onChange.
        e.target.value = ""
      }}
      className="sr-only"
      disabled={busy}
      aria-label="Choose a PDF file"
    />
  )

  // ---- uploaded state: show the document card instead of the drop zone ----
  if (meta && !busy) {
    return (
      <div className="space-y-4">
        {fileInput}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border border-border bg-card/60 p-4 sm:p-5">
          <div className="h-12 w-12 shrink-0 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <FileText className="h-6 w-6" aria-hidden="true" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground truncate" title={meta.fileName}>
              {meta.fileName}
            </p>
            <p className="text-sm text-muted-foreground">
              {meta.pageCount} {meta.pageCount === 1 ? "page" : "pages"} · {formatBytes(meta.byteSize)}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={openPicker}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:border-primary/40 hover:text-primary transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Replace
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-muted-foreground hover:border-destructive/40 hover:text-destructive transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Remove
            </button>
          </div>
        </div>

        {!meta.hasExtractableText && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              This PDF appears to be scanned. We couldn&apos;t find readable text in it, so we can&apos;t
              generate study materials — OCR would be required. Try a text-based PDF instead.
            </span>
          </div>
        )}

        {shownError && <UploadError message={shownError} />}
      </div>
    )
  }

  // ---- empty / busy state: the drop zone ----
  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          if (!busy) setIsDragOver(true)
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragOver(false)
          if (busy) return
          const file = e.dataTransfer.files?.[0]
          if (file) handleFile(file)
        }}
        onClick={() => !busy && openPicker()}
        onKeyDown={(e) => {
          if (busy) return
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            openPicker()
          }
        }}
        role="button"
        tabIndex={busy ? -1 : 0}
        aria-label="Upload a PDF — drag and drop, or press Enter to browse"
        aria-busy={busy}
        className={`relative flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed px-6 py-14 sm:py-16 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          busy ? "cursor-wait border-border/60 bg-card/40" : "cursor-pointer"
        } ${
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-border/60 bg-card/40 hover:border-primary/40 hover:bg-card/60"
        }`}
      >
        {fileInput}

        <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
          {busy ? (
            <Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" />
          ) : (
            <UploadCloud className="h-7 w-7" aria-hidden="true" />
          )}
        </div>

        <p className="font-semibold text-foreground">
          {busy ? "Reading your PDF…" : "Drag and drop your PDF here, or click to browse"}
        </p>
        <p className="text-sm text-muted-foreground">
          PDF only — up to 25 MB and {MAX_PDF_PAGES} pages
        </p>
      </div>

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" aria-hidden="true" />
        <span>
          Your PDF is temporarily processed on our server to generate the study materials you ask for.
          It is never stored, and the file itself is discarded as soon as its text has been read.
        </span>
      </p>

      {shownError && <UploadError message={shownError} />}
    </div>
  )
}

function UploadError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
      <span>{message}</span>
    </div>
  )
}
