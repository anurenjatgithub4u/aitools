import type { Metadata } from "next"
import { cache } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Star, ArrowLeft, ArrowRight, Share2, Heart, ExternalLink, Check, X, Sparkles, ChevronRight, BadgeCheck, Boxes, Lightbulb } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import connectDB from "@/lib/db"
import { Tool } from "@/models/Tool"
import { TOOL_DIRECTORY_ENABLED } from "@/lib/tools/config"
import { ToolLogo } from "@/components/tool-logo"
import {
  SITE_NAME,
  metaDescription,
  slugify,
  breadcrumbLd,
  softwareApplicationLd,
  faqLd,
  jsonLdScript,
} from "@/lib/seo"

export async function generateStaticParams() {
  if (!TOOL_DIRECTORY_ENABLED) return []
  try {
    await connectDB()
    const tools = await Tool.find({}, { id: 1 }).lean()
    return tools.map((tool: any) => ({
      id: tool.id,
    }))
  } catch (error) {
    console.error("Failed to generate static params:", error)
    return []
  }
}

// cache() dedupes the query so generateMetadata + the page share one DB call.
const getTool = cache(async (id: string) => {
  try {
    await connectDB()
    return await Tool.findOne({ id }).lean<any>()
  } catch (error) {
    console.error("Failed to fetch tool from DB:", error)
    return null
  }
})

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  if (!TOOL_DIRECTORY_ENABLED) {
    return { title: "Tool not found", robots: { index: false, follow: false } }
  }
  const { id } = await params
  const tool = await getTool(id)
  if (!tool) {
    return { title: "Tool not found", robots: { index: false, follow: true } }
  }
  const title = `${tool.name} Review, Pricing & Alternatives`
  const description = metaDescription(
    `Explore ${tool.name} features, pricing, reviews, alternatives and use cases. ${tool.best_for || ""}`
  )
  const canonical = `/tool/${tool.id}`
  return {
    title,
    description,
    keywords: tool.tags,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      title: `${title} | ${SITE_NAME}`,
      description,
      images: [{ url: `https://www.google.com/s2/favicons?domain=${(() => { try { return new URL(tool.website).hostname } catch { return "" } })()}&sz=256`, alt: `${tool.name} logo` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${SITE_NAME}`,
      description,
    },
  }
}

export default async function ToolPage({ params }: { params: Promise<{ id: string }> }) {
  if (!TOOL_DIRECTORY_ENABLED) notFound()

  const resolvedParams = await params
  const tool: any = await getTool(resolvedParams.id)

  if (!tool) {
    notFound()
  }

  let alternatives: any[] = []
  let similar: any[] = []
  try {
    if (tool.alternatives && tool.alternatives.length > 0) {
      alternatives = await Tool.find({ id: { $in: tool.alternatives } }).lean()
    }
    // Related tools from the same category (internal linking + avoids orphans).
    similar = await Tool.find({
      $or: [{ primaryCategory: tool.primaryCategory || tool.category }, { category: tool.category }],
      id: { $ne: tool.id, $nin: tool.alternatives || [] },
    })
      .sort({ trendingScore: -1, rating: -1 })
      .limit(6)
      .lean()
  } catch (error) {
    console.error("Failed to fetch related tools:", error)
  }

  const categoryName = tool.primaryCategory || tool.category
  const categorySlug = slugify(categoryName)
  const structuredData: Record<string, unknown>[] = [
    breadcrumbLd([
      { name: "Home", path: "/" },
      { name: categoryName, path: `/category/${categorySlug}` },
      { name: tool.name, path: `/tool/${tool.id}` },
    ]),
    softwareApplicationLd(tool),
  ]
  if (tool.faq && tool.faq.length > 0) {
    structuredData.push(faqLd(tool.faq))
  }

  // Joins a list as natural prose: "a, b, and c" (or "a and b" / just "a").
  const joinWithAnd = (items: string[]): string => {
    if (items.length === 0) return ""
    if (items.length === 1) return items[0]
    if (items.length === 2) return `${items[0]} and ${items[1]}`
    return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`
  }

  // ---- Derived content (computed at render time, never stored in MongoDB) ----
  const audience: string[] = tool.targetAudience || []
  const capabilities: string[] = tool.capabilities || []
  const aiTypes: string[] = tool.aiType || []
  const platforms: string[] = tool.platforms || []
  const deployment: string[] = tool.deployment || []
  const useCases: string[] = tool.useCases || []
  const integrations: string[] = tool.integrations || []
  const modelFamily: string[] = tool.modelFamily || []
  const skillLevel: string = tool.skillLevel || tool.difficulty || ""

  const priceWord = tool.pricing === "Free" ? "free" : (tool.pricing || "paid").toLowerCase()
  const typeWord = (tool.toolType || tool.category || "AI tool").toLowerCase()
  const whyChoose =
    `${tool.name} is a ${priceWord} ${typeWord}` +
    (audience.length
      ? ` built for ${audience.join(", ").toLowerCase()}`
      : tool.best_for ? ` best suited for ${tool.best_for.toLowerCase()}` : "") +
    "." +
    (capabilities.length ? ` It supports ${capabilities.slice(0, 4).join(", ").toLowerCase()}.` : "") +
    (tool.api ? " A developer API is available for integrations." : "") +
    (tool.hosting
      ? ` It is ${tool.hosting.toLowerCase()}${tool.opensource ? " and open source" : ""}.`
      : tool.opensource ? " It is open source." : "")

  return (
    <>
      <script {...jsonLdScript(structuredData)} />
      <div className="min-h-screen bg-muted/10 pb-20">
      {/* Header Banner */}
      <div className="bg-background border-b border-border/40 pt-8 pb-12 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 opacity-50" />
        <div className="container max-w-5xl mx-auto relative z-10">
          {/* Breadcrumbs (internal linking + BreadcrumbList schema) */}
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
              <li><Link href="/" className="hover:text-primary transition-colors">Home</Link></li>
              <li aria-hidden="true"><ChevronRight className="w-3.5 h-3.5" /></li>
              <li><Link href={`/category/${categorySlug}`} className="hover:text-primary transition-colors">{categoryName}</Link></li>
              <li aria-hidden="true"><ChevronRight className="w-3.5 h-3.5" /></li>
              <li className="text-foreground font-medium" aria-current="page">{tool.name}</li>
            </ol>
          </nav>
          <Link href="/search" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Search
          </Link>
          
          <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start md:items-center">
            <ToolLogo
              name={tool.name}
              website={tool.website}
              className="w-24 h-24 md:w-32 md:h-32 rounded-2xl border-4 border-background shadow-xl"
              fallbackTextClassName="text-4xl"
            />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">{tool.name}</h1>
                <Badge variant="secondary" className="text-sm px-3 py-1 bg-primary/10 text-primary border-primary/20">
                  <Star className="w-4 h-4 fill-primary mr-1" />
                  {tool.rating}
                </Badge>
                {tool.verified && (
                  <Badge variant="secondary" className="text-sm px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                    <BadgeCheck className="w-4 h-4 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>
              <p className="text-lg text-muted-foreground max-w-2xl">{tool.description}</p>

              <div className="flex flex-wrap gap-2 mt-4">
                <Link href={`/category/${categorySlug}`}>
                  <Badge variant="outline" className="hover:bg-secondary/60 cursor-pointer">{categoryName}</Badge>
                </Link>
                <Badge variant={tool.pricing === 'Free' ? 'default' : 'outline'}>{tool.pricing}</Badge>
                {tool.free_plan && <Badge variant="secondary">Free Tier Available</Badge>}
                {skillLevel && <Badge variant="outline">{skillLevel}</Badge>}
                {tool.toolType && <Badge variant="outline">{tool.toolType}</Badge>}
              </div>
            </div>
            <div className="flex md:flex-col gap-3 w-full md:w-auto shrink-0 mt-4 md:mt-0">
              <a href={tool.website} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "default", size: "lg", className: "w-full" })}>
                Visit Website <ExternalLink className="w-4 h-4 ml-2" />
              </a>

              <div className="flex gap-2 w-full">
                <Button variant="outline" size="icon" className="flex-1 md:flex-none">
                  <Heart className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" className="flex-1 md:flex-none">
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container max-w-5xl mx-auto px-4 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="border-border/60 shadow-sm rounded-3xl overflow-hidden">
              <CardContent className="p-6 md:p-8">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-500" />
                  Overview
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
                  <div className="md:col-span-7 flex flex-col justify-between gap-6">
                    <div className="space-y-4">
                      <p className="text-muted-foreground text-base leading-relaxed">
                        {tool.description}
                      </p>
                      <p className="text-muted-foreground text-base leading-relaxed">
                        {whyChoose} It holds a rating of {tool.rating}/10 on {SITE_NAME}.
                      </p>
                    </div>
                    
                    <div className="relative overflow-hidden bg-linear-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 dark:border-indigo-500/30 rounded-2xl p-5 shadow-inner">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/20 to-purple-500/0 rounded-full blur-xl pointer-events-none" />
                      <div className="flex items-start gap-3 relative z-10">
                        <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-500 dark:text-indigo-400 shrink-0">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs uppercase tracking-wider text-indigo-500 dark:text-indigo-400 font-bold mb-1">Best For</h4>
                          <p className="text-sm font-semibold text-foreground leading-snug">{tool.best_for}</p>
                          {audience.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {audience.map((a) => (
                                <span key={a} className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20">
                                  {a}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-5 flex flex-col justify-center">
                    <dl className="text-sm divide-y divide-border/40 border-t border-b border-border/40">
                      <div className="flex items-center justify-between py-2.5">
                        <dt className="text-muted-foreground">Pricing</dt>
                        <dd className="font-semibold">{tool.pricing}</dd>
                      </div>
                      <div className="flex items-center justify-between py-2.5">
                        <dt className="text-muted-foreground">Free plan</dt>
                        <dd className={`font-semibold ${tool.free_plan ? "text-emerald-600 dark:text-emerald-400" : ""}`}>{tool.free_plan ? "Available" : "Not available"}</dd>
                      </div>
                      <div className="flex items-center justify-between py-2.5">
                        <dt className="text-muted-foreground">Developer API</dt>
                        <dd className={`font-semibold ${tool.api ? "text-emerald-600 dark:text-emerald-400" : ""}`}>{tool.api ? "Available" : "Not available"}</dd>
                      </div>
                      <div className="flex items-center justify-between py-2.5">
                        <dt className="text-muted-foreground">Mobile app</dt>
                        <dd className={`font-semibold ${tool.mobile ? "text-emerald-600 dark:text-emerald-400" : ""}`}>{tool.mobile ? "Available" : "Not available"}</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                {tool.features && tool.features.length > 0 && (
                  <div className="mt-8 pt-8 border-t border-border/40">
                    <h3 className="text-lg font-bold mb-3">Key Features</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {tool.name}&apos;s core feature set includes {joinWithAnd(tool.features.map((f: string) => f.toLowerCase()))}.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* More About — consolidated prose section (use cases, capabilities, platforms, API) */}
            {(useCases.length > 0 || capabilities.length > 0 || aiTypes.length > 0 || modelFamily.length > 0 || platforms.length > 0 || deployment.length > 0 || tool.hosting || integrations.length > 0) && (
              <Card className="rounded-3xl">
                <CardContent className="p-6 md:p-8 space-y-5">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-amber-500" />
                    More About {tool.name}
                  </h2>

                  {useCases.length > 0 && (
                    <p className="text-muted-foreground leading-relaxed">
                      {tool.name} is most commonly used for {joinWithAnd(useCases.map((u) => u.toLowerCase()))}.
                    </p>
                  )}

                  {(capabilities.length > 0 || aiTypes.length > 0 || modelFamily.length > 0) && (
                    <p className="text-muted-foreground leading-relaxed">
                      {capabilities.length > 0 && `On the capability side, it supports ${joinWithAnd(capabilities.map((c) => c.toLowerCase()))}.`}
                      {aiTypes.length > 0 && ` It's built on ${joinWithAnd(aiTypes.map((a) => a.toLowerCase()))} AI technology`}
                      {modelFamily.length > 0 && `, using models from the ${joinWithAnd(modelFamily)} family`}
                      {(aiTypes.length > 0 || modelFamily.length > 0) && "."}
                    </p>
                  )}

                  {(platforms.length > 0 || deployment.length > 0 || tool.hosting) && (
                    <p className="text-muted-foreground leading-relaxed">
                      {platforms.length > 0 && `${tool.name} is available on ${joinWithAnd(platforms)}`}
                      {deployment.length > 0 && `, and can be deployed via ${joinWithAnd(deployment.map((d) => d.toLowerCase()))}`}
                      {tool.hosting && `. Hosting is ${tool.hosting.toLowerCase()}${tool.opensource ? " and the project is open source" : ""}`}
                      {(platforms.length > 0 || tool.hosting) && "."}
                    </p>
                  )}

                  {(tool.api || integrations.length > 0) && (
                    <p className="text-muted-foreground leading-relaxed">
                      {tool.api
                        ? `A developer API is available, so ${tool.name} can be integrated directly into your own applications and workflows.`
                        : `${tool.name} does not currently offer a public developer API.`}
                      {integrations.length > 0 && ` It integrates with ${joinWithAnd(integrations)}.`}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Pros Card */}
              <Card className="relative overflow-hidden border border-emerald-500/20 bg-gradient-to-b from-emerald-500/5 via-emerald-500/0 to-transparent shadow-xs hover:shadow-emerald-500/5 hover:border-emerald-500/40 transition-all duration-300 rounded-3xl group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-all duration-300 pointer-events-none" />
                <CardContent className="p-6 md:p-8">
                  <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mb-6 flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Check className="w-4 h-4" />
                    </div>
                    Pros
                  </h3>
                  <ul className="space-y-4">
                    {tool.pros.map((pro: any, i: number) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">
                        <div className="p-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0">
                          <Check className="w-3 h-3" />
                        </div>
                        <span className="leading-normal">{pro}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              
              {/* Cons Card */}
              <Card className="relative overflow-hidden border border-rose-500/20 bg-gradient-to-b from-rose-500/5 via-rose-500/0 to-transparent shadow-xs hover:shadow-rose-500/5 hover:border-rose-500/40 transition-all duration-300 rounded-3xl group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl group-hover:bg-rose-500/10 transition-all duration-300 pointer-events-none" />
                <CardContent className="p-6 md:p-8">
                  <h3 className="text-lg font-bold text-rose-600 dark:text-rose-400 mb-6 flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                      <X className="w-4 h-4" />
                    </div>
                    Cons
                  </h3>
                  <ul className="space-y-4">
                    {tool.cons.map((con: any, i: number) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">
                        <div className="p-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0">
                          <X className="w-3 h-3" />
                        </div>
                        <span className="leading-normal">{con}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {tool.faq && tool.faq.length > 0 && (
              <Card>
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
                  <div className="space-y-6">
                    {tool.faq.map((item: any, i: number) => (
                      <div key={i}>
                        <h4 className="font-semibold text-lg mb-2">{item.question}</h4>
                        <p className="text-muted-foreground">{item.answer}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-muted-foreground" />
                  Quick Facts
                </h2>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                    <dt className="text-muted-foreground">Category</dt>
                    <dd>
                      <Link href={`/category/${categorySlug}`} className="font-medium text-primary hover:underline">{categoryName}</Link>
                    </dd>
                  </div>
                  {tool.toolType && (
                    <div className="flex justify-between items-center py-1.5 border-b border-border/40 gap-3">
                      <dt className="text-muted-foreground">Tool type</dt>
                      <dd className="font-medium text-right">{tool.toolType}</dd>
                    </div>
                  )}
                  {skillLevel && (
                    <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                      <dt className="text-muted-foreground">Skill level</dt>
                      <dd className="font-medium">{skillLevel}</dd>
                    </div>
                  )}
                  {tool.license && (
                    <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                      <dt className="text-muted-foreground">License</dt>
                      <dd className="font-medium">{tool.license}</dd>
                    </div>
                  )}
                  {tool.hosting && (
                    <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                      <dt className="text-muted-foreground">Hosting</dt>
                      <dd className="font-medium">{tool.hosting}</dd>
                    </div>
                  )}
                  {modelFamily.length > 0 && (
                    <div className="flex justify-between items-center py-1.5 border-b border-border/40 gap-3">
                      <dt className="text-muted-foreground">Model family</dt>
                      <dd className="font-medium text-right">{modelFamily.join(", ")}</dd>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                    <dt className="text-muted-foreground">Open source</dt>
                    <dd className="font-medium">{tool.opensource ? "Yes" : "No"}</dd>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <dt className="text-muted-foreground">Verified</dt>
                    <dd className="font-medium">
                      {tool.verified
                        ? <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><BadgeCheck className="w-4 h-4" /> Yes</span>
                        : "No"}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-4">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {tool.tags.map((tag: any) => (
                    <Link key={tag} href={`/search?q=${tag}`}>
                      <Badge variant="secondary" className="hover:bg-secondary/80 cursor-pointer">
                        {tag}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>

            {alternatives && alternatives.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-4">Alternatives</h3>
                  <div className="flex flex-wrap gap-2">
                    {alternatives.map(altTool => {
                      return (
                        <Link key={altTool.id} href={`/tool/${altTool.id}`} className="block w-full">
                          <div className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-lg transition-colors border border-transparent hover:border-border/50">
                            <ToolLogo
                              name={altTool.name}
                              website={altTool.website}
                              className="w-8 h-8 rounded-md"
                              fallbackTextClassName="text-xs"
                            />
                            <div className="flex-1">
                              <p className="font-medium text-sm">{altTool.name}</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

        </div>

        {/* Similar tools — internal linking + ensures no tool is orphaned */}
        {similar && similar.length > 0 && (
          <section className="mt-12" aria-labelledby="similar-heading">
            <h2 id="similar-heading" className="text-2xl font-bold mb-6">Similar AI Tools</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {similar.map((s: any) => (
                <Link key={s.id} href={`/tool/${s.id}`} className="block">
                  <Card className="h-full hover:border-primary/50 transition-colors group">
                    <CardContent className="p-4 flex items-center gap-3">
                      <ToolLogo name={s.name} website={s.website} className="w-10 h-10 rounded-lg" fallbackTextClassName="text-sm" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{s.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{s.best_for || s.category}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Browse more in{" "}
              <Link href={`/category/${categorySlug}`} className="text-primary hover:underline font-medium">
                {categoryName}
              </Link>
              .
            </p>
          </section>
        )}
      </div>
    </div>
    </>
  )
}
