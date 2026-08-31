"use client"

import { useState } from "react"
import { RotateCw, RotateCcw } from "lucide-react"
import { PdfUpload } from "@/components/pdf-tools/pdf-upload"
import { PdfFileCard } from "@/components/pdf-tools/pdf-file-card"
import { PdfPagePreview } from "@/components/pdf-tools/pdf-page-preview"
import { PdfProgress } from "@/components/pdf-tools/pdf-progress"
import { PdfResult } from "@/components/pdf-tools/pdf-result"
import { PdfError } from "@/components/pdf-tools/pdf-error"
import { downloadBlob } from "@/lib/pdf-tools/client"
import { trackPdfEvent } from "@/lib/pdf-tools/analytics"
import { getPdfPageCount, renderPageThumbnails, type PageThumbnail } from "@/lib/pdf-tools/thumbnails"
import { MAX_PAGES_FOR_THUMBNAILS } from "@/lib/pdf-tools/config"
import { rotatePdf, type RotationAngle } from "@/lib/pdf-tools/rotator"

interface ConvertResult {
  blob: Blob
  downloadName: string
  pageCount: number
}

const ANGLES: { value: RotationAngle; label: string }[] = [
  { value: 90, label: "90° CW" },
  { value: 180, label: "180°" },
  { value: 270, label: "90° CCW" },
]

const MODES = [
  { key: "all", label: "All Pages" },
  { key: "custom", label: "Select Pages" },
] as const

