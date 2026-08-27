import { FileText, RefreshCw, Trash2 } from "lucide-react"
import { formatBytes } from "@/lib/pdf-tools/format"

interface PdfFileCardProps {
  fileName: string
  byteSize: number
  pageCount?: number | null
  onRemove: () => void
  onReplace?: () => void
}

// The uploaded-file summary shown after a single-file tool (Compressor,
// Splitter) accepts a file. pageCount is optional/nullable because the
// splitter knows it immediately (client-side pdf.js read) while it may not
// always be available before the server responds for other tools.
export function PdfFileCard({ fileName, byteSize, pageCount, onRemove, onReplace }: PdfFileCardProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border border-border bg-card/60 p-4 sm:p-5">
      <div className="h-12 w-12 shrink-0 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
        <FileText className="h-6 w-6" aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground truncate" title={fileName}>
          {fileName}
        </p>
        <p className="text-sm text-muted-foreground">
          {formatBytes(byteSize)}
          {typeof pageCount === "number" ? ` · ${pageCount} ${pageCount === 1 ? "page" : "pages"}` : ""}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onReplace && (
          <button
            type="button"
            onClick={onReplace}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:border-primary/40 hover:text-primary transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Replace
          </button>
        )}
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-muted-foreground hover:border-destructive/40 hover:text-destructive transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          Remove
        </button>
      </div>
    </div>
  )
}
