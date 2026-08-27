"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LibraryView } from "@/components/workspace/library-view"

export default function MyWorkflowsPage() {
  return (
    <LibraryView
      type="workflow"
      title="My Workflows"
      description="Your saved and remixed prompt sequences — every Prompt Pack you remix lands here, fully editable."
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
