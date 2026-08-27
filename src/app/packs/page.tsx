import Link from "next/link"
import type { Metadata } from "next"
import { BadgeCheck, Layers, ChevronRight, BookOpen, Zap } from "lucide-react"
import { getAllPacks, PACK_ROLES, PACK_TOOLS } from "@/lib/packs"
import { PACK_ROLE_META } from "@/lib/packs-shared"
import connectDB from "@/lib/db"
import { PackStats } from "@/models/PackStats"

// Dynamic metadata per role/tool filter — matches real search intent format (spec §7)
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; tool?: string }>
}): Promise<Metadata> {
  const { role, tool } = await searchParams
  const roleMeta = role ? PACK_ROLE_META[role] : null
  const toolLabel = tool ? PACK_TOOLS[tool]?.label : null

  if (roleMeta && !tool) {
    return {
      title: `${roleMeta.title} | FindurAI`,
      description: roleMeta.description,
      alternates: { canonical: `/packs?role=${role}` },
    }
  }

  if (toolLabel) {
    const roleLabel = role ? PACK_ROLES.find((r) => r.id === role)?.label : null
    const title = roleLabel
      ? `Best ${toolLabel} Prompts for ${roleLabel}s (2026)`
      : `Best ${toolLabel} Prompts (2026)`
    return {
      title: `${title} | FindurAI`,
      description: `Copy-paste, ready-to-run ${toolLabel} prompt packs${roleLabel ? ` for ${roleLabel.toLowerCase()}s` : ""} — multi-step sequences you can run in one click and remix into your own workflows.`,
      alternates: { canonical: `/packs?tool=${tool}${role ? `&role=${role}` : ""}` },
    }
  }

  return {
    title: "Prompt Packs — Ready-to-Run AI Prompts by Role | FindurAI",
    description:
      "Copy-paste, ready-to-run AI prompt packs for developers, writers, students and marketers — multi-step ChatGPT and Claude prompt sequences you can run in one click and remix into your own workflows.",
    alternates: { canonical: "/packs" },
  }
}

async function getStatsMap(): Promise<Record<string, { runCount: number; forkCount: number }>> {
  try {
    await connectDB()
    const rows = await PackStats.find({}).lean()
    const map: Record<string, { runCount: number; forkCount: number }> = {}
    for (const r of rows as any[]) map[r.slug] = { runCount: r.runCount, forkCount: r.forkCount }
    return map
  } catch {
    return {}
  }
}

export default async function PacksPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; tool?: string }>
}) {
  const { role, tool } = await searchParams
  const allPacks = getAllPacks()
  const stats = await getStatsMap()

  let packs = allPacks
  if (role) packs = packs.filter((p) => p.roleTags.includes(role))
  if (tool) packs = packs.filter((p) => p.toolTags.includes(tool))

  // Trending = most run first; unrun packs keep alphabetical order
  packs = [...packs].sort(
    (a, b) => (stats[b.slug]?.runCount || 0) - (stats[a.slug]?.runCount || 0)
  )

  const activeRole = PACK_ROLES.find((r) => r.id === role)
  const activeRoleMeta = role ? PACK_ROLE_META[role] : null
  const toolLabel = tool ? PACK_TOOLS[tool]?.label : undefined

  const heroTitle = activeRoleMeta?.title.replace(/ \| FindurAI$/, "") ??
    (toolLabel ? `Best ${toolLabel} Prompts (2026)` : "Prompt Packs")

  const heroDescription = activeRoleMeta?.description ??
    "Ready-to-run, multi-step prompt sequences — copy each prompt in one click, open the right AI tool, and remix any pack into your own saved workflow. No blank pages, no guessing."

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background/90">
      {/* AEO: direct-answer hero at the top of the page (spec §7) */}
      <section className="border-b border-border/40 py-12">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{heroTitle}</h1>
              {/* Direct answer paragraph — optimized for featured snippets & AI engine citation */}
              <p className="mt-3 text-base leading-relaxed text-foreground/80">{heroDescription}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4 text-indigo-500" />
                  {packs.length} prompt packs
                </span>
                <span className="flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-amber-500" />
                  One-click run + remix
                </span>
                <span className="flex items-center gap-1.5">
                  <BadgeCheck className="h-4 w-4 text-emerald-500" />
                  Verified against current models
                </span>
              </div>
            </div>
            <Link
              href="/workspace"
              className="shrink-0 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              My Workflows →
            </Link>
          </div>
        </div>
      </section>

      <div className="container mx-auto max-w-5xl px-4 py-10">
        {/* Role + tool filters — real links, so filter pages are indexable */}
        <div className="mb-8 flex flex-col gap-2">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Browse by role
          </p>
          <div className="flex flex-wrap gap-1.5">
            <FilterChip href="/packs" active={!role && !tool} label="All" />
            {PACK_ROLES.map((r) => (
              <FilterChip
                key={r.id}
                href={`/packs?role=${r.id}`}
                active={role === r.id && !tool}
                label={`${r.emoji} ${r.label}`}
              />
            ))}
          </div>
          <p className="mb-1.5 mt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Browse by AI tool
          </p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(PACK_TOOLS).map(([id, t]) => (
              <FilterChip
                key={id}
                href={`/packs?tool=${id}${role ? `&role=${role}` : ""}`}
                active={tool === id}
                label={`${t.emoji} ${t.label}`}
              />
            ))}
          </div>
        </div>

        {packs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-16 text-center">
            <p className="text-sm text-muted-foreground">
              No packs match this filter yet — more roles are being added weekly.{" "}
              <Link href="/packs" className="text-primary hover:underline">
                Browse all packs
              </Link>
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {packs.map((pack) => {
              const s = stats[pack.slug]
              return (
                <Link
                  key={pack.slug}
                  href={`/packs/${pack.slug}`}
                  className="group flex flex-col rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10"
                >
                  <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Layers className="h-3.5 w-3.5 text-indigo-500" />
                    {pack.steps.length}-prompt sequence
                    <span className="ml-auto flex gap-1">
                      {pack.toolTags.map((t) => (
                        <span key={t} title={PACK_TOOLS[t]?.label}>
                          {PACK_TOOLS[t]?.emoji}
                        </span>
                      ))}
                    </span>
                  </div>

                  <h2 className="text-base font-bold leading-snug group-hover:text-primary transition-colors">
                    {pack.title}
                  </h2>

                  {/* Benefit one-liner — outcome first (spec §0.5.2) */}
                  {pack.benefit && (
                    <p className="mt-1.5 text-sm font-medium text-primary/80">{pack.benefit}</p>
                  )}

                  <p className="mt-1.5 line-clamp-2 flex-1 text-sm text-muted-foreground">
                    {pack.description}
                  </p>

                  {/* Role tags */}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {pack.roleTags.map((r) => {
                      const role = PACK_ROLES.find((pr) => pr.id === r)
                      return role ? (
                        <span
                          key={r}
                          className="rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                        >
                          {role.emoji} {role.label}
                        </span>
                      ) : null
                    })}
                  </div>

                  <div className="mt-4 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <BadgeCheck className="h-3.5 w-3.5 text-emerald-500" />
                      Verified {pack.lastVerifiedDate}
                    </span>
                    {s && s.runCount > 0 && <span>Run {s.runCount}×</span>}
                    {s && s.forkCount > 0 && <span>Remixed {s.forkCount}×</span>}
                    <span className="ml-auto flex items-center gap-0.5 font-medium text-primary">
                      Open <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function FilterChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  )
}
