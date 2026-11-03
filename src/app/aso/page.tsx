import type { Metadata } from "next";
import Link from "next/link";
import { CountryFlag } from "@/components/country-flag";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getCountry } from "@/lib/countries";
import { COUNTRY_PAGES, countryPagePath } from "@/lib/seo/country-pages";

export const metadata: Metadata = {
  title: "App Store Keyword Research by Country",
  description:
    "How people search the App Store in the US, UK, Germany, France, Spain, Italy, Japan, Brazil and India, with local keyword examples and tips for each storefront.",
  alternates: { canonical: "/aso" },
};

export default function AsoIndexPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">App Store keyword research by country</h1>
        <p className="mt-4 max-w-2xl text-lg text-pretty text-muted-foreground">
          Each App Store storefront has its own keyword field, its own language and its own competition. A word-for-word translation
          usually isn&apos;t what people type. Pick a country to see how locals search and what to watch out for.
        </p>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {COUNTRY_PAGES.map((p) => (
            <li key={p.slug}>
              <Link href={countryPagePath(p)} className="block h-full rounded-2xl border bg-card p-4 transition-colors hover:bg-muted">
                <span className="flex items-center gap-2 font-medium">
                  <CountryFlag code={p.code} />
                  {getCountry(p.code).name}
                </span>
                <span className="mt-2 block text-sm text-muted-foreground">
                  {p.examples[0].english} → <span lang={getCountry(p.code).language}>{p.examples[0].local}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter />
      <BreadcrumbJsonLd items={[{ name: "ASO by country", path: "/aso" }]} />
    </>
  );
}
