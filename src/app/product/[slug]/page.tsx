import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ExternalLink } from "lucide-react"
import connectDB from "@/lib/db"
import { Product } from "@/models/Product"
import { ToolLogo } from "@/components/tool-logo"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { ProductVotePanel } from "@/components/products/product-vote-panel"
import { PRODUCTS_ENABLED } from "@/lib/products/config"

export const revalidate = 60

async function getProduct(slug: string) {
  try {
    await connectDB()
    return await Product.findOne({ slug, status: "live" }).lean()
  } catch (e) {
    console.error("[product] lookup failed:", e)
    return null
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const product = await getProduct(slug)
  if (!product) return { title: "Product not found", robots: { index: false, follow: false } }

  return {
    title: `${product.name} — ${product.tagline}`,
    description: product.tagline,
    alternates: { canonical: `/product/${product.slug}` },
    // Noindex on purpose. A user-submitted page holding a tagline and an
    // outbound link is thin by definition, and 205 thin pages are precisely
    // what put this domain at position 55 with 42% of URLs unindexed. The
    // leaderboard is the page that ranks; revisit this once products here
    // carry real depth.
    robots: { index: false, follow: true },
  }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  if (!PRODUCTS_ENABLED) notFound()

  const { slug } = await params
  const product = await getProduct(slug)
  if (!product) notFound()

  return (
    <div className="min-h-screen bg-background py-12 md:py-16">
      <div className="container mx-auto max-w-2xl px-4">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to the leaderboard
        </Link>

        <div className="flex items-start gap-5">
          <ToolLogo
            name={product.name}
            website={product.website}
            className="h-16 w-16 shrink-0 rounded-2xl"
          />

          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {product.name}
            </h1>
            <p className="mt-1.5 text-muted-foreground">{product.tagline}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{product.category}</Badge>
              {product.submitterName && (
                <span className="text-xs text-muted-foreground">
                  submitted by {product.submitterName}
                </span>
              )}
            </div>
          </div>

          <ProductVotePanel slug={product.slug} initialCount={product.upvoteCount ?? 0} />
        </div>

        <a
          href={product.website}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className={buttonVariants({ className: "mt-8 w-full gap-2 rounded-xl" })}
        >
          Visit {product.name}
          <ExternalLink className="h-4 w-4" />
        </a>

        <div className="mt-10 border-t border-border/50 pt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            About
          </h2>
          <p className="whitespace-pre-line leading-relaxed text-foreground/90">
            {product.description}
          </p>
        </div>
      </div>
    </div>
  )
}
