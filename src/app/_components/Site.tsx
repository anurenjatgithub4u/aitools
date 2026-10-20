import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand text-brand-ink">F</span>
      <span className="leading-tight text-lg">FindUrAI</span>
    </Link>
  );
}

const LINKS = [
  ["Home", "/"],
  ["How it works", "/#how"],
  ["Pricing", "/pricing/"],
  ["FAQ", "/pricing/#faq"],
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 px-3 pt-3">
      <div className="mx-auto flex max-w-5xl items-center gap-4 rounded-2xl border border-line bg-surface/90 px-5 py-2.5 shadow-sm backdrop-blur">
        <Logo />
        <nav className="mx-auto hidden items-center gap-1 text-sm md:flex">
          {LINKS.map(([name, href]) => (
            <Link key={name} href={href} className="rounded-lg px-3 py-2 text-muted hover:text-ink">{name}</Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1 text-sm md:ml-0">
          <Link href="/studio/" className="rounded-lg px-3 py-2 text-muted hover:text-ink">Login</Link>
          <Link href="/studio/" className="rounded-full bg-brand px-4 py-2 font-medium text-brand-ink shadow-sm hover:opacity-90">Get Started →</Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-8 text-sm text-muted">
        <span>© {new Date().getFullYear()} FindUrAI · Your AI content creator</span>
        <div className="flex gap-4">
          <Link href="/pricing/" className="hover:text-ink">Pricing</Link>
          <Link href="/studio/" className="hover:text-ink">Studio</Link>
        </div>
      </div>
    </footer>
  );
}
