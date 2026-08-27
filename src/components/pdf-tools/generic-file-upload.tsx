"use client"

import { useRef, useState } from "react"
import { Loader2, UploadCloud } from "lucide-react"
import { PdfError } from "./pdf-error"

interface GenericFileUploadProps {
  /** input[accept] value, e.g. "image/jpeg,image/png,image/webp" */
  accept: string
  multiple?: boolean
  busy?: boolean
  error?: string | null
  onFilesSelected: (files: File[]) => void
  /** Returns an error message if the file is rejected, or null if it's fine.
   *  Real, per-tool validation (extension/MIME/size) — this component has
   *  no opinion of its own about what a valid file looks like. */
  validate: (file: File) => string | null
  title: string // e.g. "Drop your image here"
  chooseLabel: string // e.g. "Choose Image"
  hint: string // e.g. "JPG, PNG or WEBP — up to 25 MB"
}

// Same drag-and-drop/keyboard/empty-state pattern as PdfUpload — this is the
// non-PDF sibling for tools whose *source* isn't a PDF (Image to PDF, HTML
// to PDF, Word to PDF), so it doesn't hardcode PDF-only copy or validation.
export function GenericFileUpload({
  accept,
  multiple = false,
  busy = false,
  error = null,
  onFilesSelected,
  validate,
  title,
  chooseLabel,
  hint,
}: GenericFileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (fileList: FileList | File[]) => {
    setLocalError(null)
    const files = Array.from(fileList)
    if (files.length === 0) return

    for (const file of files) {
      const issue = validate(file)
      if (issue) {
        setLocalError(issue)
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
        accept={accept}
        multiple={multiple}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files)
          e.target.value = ""
        }}
        className="sr-only"
        disabled={busy}
        aria-label={multiple ? "Choose files" : "Choose a file"}
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
        aria-label={`${title} — drag and drop, or press Enter to browse`}
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

        <p className="font-semibold text-foreground">{busy ? "Reading your file…" : title}</p>
        <p className="text-sm text-muted-foreground">{hint}</p>

        {!busy && (
          <span className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium">
            {chooseLabel}
          </span>
        )}
      </div>

      {shownError && <PdfError message={shownError} />}
    </div>
  )
}
