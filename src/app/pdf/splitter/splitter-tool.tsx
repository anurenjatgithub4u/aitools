"use client"

import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { useAuth } from "@/components/auth-context"
import { PdfUpload } from "@/components/pdf-tools/pdf-upload"
import { PdfFileCard } from "@/components/pdf-tools/pdf-file-card"
import { PdfPagePreview } from "@/components/pdf-tools/pdf-page-preview"
import { PdfProgress } from "@/components/pdf-tools/pdf-progress"
import { PdfResult } from "@/components/pdf-tools/pdf-result"
import { PdfError } from "@/components/pdf-tools/pdf-error"
import { usePdfProcessing } from "@/lib/pdf-tools/use-pdf-processing"
import { downloadBlob } from "@/lib/pdf-tools/client"
import { trackPdfEvent } from "@/lib/pdf-tools/analytics"
import { getPdfPageCount, renderPageThumbnails, type PageThumbnail } from "@/lib/pdf-tools/thumbnails"
import { MAX_PAGES_FOR_THUMBNAILS } from "@/lib/pdf-tools/config"
import type { PageRange, SplitMode, SplitRequestOptions } from "@/lib/pdf-tools/types"

interface SplitResult {
  blob: Blob
  downloadName: string
  outputFileCount: number
  isZip: boolean
}

const MODES: { key: SplitMode; label: string }[] = [
  { key: "extract", label: "Extract Pages" },
  { key: "every", label: "Split Every Page" },
  { key: "ranges", label: "Split by Ranges" },
]

