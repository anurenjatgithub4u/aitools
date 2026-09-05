import type { Metadata } from "next"
import Link from "next/link"
import { Plus } from "lucide-react"
import connectDB from "@/lib/db"
import { Product } from "@/models/Product"
import { Button } from "@/components/ui/button"
import { Leaderboard, type LeaderboardProduct } from "@/components/products/leaderboard"
import { SITE_NAME } from "@/lib/seo"

export const metadata: Metadata = {
  // Absolute bypasses the "%s | FindurAI" template so the brand isn't doubled.
  title: { absolute: `${SITE_NAME} | Discover and Upvote New Products` },
  description:
    "A free product leaderboard. Submit your product in seconds, no payment and no waiting for approval, and let the community upvote it. Browse what makers are launching right now.",
  alternates: { canonical: "/" },
}

// ISR: the page is served as static HTML (good for crawling) but re-renders at
// most once a minute so a new submission or a burst of votes shows up quickly.
export const revalidate = 60

async function getProducts(): Promise<LeaderboardProduct[]> {
  try {
    await connectDB()
    const products = await Product.find({ status: "live" })
      .select("slug name tagline website category upvoteCount submitterName")
      .sort({ upvoteCount: -1, createdAt: -1 })
      .limit(200)
      .lean()

    // lean() still hands back ObjectIds and Dates; map to a plain, serializable
    // shape before it crosses into the client component.
    return products.map((p) => ({
      slug: p.slug,
      name: p.name,
      tagline: p.tagline,
      website: p.website,
      category: p.category,
      upvoteCount: p.upvoteCount ?? 0,
      submitterName: p.submitterName || "",
    }))
  } catch (e) {
    // A database blip shouldn't blank the homepage — render the shell and the
    // submit CTA instead of a 500.
    console.error("[home] failed to load products:", e)
    return []
  }
}

export default async function Page() {
  const products = await getProducts()

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 -z-10 bg-purple-500/5 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)] dark:bg-black dark:bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(147,51,234,0.12),transparent_70%)]" />

      <section className="container mx-auto max-w-4xl px-4 py-14 md:py-20">
        <div className="mb-10 text-center md:mb-14">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">
            Free · No bidding · No approval queue
          </span>
          <h1 className="text-4xl font-black tracking-tight text-foreground md:text-6xl">
            Launch it. Let people vote.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
            Add your product for free and it goes live immediately — no fee, no queue. The
            community upvotes what&apos;s worth using, and the best rise to the top.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/submit">
              <Button
                size="lg"
                className="h-12 gap-2 rounded-2xl px-7 text-base font-semibold shadow-lg shadow-primary/20 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Submit your product
              </Button>
            </Link>
            {products.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {products.length} {products.length === 1 ? "product" : "products"} listed
              </span>
            )}
          </div>
        </div>

        <Leaderboard initialProducts={products} />
      </section>
    </div>
  )
}
