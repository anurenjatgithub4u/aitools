"use client"

import { useState } from "react"
import { useAuth } from "@/components/auth-context"
import { PdfUpload } from "@/components/pdf-tools/pdf-upload"
import { PdfFileList, type PdfFileListItem } from "@/components/pdf-tools/pdf-file-list"
import { PdfProgress } from "@/components/pdf-tools/pdf-progress"
import { PdfResult } from "@/components/pdf-tools/pdf-result"
import { PdfError } from "@/components/pdf-tools/pdf-error"
import { usePdfProcessing } from "@/lib/pdf-tools/use-pdf-processing"
import { downloadBlob } from "@/lib/pdf-tools/client"
import { trackPdfEvent } from "@/lib/pdf-tools/analytics"
import { formatBytes } from "@/lib/pdf-tools/format"
import { getPdfPageCount } from "@/lib/pdf-tools/thumbnails"
import type { MergeRequestOptions } from "@/lib/pdf-tools/types"

interface MergeItem extends PdfFileListItem {
  file: File
}

interface MergeResult {
  blob: Blob
  downloadName: string
  fileCount: number
  pageCount: number
  resultBytes: number
}

function makeId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
}

export function MergerTool() {
  const { user } = useAuth()
  const { state, setReady, uploadFraction, error, setError, run, reset, isBusy } = usePdfProcessing()

  const [items, setItems] = useState<MergeItem[]>([])
  const [addBookmarks, setAddBookmarks] = useState(false)
  const [preserveMetadata, setPreserveMetadata] = useState(false)
  const [result, setResult] = useState<MergeResult | null>(null)

  const handleFilesSelected = async (files: File[]) => {
    setError(null)
    setResult(null)
    const newItems: MergeItem[] = await Promise.all(
      files.map(async (file) => {
        const pageCount = await getPdfPageCount(file).catch(() => null)
        return { id: makeId(), file, fileName: file.name, byteSize: file.size, pageCount }
      })
    )
    setItems((prev) => [...prev, ...newItems])
    setReady()
    trackPdfEvent("pdf_tool_opened", { tool_name: "pdf_merger", file_size: newItems.reduce((s, i) => s + i.byteSize, 0) })
  }

  const handleReorder = (newItems: PdfFileListItem[]) => {
    // Re-map by id to keep each item's original File object attached.
    const byId = new Map(items.map((i) => [i.id, i]))
    setItems(newItems.map((i) => byId.get(i.id)!).filter(Boolean))
  }

  const handleRemove = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  const handleMerge = async () => {
    if (items.length < 2 || isBusy) {
      if (items.length < 2) setError("Add at least two PDFs to merge.")
      return
    }

    const totalBytes = items.reduce((s, i) => s + i.byteSize, 0)
    trackPdfEvent("pdf_processing_started", { tool_name: "pdf_merger", file_size: totalBytes, page_count: items.length })

    const options: MergeRequestOptions = { addBookmarks, preserveMetadata }
    const formData = new FormData()
    // Order matters — this is the exact order the merged PDF will follow.
    for (const item of items) formData.append("files", item.file)
    formData.append("options", JSON.stringify(options))
    const idToken = user ? await user.getIdToken().catch(() => undefined) : undefined
    if (idToken) formData.append("idToken", idToken)

    const started = Date.now()
    const res = await run("/api/pdf/merge", formData)
    if (!res) {
      trackPdfEvent("pdf_processing_failed", { tool_name: "pdf_merger", file_size: totalBytes })
      return
    }

    const meta = {
      fileCount: Number(res.meta["file-count"] ?? items.length),
      pageCount: Number(res.meta["page-count"] ?? 0),
      resultBytes: Number(res.meta["result-bytes"] ?? res.blob.size),
    }
    setResult({ blob: res.blob, downloadName: res.downloadName, ...meta })
    trackPdfEvent("pdf_processing_completed", {
      tool_name: "pdf_merger",
      file_size: meta.resultBytes,
      page_count: meta.pageCount,
      processing_time: Date.now() - started,
    })
  }

  const handleDownload = () => {
    if (!result) return
    downloadBlob(result.blob, result.downloadName)
    trackPdfEvent("pdf_downloaded", { tool_name: "pdf_merger" })
  }

  const handleReset = () => {
    setItems([])
    setResult(null)
    reset()
  }

  // ---- result ----
  if (state === "success" && result) {
    return (
      <PdfResult
        heading="PDFs merged successfully."
        primaryAction={{ label: "Download Merged PDF", onClick: handleDownload }}
        secondaryActions={[{ label: "Merge More PDFs", onClick: handleReset }]}
      >
        <p className="text-sm text-muted-foreground">
          {result.fileCount} files · {result.pageCount} pages · {formatBytes(result.resultBytes)}
        </p>
      </PdfResult>
    )
  }

  return (
    <>
      <PdfUpload multiple onFilesSelected={handleFilesSelected} busy={false} />

      {items.length > 0 && (
        <div className="space-y-6">
          <PdfFileList items={items} onReorder={handleReorder} onRemove={handleRemove} />

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={addBookmarks}
                onChange={(e) => setAddBookmarks(e.target.checked)}
                className="accent-[var(--primary)]"
              />
              Add bookmarks for each PDF
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={preserveMetadata}
                onChange={(e) => setPreserveMetadata(e.target.checked)}
                className="accent-[var(--primary)]"
              />
              Preserve document metadata
            </label>
          </div>

          {error && <PdfError message={error} />}

          <button
            type="button"
            onClick={handleMerge}
            disabled={isBusy || items.length < 2}
            className="w-full inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground px-6 py-3.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Merge PDFs
          </button>
        </div>
      )}

      {(state === "uploading" || state === "processing") && (
        <PdfProgress phase={state} uploadFraction={uploadFraction} label={state === "processing" ? "Merging your PDFs…" : undefined} />
      )}
    </>
  )
}
