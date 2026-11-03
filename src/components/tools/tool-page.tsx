import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { PLAN_LIMITS } from "@/lib/plans";
import { type ToolSlug, TOOLS, toolPath } from "@/lib/tools/list";

/** Shared layout for a free tool: the tool on top, crawlable explanation below, then the sign-up pitch. */
export function ToolPage({
  slug,
  title,
  intro,
  tool,
  children,
}: {
  slug: ToolSlug;
  title: string;
  intro: string;
  tool: React.ReactNode;
  children: React.ReactNode;
}) {
  const others = TOOLS.filter((t) => t.slug !== slug);
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl space-y-10 px-4 py-10">
        <div>
          <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
            <Link href="/" className="hover:underline">Home</Link> / <Link href="/tools" className="hover:underline">Free tools</Link> / {title}
          </nav>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-lg text-pretty text-muted-foreground">{intro}</p>
          <p className="mt-1 text-sm text-muted-foreground">Free, no sign-up.</p>
        </div>

        {tool}

        <article className="max-w-3xl space-y-3 text-muted-foreground [&_a]:text-foreground [&_a]:underline [&_h2]:pt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-foreground [&_ul]:space-y-2">
          {children}
        </article>

        <section className="rounded-2xl border bg-card p-6 text-center">
          <h2 className="text-xl font-semibold">Find keywords worth ranking for</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Describe your app. We suggest keywords, rewrite them the way people search in 9 countries, and score each one&apos;s volume and
            difficulty.
          </p>
          <Button size="lg" className="group mt-4" asChild>
            <Link href="/login?mode=signup">
              Start free
              <ArrowRightIcon className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">{PLAN_LIMITS.free.projects} projects free · no card needed</p>
        </section>

        {others.length > 0 && (
          <nav aria-labelledby="more-tools">
            <h2 id="more-tools" className="text-lg font-semibold">More free tools</h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {others.map((t) => (
                <li key={t.slug}>
                  <Link href={toolPath(t.slug)} className="block rounded-2xl border p-4 hover:bg-muted">
                    <span className="font-medium">{t.name}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">{t.blurb}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </main>
      <SiteFooter />
      <BreadcrumbJsonLd items={[{ name: "Free tools", path: "/tools" }, { name: title, path: toolPath(slug) }]} />
    </>
  );
}
