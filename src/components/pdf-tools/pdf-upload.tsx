"use client"

import { useRef, useState } from "react"
import { Loader2, UploadCloud } from "lucide-react"
import { MAX_PDF_BYTES } from "@/lib/pdf-tools/config"
import { PdfError } from "./pdf-error"

interface PdfUploadProps {
  multiple?: boolean
  busy?: boolean
  error?: string | null
  onFilesSelected: (files: File[]) => void
  hint?: string
}

// The drop-zone / picker only — deliberately doesn't render an "uploaded
// file" state, since that differs between a single-file tool (PdfFileCard)
// and the merger's reorderable list (PdfFileList). This is purely the empty
// and busy states (spec §3).
export function PdfUpload({ multiple = false, busy = false, error = null, onFilesSelected, hint }: PdfUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (fileList: FileList | File[]) => {
    setLocalError(null)
    const files = Array.from(fileList)
    if (files.length === 0) return

    for (const file of files) {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
      if (!isPdf) {
        setLocalError("Please upload a PDF file.")
        return
      }
      if (file.size === 0) {
        setLocalError("This file appears to be empty.")
        return
      }
      if (file.size > MAX_PDF_BYTES) {
        setLocalError(`This file is too large. Please upload a PDF smaller than ${Math.round(MAX_PDF_BYTES / (1024 * 1024))} MB.`)
        return
      }
    }
    onFilesSelected(files)
  }

  const openPicker = () => inputRef.current?.click()
  const shownError = localError || error

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple={multiple}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files)
          e.target.value = ""
        }}
        className="sr-only"
        disabled={busy}
        aria-label={multiple ? "Choose PDF files" : "Choose a PDF file"}
      />

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
          if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files)
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
        aria-label={multiple ? "Upload PDFs — drag and drop, or press Enter to browse" : "Upload a PDF — drag and drop, or press Enter to browse"}
        aria-busy={busy}
        className={`relative flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed px-6 py-14 sm:py-16 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          busy ? "cursor-wait border-border/60 bg-card/40" : "cursor-pointer"
        } ${
          isDragOver ? "border-primary bg-primary/5" : "border-border/60 bg-card/40 hover:border-primary/40 hover:bg-card/60"
        }`}
      >
        <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
          {busy ? <Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" /> : <UploadCloud className="h-7 w-7" aria-hidden="true" />}
        </div>

        <p className="font-semibold text-foreground">
          {busy ? "Reading your PDF…" : multiple ? "Drop your PDFs here, or click to browse" : "Drop your PDF here, or click to browse"}
        </p>
        <p className="text-sm text-muted-foreground">
          {hint ?? `PDF only — up to ${Math.round(MAX_PDF_BYTES / (1024 * 1024))} MB${multiple ? " each. You can select multiple files." : ""}`}
        </p>

        {!busy && (
          <span className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium">
            {multiple ? "Choose PDF Files" : "Choose PDF"}
          </span>
        )}
      </div>

      {shownError && <PdfError message={shownError} />}
    </div>
  )
}
