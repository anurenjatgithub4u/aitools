"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronUp, Loader2 } from "lucide-react"
import { useAuth } from "@/components/auth-context"
import { cn } from "@/lib/utils"

interface UpvoteButtonProps {
  slug: string
  count: number
  voted: boolean
  /** Called with the server's authoritative count so a parent list can re-sort. */
  onChange?: (slug: string, voted: boolean, count: number) => void
  size?: "default" | "lg"
}

export function UpvoteButton({ slug, count, voted, onChange, size = "default" }: UpvoteButtonProps) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function handleClick() {
    // Signed out: send them to sign in rather than failing with a 401 they'd
    // have to interpret.
    if (!user) {
      router.push("/login")
      return
    }
    if (pending) return

    const nextVoted = !voted
    setPending(true)

    // Optimistic — the button is the whole interaction, so it shouldn't wait a
    // round trip to acknowledge the click.
    onChange?.(slug, nextVoted, count + (nextVoted ? 1 : -1))

    try {
      const token = await user.getIdToken()
      const res = await fetch(`/api/products/${slug}/vote`, {
        method: nextVoted ? "POST" : "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => null)

      if (!res.ok) {
        // Roll back to what we had before the optimistic bump.
        onChange?.(slug, voted, count)
        return
      }
      // Settle on the server's number — it's authoritative if another tab or
      // device voted in the meantime.
      onChange?.(slug, data?.voted ?? nextVoted, data?.upvoteCount ?? count)
    } catch {
      onChange?.(slug, voted, count)
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={authLoading}
      aria-pressed={voted}
      aria-label={voted ? `Remove your upvote from ${slug}` : `Upvote ${slug}`}
      className={cn(
        "group flex shrink-0 flex-col items-center justify-center rounded-xl border transition-all cursor-pointer",
        size === "lg" ? "h-16 w-14 gap-0.5" : "h-14 w-12",
        voted
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border bg-card/60 text-muted-foreground hover:border-primary/40 hover:text-primary",
        authLoading && "opacity-50"
      )}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <ChevronUp
          className={cn("h-4 w-4 transition-transform", !voted && "group-hover:-translate-y-0.5")}
        />
      )}
      <span className={cn("font-bold tabular-nums", size === "lg" ? "text-base" : "text-sm")}>
        {count}
      </span>
    </button>
  )
}