export function SplitterTool() {
  const { user } = useAuth()
  const { state, setReady, uploadFraction, error, setError, run, reset, isBusy } = usePdfProcessing()

  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState<number | null>(null)
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([])
  const [thumbnailsLoading, setThumbnailsLoading] = useState(false)

  const [mode, setMode] = useState<SplitMode>("extract")
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set())
  const [ranges, setRanges] = useState<PageRange[]>([{ start: 1, end: 1 }])
  const [rangeError, setRangeError] = useState<string | null>(null)

  const [result, setResult] = useState<SplitResult | null>(null)

  const handleFilesSelected = async (files: File[]) => {
    const selected = files[0]
    setFile(selected)
    setResult(null)
    setError(null)
    setSelectedPages(new Set())
    setThumbnails([])
    setReady()
    trackPdfEvent("pdf_tool_opened", { tool_name: "pdf_splitter", file_size: selected.size })

    try {
      const count = await getPdfPageCount(selected)
      setPageCount(count)
      setRanges([{ start: 1, end: count }])
      if (count <= MAX_PAGES_FOR_THUMBNAILS) {
        setThumbnailsLoading(true)
        const thumbs = await renderPageThumbnails(selected, (t) => setThumbnails((prev) => [...prev, t]))
        setThumbnails(thumbs)
        setThumbnailsLoading(false)
      }
    } catch {
      setThumbnailsLoading(false)
      // Page count/thumbnails are display niceties — the server still
      // validates the file for real when the user actually splits it.
    }
  }

  const togglePage = (pageNumber: number) => {
    setSelectedPages((prev) => {
      const next = new Set(prev)
      if (next.has(pageNumber)) next.delete(pageNumber)
      else next.add(pageNumber)
      return next
    })
  }

  const updateRange = (index: number, field: "start" | "end", value: number) => {
    setRanges((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)))
  }
  const addRange = () => setRanges((prev) => [...prev, { start: 1, end: pageCount ?? 1 }])
  const removeRange = (index: number) => setRanges((prev) => prev.filter((_, i) => i !== index))

  const validateRangesClientSide = (): boolean => {
    if (!pageCount) return false
    if (ranges.length === 0) {
      setRangeError("Add at least one page range.")
      return false
    }
    for (const r of ranges) {
      if (!Number.isInteger(r.start) || !Number.isInteger(r.end) || r.start < 1 || r.end > pageCount) {
        setRangeError(`Page numbers must be between 1 and ${pageCount}.`)
        return false
      }
      if (r.start > r.end) {
        setRangeError("A range's start page must not be after its end page.")
        return false
      }
    }
    setRangeError(null)
    return true
  }

  const handleSplit = async () => {
    if (!file || isBusy) return

    let options: SplitRequestOptions
    if (mode === "extract") {
      if (selectedPages.size === 0) {
        setRangeError("Select at least one page.")
        return
      }
      options = { mode, pages: Array.from(selectedPages).sort((a, b) => a - b) }
    } else if (mode === "every") {
      options = { mode }
    } else {
      if (!validateRangesClientSide()) return
      options = { mode, ranges }
    }

    trackPdfEvent("pdf_processing_started", { tool_name: "pdf_splitter", file_size: file.size, page_count: pageCount ?? undefined })

    const formData = new FormData()
    formData.append("file", file)
    formData.append("options", JSON.stringify(options))
    const idToken = user ? await user.getIdToken().catch(() => undefined) : undefined
    if (idToken) formData.append("idToken", idToken)

    const started = Date.now()
    const res = await run("/api/pdf/split", formData)
    if (!res) {
      trackPdfEvent("pdf_processing_failed", { tool_name: "pdf_splitter", file_size: file.size })
      return
    }

    const meta = {
      outputFileCount: Number(res.meta["output-file-count"] ?? 1),
      isZip: res.meta["is-zip"] === "true",
    }
    setResult({ blob: res.blob, downloadName: res.downloadName, ...meta })
    trackPdfEvent("pdf_processing_completed", {
      tool_name: "pdf_splitter",
      file_size: file.size,
      page_count: pageCount ?? undefined,
      processing_time: Date.now() - started,
    })
  }

  const handleDownload = () => {
    if (!result) return
    downloadBlob(result.blob, result.downloadName)
    trackPdfEvent("pdf_downloaded", { tool_name: "pdf_splitter" })
  }

  const handleReset = () => {
    setFile(null)
    setPageCount(null)
    setThumbnails([])
    setSelectedPages(new Set())
    setRanges([{ start: 1, end: 1 }])
    setResult(null)
    reset()
  }

  // ---- result ----
  if (state === "success" && result) {
    const heading =
      mode === "extract" && !result.isZip
        ? "Your PDF has been created."
        : `Your PDF has been split into ${result.outputFileCount} files.`

    return (
      <PdfResult
        heading={heading}
        primaryAction={{ label: result.isZip ? "Download ZIP" : "Download PDF", onClick: handleDownload }}
        secondaryActions={[{ label: "Split Another PDF", onClick: handleReset }]}
      >
        {mode === "extract" && !result.isZip && (
          <p className="text-sm text-muted-foreground">
            Selected pages: {Array.from(selectedPages).sort((a, b) => a - b).join(", ")}
          </p>
        )}
      </PdfResult>
    )
  }

  return (
    <>
      {!file && <PdfUpload onFilesSelected={handleFilesSelected} />}

      {file && (
        <PdfFileCard fileName={file.name} byteSize={file.size} pageCount={pageCount} onRemove={handleReset} onReplace={handleReset} />
      )}

      {file && pageCount && (state === "ready" || state === "error") && (
        <div className="space-y-6">
          <div className="inline-flex rounded-xl border border-border p-1 bg-card/40" role="tablist" aria-label="Split mode">
            {MODES.map((m) => (
              <button
                key={m.key}
                type="button"
                role="tab"
                aria-selected={mode === m.key}
                onClick={() => setMode(m.key)}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                  mode === m.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {mode === "extract" && (
            <PdfPagePreview
              pageCount={pageCount}
              thumbnails={thumbnails}
              loading={thumbnailsLoading}
              selected={selectedPages}
              onToggle={togglePage}
            />
          )}

          {mode === "every" && (
            <p className="text-sm text-muted-foreground rounded-xl border border-border bg-card/40 p-4">
              {pageCount} pages → {pageCount} PDF files, delivered as a ZIP.
            </p>
          )}

          {mode === "ranges" && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">Page ranges</p>
              {ranges.map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={pageCount}
                    value={r.start}
                    onChange={(e) => updateRange(i, "start", Number(e.target.value))}
                    aria-label={`Range ${i + 1} start page`}
                    className="w-20 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                  <span className="text-muted-foreground">–</span>
                  <input
                    type="number"
                    min={1}
                    max={pageCount}
                    value={r.end}
                    onChange={(e) => updateRange(i, "end", Number(e.target.value))}
                    aria-label={`Range ${i + 1} end page`}
                    className="w-20 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeRange(i)}
                    disabled={ranges.length === 1}
                    aria-label={`Remove range ${i + 1}`}
                    className="ml-auto h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addRange}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline cursor-pointer"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add Range
              </button>
              {rangeError && <PdfError message={rangeError} />}
            </div>
          )}

          {error && <PdfError message={error} />}

          <button
            type="button"
            onClick={handleSplit}
            disabled={isBusy}
            className="w-full inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground px-6 py-3.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Split PDF
          </button>
        </div>
      )}

      {(state === "uploading" || state === "processing") && (
        <PdfProgress phase={state} uploadFraction={uploadFraction} label={state === "processing" ? "Splitting your PDF…" : undefined} />
      )}
    </>
  )
}
