import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ArrowRight } from "lucide-react"

// Distinct-but-restrained per-tool identity: same container size/radius/
// border style everywhere (per spec, only the icon/visual treatment should
// differ), just a different accent hue so Compress/Split/Merge read apart
// from each other at a glance. All three stay inside the existing palette
// (no new colors introduced — these are the same blue/amber/violet the rest
// of the app already uses for accents elsewhere).
const TINTS = {
  primary: "bg-primary/10 border-primary/20 text-primary",
  blue: "bg-blue-500/10 border-blue-500/20 text-blue-500",
  amber: "bg-amber-500/10 border-amber-500/20 text-amber-500",
  violet: "bg-violet-500/10 border-violet-500/20 text-violet-500",
  emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-500",
  cyan: "bg-cyan-500/10 border-cyan-500/20 text-cyan-500",
  rose: "bg-rose-500/10 border-rose-500/20 text-rose-500",
  indigo: "bg-indigo-500/10 border-indigo-500/20 text-indigo-500",
} as const

export type PdfToolTint = keyof typeof TINTS

interface PdfToolCardProps {
  icon: LucideIcon
  title: string
  description: string
  supportedInfo: string
  href: string
  ctaLabel: string
  tint?: PdfToolTint
}

// The PDF Utilities landing page's tool card — same visual language as the
// rest of the site's card grids (rounded-2xl, border-border, bg-card/50).
// The whole card is the interaction target (a real <Link>, so it's a native,
// keyboard-operable anchor with no extra ARIA needed) — the CTA text/arrow
// is just the visible affordance inside it, not a separate control.
export function PdfToolCard({
  icon: Icon,
  title,
  description,
  supportedInfo,
  href,
  ctaLabel,
  tint = "primary",
}: PdfToolCardProps) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl border border-border/50 bg-card/50 p-6 transition-[background-color,border-color,box-shadow,transform] duration-300 hover:border-primary/40 hover:bg-card hover:shadow-lg hover:shadow-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-safe:hover:-translate-y-1"
    >
      <div className={`h-12 w-12 rounded-xl border flex items-center justify-center mb-5 ${TINTS[tint]}`}>
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>

      <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed flex-1">{description}</p>
      <p className="text-xs text-muted-foreground/70 mt-4">{supportedInfo}</p>

      <span className="inline-flex items-center gap-1.5 mt-5 text-sm font-semibold text-primary">
        {ctaLabel}
        <ArrowRight
          className="h-3.5 w-3.5 motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:translate-x-[3px]"
          aria-hidden="true"
        />
      </span>
    </Link>
  )
}
