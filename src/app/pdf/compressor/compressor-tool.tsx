"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { useAuth } from "@/components/auth-context"
import { PdfUpload } from "@/components/pdf-tools/pdf-upload"
import { PdfFileCard } from "@/components/pdf-tools/pdf-file-card"
import { PdfProgress } from "@/components/pdf-tools/pdf-progress"
import { PdfResult } from "@/components/pdf-tools/pdf-result"
import { PdfError } from "@/components/pdf-tools/pdf-error"
import { usePdfProcessing } from "@/lib/pdf-tools/use-pdf-processing"
import { downloadBlob } from "@/lib/pdf-tools/client"
import { trackPdfEvent } from "@/lib/pdf-tools/analytics"
import { formatBytes } from "@/lib/pdf-tools/format"
import { getPdfPageCount } from "@/lib/pdf-tools/thumbnails"
import {
  COMPRESSION_PRESETS,
  DEFAULT_COMPRESSION_LEVEL,
  MAX_IMAGE_QUALITY,
  MIN_IMAGE_QUALITY,
  MIN_MAX_DIMENSION,
  MAX_MAX_DIMENSION,
  type CompressionLevel,
} from "@/lib/pdf-tools/config"
import type { CompressAdvancedOptions } from "@/lib/pdf-tools/types"

interface CompressResult {
  blob: Blob
  downloadName: string
  originalBytes: number
  resultBytes: number
  pageCount: number
  alreadyOptimized: boolean
}

const LEVELS: CompressionLevel[] = ["low", "recommended", "high"]

