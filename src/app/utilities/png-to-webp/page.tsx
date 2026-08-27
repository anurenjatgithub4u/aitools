import { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, Wrench } from "lucide-react"

export const metadata: Metadata = {
  title: "PNG to WEBP Converter — Temporarily Unavailable",
  description: "This tool is temporarily disabled. Check back soon.",
  alternates: { canonical: "/utilities/png-to-webp" },
}

// The converter itself (./converter.tsx) is left intact and untouched —
// this route is just gated off from public access for now.
export default function PngToWebpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background/90 py-12 md:py-20">
      <div className="container max-w-2xl mx-auto px-4 text-center">
        <Link
          href="/utilities"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-10"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Utilities
        </Link>

        <div className="h-14 w-14 mx-auto rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-6">
          <Wrench className="h-7 w-7" />
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-4">
          This tool is temporarily unavailable
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          The PNG to WEBP converter is offline for now. Check back soon, or explore the rest of FindUrAI in the meantime.
        </p>
      </div>
    </div>
  )
}
