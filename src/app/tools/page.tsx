import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TOOLS, toolPath } from "@/lib/tools/list";

export const metadata: Metadata = {
  title: "Free ASO Tools for the App Store",
  description: "Free App Store optimization tools, no sign-up: keyword field character counter and an iOS keyword rank checker for 9 countries.",
  alternates: { canonical: "/tools" },
};

export default function ToolsIndexPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Free ASO tools</h1>
        <p className="mt-4 max-w-2xl text-lg text-pretty text-muted-foreground">
          Quick App Store optimization tools you can use right now. No account, no card.
        </p>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {TOOLS.map((t) => (
            <li key={t.slug}>
              <Link href={toolPath(t.slug)} className="block h-full rounded-2xl border bg-card p-5 transition-colors hover:bg-muted">
                <span className="font-medium">{t.name}</span>
                <span className="mt-2 block text-sm text-muted-foreground">{t.blurb}</span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter />
      <BreadcrumbJsonLd items={[{ name: "Free tools", path: "/tools" }]} />
    </>
  );
}
