import { ArrowRightIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CountryFlag } from "@/components/country-flag";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { getCountry, isEnglish } from "@/lib/countries";
import { PLAN_LIMITS } from "@/lib/plans";
import { COUNTRY_PAGES, countryPagePath, getCountryPage, storefrontSizeNote } from "@/lib/seo/country-pages";

type Props = { params: Promise<{ country: string }> };

export const dynamicParams = false;
export const generateStaticParams = () => COUNTRY_PAGES.map((p) => ({ country: p.slug }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = getCountryPage((await params).country);
  if (!page) return {};
  const name = getCountry(page.code).name;
  const description = `${page.intro.split(". ")[0]}. Find the keywords people really search in ${name}, check live ranks and difficulty. Free.`;
  return {
    title: page.heading,
    description,
    keywords: [`ASO ${name}`, `App Store keywords ${name}`, `app store optimization ${name}`, `${getCountry(page.code).languageName} app keywords`],
    alternates: { canonical: countryPagePath(page) },
    openGraph: { title: page.heading, description, url: countryPagePath(page) },
  };
}

export default async function CountryAsoPage({ params }: Props) {
  const page = getCountryPage((await params).country);
  if (!page) notFound();
  const country = getCountry(page.code);
  const sizeNote = storefrontSizeNote(page.code);
  const others = COUNTRY_PAGES.filter((p) => p.slug !== page.slug);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl space-y-10 px-4 py-10">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
          <Link href="/" className="hover:underline">Home</Link> / <Link href="/aso" className="hover:underline">ASO by country</Link> / {country.name}
        </nav>

        <header>
          <h1 className="flex flex-wrap items-center gap-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            <CountryFlag code={page.code} />
            {page.heading}
          </h1>
          <p className="mt-4 text-lg text-pretty text-muted-foreground">{page.intro}</p>
        </header>

        <section aria-labelledby="examples">
          <h2 id="examples" className="text-xl font-semibold">
            {isEnglish(page.code) ? `How people search in ${country.name}` : `How people search in ${country.languageName}`}
          </h2>
          <div className="mt-3 overflow-x-auto rounded-2xl border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">You might write</th>
                  <th className="px-4 py-2 font-medium">People in {country.name} search</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {page.examples.map((e) => (
                  <tr key={e.local}>
                    <td className="px-4 py-2 text-muted-foreground">{e.english}</td>
                    <td className="px-4 py-2">
                      <span className="font-medium" lang={country.language}>{e.local}</span>
                      {e.note && <span className="ml-2 text-xs text-muted-foreground">({e.note})</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Examples of how wording changes. Which phrase is worth it for your app depends on your niche: check it before you commit.
          </p>
        </section>

        {sizeNote && (
          <section aria-labelledby="size">
            <h2 id="size" className="text-xl font-semibold">How competitive is the {country.name} App Store?</h2>
            <p className="mt-2 text-muted-foreground">{sizeNote}</p>
            <p className="mt-2 text-muted-foreground">
              That&apos;s why a keyword that looks taken in the US can still be open here. Our difficulty and volume scores adjust for this
              automatically (measured October 2026 from the rating counts of 12 global apps).
            </p>
          </section>
        )}

        <section aria-labelledby="tips">
          <h2 id="tips" className="text-xl font-semibold">Tips for {country.name}</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
            {page.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
            <li>
              Every storefront has its own 30-character name, 30-character subtitle and 100-character keyword field. Separate keywords with
              commas, no spaces, and don&apos;t repeat words already in your name or subtitle.
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border bg-card p-6 text-center">
          <h2 className="text-xl font-semibold">Find your keywords for {country.name}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Describe your app. We suggest keywords, rewrite them the way people search in {country.name}, and check where you rank, how much
            they&apos;re searched and how hard they are.
          </p>
          <Button size="lg" className="group mt-4" asChild>
            <Link href="/login?mode=signup">
              Start free
              <ArrowRightIcon className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">{PLAN_LIMITS.free.projects} projects free · no card needed</p>
        </section>

        <nav aria-labelledby="more">
          <h2 id="more" className="text-lg font-semibold">Other countries</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {others.map((p) => (
              <li key={p.slug}>
                <Link href={countryPagePath(p)} className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm hover:bg-muted">
                  <CountryFlag code={p.code} />
                  {getCountry(p.code).name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </main>
      <SiteFooter />
      <BreadcrumbJsonLd items={[{ name: "ASO by country", path: "/aso" }, { name: country.name, path: countryPagePath(page) }]} />
    </>
  );
}
