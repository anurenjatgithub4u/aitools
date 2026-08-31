"use client"

import { useState } from "react"
import { PdfUpload } from "@/components/pdf-tools/pdf-upload"
import { PdfFileCard } from "@/components/pdf-tools/pdf-file-card"
import { PdfProgress } from "@/components/pdf-tools/pdf-progress"
import { PdfResult } from "@/components/pdf-tools/pdf-result"
import { PdfError } from "@/components/pdf-tools/pdf-error"
import { downloadBlob } from "@/lib/pdf-tools/client"
import { trackPdfEvent } from "@/lib/pdf-tools/analytics"
import { getPdfPageCount } from "@/lib/pdf-tools/thumbnails"
import { addPageNumbers, type PageNumberPosition } from "@/lib/pdf-tools/page-numbers"

interface ConvertResult {
  blob: Blob
  downloadName: string
  pageCount: number
}

const POSITIONS: { value: PageNumberPosition; label: string }[] = [
  { value: "top-left", label: "Top Left" },
  { value: "top-center", label: "Top Center" },
  { value: "top-right", label: "Top Right" },
  { value: "bottom-left", label: "Bottom Left" },
  { value: "bottom-center", label: "Bottom Center" },
  { value: "bottom-right", label: "Bottom Right" },
]

const FORMATS: { value: string; label: string; example: string }[] = [
  { value: "number", label: "Number only", example: "1" },
  { value: "page-n", label: "Page N", example: "Page 1" },
  { value: "page-n-of-total", label: "Page N of Total", example: "Page 1 of 12" },
  { value: "n-of-total", label: "N / Total", example: "1 / 12" },
]

export function PageNumbersTool() {
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState<number | null>(null)
  const [state, setState] = useState<"idle" | "ready" | "processing" | "success" | "error">("idle")
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ConvertResult | null>(null)

  // Options
  const [position, setPosition] = useState<PageNumberPosition>("bottom-center")
  const [format, setFormat] = useState("page-n-of-total")
  const [startNumber, setStartNumber] = useState(1)
  const [fontSize, setFontSize] = useState(11)

  const isBusy = state === "processing"

  const handleFilesSelected = async (files: File[]) => {
    const selected = files[0]
    setFile(selected)
    setResult(null)
    setError(null)
    setState("ready")
    trackPdfEvent("pdf_tool_opened", { tool_name: "pdf_page_numbers", file_size: selected.size })
    try {
      const count = await getPdfPageCount(selected)
      setPageCount(count)
    } catch {
      // Page count is a display nicety
    }
  }

  const handleConvert = async () => {
    if (!file || isBusy) return
    setError(null)
    setState("processing")
    trackPdfEvent("pdf_processing_started", { tool_name: "pdf_page_numbers", file_size: file.size })
    const started = Date.now()

    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const output = await addPageNumbers(bytes, {
        position,
        startNumber,
        fontSize,
        format: format as "number" | "page-n" | "page-n-of-total" | "n-of-total",
        margin: 28,
      })
      const downloadName = file.name.replace(/\.pdf$/i, "") + "-numbered.pdf"
      setResult({ blob: output.blob, downloadName, pageCount: output.pageCount })
      setState("success")
      trackPdfEvent("pdf_processing_completed", {
        tool_name: "pdf_page_numbers",
        file_size: output.blob.size,
        page_count: output.pageCount,
        processing_time: Date.now() - started,
      })
    } catch {
      setState("error")
      setError("We couldn't add page numbers to this PDF. Please check it's a valid, unencrypted PDF and try again.")
      trackPdfEvent("pdf_processing_failed", { tool_name: "pdf_page_numbers", file_size: file.size })
    }
  }

  const handleDownload = () => {
    if (!result) return
    downloadBlob(result.blob, result.downloadName)
    trackPdfEvent("pdf_downloaded", { tool_name: "pdf_page_numbers" })
  }

  const handleReset = () => {
    setFile(null)
    setPageCount(null)
    setResult(null)
    setError(null)
    setState("idle")
  }

  if (state === "success" && result) {
    return (
      <PdfResult
        heading="Page numbers added."
        primaryAction={{ label: "Download PDF", onClick: handleDownload }}
        secondaryActions={[{ label: "Number Another PDF", onClick: handleReset }]}
      >
        <p className="text-sm text-muted-foreground">
          {result.pageCount} {result.pageCount === 1 ? "page" : "pages"} numbered
        </p>
      </PdfResult>
    )
  }

  return (
    <>
      {!file && <PdfUpload onFilesSelected={handleFilesSelected} />}

      {file && (
        <PdfFileCard
          fileName={file.name}
          byteSize={file.size}
          pageCount={pageCount}
          onRemove={handleReset}
          onReplace={handleReset}
        />
      )}

      {file && (state === "ready" || state === "error") && (
        <div className="space-y-6">

          {/* Position */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-3">Position</p>
            <div className="grid grid-cols-3 gap-2">
              {POSITIONS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPosition(p.value)}
                  className={`px-3 py-2 text-sm rounded-xl border transition-colors cursor-pointer font-medium ${
                    position === p.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Format */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-3">Format</p>
            <div className="space-y-2">
              {FORMATS.map((f) => (
                <label
                  key={f.value}
                  className={`flex items-center justify-between gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                    format === f.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="page-number-format"
                      value={f.value}
                      checked={format === f.value}
                      onChange={() => setFormat(f.value)}
                      className="accent-[var(--primary)]"
                    />
                    <span className="text-sm font-medium text-foreground">{f.label}</span>
                  </span>
                  <span className="text-xs text-muted-foreground font-mono bg-muted/60 rounded px-2 py-0.5">
                    {f.example}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Start number & font size */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="start-number" className="block text-sm font-semibold text-foreground mb-2">
                Start at page
              </label>
              <input
                id="start-number"
                type="number"
                min={1}
                max={9999}
                value={startNumber}
                onChange={(e) => setStartNumber(Math.max(1, Number(e.target.value)))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="font-size" className="block text-sm font-semibold text-foreground mb-2">
                Font size (pt)
              </label>
              <input
                id="font-size"
                type="number"
                min={6}
                max={36}
                value={fontSize}
                onChange={(e) => setFontSize(Math.max(6, Math.min(36, Number(e.target.value))))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {error && <PdfError message={error} />}

          <button
            type="button"
            onClick={handleConvert}
            disabled={isBusy}
            className="w-full inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground px-6 py-3.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Add Page Numbers
          </button>
        </div>
      )}

      {state === "processing" && <PdfProgress phase="processing" label="Adding page numbers…" />}
    </>
  )
}
