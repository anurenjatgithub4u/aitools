"use client"

import { useState, useEffect, Suspense, useMemo } from "react"
import { useSearchParams, useRouter, notFound } from "next/navigation"
import { TOOL_DIRECTORY_ENABLED } from "@/lib/tools/config"
import { CheckCircle2, XCircle, Star, ArrowRight, AlertTriangle, Trophy, Sparkles, DollarSign, Layers, ListChecks, Scale } from "lucide-react"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { AITool } from "@/types"
import { ToolLogo } from "@/components/tool-logo"

// Two tools are "comparable" when they share a category or have overlapping
// tags/capabilities — otherwise the comparison is apples-to-oranges.
function areRelated(a: AITool, b: AITool): boolean {
  if (a.category === b.category) return true
  const aTags = new Set([...(a.tags || []), ...(a.capabilities || [])].map(t => t.toLowerCase()))
  const overlap = [...(b.tags || []), ...(b.capabilities || [])].filter(t => aTags.has(t.toLowerCase()))
  return overlap.length >= 2
}

function BoolBadge({ value }: { value: boolean }) {
  return value ? (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1">
      <CheckCircle2 className="w-4 h-4" /> Yes
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground bg-muted/60 border border-border/60 rounded-full px-3 py-1">
      <XCircle className="w-4 h-4" /> No
    </span>
  )
}

// Responsive comparison row: label on top (mobile) / left (desktop), two value cells
function Row({ label, left, right, subtle, align = "center" }: { label: string; left: React.ReactNode; right: React.ReactNode; subtle?: string; align?: "center" | "right" }) {
  const cellClass = align === "right"
    ? "flex flex-col items-end justify-start text-right"
    : "text-center flex flex-col items-center justify-start"
  return (
    <div className="grid grid-cols-2 md:grid-cols-[180px_1fr_1fr] gap-x-4 gap-y-2 py-4 px-4 md:px-6 border-b border-border/30 last:border-b-0 hover:bg-muted/20 transition-colors">
      <div className="col-span-2 md:col-span-1 flex md:block items-baseline gap-2">
        <span className="text-sm font-semibold text-muted-foreground">{label}</span>
        {subtle && <span className="block text-[10px] text-muted-foreground/60 md:mt-1">{subtle}</span>}
      </div>
      <div className={cellClass}>{left}</div>
      <div className={cellClass}>{right}</div>
    </div>
  )
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 px-4 md:px-6 py-3 bg-muted/40 border-y border-border/40">
      <Icon className="w-4 h-4 text-primary" />
      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</span>
    </div>
  )
}

