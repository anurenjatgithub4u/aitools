"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LibraryView } from "@/components/workspace/library-view"

export default function MyPromptsPage() {
  return (
    <LibraryView
      type="prompt"
      title="My Prompts"
      description="Your saved and remixed prompts — copy them or send them straight to ChatGPT or Claude."
      headerExtra={
        <Link href="/packs">
          <Button variant="outline" className="rounded-full">
            Browse Prompt Packs
          </Button>
        </Link>
      }
      emptyExtra={
        <Link href="/packs">
          <Button size="sm" variant="outline">
            Remix a Prompt Pack instead
          </Button>
        </Link>
      }
    />
  )
}