export function CompressorTool() {
  const { user } = useAuth()
  const { state, setReady, uploadFraction, error, setError, run, reset, isBusy } = usePdfProcessing()

  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState<number | null>(null)
  const [level, setLevel] = useState<CompressionLevel>(DEFAULT_COMPRESSION_LEVEL)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [advanced, setAdvanced] = useState<CompressAdvancedOptions>({})
  const [result, setResult] = useState<CompressResult | null>(null)

  const handleFilesSelected = async (files: File[]) => {
    const selected = files[0]
    setFile(selected)
    setPageCount(null)
    setResult(null)
    setError(null)
    setReady()
    trackPdfEvent("pdf_tool_opened", { tool_name: "pdf_compressor", file_size: selected.size })
    try {
      const count = await getPdfPageCount(selected)
      setPageCount(count)
    } catch {
      // Page count is a display nicety — the server still validates the
      // file for real when the user actually compresses it.
    }
  }

  const handleCompress = async () => {
    if (!file || isBusy) return
    trackPdfEvent("pdf_processing_started", {
      tool_name: "pdf_compressor",
      file_size: file.size,
      page_count: pageCount ?? undefined,
      compression_level: level,
    })

    const formData = new FormData()
    formData.append("file", file)
    formData.append("options", JSON.stringify({ level, advanced }))
    const idToken = user ? await user.getIdToken().catch(() => undefined) : undefined
    if (idToken) formData.append("idToken", idToken)

    const started = Date.now()
    const res = await run("/api/pdf/compress", formData)
    if (!res) {
      trackPdfEvent("pdf_processing_failed", { tool_name: "pdf_compressor", file_size: file.size })
      return
    }

    const meta = {
      originalBytes: Number(res.meta["original-bytes"] ?? file.size),
      resultBytes: Number(res.meta["result-bytes"] ?? res.blob.size),
      pageCount: Number(res.meta["page-count"] ?? pageCount ?? 0),
      alreadyOptimized: res.meta["already-optimized"] === "true",
    }
    setResult({ blob: res.blob, downloadName: res.downloadName, ...meta })
    trackPdfEvent("pdf_processing_completed", {
      tool_name: "pdf_compressor",
      file_size: meta.originalBytes,
      page_count: meta.pageCount,
      compression_level: level,
      processing_time: Date.now() - started,
    })
  }

  const handleDownload = () => {
    if (!result) return
    downloadBlob(result.blob, result.downloadName)
    trackPdfEvent("pdf_downloaded", { tool_name: "pdf_compressor", file_size: result.resultBytes })
  }

  const handleReset = () => {
    setFile(null)
    setPageCount(null)
    setResult(null)
    setAdvanced({})
    reset()
  }

  // ---- result ----
  if (state === "success" && result) {
    const saved = Math.max(0, result.originalBytes - result.resultBytes)
    const savedPct = result.originalBytes > 0 ? Math.round((saved / result.originalBytes) * 100) : 0

    return (
      <PdfResult
        heading={result.alreadyOptimized ? "Compression Complete" : "Compression Complete"}
        primaryAction={{ label: "Download Compressed PDF", onClick: handleDownload }}
        secondaryActions={[{ label: "Compress Another PDF", onClick: handleReset }]}
      >
        {result.alreadyOptimized ? (
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            This PDF is already highly optimized. We couldn&apos;t significantly reduce its size without
            affecting quality.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-4 text-lg font-bold text-foreground">
              <span>{formatBytes(result.originalBytes)}</span>
              <span className="text-muted-foreground text-sm font-normal">→</span>
              <span className="text-primary">{formatBytes(result.resultBytes)}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Saved {formatBytes(saved)} · {savedPct}% smaller
            </p>
            <p className="text-xs text-muted-foreground/70">Best balance between file size and quality.</p>
          </div>
        )}
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
          <div>
            <p className="text-sm font-semibold text-foreground mb-3">Compression Level</p>
            <div className="space-y-2">
              {LEVELS.map((key) => {
                const preset = COMPRESSION_PRESETS[key]
                return (
                  <label
                    key={key}
                    className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-colors ${
                      level === key ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                    }`}
                  >
                    <input
                      type="radio"
                      name="compression-level"
                      value={key}
                      checked={level === key}
                      onChange={() => setLevel(key)}
                      className="mt-1 accent-[var(--primary)]"
                    />
                    <span>
                      <span className="block font-semibold text-foreground">{preset.label}</span>
                      <span className="block text-sm text-muted-foreground">{preset.helpText}</span>
                    </span>
                  </label>
                )
              })}
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setAdvancedOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer"
              aria-expanded={advancedOpen}
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${advancedOpen ? "rotate-180" : ""}`} aria-hidden="true" />
              Advanced options
            </button>

            {advancedOpen && (
              <div className="mt-4 space-y-4 rounded-xl border border-border bg-card/40 p-4">
                <div>
                  <label className="flex items-center justify-between text-sm text-foreground mb-1.5">
                    <span>Image quality</span>
                    <span className="text-muted-foreground">{advanced.imageQuality ?? COMPRESSION_PRESETS[level].jpegQuality}</span>
                  </label>
                  <input
                    type="range"
                    min={MIN_IMAGE_QUALITY}
                    max={MAX_IMAGE_QUALITY}
                    value={advanced.imageQuality ?? COMPRESSION_PRESETS[level].jpegQuality}
                    onChange={(e) => setAdvanced((a) => ({ ...a, imageQuality: Number(e.target.value) }))}
                    className="w-full accent-[var(--primary)]"
                  />
                </div>

                <div>
                  <label className="flex items-center justify-between text-sm text-foreground mb-1.5">
                    <span>Image resolution (max dimension)</span>
                    <span className="text-muted-foreground">
                      {advanced.imageResolution ?? COMPRESSION_PRESETS[level].maxDimensionPx}px
                    </span>
                  </label>
                  <input
                    type="range"
                    min={MIN_MAX_DIMENSION}
                    max={MAX_MAX_DIMENSION}
                    step={100}
                    value={advanced.imageResolution ?? COMPRESSION_PRESETS[level].maxDimensionPx}
                    onChange={(e) => setAdvanced((a) => ({ ...a, imageResolution: Number(e.target.value) }))}
                    className="w-full accent-[var(--primary)]"
                  />
                </div>

                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={advanced.grayscale ?? false}
                    onChange={(e) => setAdvanced((a) => ({ ...a, grayscale: e.target.checked }))}
                    className="accent-[var(--primary)]"
                  />
                  Grayscale conversion
                </label>

                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={advanced.removeMetadata ?? true}
                    onChange={(e) => setAdvanced((a) => ({ ...a, removeMetadata: e.target.checked }))}
                    className="accent-[var(--primary)]"
                  />
                  Remove metadata
                </label>
              </div>
            )}
          </div>

          {error && <PdfError message={error} />}

          <button
            type="button"
            onClick={handleCompress}
            disabled={isBusy}
            className="w-full inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground px-6 py-3.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Compress PDF
          </button>
        </div>
      )}

      {(state === "uploading" || state === "processing") && (
        <PdfProgress phase={state} uploadFraction={uploadFraction} label={state === "processing" ? "Compressing your PDF…" : undefined} />
      )}
    </>
  )
}
