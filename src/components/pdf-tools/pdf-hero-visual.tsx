// Purely decorative — balances the hero's right-hand whitespace on wide
// screens. Built from plain divs using only tokens already in the design
// system (bg-card, border-border, text-primary, the same soft brand
// gradient the blog's placeholder art already uses at low opacity), so it
// needs no new dependency and no SVG asset. Hidden below lg: a stack of
// three rotated cards has nothing to add on a narrow screen where the real
// content already fills the width.
export function PdfHeroVisual() {
  return (
    <div
      aria-hidden="true"
      className="relative hidden lg:flex h-72 w-72 shrink-0 items-center justify-center"
    >
      {/* soft brand-gradient glow, very low opacity — depth, not decoration */}
      <div className="absolute inset-6 rounded-full bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-pink-500/10 blur-3xl" />

      {/* back sheet */}
      <div className="absolute h-44 w-36 -rotate-[10deg] -translate-x-6 translate-y-2 rounded-2xl border border-border/60 bg-card/60 shadow-sm" />

      {/* middle sheet */}
      <div className="absolute h-44 w-36 rotate-[6deg] translate-x-5 -translate-y-1 rounded-2xl border border-border/70 bg-card/80 shadow-md" />

      {/* front sheet — the one with "content" on it */}
      <div className="relative h-44 w-36 -rotate-[2deg] rounded-2xl border border-border bg-card shadow-lg overflow-hidden">
        {/* folded corner */}
        <div className="absolute -top-3 -right-3 h-8 w-8 rotate-45 border border-border bg-background" />
        <div className="p-4 pt-5 space-y-2">
          <div className="h-1.5 w-3/4 rounded-full bg-muted-foreground/25" />
          <div className="h-1.5 w-full rounded-full bg-muted-foreground/15" />
          <div className="h-1.5 w-5/6 rounded-full bg-muted-foreground/15" />
          <div className="h-1.5 w-2/3 rounded-full bg-muted-foreground/15" />
        </div>
      </div>

      {/* small "processed" badge, overlapping the stack — reuses the same
          icon-container language as the tool cards (rounded-xl, primary/10,
          primary/20 border) rather than inventing a new visual motif */}
      <div className="absolute bottom-6 right-8 h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 backdrop-blur-sm flex items-center justify-center text-primary shadow-sm">
        <CheckIcon />
      </div>
    </div>
  )
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}
