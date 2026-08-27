import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft, ShieldCheck } from "lucide-react"

interface PdfToolLayoutProps {
  title: string
  description: string
  children: ReactNode
  /**
   * Overrides the default server-processing privacy line. Only pass a
   * custom string when it's more accurate for that specific tool — e.g.
   * PDF → Image runs entirely client-side and never uploads the file at
   * all, which is a stronger, still-true claim than the default.
   */
  privacyNote?: string
}

// Shared page chrome for every PDF Utility tool page — back link, header,
// the privacy line (accurate: routes never persist the uploaded file — see
// route-helpers.ts / each api/pdf/* route), and a max-width step container.
export function PdfToolLayout({ title, description, children, privacyNote }: PdfToolLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background/90 py-12 md:py-20">
      <div className="container max-w-3xl mx-auto px-4">
        <Link
          href="/pdf"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          PDF Utilities
        </Link>

        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3">{title}</h1>
          <p className="text-lg text-muted-foreground leading-relaxed">{description}</p>
        </div>

        <div className="space-y-6">{children}</div>

        <p className="flex items-start gap-2 text-xs text-muted-foreground mt-8">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" aria-hidden="true" />
          <span>{privacyNote ?? "Your files are processed securely and are not permanently stored."}</span>
        </p>
      </div>
    </div>
  )
}
