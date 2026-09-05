import type { Metadata } from "next"
import { cache } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import connectDB from "@/lib/db"
import { Tool } from "@/models/Tool"
import { TOOL_DIRECTORY_ENABLED } from "@/lib/tools/config"
import { ToolCard } from "@/components/tool-card"
import {
  SITE_NAME,
  SITE_URL,
  slugify,
  categoryTitle,
  metaDescription,
  breadcrumbLd,
  jsonLdScript,
} from "@/lib/seo"

export const revalidate = 86400

// Resolve a slug back to its canonical category name + the tools in it.
// cache() dedupes the query so generateMetadata + the page share one DB call.
const getCategory = cache(async (slug: string) => {
  await connectDB()
  const tools = await Tool.find(
    {},
    { id: 1, name: 1, description: 1, website: 1, category: 1, primaryCategory: 1, rating: 1, pricing: 1, free_plan: 1, api: 1, mobile: 1, opensource: 1, best_for: 1, difficulty: 1, pros: 1, cons: 1, tags: 1, trendingScore: 1 }
  ).lean<any[]>()

  const matched = tools.filter(
    (t) => slugify(t.primaryCategory || "") === slug || slugify(t.category || "") === slug
  )
  if (matched.length === 0) return null

  // Prefer the standardized primaryCategory label for the page title.
  const name =
    matched.find((t) => slugify(t.primaryCategory || "") === slug)?.primaryCategory ||
    matched.find((t) => slugify(t.category || "") === slug)?.category ||
    slug
  matched.sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0) || (b.rating || 0) - (a.rating || 0))
  return { name, tools: matched }
})

export async function generateStaticParams() {
  if (!TOOL_DIRECTORY_ENABLED) return []
  try {
    await connectDB()
    const tools = await Tool.find({}, { category: 1, primaryCategory: 1 }).lean<any[]>()
    const slugs = new Set<string>()
    for (const t of tools) {
      if (t.primaryCategory) slugs.add(slugify(t.primaryCategory))
      if (t.category) slugs.add(slugify(t.category))
    }
    return [...slugs].filter(Boolean).map((slug) => ({ slug }))
  } catch (error) {
    console.error("Failed to generate category params:", error)
    return []
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  if (!TOOL_DIRECTORY_ENABLED) {
    return { title: "Category not found", robots: { index: false, follow: false } }
  }
  const { slug } = await params
  const data = await getCategory(slug)
  if (!data) return { title: "Category not found", robots: { index: false, follow: true } }
  const title = categoryTitle(data.name)
  const description = metaDescription(
    `Compare the ${data.name.toLowerCase()} tools with reviews, pricing, features and alternatives. Browse ${data.tools.length} hand-picked AI tools on ${SITE_NAME}.`
  )
  const canonical = `/category/${slug}`
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { type: "website", url: canonical, title: `${title} | ${SITE_NAME}`, description },
    twitter: { card: "summary_large_image", title: `${title} | ${SITE_NAME}`, description },
  }
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  if (!TOOL_DIRECTORY_ENABLED) notFound()

  const { slug } = await params
  const data = await getCategory(slug)
  if (!data) notFound()

  const heading = categoryTitle(data.name)
  const structuredData = [
    breadcrumbLd([
      { name: "Home", path: "/" },
      { name: data.name, path: `/category/${slug}` },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: heading,
      url: `${SITE_URL}/category/${slug}`,
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: data.tools.length,
        itemListElement: data.tools.slice(0, 30).map((t, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `${SITE_URL}/tool/${t.id}`,
          name: t.name,
        })),
      },
    },
  ]

  return (
    <>
      <script {...jsonLdScript(structuredData)} />
      <div className="min-h-screen bg-muted/10">
        <div className="bg-background border-b border-border/40 pt-10 pb-8 px-4">
          <div className="container max-w-7xl mx-auto">
            <nav aria-label="Breadcrumb" className="mb-5">
              <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                <li><Link href="/" className="hover:text-primary transition-colors">Home</Link></li>
                <li aria-hidden="true"><ChevronRight className="w-3.5 h-3.5" /></li>
                <li className="text-foreground font-medium" aria-current="page">{data.name}</li>
              </ol>
            </nav>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{heading}</h1>
            <p className="text-muted-foreground mt-3 max-w-2xl">
              Compare {data.tools.length} of the best {data.name.toLowerCase()} tools — with reviews, pricing,
              features, pros and cons, and alternatives to help you choose the right one.
            </p>
          </div>
        </div>

        <div className="container max-w-7xl mx-auto px-4 py-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.tools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
