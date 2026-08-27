"use client"

import { useCallback, useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  UploadCloud,
  ImageIcon,
  Download,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RotateCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"

type ConversionStatus = "pending" | "converting" | "done" | "error"

interface ConversionItem {
  id: string
  file: File
  status: ConversionStatus
  previewUrl: string
  outputUrl?: string
  outputBlob?: Blob
  outputSize?: number
  width?: number
  height?: number
  error?: string
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// Converts a single image File to a WEBP Blob via an off-DOM canvas.
// Runs entirely client-side — the file never leaves the browser.
function convertToWebp(file: File, quality: number): Promise<{ blob: Blob; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas")
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("Canvas is not supported in this browser."))
          return
        }
        ctx.drawImage(img, 0, 0)
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl)
            if (blob) {
              resolve({ blob, width: canvas.width, height: canvas.height })
            } else {
              reject(new Error("Conversion failed — this browser may not support WEBP export."))
            }
          },
          "image/webp",
          quality
        )
      } catch {
        URL.revokeObjectURL(objectUrl)
        reject(new Error("Could not read this image."))
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error("Could not load this file as an image."))
    }
    img.src = objectUrl
  })
}

export function PngToWebpConverter() {
  const [items, setItems] = useState<ConversionItem[]>([])
  const [quality, setQuality] = useState(0.85)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const runConversion = useCallback(async (item: ConversionItem, q: number) => {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: "converting", error: undefined } : i)))
    try {
      const { blob, width, height } = await convertToWebp(item.file, q)
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                status: "done",
                outputBlob: blob,
                outputUrl: URL.createObjectURL(blob),
                outputSize: blob.size,
                width,
                height,
              }
            : i
        )
      )
    } catch (err) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, status: "error", error: err instanceof Error ? err.message : "Conversion failed" }
            : i
        )
      )
    }
  }, [])

  const addFiles = useCallback(
    (fileList: FileList | File[]) => {
      const files = Array.from(fileList)
      const newItems: ConversionItem[] = []

      for (const file of files) {
        const isPng = file.type === "image/png" || file.name.toLowerCase().endsWith(".png")
        const item: ConversionItem = {
          id: makeId(),
          file,
          status: isPng ? "pending" : "error",
          previewUrl: URL.createObjectURL(file),
          error: isPng ? undefined : "Not a PNG file — skipped",
        }
        newItems.push(item)
      }

      setItems((prev) => [...prev, ...newItems])

      // Auto-convert every valid PNG at the current quality setting.
      newItems
        .filter((i) => i.status === "pending")
        .forEach((i) => runConversion(i, quality))
    },
    [quality, runConversion]
  )

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files)
    }
    e.target.value = ""
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files)
    }
  }

  const removeItem = (id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id)
      if (target) {
        URL.revokeObjectURL(target.previewUrl)
        if (target.outputUrl) URL.revokeObjectURL(target.outputUrl)
      }
      return prev.filter((i) => i.id !== id)
    })
  }

  const clearAll = () => {
    items.forEach((i) => {
      URL.revokeObjectURL(i.previewUrl)
      if (i.outputUrl) URL.revokeObjectURL(i.outputUrl)
    })
    setItems([])
  }

  const reconvertAll = () => {
    items.filter((i) => i.status !== "error" || i.error !== "Not a PNG file — skipped").forEach((i) => {
      if (i.file.type === "image/png" || i.file.name.toLowerCase().endsWith(".png")) {
        runConversion(i, quality)
      }
    })
  }

  const downloadItem = (item: ConversionItem) => {
    if (!item.outputUrl) return
    const a = document.createElement("a")
    a.href = item.outputUrl
    a.download = item.file.name.replace(/\.png$/i, "") + ".webp"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const downloadAll = () => {
    const done = items.filter((i) => i.status === "done")
    done.forEach((item, idx) => {
      setTimeout(() => downloadItem(item), idx * 250)
    })
  }

  const doneItems = items.filter((i) => i.status === "done")
  const totalOriginal = doneItems.reduce((sum, i) => sum + i.file.size, 0)
  const totalOutput = doneItems.reduce((sum, i) => sum + (i.outputSize ?? 0), 0)
  const totalSavedPct = totalOriginal > 0 ? Math.round((1 - totalOutput / totalOriginal) * 100) : 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background/90 py-12 md:py-20">
      <div className="container max-w-5xl mx-auto px-4">
        {/* Breadcrumb */}
        <Link
          href="/utilities"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Utilities
        </Link>

        {/* Header */}
        <div className="max-w-2xl mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4 border border-primary/20 backdrop-blur-sm">
            <ImageIcon className="h-3 w-3" />
            <span>Free Utility</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4 bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground/80 bg-clip-text text-transparent">
            PNG to WEBP Converter
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Drop in one or more PNG files to convert them to WEBP. Everything happens locally in your browser — files are never uploaded anywhere.
          </p>
        </div>

        {/* Quality control */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md px-5 py-4 mb-6">
          <label htmlFor="quality" className="text-sm font-semibold text-foreground whitespace-nowrap">
            Quality: <span className="text-primary">{Math.round(quality * 100)}%</span>
          </label>
          <input
            id="quality"
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={quality}
            onChange={(e) => setQuality(parseFloat(e.target.value))}
            className="w-full accent-primary cursor-pointer"
          />
          {items.length > 0 && (
            <Button variant="outline" size="sm" onClick={reconvertAll} className="gap-2 shrink-0 cursor-pointer">
              <RotateCw className="h-3.5 w-3.5" />
              Re-convert with this quality
            </Button>
          )}
        </div>

        {/* Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragOver(true)
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed px-6 py-14 text-center cursor-pointer transition-colors ${
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-border/60 bg-card/40 hover:border-primary/40 hover:bg-card/60"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,.png"
            multiple
            onChange={handleFileInput}
            className="hidden"
          />
          <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <UploadCloud className="h-7 w-7" />
          </div>
          <p className="font-semibold text-foreground">
            Drag and drop PNG files here, or click to browse
          </p>
          <p className="text-sm text-muted-foreground">You can select multiple files at once</p>
        </div>

        {/* Results */}
        {items.length > 0 && (
          <div className="mt-8">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="text-sm text-muted-foreground">
                {doneItems.length > 0 && (
                  <span>
                    {doneItems.length} converted
                    {totalOriginal > 0 && (
                      <>
                        {" "}· {formatBytes(totalOriginal)} → {formatBytes(totalOutput)}{" "}
                        <span className="text-primary font-semibold">
                          ({totalSavedPct >= 0 ? `${totalSavedPct}% smaller` : `${Math.abs(totalSavedPct)}% larger`})
                        </span>
                      </>
                    )}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {doneItems.length > 1 && (
                  <Button variant="outline" size="sm" onClick={downloadAll} className="gap-2 cursor-pointer">
                    <Download className="h-3.5 w-3.5" />
                    Download all
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={clearAll} className="cursor-pointer">
                  Clear all
                </Button>
              </div>
            </div>

            <div className="grid gap-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 rounded-2xl border border-border/50 bg-card p-3 sm:p-4"
                >
                  {/* Thumbnail */}
                  <div className="h-14 w-14 rounded-xl overflow-hidden bg-muted shrink-0 border border-border/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.previewUrl} alt={item.file.name} className="h-full w-full object-cover" />
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{item.file.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatBytes(item.file.size)}
                      {item.status === "done" && item.outputSize !== undefined && (
                        <>
                          {" "}→ {formatBytes(item.outputSize)}
                          {item.width && item.height && (
                            <span className="hidden sm:inline"> · {item.width}×{item.height}</span>
                          )}
                        </>
                      )}
                      {item.status === "error" && item.error && (
                        <span className="text-destructive"> · {item.error}</span>
                      )}
                    </p>
                  </div>

                  {/* Status / actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {item.status === "converting" && (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Converting
                      </span>
                    )}
                    {item.status === "done" && (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-primary hidden sm:block" />
                        <Button size="sm" onClick={() => downloadItem(item)} className="gap-1.5 cursor-pointer">
                          <Download className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Download</span>
                        </Button>
                      </>
                    )}
                    {item.status === "error" && (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                    <button
                      onClick={() => removeItem(item.id)}
                      aria-label="Remove file"
                      className="h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reassurance strip */}
        <div className="mt-10 flex items-center gap-3 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md px-6 py-4 text-sm text-muted-foreground">
          <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
          <span>
            Conversion happens entirely in your browser using the Canvas API. Your images are never uploaded or stored on our servers.
          </span>
        </div>
      </div>
    </div>
  )
}