export function RotateTool() {
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState<number | null>(null)
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([])
  const [thumbnailsLoading, setThumbnailsLoading] = useState(false)

  const [state, setState] = useState<"idle" | "ready" | "processing" | "success" | "error">("idle")
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ConvertResult | null>(null)

  // Options
  const [mode, setMode] = useState<"all" | "custom">("all")
  const [angle, setAngle] = useState<RotationAngle>(90)
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set())
  // Per-page angle overrides in "custom" mode; defaults to `angle` if not set
  const [pageAngles, setPageAngles] = useState<Map<number, RotationAngle>>(new Map())

  const isBusy = state === "processing"

  const handleFilesSelected = async (files: File[]) => {
    const selected = files[0]
    setFile(selected)
    setResult(null)
    setError(null)
    setSelectedPages(new Set())
    setPageAngles(new Map())
    setThumbnails([])
    setState("ready")
    trackPdfEvent("pdf_tool_opened", { tool_name: "pdf_rotator", file_size: selected.size })

    try {
      const count = await getPdfPageCount(selected)
      setPageCount(count)
      if (count <= MAX_PAGES_FOR_THUMBNAILS) {
        setThumbnailsLoading(true)
        const thumbs = await renderPageThumbnails(selected, (t) => setThumbnails((prev) => [...prev, t]))
        setThumbnails(thumbs)
        setThumbnailsLoading(false)
      }
    } catch {
      setThumbnailsLoading(false)
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

  const setPageAngle = (pageNumber: number, a: RotationAngle) => {
    setPageAngles((prev) => {
      const next = new Map(prev)
      next.set(pageNumber, a)
      return next
    })
  }

  const handleConvert = async () => {
    if (!file || isBusy) return

    if (mode === "custom" && selectedPages.size === 0) {
      setError("Select at least one page to rotate.")
      return
    }

    setError(null)
    setState("processing")
    trackPdfEvent("pdf_processing_started", {
      tool_name: "pdf_rotator",
      file_size: file.size,
      page_count: pageCount ?? undefined,
    })
    const started = Date.now()

    try {
      const bytes = new Uint8Array(await file.arrayBuffer())

      let output: { blob: Blob; pageCount: number }
      if (mode === "all") {
        output = await rotatePdf(bytes, { mode: "all", angle })
      } else {
        // Build per-page rotation map for selected pages
        const perPage = new Map<number, RotationAngle>()
        for (const pageNum of selectedPages) {
          perPage.set(pageNum, pageAngles.get(pageNum) ?? angle)
        }
        output = await rotatePdf(bytes, { mode: "custom", perPage })
      }

      const downloadName = file.name.replace(/\.pdf$/i, "") + "-rotated.pdf"
      setResult({ blob: output.blob, downloadName, pageCount: output.pageCount })
      setState("success")
      trackPdfEvent("pdf_processing_completed", {
        tool_name: "pdf_rotator",
        file_size: output.blob.size,
        page_count: output.pageCount,
        processing_time: Date.now() - started,
      })
    } catch {
      setState("error")
      setError("We couldn't rotate this PDF. Please check it's a valid, unencrypted PDF and try again.")
      trackPdfEvent("pdf_processing_failed", { tool_name: "pdf_rotator", file_size: file.size })
    }
  }

  const handleDownload = () => {
    if (!result) return
    downloadBlob(result.blob, result.downloadName)
    trackPdfEvent("pdf_downloaded", { tool_name: "pdf_rotator" })
  }

  const handleReset = () => {
    setFile(null)
    setPageCount(null)
    setThumbnails([])
    setSelectedPages(new Set())
    setPageAngles(new Map())
    setResult(null)
    setError(null)
    setState("idle")
  }

  if (state === "success" && result) {
    return (
      <PdfResult
        heading="PDF rotated."
        primaryAction={{ label: "Download PDF", onClick: handleDownload }}
        secondaryActions={[{ label: "Rotate Another PDF", onClick: handleReset }]}
      >
        <p className="text-sm text-muted-foreground">
          {result.pageCount} {result.pageCount === 1 ? "page" : "pages"}
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

      {file && pageCount && (state === "ready" || state === "error") && (
        <div className="space-y-6">
          {/* Mode tabs */}
          <div className="inline-flex rounded-xl border border-border p-1 bg-card/40" role="tablist" aria-label="Rotation mode">
            {MODES.map((m) => (
              <button
                key={m.key}
                type="button"
                role="tab"
                aria-selected={mode === m.key}
                onClick={() => setMode(m.key)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                  mode === m.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Global angle selector */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-3">
              {mode === "all" ? "Rotate all pages by" : "Default rotation for selected pages"}
            </p>
            <div className="flex flex-wrap gap-2">
              {ANGLES.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => setAngle(a.value)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${
                    angle === a.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {a.value === 90 && <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />}
                  {a.value === 270 && <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom mode: page picker */}
          {mode === "custom" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Click pages to select them. Selected pages will be rotated by the angle above (or set individually below).
              </p>
              <PdfPagePreview
                pageCount={pageCount}
                thumbnails={thumbnails}
                loading={thumbnailsLoading}
                selected={selectedPages}
                onToggle={togglePage}
              />

              {selectedPages.size > 0 && (
                <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Per-page rotation overrides (optional)
                  </p>
                  {Array.from(selectedPages)
                    .sort((a, b) => a - b)
                    .map((pageNum) => (
                      <div key={pageNum} className="flex items-center gap-3">
                        <span className="text-sm text-foreground w-20 shrink-0">Page {pageNum}</span>
                        <div className="flex gap-1.5 flex-wrap">
                          {ANGLES.map((a) => {
                            const pageAngle = pageAngles.get(pageNum) ?? angle
                            const isSelected = pageAngle === a.value
                            return (
                              <button
                                key={a.value}
                                type="button"
                                onClick={() => setPageAngle(pageNum, a.value)}
                                className={`px-3 py-1 text-xs rounded-lg border transition-colors cursor-pointer font-medium ${
                                  isSelected
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border text-muted-foreground hover:border-primary/30"
                                }`}
                              >
                                {a.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {error && <PdfError message={error} />}

          <button
            type="button"
            onClick={handleConvert}
            disabled={isBusy}
            className="w-full inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground px-6 py-3.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Rotate PDF
          </button>
        </div>
      )}

      {state === "processing" && <PdfProgress phase="processing" label="Rotating your PDF…" />}
    </>
  )
}
