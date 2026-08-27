"use client"

import { useEffect, useRef, useState } from "react"
import JSZip from "jszip"
import { AlertCircle } from "lucide-react"
import { PdfUpload } from "./pdf-upload"
import { PdfFileCard } from "./pdf-file-card"
import { PdfPagePreview } from "./pdf-page-preview"
import { PdfProgress } from "./pdf-progress"
import { PdfResult } from "./pdf-result"
import { PdfError } from "./pdf-error"
import { downloadBlob } from "@/lib/pdf-tools/client"
import { trackPdfEvent } from "@/lib/pdf-tools/analytics"
import { renderPageThumbnails, type PageThumbnail } from "@/lib/pdf-tools/thumbnails"
import {
  openPdfForExport,
  renderPageToImage,
  extensionFor,
  IMAGE_EXPORT_RESOLUTIONS,
  type ImageExportFormat,
} from "@/lib/pdf-tools/export-images"
import { MAX_PAGES_FOR_THUMBNAILS } from "@/lib/pdf-tools/config"

interface PdfToImageToolProps {
  /** The format this route targets — e.g. /pdf/to-jpg passes "jpg". Still
   *  switchable inside the tool; this only sets what's selected on load. */
  defaultFormat: ImageExportFormat
}

const FORMAT_LABELS: Record<ImageExportFormat, string> = { jpg: "JPG", png: "PNG", webp: "WEBP" }
const FORMATS: ImageExportFormat[] = ["jpg", "png", "webp"]

type PageMode = "all" | "selected"

interface ExportResult {
  blob: Blob
  downloadName: string
  pageCount: number
  isZip: boolean
  fellBackToPng: boolean
}

// Minimal shape of the pdf.js document proxy this component actually uses —
// avoids importing pdf.js's own types into a "use client" tree just for a
// handle we pass straight back into export-images.ts / thumbnails helpers.
interface OpenPdf {
  numPages: number
  destroy: () => Promise<void>
}

