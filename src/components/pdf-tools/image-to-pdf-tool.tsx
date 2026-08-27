"use client"

import { useState } from "react"
import { GenericFileUpload } from "./generic-file-upload"
import { PdfFileList, type PdfFileListItem } from "./pdf-file-list"
import { PdfProgress } from "./pdf-progress"
import { PdfResult } from "./pdf-result"
import { PdfError } from "./pdf-error"
import { downloadBlob } from "@/lib/pdf-tools/client"
import { trackPdfEvent } from "@/lib/pdf-tools/analytics"
import { convertImagesToPdf, type ImagePageSize } from "@/lib/pdf-tools/images-to-pdf"
import { MAX_IMAGE_BYTES, MAX_IMAGES_PER_PDF } from "@/lib/pdf-tools/config"

interface ImageToPdfToolProps {
  /** Which format this route targets — only changes copy/hints, every route
   *  actually accepts all three (matching how real "JPG to PDF" tools work). */
  defaultFormat: "jpg" | "png" | "webp"
}

interface ImageItem extends PdfFileListItem {
  file: File
}

interface ConvertResult {
  blob: Blob
  downloadName: string
  pageCount: number
}

function makeId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
}

const FORMAT_LABEL: Record<ImageToPdfToolProps["defaultFormat"], string> = { jpg: "JPG", png: "PNG", webp: "WEBP" }

function validateImage(file: File): string | null {
  const isImage = /^image\/(jpeg|png|webp)$/.test(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name)
  if (!isImage) return "Please upload a JPG, PNG or WEBP image."
  if (file.size === 0) return "This file appears to be empty."
  if (file.size > MAX_IMAGE_BYTES) return `This image is too large. Please upload one smaller than ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))} MB.`
  return null
}

export function ImageToPdfTool({ defaultFormat }: ImageToPdfToolProps) {
  const [items, setItems] = useState<ImageItem[]>([])
  const [pageSize, setPageSize] = useState<ImagePageSize>("fit")
  const [state, setState] = useState<"idle" | "ready" | "processing" | "success" | "error">("idle")
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ConvertResult | null>(null)

  const isBusy = state === "processing"

  const handleFilesSelected = (files: File[]) => {
    setError(null)
    setResult(null)
    const room = MAX_IMAGES_PER_PDF - items.length
    if (room <= 0) {
      setError(`You can add up to ${MAX_IMAGES_PER_PDF} images in one PDF.`)
      return
    }
    const accepted = files.slice(0, room)
    const newItems: ImageItem[] = accepted.map((file) => ({ id: makeId(), file, fileName: file.name, byteSize: file.size }))
    setItems((prev) => [...prev, ...newItems])
    setState("ready")
    trackPdfEvent("pdf_tool_opened", { tool_name: "image_to_pdf", file_size: newItems.reduce((s, i) => s + i.byteSize, 0) })
    if (files.length > accepted.length) {
      setError(`Only added the first ${accepted.length} images — the limit is ${MAX_IMAGES_PER_PDF} per PDF.`)
    }
  }

  const handleReorder = (newItems: PdfFileListItem[]) => {
    const byId = new Map(items.map((i) => [i.id, i]))
    setItems(newItems.map((i) => byId.get(i.id)!).filter(Boolean))
  }

  const handleRemove = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id))

  const handleConvert = async () => {
    if (items.length === 0 || isBusy) return
    setError(null)
    setState("processing")
    const totalBytes = items.reduce((s, i) => s + i.byteSize, 0)
    trackPdfEvent("pdf_processing_started", { tool_name: "image_to_pdf", file_size: totalBytes, page_count: items.length })
    const started = Date.now()

    try {
      const output = await convertImagesToPdf(items.map((i) => i.file), pageSize)
      const downloadName = items.length === 1 ? `${items[0].fileName.replace(/\.[^.]+$/, "")}.pdf` : "images.pdf"
      setResult({ blob: output.blob, downloadName, pageCount: output.pageCount })
      setState("success")
      trackPdfEvent("pdf_processing_completed", {
        tool_name: "image_to_pdf",
        file_size: output.blob.size,
        page_count: output.pageCount,
        processing_time: Date.now() - started,
      })
    } catch {
      setState("error")
      setError("We couldn't convert these images. Please check they're valid JPG, PNG or WEBP files and try again.")
      trackPdfEvent("pdf_processing_failed", { tool_name: "image_to_pdf", file_size: totalBytes })
    }
  }

  const handleDownload = () => {
    if (!result) return
    downloadBlob(result.blob, result.downloadName)
    trackPdfEvent("pdf_downloaded", { tool_name: "image_to_pdf" })
  }

  const handleReset = () => {
    setItems([])
    setResult(null)
    setError(null)
    setState("idle")
  }

  if (state === "success" && result) {
    return (
      <PdfResult
        heading="Your PDF is ready."
        primaryAction={{ label: "Download PDF", onClick: handleDownload }}
        secondaryActions={[{ label: "Convert More Images", onClick: handleReset }]}
      >
        <p className="text-sm text-muted-foreground">
          {result.pageCount} {result.pageCount === 1 ? "page" : "pages"}
        </p>
      </PdfResult>
    )
  }

  return (
    <>
      <GenericFileUpload
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        multiple
        validate={validateImage}
        onFilesSelected={handleFilesSelected}
        title="Drop your images here, or click to browse"
        chooseLabel="Choose Images"
        hint={`JPG, PNG or WEBP — up to ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))} MB each. You can select multiple.`}
      />

      {items.length > 0 && (
        <div className="space-y-6">
          <PdfFileList items={items} onReorder={handleReorder} onRemove={handleRemove} title="Images to convert" />

          <div>
            <p className="text-sm font-semibold text-foreground mb-3">Page size</p>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-colors ${
                  pageSize === "fit" ? "border-primary bg-primary/5" : "border-border bg-card/40 hover:border-primary/30"
                }`}
              >
                <input type="radio" name="pageSize" className="mt-1 accent-primary" checked={pageSize === "fit"} onChange={() => setPageSize("fit")} />
                <span>
                  <span className="block text-sm font-semibold text-foreground">Fit to image</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">Each page matches its image exactly</span>
                </span>
              </label>
              <label
                className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-colors ${
                  pageSize === "a4" ? "border-primary bg-primary/5" : "border-border bg-card/40 hover:border-primary/30"
                }`}
              >
                <input type="radio" name="pageSize" className="mt-1 accent-primary" checked={pageSize === "a4"} onChange={() => setPageSize("a4")} />
                <span>
                  <span className="block text-sm font-semibold text-foreground">A4 page</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">Image centered on a standard page</span>
                </span>
              </label>
            </div>
          </div>

          {error && <PdfError message={error} />}

          <button
            type="button"
            onClick={handleConvert}
            disabled={isBusy}
            className="w-full inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground px-6 py-3.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Convert to PDF
          </button>
        </div>
      )}

      {state === "processing" && <PdfProgress phase="processing" label={`Converting your ${FORMAT_LABEL[defaultFormat]} images…`} />}
    </>
  )
}
