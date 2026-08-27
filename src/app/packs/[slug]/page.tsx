import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { BadgeCheck, ChevronRight, Lightbulb, Target } from "lucide-react"
import { getAllPackSlugs, getPack, PACK_TOOLS } from "@/lib/packs"
import { RunPackButton, PackStepActions, PackLiveStats } from "@/components/packs/run-pack"
import { ForkPackButton } from "@/components/packs/fork-button"

export async function generateStaticParams() {
  return getAllPackSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const pack = getPack(slug)
  if (!pack) return { title: "Pack not found" }
  return {
    title: `${pack.title} | FindurAI`,
    description: pack.description,
    alternates: { canonical: `/packs/${pack.slug}` },
    openGraph: {
      title: pack.title,
      description: pack.description,
      type: "article",
      url: `/packs/${pack.slug}`,
    },
  }
}

export default async function PackPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const pack = getPack(slug)
  if (!pack) notFound()

  // AEO: FAQPage + HowTo-ish ItemList structured data
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: pack.faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: pack.title,
      description: pack.description,
      step: pack.steps.map((s) => ({
        "@type": "HowToStep",
        position: s.stepNumber,
        name: s.title,
        text: s.promptText,
      })),
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background/90 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article className="container mx-auto max-w-3xl px-4">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/packs" className="hover:text-primary">Prompt Packs</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="truncate text-foreground">{pack.title}</span>
        </nav>

        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{pack.title}</h1>

          {/* Direct answer first — for snippets and AI answer engines */}
          <p className="mt-3 text-base leading-relaxed text-foreground/90">{pack.description}</p>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-500">
              <BadgeCheck className="h-3.5 w-3.5" />
              Verified against {pack.lastVerifiedModel} on {pack.lastVerifiedDate}
            </span>
            <span>{pack.steps.length} prompts</span>
            <span className="flex gap-1">
              {pack.toolTags.map((t) => (
                <span key={t}>
                  {PACK_TOOLS[t]?.emoji} {PACK_TOOLS[t]?.label}
                </span>
              ))}
            </span>
            <PackLiveStats slug={pack.slug} />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <RunPackButton pack={pack} />
            <ForkPackButton pack={pack} />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Run = copies the prompt and opens the tool. Remix = save an editable copy to your
            workspace (free account).
          </p>
        </header>

        {/* Steps — full prompts, copy-paste ready, no login wall */}
        <div className="flex flex-col gap-8">
          {pack.steps.map((step) => {
            const tool = PACK_TOOLS[step.tool] || PACK_TOOLS.chatgpt
            return (
              <section
                key={step.stepNumber}
                className="rounded-2xl border border-border bg-card p-5 md:p-6"
              >
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {step.stepNumber}
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-base font-bold">{step.title}</h2>
                    <p className="text-xs text-muted-foreground">
                      {tool.emoji} {tool.label}
                    </p>
                  </div>
                </div>

                <pre className="mb-4 overflow-x-auto whitespace-pre-wrap rounded-xl bg-muted/60 p-4 font-mono text-[13px] leading-relaxed">
                  {step.promptText}
                </pre>

                <PackStepActions pack={pack} stepNumber={step.stepNumber} />

                <div className="mt-4 grid gap-3 border-t border-border/60 pt-4 text-sm sm:grid-cols-2">
                  <p className="flex gap-2 text-muted-foreground">
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <span>
                      <span className="font-medium text-foreground">Why this works: </span>
                      {step.whyThisTool}
                    </span>
                  </p>
                  <p className="flex gap-2 text-muted-foreground">
                    <Target className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <span>
                      <span className="font-medium text-foreground">Good output: </span>
                      {step.outputExpected}
                    </span>
                  </p>
                </div>
              </section>
            )
          })}
        </div>

        {/* FAQ */}
        {pack.faq.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-4 text-xl font-bold">Frequently Asked Questions</h2>
            <div className="flex flex-col gap-4">
              {pack.faq.map((f) => (
                <div key={f.q} className="rounded-xl border border-border bg-card p-4">
                  <h3 className="text-sm font-semibold">{f.q}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{f.a}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Bottom CTA */}
        <section className="mt-12 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-6 text-center">
          <h2 className="text-lg font-bold">Make this workflow yours</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Remix this pack into your workspace — edit the prompts, track your runs, and never
            hunt for them in old chats again.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <ForkPackButton pack={pack} />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            <Link href="/packs" className="text-primary hover:underline">
              ← Browse all Prompt Packs
            </Link>
          </p>
        </section>
      </article>
    </div>
  )
}
