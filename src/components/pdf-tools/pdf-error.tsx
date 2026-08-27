import { AlertCircle } from "lucide-react"

interface PdfErrorProps {
  message: string
  onRetry?: () => void
}

// Screen-reader-announced (role="alert") and never rendered from an icon
// alone — the message itself always carries the meaning (spec §26/§28).
export function PdfError({ message, onRetry }: PdfErrorProps) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1">
        <span>{message}</span>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="block mt-2 font-semibold underline underline-offset-2 hover:no-underline cursor-pointer"
          >
            Try Another File
          </button>
        )}
      </div>
    </div>
  )
}
