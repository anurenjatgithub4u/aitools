import { formatPercent } from "@/lib/pdf-tools/format"

interface PdfProgressProps {
  phase: "uploading" | "processing"
  uploadFraction?: number // 0-1, only meaningful during "uploading" — real, from XHR
  label?: string
}

// The server can't report real progress for the processing phase itself
// (compress/split/merge run as one synchronous operation, not a streamed
// job), so that phase intentionally uses an indeterminate indicator rather
// than a fabricated percentage (spec §4: "Do not show fake progress").
export function PdfProgress({ phase, uploadFraction, label }: PdfProgressProps) {
  const isUploading = phase === "uploading"
  const pct = isUploading ? Math.round((uploadFraction ?? 0) * 100) : null

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-2xl border border-border bg-card/60 p-6 sm:p-8 text-center space-y-4"
    >
      <p className="font-semibold text-foreground">
        {label ?? (isUploading ? "Uploading your PDF…" : "Processing your PDF…")}
      </p>

      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        {isUploading ? (
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-150 ease-out"
            style={{ width: `${pct}%` }}
          />
        ) : (
          <div className="h-full w-1/3 rounded-full bg-primary animate-pdf-indeterminate" />
        )}
      </div>

      {isUploading && <p className="text-sm text-muted-foreground">{formatPercent(uploadFraction ?? 0)}</p>}
      {!isUploading && <p className="text-xs text-muted-foreground">Please don&apos;t close this page.</p>}
    </div>
  )
}
