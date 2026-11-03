import Link from "next/link";
import { CountryFlag } from "@/components/country-flag";
import { Faq } from "@/components/home/faq";
import { Hero } from "@/components/home/hero";
import { HomeJsonLd } from "@/components/seo/json-ld";
import { ProjectsView } from "@/components/projects/projects-view";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getCountry } from "@/lib/countries";
import { appsRepo } from "@/lib/db";
import { authEnabled } from "@/lib/firebase/config";
import { PLAN_LIMITS, projectsLeft } from "@/lib/plans";
import { COUNTRY_PAGES, countryPagePath } from "@/lib/seo/country-pages";
import { getCurrentUser } from "@/lib/session";
import { TOOLS, toolPath } from "@/lib/tools/list";

// Per-user data on every request (and keeps `next build` from opening the database).
export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  const projects = user ? await appsRepo.listProjects(user.id) : [];
  const quota =
    user && authEnabled && user.plan === "free"
      ? { left: projectsLeft(user.plan, user.projectsCreated), total: PLAN_LIMITS.free.projects }
      : null;
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl space-y-10 px-4 py-8">
        <Hero signedIn={user !== null} hasProjects={projects.length > 0} />
        {user && <ProjectsView initialProjects={projects} quota={quota} />}
        <FreeTools />
        <CountryGuides />
        <Faq />
      </main>
      <SiteFooter />
      <HomeJsonLd />
    </>
  );
}

function FreeTools() {
  return (
    <section aria-labelledby="free-tools" className="mx-auto max-w-3xl">
      <h2 id="free-tools" className="text-2xl font-semibold tracking-tight">
        Free tools, no sign-up
      </h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {TOOLS.map((t) => (
          <li key={t.slug}>
            <Link href={toolPath(t.slug)} className="block h-full rounded-2xl border bg-card p-4 transition-colors hover:bg-muted">
              <span className="font-medium">{t.name}</span>
              <span className="mt-1 block text-sm text-muted-foreground">{t.blurb}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CountryGuides() {
  return (
    <section aria-labelledby="by-country" className="mx-auto max-w-3xl">
      <h2 id="by-country" className="text-2xl font-semibold tracking-tight">
        Keyword research by country
      </h2>
      <p className="mt-2 text-muted-foreground">How people really search the App Store in each country, with local examples and tips.</p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {COUNTRY_PAGES.map((p) => (
          <li key={p.slug}>
            <Link href={countryPagePath(p)} className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-sm hover:bg-muted">
              <CountryFlag code={p.code} />
              {getCountry(p.code).name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
