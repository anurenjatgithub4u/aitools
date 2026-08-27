import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import {
  BookOpen,
  Zap,
  MessageSquare,
  Clock,
  BarChart3,
  Play,
  ArrowRight,
  ChevronRight,
  Wrench,
} from "lucide-react"
import { getTopic, getAllTopicSlugs } from "@/lib/topics"
import { LearningPath, TopicProgressBar } from "@/components/learn/learning-path"
import { PromptPackCard } from "@/components/learn/prompt-pack"

export async function generateStaticParams() {
  const slugs = await getAllTopicSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const topic = await getTopic(slug)
  if (!topic) return { title: "Topic not found" }
  const title = `${topic.title} — Complete Learning Path & Guides | FindurAI`
  return {
    title,
    description: topic.tagline,
    alternates: { canonical: `/topics/${topic.slug}` },
    openGraph: { title, description: topic.tagline, type: "website", url: `/topics/${topic.slug}` },
  }
}

const SECTION_NAV = [
  { id: "overview", label: "Overview" },
  { id: "path", label: "Learning Path" },
  { id: "workflows", label: "Workflows" },
  { id: "prompts", label: "Prompt Packs" },
  { id: "tools", label: "Tools" },
  { id: "related", label: "Related" },
]

export default async function TopicHubPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const topic = await getTopic(slug)
  if (!topic) notFound()

  const startHref = `/blog/${topic.startHere}`

  // JSON-LD: mark the hub as a course-like ItemList of its live guides
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${topic.title} Learning Path`,
    description: topic.tagline,
    itemListElement: topic.flatPath.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `https://findurai.com/blog/${item.slug}`,
      name: item.title,
    })),
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background/90">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="container mx-auto max-w-6xl px-4 py-8 md:py-12">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/learn" className="hover:text-primary">Learn</Link>
          <ChevronRight className="h-3 w-3" />
          <Link href="/blog" className="hover:text-primary">{topic.category}</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{topic.title}</span>
        </nav>

        {/* Hero */}
        <header className="mb-10 rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6 md:p-8">
          <div className="flex items-start gap-4">
            <span className="text-4xl md:text-5xl">{topic.emoji}</span>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold md:text-3xl">{topic.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground md:text-base">{topic.tagline}</p>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-indigo-500" /> {topic.guideCount} guides
                </span>
                <span className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-500" /> {topic.workflowCount} workflows
                </span>
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-pink-500" /> {topic.promptPackCount} prompt pack{topic.promptPackCount === 1 ? "" : "s"}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-emerald-500" /> ~{topic.totalReadingMinutes} min
                </span>
                <span className="flex items-center gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5 text-violet-500" /> {topic.level}
                </span>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Link
                  href={startHref}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  <Play className="h-4 w-4" /> Start Learning
                </Link>
                <TopicProgressBar topicSlug={topic.slug} total={topic.guideCount} />
              </div>
            </div>
          </div>
        </header>

        {/* Sticky in-page nav */}
        <nav className="sticky top-16 z-20 mb-8 -mx-4 hidden items-center gap-1 overflow-x-auto border-b border-border/60 bg-background/80 px-4 py-2 backdrop-blur md:flex">
          {SECTION_NAV.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {s.label}
            </a>
          ))}
        </nav>

        <div className="flex flex-col gap-12">
          {/* Overview */}
          <section id="overview" className="scroll-mt-28">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Overview
            </h2>
            <div className="max-w-3xl space-y-3 text-sm leading-relaxed text-foreground/90">
              {topic.overview.split("\n\n").map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </section>

          {/* Learning Path */}
          <section id="path" className="scroll-mt-28">
            <h2 className="mb-1 text-lg font-bold">Learning Path</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Follow it in order, or jump to any guide. Your progress is saved on this device.
            </p>
            <LearningPath topicSlug={topic.slug} sections={topic.learningPath} />

            {topic.reference.length > 0 && (
              <div className="mt-8">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Reference
                </h3>
                <div className="flex flex-wrap gap-2">
                  {topic.reference.map((item) =>
                    item.live ? (
                      <Link
                        key={item.slug}
                        href={`/blog/${item.slug}`}
                        className="rounded-full border border-border bg-card px-4 py-1.5 text-xs transition-colors hover:border-primary/40"
                      >
                        {item.title}
                      </Link>
                    ) : (
                      <span
                        key={item.slug}
                        className="rounded-full border border-dashed border-border px-4 py-1.5 text-xs text-muted-foreground"
                      >
                        {item.title} · soon
                      </span>
                    )
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Workflows */}
          {topic.workflows && topic.workflows.length > 0 && (
            <section id="workflows" className="scroll-mt-28">
              <h2 className="mb-1 text-lg font-bold">Workflows</h2>
              <p className="mb-5 text-sm text-muted-foreground">
                Stop learning, start doing. Save any of these into your workspace and run them.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {topic.workflows.map((wf) => (
                  <div key={wf.title} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-500" />
                      <h4 className="text-sm font-semibold">{wf.title}</h4>
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">{wf.goal}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                      <span>{wf.steps} steps</span>
                      <span>·</span>
                      <span>{wf.time}</span>
                      <span>·</span>
                      <span>{wf.tools.join(", ")}</span>
                    </div>
                    <Link
                      href={`/search?q=${encodeURIComponent(wf.starterKitQuery || wf.goal)}`}
                      className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      Build this workflow <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Prompt Packs */}
          {topic.promptPacks && topic.promptPacks.length > 0 && (
            <section id="prompts" className="scroll-mt-28">
              <h2 className="mb-1 text-lg font-bold">Prompt Packs</h2>
              <p className="mb-5 text-sm text-muted-foreground">
                Copy-ready prompts for this topic. Expand a pack to grab individual prompts.
              </p>
              <div className="flex flex-col gap-3">
                {topic.promptPacks.map((pack) => (
                  <PromptPackCard key={pack.title} pack={pack} />
                ))}
              </div>
            </section>
          )}

          {/* Tools */}
          {topic.toolTags && topic.toolTags.length > 0 && (
            <section id="tools" className="scroll-mt-28">
              <h2 className="mb-1 text-lg font-bold">Tools for this topic</h2>
              <p className="mb-5 text-sm text-muted-foreground">
                Explore the AI tools people use to build {topic.title.toLowerCase()}.
              </p>
              <div className="flex flex-wrap gap-2">
                {topic.toolTags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/search?q=${encodeURIComponent(tag)}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm transition-colors hover:border-primary/40"
                  >
                    <Wrench className="h-3.5 w-3.5 text-cyan-500" /> {tag}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Related Topics */}
          {topic.relatedTopics && topic.relatedTopics.length > 0 && (
            <section id="related" className="scroll-mt-28">
              <h2 className="mb-1 text-lg font-bold">Related Topics</h2>
              <p className="mb-5 text-sm text-muted-foreground">Where to go next.</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {topic.relatedTopics.map((rt) => {
                  const inner = (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{rt.emoji}</span>
                        <span className="text-sm font-semibold">{rt.title}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{rt.reason}</p>
                      {rt.planned && (
                        <span className="mt-2 inline-block rounded-full border border-dashed border-border px-2 py-0.5 text-[9px] uppercase text-muted-foreground">
                          Coming soon
                        </span>
                      )}
                    </>
                  )
                  return rt.planned ? (
                    <div key={rt.slug} className="rounded-xl border border-dashed border-border p-4 opacity-70">
                      {inner}
                    </div>
                  ) : (
                    <Link
                      key={rt.slug}
                      href={`/topics/${rt.slug}`}
                      className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
                    >
                      {inner}
                    </Link>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
