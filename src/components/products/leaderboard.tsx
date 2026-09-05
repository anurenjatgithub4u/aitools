"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Trophy, Plus } from "lucide-react"
import { useAuth } from "@/components/auth-context"
import { ToolLogo } from "@/components/tool-logo"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { UpvoteButton } from "@/components/products/upvote-button"
import { PRODUCT_CATEGORIES } from "@/lib/products/config"
import { cn } from "@/lib/utils"

export interface LeaderboardProduct {
  slug: string
  name: string
  tagline: string
  website: string
  category: string
  upvoteCount: number
  submitterName?: string
}

/**
 * The list arrives already rendered from the server so the page has real
 * content in its HTML — this is the one page on the site that should rank.
 * Everything below is just interactivity layered on top of it.
 */
export function Leaderboard({ initialProducts }: { initialProducts: LeaderboardProduct[] }) {
  const { user } = useAuth()
  const [products, setProducts] = useState(initialProducts)
  const [votedSlugs, setVotedSlugs] = useState<Set<string>>(new Set())
  const [category, setCategory] = useState<string>("All")

  // Which ones this account already upvoted. Fetched separately from the list
  // itself, which is public and edge-cached.
  useEffect(() => {
    let cancelled = false
    if (!user) {
      setVotedSlugs(new Set())
      return
    }
    ;(async () => {
      try {
        const token = await user.getIdToken()
        const res = await fetch("/api/products/votes", {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (!cancelled && data?.ok) setVotedSlugs(new Set<string>(data.slugs))
      } catch {
        // Non-fatal: buttons just render un-voted until the next load.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  function handleVoteChange(slug: string, voted: boolean, count: number) {
    setVotedSlugs((prev) => {
      const next = new Set(prev)
      if (voted) next.add(slug)
      else next.delete(slug)
      return next
    })
    setProducts((prev) => prev.map((p) => (p.slug === slug ? { ...p, upvoteCount: count } : p)))
  }

  // Filtering only — the rank order stays as the server sorted it, so a row
  // doesn't leap around under the cursor the moment you upvote it.
  const visible = useMemo(
    () => (category === "All" ? products : products.filter((p) => p.category === category)),
    [products, category]
  )

  const categoriesInUse = useMemo(() => {
    const used = new Set(products.map((p) => p.category))
    return PRODUCT_CATEGORIES.filter((c) => used.has(c))
  }, [products])

  return (
    <div className="w-full">
      {/* Filter chips — only categories that actually have products in them. */}
      {categoriesInUse.length > 0 && (
        <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
          {["All", ...categoriesInUse].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer",
                category === c
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-card/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
              )}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState hasProducts={products.length > 0} />
      ) : (
        <ol className="space-y-3">
          {visible.map((product, index) => (
            <li
              key={product.slug}
              className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur transition-colors hover:border-primary/30 sm:gap-5 sm:p-5"
            >
              <span className="w-6 shrink-0 text-center text-lg font-bold tabular-nums text-muted-foreground sm:w-8 sm:text-xl">
                {index + 1}
              </span>

              <ToolLogo
                name={product.name}
                website={product.website}
                className="h-11 w-11 shrink-0 rounded-xl sm:h-12 sm:w-12"
              />

              <div className="min-w-0 flex-1">
                <Link
                  href={`/product/${product.slug}`}
                  className="font-semibold text-foreground hover:text-primary transition-colors"
                >
                  {product.name}
                </Link>
                <p className="truncate text-sm text-muted-foreground">{product.tagline}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <Badge variant="secondary" className="text-[11px]">
                    {product.category}
                  </Badge>
                </div>
              </div>

              <UpvoteButton
                slug={product.slug}
                count={product.upvoteCount}
                voted={votedSlugs.has(product.slug)}
                onChange={handleVoteChange}
              />
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function EmptyState({ hasProducts }: { hasProducts: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/70 px-6 py-16 text-center">
      <Trophy className="mx-auto mb-4 h-8 w-8 text-muted-foreground/50" />
      <h2 className="text-lg font-semibold text-foreground">
        {hasProducts ? "Nothing in this category yet" : "No products yet"}
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        {hasProducts
          ? "Try another category, or add the first product here."
          : "The leaderboard is empty. Submit the first product and claim the top spot."}
      </p>
      <Link href="/submit" className="mt-6 inline-block">
        <Button className="gap-2 rounded-xl cursor-pointer">
          <Plus className="h-4 w-4" />
          Submit a product
        </Button>
      </Link>
    </div>
  )
}
