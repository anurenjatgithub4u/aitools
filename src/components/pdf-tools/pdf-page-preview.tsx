import { Check, Loader2 } from "lucide-react"
import type { PageThumbnail } from "@/lib/pdf-tools/thumbnails"

interface PdfPagePreviewProps {
  pageCount: number
  thumbnails: PageThumbnail[]
  loading: boolean
  selected: Set<number>
  onToggle: (pageNumber: number) => void
}

// Responsive grid of page thumbnails with a clear selected/unselected
// visual state — becomes a horizontally-scrollable strip is unnecessary
// here since the grid itself already reflows to fewer columns on narrow
// viewports (spec §25: "responsive grid" is the option we picked over
// horizontal scroll, since a grid keeps every page visible without hidden
// overflow on mobile).
export function PdfPagePreview({ pageCount, thumbnails, loading, selected, onToggle }: PdfPagePreviewProps) {
  const byPage = new Map(thumbnails.map((t) => [t.pageNumber, t]))

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-foreground">Pages</p>
        <p className="text-xs text-muted-foreground">
          {selected.size} of {pageCount} selected
        </p>
      </div>

      <div
        role="group"
        aria-label="Select pages"
        className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-[420px] overflow-y-auto p-1"
      >
        {Array.from({ length: pageCount }, (_, i) => i + 1).map((pageNumber) => {
          const isSelected = selected.has(pageNumber)
          const thumb = byPage.get(pageNumber)
          return (
            <button
              key={pageNumber}
              type="button"
              onClick={() => onToggle(pageNumber)}
              aria-pressed={isSelected}
              aria-label={`Page ${pageNumber}${isSelected ? ", selected" : ""}`}
              className={`relative aspect-[3/4] rounded-lg border-2 overflow-hidden bg-muted flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isSelected ? "border-primary" : "border-border/60 hover:border-primary/40"
              }`}
            >
              {thumb ? (
                // Thumbnails are small, client-generated data URLs — a plain
                // img keeps this simple and avoids next/image's remote-size
                // assumptions for a data: URI.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumb.dataUrl} alt="" className="h-full w-full object-cover" draggable={false} />
              ) : loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
              ) : (
                <span className="text-xs text-muted-foreground">PDF</span>
              )}

              <span
                className={`absolute bottom-1 left-1 right-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-center ${
                  isSelected ? "bg-primary text-primary-foreground" : "bg-background/80 text-foreground"
                }`}
              >
                {pageNumber}
              </span>

              {isSelected && (
                <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <Check className="h-2.5 w-2.5" aria-hidden="true" />
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