function FeatureList({ items, sharedSet, tone }: { items?: string[]; sharedSet?: Set<string>; tone: "primary" | "green" | "red" }) {
  if (!items || items.length === 0) return <span className="text-sm text-muted-foreground/60">—</span>
  const Icon = tone === "red" ? XCircle : CheckCircle2
  const color = tone === "red" ? "text-red-500/70" : tone === "green" ? "text-green-500" : "text-primary"
  return (
    <ul className="space-y-2 text-left w-full max-w-[280px]">
      {items.map((item, i) => {
        const shared = sharedSet?.has(item.toLowerCase())
        return (
          <li key={i} className="flex items-start gap-2 text-sm leading-snug">
            <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${shared ? "text-amber-500" : color}`} />
            <span className="text-foreground/80">{item}{shared && <span className="text-amber-500 ml-1">★</span>}</span>
          </li>
        )
      })}
    </ul>
  )
}

function CompareContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [allTools, setAllTools] = useState<AITool[]>([])
  const [loading, setLoading] = useState(true)
  const [tool1Id, setTool1Id] = useState<string>(searchParams.get("a") || "")
  const [tool2Id, setTool2Id] = useState<string>(searchParams.get("b") || "")

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem("tools-cache")
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAllTools(parsed)
          setLoading(false)
        }
      }
    } catch { /* ignore corrupt cache */ }

    fetch("/api/tools")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAllTools(data)
          try { sessionStorage.setItem("tools-cache", JSON.stringify(data)) } catch { /* quota */ }
        }
        setLoading(false)
      })
      .catch((err) => {
        console.error("Failed to fetch tools for comparison", err)
        setLoading(false)
      })
  }, [])

  // Default to the top two tools of the same category when nothing selected
  useEffect(() => {
    if (allTools.length >= 2 && !tool1Id && !tool2Id) {
      const first = allTools[0]
      const sameCat = allTools.find(t => t.id !== first.id && t.category === first.category)
      setTool1Id(first.id)
      setTool2Id((sameCat ?? allTools[1]).id)
    }
  }, [allTools, tool1Id, tool2Id])

  // Keep the URL shareable
  useEffect(() => {
    if (tool1Id && tool2Id) {
      router.replace(`/compare?a=${tool1Id}&b=${tool2Id}`, { scroll: false })
    }
  }, [tool1Id, tool2Id, router])

  const tool1 = allTools.find(t => t.id === tool1Id)
  const tool2 = allTools.find(t => t.id === tool2Id)

  const related = tool1 && tool2 ? areRelated(tool1, tool2) : true

  const suggestions = useMemo(() => {
    if (!tool1) return []
    return allTools
      .filter(t => t.id !== tool1.id && t.id !== tool2Id && t.category === tool1.category)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 4)
  }, [allTools, tool1, tool2Id])

  const groupedOptions = (otherId: string) => {
    const other = allTools.find(t => t.id === otherId)
    if (!other) return { related: [], rest: allTools }
    const rel = allTools.filter(t => t.id !== otherId && t.category === other.category)
    const rest = allTools.filter(t => t.id !== otherId && t.category !== other.category)
    return { related: rel, rest }
  }

  const sharedFeatures = useMemo(() => {
    if (!tool1 || !tool2) return new Set<string>()
    const set1 = new Set((tool1.features || []).map(f => f.toLowerCase()))
    return new Set((tool2.features || []).filter(f => set1.has(f.toLowerCase())).map(f => f.toLowerCase()))
  }, [tool1, tool2])

  const ratingWinner = tool1 && tool2
    ? (tool1.rating > tool2.rating ? 1 : tool2.rating > tool1.rating ? 2 : 0)
    : 0

  const renderSelect = (
    value: string,
    onChange: (v: string) => void,
    otherId: string,
    placeholder: string,
  ) => {
    const { related: rel, rest } = groupedOptions(otherId)
    return (
      <Select value={value} onValueChange={(val) => val && onChange(val)}>
        <SelectTrigger className="h-12 text-base md:text-lg w-full rounded-xl bg-background/70 backdrop-blur-sm border-border/60 shadow-sm">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {rel.length > 0 && (
            <SelectGroup>
              <SelectLabel>Same category</SelectLabel>
              {rel.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectGroup>
          )}
          <SelectGroup>
            {rel.length > 0 && <SelectLabel>Other categories</SelectLabel>}
            {rest.map(t => (
              <SelectItem key={t.id} value={t.id}>{t.name} — {t.category}</SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    )
  }

  return (
    <div className="min-h-screen bg-muted/10 pb-20">
      {/* Hero */}
      <div className="relative overflow-hidden bg-background border-b border-border/40 pt-12 pb-14 px-4 text-center">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[128px] pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[128px] pointer-events-none" />
        <div className="container max-w-4xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4 border border-primary/20">
            <Scale className="h-3 w-3" />
            <span>Side-by-Side Comparison</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4">Compare AI Tools</h1>
          <p className="text-muted-foreground text-base md:text-lg mb-8 max-w-2xl mx-auto">
            Select two tools to see how they stack up against each other side-by-side.
          </p>

          <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-4 max-w-2xl mx-auto">
            <div className="w-full md:w-[260px]">
              {renderSelect(tool1Id, setTool1Id, tool2Id, "Select first tool")}
            </div>

            <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-sm flex items-center justify-center">
              VS
            </div>

            <div className="w-full md:w-[260px]">
              {renderSelect(tool2Id, setTool2Id, tool1Id, "Select second tool")}
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-5xl mx-auto px-3 md:px-4 mt-8 md:mt-12">
        {/* Cross-category warning */}
        {tool1 && tool2 && !related && (
          <div className="mb-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 md:p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-600 dark:text-amber-400">
                  These tools serve different purposes
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {tool1.name} is a <strong>{tool1.category}</strong> tool while {tool2.name} is a <strong>{tool2.category}</strong> tool,
                  so a feature-by-feature comparison may not be apples-to-apples. You can still compare pricing and platform basics below.
                </p>
                {suggestions.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                      Compare {tool1.name} with a similar tool instead:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map(s => (
                        <button
                          key={s.id}
                          onClick={() => setTool2Id(s.id)}
                          className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border border-border bg-background hover:border-primary/50 hover:text-primary transition-colors"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          {s.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="bg-background rounded-3xl border border-border/40 shadow-sm p-12 text-center animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded-md w-1/3 mx-auto" />
            <div className="h-6 bg-muted rounded-md w-1/2 mx-auto" />
            <div className="h-40 bg-muted rounded-xl w-full" />
          </div>
        ) : tool1 && tool2 ? (
          <div className="bg-background rounded-3xl border border-border/40 shadow-xl shadow-primary/[0.03] overflow-hidden">

            {/* Tool header cards */}
            <div className="grid grid-cols-2 md:grid-cols-[180px_1fr_1fr]">
              <div className="hidden md:block" />
              {[tool1, tool2].map((tool, i) => (
                <div
                  key={tool.id}
                  className={`relative p-5 md:p-8 text-center ${i === 0 ? "border-r border-border/30" : ""} ${ratingWinner === i + 1 ? "bg-gradient-to-b from-primary/[0.06] to-transparent" : ""}`}
                >
                  {ratingWinner === i + 1 && (
                    <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground rounded-full px-2.5 py-1 shadow-md">
                      <Trophy className="w-3 h-3" /> Top rated
                    </span>
                  )}
                  <ToolLogo
                    name={tool.name}
                    website={tool.website}
                    className="w-14 h-14 md:w-20 md:h-20 mx-auto mb-3 md:mb-4 rounded-2xl shadow-md"
                    fallbackTextClassName="text-2xl"
                  />
                  <Link href={`/tool/${tool.id}`} className="text-lg md:text-2xl font-bold hover:text-primary transition-colors block mb-2 leading-tight">
                    {tool.name}
                  </Link>
                  <div className="flex items-center justify-center gap-2 flex-wrap mb-3">
                    <Badge variant="secondary" className="text-xs">{tool.category}</Badge>
                    {tool.verified && <Badge variant="outline" className="text-xs text-green-500 border-green-500/40">Verified</Badge>}
                  </div>
                  <div className={`inline-flex items-center gap-1.5 font-bold text-xl md:text-2xl rounded-full px-4 py-1.5 ${ratingWinner === i + 1 ? "bg-primary/10 text-primary" : "text-foreground"}`}>
                    <Star className="w-5 h-5 fill-primary text-primary" /> {tool.rating}
                  </div>
                </div>
              ))}
            </div>

            {/* Pricing & Access */}
            <SectionHeader icon={DollarSign} title="Pricing & Access" />
            <Row
              label="Pricing"
              left={
                <div>
                  <Badge variant={tool1.pricing === "Free" ? "default" : "outline"} className="text-sm px-3 py-1">{tool1.pricing}</Badge>
                  {tool1.startingPrice && <div className="text-xs text-muted-foreground mt-1.5">from {tool1.startingPrice}</div>}
                </div>
              }
              right={
                <div>
                  <Badge variant={tool2.pricing === "Free" ? "default" : "outline"} className="text-sm px-3 py-1">{tool2.pricing}</Badge>
                  {tool2.startingPrice && <div className="text-xs text-muted-foreground mt-1.5">from {tool2.startingPrice}</div>}
                </div>
              }
            />
            <Row label="Free Plan" left={<BoolBadge value={tool1.free_plan} />} right={<BoolBadge value={tool2.free_plan} />} />
            <Row label="API Available" left={<BoolBadge value={tool1.api} />} right={<BoolBadge value={tool2.api} />} />
            <Row label="Mobile App" left={<BoolBadge value={tool1.mobile} />} right={<BoolBadge value={tool2.mobile} />} />
            <Row label="Open Source" left={<BoolBadge value={tool1.opensource} />} right={<BoolBadge value={tool2.opensource} />} />

            {/* Usability */}
            <SectionHeader icon={Layers} title="Usability" />
            <Row
              label="Ease of Use"
              left={<span className="text-sm font-semibold">{tool1.difficulty}</span>}
              right={<span className="text-sm font-semibold">{tool2.difficulty}</span>}
            />
            <Row
              label="Best For"
              left={<p className="text-sm text-foreground/80 leading-relaxed max-w-[300px]">{tool1.best_for}</p>}
              right={<p className="text-sm text-foreground/80 leading-relaxed max-w-[300px]">{tool2.best_for}</p>}
            />

            {/* Features */}
            <SectionHeader icon={ListChecks} title="Features & Strengths" />
            <Row
              label="Key Features"
              subtle="★ = both tools have this"
              align="right"
              left={<FeatureList items={tool1.features} sharedSet={sharedFeatures} tone="primary" />}
              right={<FeatureList items={tool2.features} sharedSet={sharedFeatures} tone="primary" />}
            />
            <Row
              label="Pros"
              align="right"
              left={<FeatureList items={tool1.pros?.slice(0, 4)} tone="green" />}
              right={<FeatureList items={tool2.pros?.slice(0, 4)} tone="green" />}
            />
            <Row
              label="Cons"
              align="right"
              left={<FeatureList items={tool1.cons?.slice(0, 4)} tone="red" />}
              right={<FeatureList items={tool2.cons?.slice(0, 4)} tone="red" />}
            />
            <Row
              label="Tags"
              left={
                <div className="flex flex-wrap justify-center gap-1.5 max-w-[280px]">
                  {tool1.tags?.slice(0, 6).map(tag => (
                    <Badge key={tag} variant="secondary" className="font-mono text-[10px] uppercase">#{tag}</Badge>
                  ))}
                </div>
              }
              right={
                <div className="flex flex-wrap justify-center gap-1.5 max-w-[280px]">
                  {tool2.tags?.slice(0, 6).map(tag => (
                    <Badge key={tag} variant="secondary" className="font-mono text-[10px] uppercase">#{tag}</Badge>
                  ))}
                </div>
              }
            />

            {/* CTA */}
            <div className="grid grid-cols-2 md:grid-cols-[180px_1fr_1fr] gap-4 p-4 md:p-6 bg-muted/20">
              <div className="hidden md:block" />
              {[tool1, tool2].map((tool) => (
                <div key={tool.id} className="flex justify-center">
                  <Link
                    href={`/tool/${tool.id}`}
                    className={buttonVariants({ variant: "default", size: "sm", className: "rounded-lg px-5 font-semibold" })}
                  >
                    View {tool.name.length > 14 ? "Details" : tool.name} <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            Please select two tools to compare.
          </div>
        )}
      </div>
    </div>
  )
}

export default function ComparePage() {
  if (!TOOL_DIRECTORY_ENABLED) notFound()

  return (
    <Suspense fallback={<div className="p-8 text-center">Loading comparison...</div>}>
      <CompareContent />
    </Suspense>
  )
}
