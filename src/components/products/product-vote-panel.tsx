"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-context"
import { UpvoteButton } from "@/components/products/upvote-button"

/**
 * The detail page is a server component, so the vote button needs a small
 * client wrapper to hold its own state and look up whether this account has
 * already voted.
 */
export function ProductVotePanel({
  slug,
  initialCount,
}: {
  slug: string
  initialCount: number
}) {
  const { user } = useAuth()
  const [count, setCount] = useState(initialCount)
  const [voted, setVoted] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!user) {
      setVoted(false)
      return
    }
    ;(async () => {
      try {
        const token = await user.getIdToken()
        const res = await fetch("/api/products/votes", {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (!cancelled && data?.ok) setVoted((data.slugs as string[]).includes(slug))
      } catch {
        // Leaves the button un-voted; clicking it still does the right thing
        // because the server enforces one vote per account regardless.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user, slug])

  return (
    <UpvoteButton
      slug={slug}
      count={count}
      voted={voted}
      size="lg"
      onChange={(_slug, nextVoted, nextCount) => {
        setVoted(nextVoted)
        setCount(nextCount)
      }}
    />
  )
}