export function PdfToImageTool({ defaultFormat }: PdfToImageToolProps) {
  const [file, setFile] = useState<File | null>(null)
  const [pdf, setPdf] = useState<OpenPdf | null>(null)
  const pdfRef = useRef<OpenPdf | null>(null)
  const [pageCount, setPageCount] = useState<number | null>(null)
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([])
  const [thumbnailsLoading, setThumbnailsLoading] = useState(false)
  const [openError, setOpenError] = useState<string | null>(null)

  const [format, setFormat] = useState<ImageExportFormat>(defaultFormat)
  const [resolution, setResolution] = useState<"standard" | "high">("standard")
  const [pageMode, setPageMode] = useState<PageMode>("all")
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set())

  const [state, setState] = useState<"idle" | "ready" | "processing" | "success" | "error">("idle")
  const [progressLabel, setProgressLabel] = useState<string | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ExportResult | null>(null)

  // Always close the pdf.js document we opened — it holds real memory
  // (decoded page data) that won't free itself just because state changed.
  useEffect(() => {
    return () => {
      pdfRef.current?.destroy().catch(() => {})
    }
  }, [])

  const isBusy = state === "processing"

  const handleFilesSelected = async (files: File[]) => {
    const selected = files[0]
    await pdfRef.current?.destroy().catch(() => {})
    setFile(selected)
    setPdf(null)
    pdfRef.current = null
    setResult(null)
    setError(null)
    setOpenError(null)
    setSelectedPages(new Set())
    setThumbnails([])
    setPageMode("all")
    trackPdfEvent("pdf_tool_opened", { tool_name: "pdf_to_image", file_size: selected.size })

    try {
      const opened = await openPdfForExport(selected)
      pdfRef.current = opened as unknown as OpenPdf
      setPdf(pdfRef.current)
      setPageCount(opened.numPages)
      setState("ready")

      if (opened.numPages <= MAX_PAGES_FOR_THUMBNAILS) {
        setThumbnailsLoading(true)
        const thumbs = await renderPageThumbnails(selected, (t) => setThumbnails((prev) => [...prev, t]))
        setThumbnails(thumbs)
        setThumbnailsLoading(false)
      }
    } catch {
      setState("error")
      setOpenError("We couldn't read this PDF. Please try another PDF.")
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

  const baseName = (name: string) => name.replace(/\.pdf$/i, "")

  const handleConvert = async () => {
    if (!file || !pdf || !pageCount || isBusy) return

    const pages =
      pageMode === "selected"
        ? Array.from(selectedPages).sort((a, b) => a - b)
        : Array.from({ length: pageCount }, (_, i) => i + 1)

    if (pages.length === 0) {
      setError("Select at least one page.")
      return
    }

    setError(null)
    setState("processing")
    setProgressLabel(pages.length > 1 ? `Converting page 1 of ${pages.length}…` : "Converting your PDF…")
    trackPdfEvent("pdf_processing_started", { tool_name: "pdf_to_image", file_size: file.size, page_count: pageCount })
    const started = Date.now()

    try {
      const dpi = IMAGE_EXPORT_RESOLUTIONS[resolution].dpi
      const rendered: { pageNumber: number; blob: Blob; fellBackToPng: boolean }[] = []

      for (let i = 0; i < pages.length; i++) {
        setProgressLabel(pages.length > 1 ? `Converting page ${i + 1} of ${pages.length}…` : "Converting your PDF…")
        // Pages render sequentially, one canvas at a time, so this loop is
        // intentionally not parallelized (a shared canvas element is reused).
        const page = await renderPageToImage(pdf as unknown as Parameters<typeof renderPageToImage>[0], pages[i], format, dpi)
        rendered.push(page)
      }

      const ext = extensionFor(format)
      const anyFellBack = rendered.some((r) => r.fellBackToPng)
      const name = baseName(file.name)

      let output: ExportResult
      if (rendered.length === 1) {
        output = {
          blob: rendered[0].blob,
          downloadName: `${name}.${rendered[0].fellBackToPng ? "png" : ext}`,
          pageCount: 1,
          isZip: false,
          fellBackToPng: rendered[0].fellBackToPng,
        }
      } else {
        const zip = new JSZip()
        rendered.forEach((r) => {
          const pad = String(r.pageNumber).padStart(3, "0")
          zip.file(`page-${pad}.${r.fellBackToPng ? "png" : ext}`, r.blob)
        })
        const zipBlob = await zip.generateAsync({ type: "blob" })
        output = {
          blob: zipBlob,
          downloadName: `${name}-images.zip`,
          pageCount: rendered.length,
          isZip: true,
          fellBackToPng: anyFellBack,
        }
      }

      setResult(output)
      setState("success")
      trackPdfEvent("pdf_processing_completed", {
        tool_name: "pdf_to_image",
        file_size: file.size,
        page_count: pageCount,
        processing_time: Date.now() - started,
      })
    } catch {
      setState("error")
      setError("We couldn't convert this PDF. Please try another PDF.")
      trackPdfEvent("pdf_processing_failed", { tool_name: "pdf_to_image", file_size: file.size })
    }
  }

  const handleDownload = () => {
    if (!result) return
    downloadBlob(result.blob, result.downloadName)
    trackPdfEvent("pdf_downloaded", { tool_name: "pdf_to_image" })
  }

  const handleReset = () => {
    pdfRef.current?.destroy().catch(() => {})
    pdfRef.current = null
    setFile(null)
    setPdf(null)
    setPageCount(null)
    setThumbnails([])
    setSelectedPages(new Set())
    setPageMode("all")
    setResult(null)
    setError(null)
    setOpenError(null)
    setState("idle")
  }

  // ---- result ----
  if (state === "success" && result) {
    return (
      <PdfResult
        heading={result.isZip ? `Your PDF has been converted to ${result.pageCount} images.` : "Your image is ready."}
        primaryAction={{ label: result.isZip ? "Download ZIP" : `Download ${FORMAT_LABELS[format]}`, onClick: handleDownload }}
        secondaryActions={[{ label: "Convert Another PDF", onClick: handleReset }]}
      >
        {result.fellBackToPng && (
          <p className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 text-left rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
            <span>Your browser doesn&apos;t support exporting WEBP, so PNG was used instead — same image, different format.</span>
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

      {openError && <PdfError message={openError} />}

      {file && pageCount && (state === "ready" || state === "error") && (
        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold text-foreground mb-3">Output format</p>
            <div className="inline-flex rounded-xl border border-border p-1 bg-card/40" role="tablist" aria-label="Output format">
              {FORMATS.map((f) => (
                <button
                  key={f}
                  type="button"
                  role="tab"
                  aria-selected={format === f}
                  onClick={() => setFormat(f)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                    format === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {FORMAT_LABELS[f]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground mb-3">Resolution</p>
            <div className="grid grid-cols-2 gap-3">
              {(Object.entries(IMAGE_EXPORT_RESOLUTIONS) as [keyof typeof IMAGE_EXPORT_RESOLUTIONS, typeof IMAGE_EXPORT_RESOLUTIONS["standard"]][]).map(
                ([key, preset]) => (
                  <label
                    key={key}
                    className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-colors ${
                      resolution === key ? "border-primary bg-primary/5" : "border-border bg-card/40 hover:border-primary/30"
                    }`}
                  >
                    <input
                      type="radio"
                      name="resolution"
                      className="mt-1 accent-primary"
                      checked={resolution === key}
                      onChange={() => setResolution(key)}
                    />
                    <span>
                      <span className="block text-sm font-semibold text-foreground">{preset.label}</span>
                      <span className="block text-xs text-muted-foreground mt-0.5">{preset.helpText}</span>
                    </span>
                  </label>
                )
              )}
            </div>
          </div>

          {pageCount > 1 && (
            <div>
              <p className="text-sm font-semibold text-foreground mb-3">Pages</p>
              <div className="inline-flex rounded-xl border border-border p-1 bg-card/40" role="tablist" aria-label="Which pages to convert">
                <button
                  type="button"
                  role="tab"
                  aria-selected={pageMode === "all"}
                  onClick={() => setPageMode("all")}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                    pageMode === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All pages
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={pageMode === "selected"}
                  disabled={thumbnails.length === 0}
                  onClick={() => setPageMode("selected")}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    pageMode === "selected" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Selected pages
                </button>
              </div>

              {pageMode === "selected" && (
                <div className="mt-4">
                  <PdfPagePreview
                    pageCount={pageCount}
                    thumbnails={thumbnails}
                    loading={thumbnailsLoading}
                    selected={selectedPages}
                    onToggle={togglePage}
                  />
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
            Convert to {FORMAT_LABELS[format]}
          </button>
        </div>
      )}

      {state === "processing" && <PdfProgress phase="processing" label={progressLabel} />}
    </>
  )
}
