import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-brand-ink">R</span>
          Reelforge
        </Link>
        <nav className="ml-auto flex items-center gap-1 text-sm">
          <Link href="/#features" className="hidden rounded-lg px-3 py-2 text-muted hover:text-ink sm:block">Features</Link>
          <Link href="/#how" className="hidden rounded-lg px-3 py-2 text-muted hover:text-ink sm:block">How it works</Link>
          <Link href="/pricing/" className="rounded-lg px-3 py-2 text-muted hover:text-ink">Pricing</Link>
          <Link href="/studio/" className="ml-1 rounded-lg bg-brand px-4 py-2 font-medium text-brand-ink hover:opacity-90">Open studio</Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-8 text-sm text-muted">
        <span>© {new Date().getFullYear()} Reelforge</span>
        <div className="flex gap-4">
          <Link href="/pricing/" className="hover:text-ink">Pricing</Link>
          <Link href="/studio/" className="hover:text-ink">Studio</Link>
        </div>
      </div>
    </footer>
  );
}
