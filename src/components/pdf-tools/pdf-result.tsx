import type { ReactNode } from "react"
import { CheckCircle2 } from "lucide-react"

interface PdfResultProps {
  heading: string
  children?: ReactNode // tool-specific summary (before/after size, file counts, etc.)
  primaryAction: { label: string; onClick: () => void }
  secondaryActions?: { label: string; onClick: () => void }[]
}

// Generic success shell — each tool supplies its own summary body as
// children (a before/after comparison for the compressor, a file/page count
// for the splitter and merger) rather than this component trying to model
// every shape.
export function PdfResult({ heading, children, primaryAction, secondaryActions }: PdfResultProps) {
  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-8 text-center space-y-6">
      <div className="flex flex-col items-center gap-3">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
          <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
        </div>
        <h3 className="text-xl font-bold text-foreground">{heading}</h3>
      </div>

      {children}

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={primaryAction.onClick}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold hover:bg-primary/90 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {primaryAction.label}
        </button>
        {secondaryActions?.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-6 py-3 text-sm font-medium hover:border-primary/40 hover:text-primary transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  )
}
