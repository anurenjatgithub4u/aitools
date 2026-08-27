import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { ChevronRight, ArrowRight } from "lucide-react"
import { getAllTechniques, getTechnique, getPacksUsingTechnique } from "@/lib/graph"

// Technique pages: teach a prompting skill ONCE, then list every pack that
// uses it. Graph-powered, strong standalone SEO ("What is X prompting?").

export async function generateStaticParams() {
  return getAllTechniques().map((t) => ({ slug: t.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const t = getTechnique(slug)
  if (!t) return { title: "Technique not found" }
  return {
    title: `${t.label} — Prompting Technique Explained | FindurAI`,
    description: t.short,
    alternates: { canonical: `/techniques/${t.slug}` },
  }
}

export default async function TechniquePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const technique = getTechnique(slug)
  if (!technique) notFound()

  const packs = getPacksUsingTechnique(slug)
  const prereqs = (technique.prerequisiteOf || [])
    .map((s) => getTechnique(s))
    .filter((t): t is NonNullable<typeof t> => !!t)

  return (
    <div className="min-h-screen py-12">
      <article className="container mx-auto max-w-2xl px-4">
        <nav className="mb-8 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/packs" className="hover:text-primary">Prompt Packs</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">Technique</span>
        </nav>

        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Prompting technique
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
          {technique.label}
        </h1>
        <p className="mt-3 text-base text-muted-foreground">{technique.short}</p>

        <div className="mt-8 space-y-4 text-[15px] leading-relaxed text-foreground/90">
          {technique.body.split("\n\n").map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>

        {prereqs.length > 0 && (
          <p className="mt-8 border-t border-border pt-6 text-sm text-muted-foreground">
            Master this first, then move on to{" "}
            {prereqs.map((p, i) => (
              <span key={p.slug}>
                {i > 0 && ", "}
                <Link href={`/techniques/${p.slug}`} className="text-primary hover:underline">
                  {p.label}
                </Link>
              </span>
            ))}
            .
          </p>
        )}

        {packs.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-1 font-display text-xl font-semibold">See it in action</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Every Prompt Pack that uses this technique — run one and feel the difference.
            </p>
            <div className="divide-y divide-border border-y border-border">
              {packs.map((p) => (
                <Link
                  key={p.slug}
                  href={`/packs/${p.slug}`}
                  className="group flex items-center gap-4 py-4 transition-colors hover:bg-muted/40"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-[15px] font-semibold group-hover:text-primary transition-colors">
                      {p.title}
                    </span>
                    {p.benefit && (
                      <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                        {p.benefit}
                      </span>
                    )}
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  )
}
