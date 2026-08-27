"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Check, Copy, Download, Printer } from "lucide-react"

// Inline confirmation on the button itself — no toast for a small action.
export function CopyButton({
  getText,
  label = "Copy",
  className = "",
}: {
  getText: () => string
  label?: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }, [])

  const copy = useCallback(async () => {
    const text = getText()
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Clipboard API is unavailable over plain HTTP and in some embedded
      // browsers — fall back to a hidden textarea so copy still works.
      const textarea = document.createElement("textarea")
      textarea.value = text
      textarea.setAttribute("readonly", "")
      textarea.style.position = "fixed"
      textarea.style.opacity = "0"
      document.body.appendChild(textarea)
      textarea.select()
      try {
        document.execCommand("copy")
      } finally {
        document.body.removeChild(textarea)
      }
    }
    setCopied(true)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setCopied(false), 2000)
  }, [getText])

  return (
    <button
      type="button"
      onClick={copy}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium hover:border-primary/40 hover:text-primary transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      <span aria-live="polite">{copied ? "Copied" : label}</span>
    </button>
  )
}

export function DownloadButton({
  onDownload,
  label,
}: {
  onDownload: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onDownload}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium hover:border-primary/40 hover:text-primary transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Download className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </button>
  )
}

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium hover:border-primary/40 hover:text-primary transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Printer className="h-3.5 w-3.5" aria-hidden="true" />
      Print
    </button>
  )
}

/** Row of export controls shown above each result view. */
export function ResultActions({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2 print:hidden">{children}</div>
}

/** Shows "Source: page 12" / "Source: pages 12–14", or nothing when unknown. */
export function SourcePages({ pages }: { pages: number[] }) {
  if (!pages.length) return null

  const consecutive = pages.every((p, i) => i === 0 || p === pages[i - 1] + 1)
  const label =
    pages.length === 1
      ? `Source: page ${pages[0]}`
      : consecutive
        ? `Source: pages ${pages[0]}–${pages[pages.length - 1]}`
        : `Source: pages ${pages.join(", ")}`

  return <span className="text-xs text-muted-foreground whitespace-nowrap">{label}</span>
}
