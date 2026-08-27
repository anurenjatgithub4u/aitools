"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-context"
import { GraphView } from "@/components/workspace/graph-view"
import { workspaceApi } from "@/lib/workspace"
import type { GraphData } from "@/types/workspace"

export default function GraphPage() {
  const { user } = useAuth()
  const [graph, setGraph] = useState<GraphData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    workspaceApi
      .getGraph(user.uid)
      .then(setGraph)
      .catch(() => setGraph({ nodes: [], edges: [] }))
      .finally(() => setLoading(false))
  }, [user])

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">🕸️ Connections</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything in your workspace, connected. Scroll to zoom, drag to pan, click a node to
          open it.
        </p>
      </div>
      {loading ? (
        <div className="h-[560px] animate-pulse rounded-xl bg-muted" />
      ) : (
        graph && <GraphView data={graph} height={560} />
      )}
    </div>
  )
}
