import Link from "next/link";
import { getCountry } from "@/lib/countries";
import { COUNTRY_PAGES, countryPagePath } from "@/lib/seo/country-pages";
import { SITE } from "@/lib/site";

/** Footer with links to every country guide, so each one is reachable from every public page. */
export function SiteFooter() {
  return (
    <footer className="mt-12 border-t">
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 text-xs text-muted-foreground">
        <nav aria-label="Keyword research by country" className="flex flex-wrap gap-x-4 gap-y-1">
          <Link href="/aso" className="font-medium text-foreground hover:underline">
            ASO by country
          </Link>
          {COUNTRY_PAGES.map((p) => (
            <Link key={p.slug} href={countryPagePath(p)} className="hover:underline">
              {getCountry(p.code).name}
            </Link>
          ))}
        </nav>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>
            © {new Date().getFullYear()} {SITE.brand} · {SITE.name}: App Store keyword research and ASO
          </span>
          <span>Search data from Apple&apos;s public iTunes Search API. Volume is an estimate.</span>
        </div>
      </div>
    </footer>
  );
}
