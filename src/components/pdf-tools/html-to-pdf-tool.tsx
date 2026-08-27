"use client"

import { useState } from "react"
import { AlertCircle } from "lucide-react"
import { GenericFileUpload } from "./generic-file-upload"
import { PdfFileCard } from "./pdf-file-card"
import { PdfProgress } from "./pdf-progress"
import { PdfResult } from "./pdf-result"
import { PdfError } from "./pdf-error"
import { downloadBlob } from "@/lib/pdf-tools/client"
import { trackPdfEvent } from "@/lib/pdf-tools/analytics"
import { renderHtmlStringToPdf } from "@/lib/pdf-tools/html-to-pdf"
import { MAX_HTML_BYTES } from "@/lib/pdf-tools/config"

interface ConvertResult {
  blob: Blob
  downloadName: string
  pageCount: number
}

function validateHtml(file: File): string | null {
  const isHtml = /\.(html?)$/i.test(file.name) || file.type === "text/html"
  if (!isHtml) return "Please upload an HTML file (.html or .htm)."
  if (file.size === 0) return "This file appears to be empty."
  if (file.size > MAX_HTML_BYTES) return `This file is too large. Please upload one smaller than ${Math.round(MAX_HTML_BYTES / (1024 * 1024))} MB.`
  return null
}

export function HtmlToPdfTool() {
  const [file, setFile] = useState<File | null>(null)
  const [state, setState] = useState<"idle" | "ready" | "processing" | "success" | "error">("idle")
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ConvertResult | null>(null)

  const isBusy = state === "processing"

  const handleFilesSelected = (files: File[]) => {
    const selected = files[0]
    setFile(selected)
    setResult(null)
    setError(null)
    setState("ready")
    trackPdfEvent("pdf_tool_opened", { tool_name: "html_to_pdf", file_size: selected.size })
  }

  const handleConvert = async () => {
    if (!file || isBusy) return
    setError(null)
    setState("processing")
    trackPdfEvent("pdf_processing_started", { tool_name: "html_to_pdf", file_size: file.size })
    const started = Date.now()

    try {
      const html = await file.text()
      const output = await renderHtmlStringToPdf(html)
      setResult({ blob: output.blob, downloadName: `${file.name.replace(/\.html?$/i, "")}.pdf`, pageCount: output.pageCount })
      setState("success")
      trackPdfEvent("pdf_processing_completed", {
        tool_name: "html_to_pdf",
        file_size: output.blob.size,
        page_count: output.pageCount,
        processing_time: Date.now() - started,
      })
    } catch {
      setState("error")
      setError("We couldn't convert this HTML file. Please check it's a valid HTML document and try again.")
      trackPdfEvent("pdf_processing_failed", { tool_name: "html_to_pdf", file_size: file.size })
    }
  }

  const handleDownload = () => {
    if (!result) return
    downloadBlob(result.blob, result.downloadName)
    trackPdfEvent("pdf_downloaded", { tool_name: "html_to_pdf" })
  }

  const handleReset = () => {
    setFile(null)
    setResult(null)
    setError(null)
    setState("idle")
  }

  if (state === "success" && result) {
    return (
      <PdfResult
        heading="Your PDF is ready."
        primaryAction={{ label: "Download PDF", onClick: handleDownload }}
        secondaryActions={[{ label: "Convert Another File", onClick: handleReset }]}
      >
        <p className="text-sm text-muted-foreground">
          {result.pageCount} {result.pageCount === 1 ? "page" : "pages"}
        </p>
      </PdfResult>
    )
  }

  return (
    <>
      {!file && (
        <GenericFileUpload
          accept="text/html,.html,.htm"
          validate={validateHtml}
          onFilesSelected={handleFilesSelected}
          title="Drop your HTML file here, or click to browse"
          chooseLabel="Choose HTML File"
          hint={`.html or .htm — up to ${Math.round(MAX_HTML_BYTES / (1024 * 1024))} MB`}
        />
      )}

      {file && <PdfFileCard fileName={file.name} byteSize={file.size} onRemove={handleReset} onReplace={handleReset} />}

      {file && (state === "ready" || state === "error") && (
        <div className="space-y-6">
          <p className="flex items-start gap-2 text-xs text-muted-foreground rounded-lg bg-card/40 border border-border p-3">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              This renders your HTML the way a browser would display it. Complex layouts, external stylesheets, or
              JavaScript-driven content may not come through exactly.
            </span>
          </p>

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

      {state === "processing" && <PdfProgress phase="processing" label="Rendering your HTML…" />}
    </>
  )
}
