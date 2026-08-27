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
import { convertDocxToPdf } from "@/lib/pdf-tools/word-to-pdf"
import { MAX_DOCX_BYTES } from "@/lib/pdf-tools/config"

interface ConvertResult {
  blob: Blob
  downloadName: string
  pageCount: number
}

function validateDocx(file: File): string | null {
  const name = file.name.toLowerCase()
  if (name.endsWith(".doc") && !name.endsWith(".docx")) {
    return "Legacy .doc files aren't supported — please save as .docx and try again."
  }
  const isDocx = name.endsWith(".docx") || file.type.includes("wordprocessingml")
  if (!isDocx) return "Please upload a Word document (.docx)."
  if (file.size === 0) return "This file appears to be empty."
  if (file.size > MAX_DOCX_BYTES) return `This file is too large. Please upload one smaller than ${Math.round(MAX_DOCX_BYTES / (1024 * 1024))} MB.`
  return null
}

export function WordToPdfTool() {
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
    trackPdfEvent("pdf_tool_opened", { tool_name: "word_to_pdf", file_size: selected.size })
  }

  const handleConvert = async () => {
    if (!file || isBusy) return
    setError(null)
    setState("processing")
    trackPdfEvent("pdf_processing_started", { tool_name: "word_to_pdf", file_size: file.size })
    const started = Date.now()

    try {
      const output = await convertDocxToPdf(file)
      setResult({ blob: output.blob, downloadName: `${file.name.replace(/\.docx?$/i, "")}.pdf`, pageCount: output.pageCount })
      setState("success")
      trackPdfEvent("pdf_processing_completed", {
        tool_name: "word_to_pdf",
        file_size: output.blob.size,
        page_count: output.pageCount,
        processing_time: Date.now() - started,
      })
    } catch (e) {
      setState("error")
      setError(e instanceof Error && e.message ? e.message : "We couldn't convert this document. Please try another file.")
      trackPdfEvent("pdf_processing_failed", { tool_name: "word_to_pdf", file_size: file.size })
    }
  }

  const handleDownload = () => {
    if (!result) return
    downloadBlob(result.blob, result.downloadName)
    trackPdfEvent("pdf_downloaded", { tool_name: "word_to_pdf" })
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
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          validate={validateDocx}
          onFilesSelected={handleFilesSelected}
          title="Drop your Word document here, or click to browse"
          chooseLabel="Choose Word File"
          hint={`.docx — up to ${Math.round(MAX_DOCX_BYTES / (1024 * 1024))} MB`}
        />
      )}

      {file && <PdfFileCard fileName={file.name} byteSize={file.size} onRemove={handleReset} onReplace={handleReset} />}

      {file && (state === "ready" || state === "error") && (
        <div className="space-y-6">
          <p className="flex items-start gap-2 text-xs text-muted-foreground rounded-lg bg-card/40 border border-border p-3">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              This preserves your document&apos;s text, headings, lists, tables and images — exact page layout and
              formatting from the original file aren&apos;t reproduced pixel-for-pixel.
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

      {state === "processing" && <PdfProgress phase="processing" label="Converting your document…" />}
    </>
  )
}
