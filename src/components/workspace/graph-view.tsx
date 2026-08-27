"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import type { GraphData, GraphNode } from "@/types/workspace"

const KIND_COLORS: Record<string, string> = {
  project: "#8b5cf6",
  knowledge: "#22c55e",
  prompt: "#eab308",
  workflow: "#3b82f6",
  decision: "#f97316",
  reference: "#06b6d4",
  research: "#ec4899",
  code: "#64748b",
  template: "#a855f7",
  idea: "#f59e0b",
  bookmark: "#14b8a6",
}

interface PositionedNode extends GraphNode {
  x: number
  y: number
}

// Small deterministic force-directed layout (no external deps)
function layout(data: GraphData, width: number, height: number): PositionedNode[] {
  const nodes: PositionedNode[] = data.nodes.map((n, i) => {
    const angle = (i / Math.max(data.nodes.length, 1)) * Math.PI * 2
    const r = Math.min(width, height) * 0.35
    return { ...n, x: width / 2 + r * Math.cos(angle), y: height / 2 + r * Math.sin(angle) }
  })
  const index = new Map(nodes.map((n, i) => [n.id, i]))
  const vx = new Float64Array(nodes.length)
  const vy = new Float64Array(nodes.length)

  for (let iter = 0; iter < 250; iter++) {
    // Repulsion
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        let dx = nodes[i].x - nodes[j].x
        let dy = nodes[i].y - nodes[j].y
        let d2 = dx * dx + dy * dy
        if (d2 < 1) d2 = 1
        const f = 2500 / d2
        const d = Math.sqrt(d2)
        dx /= d
        dy /= d
        vx[i] += dx * f
        vy[i] += dy * f
        vx[j] -= dx * f
        vy[j] -= dy * f
      }
    }
    // Springs along edges
    for (const e of data.edges) {
      const a = index.get(e.source)
      const b = index.get(e.target)
      if (a === undefined || b === undefined) continue
      const dx = nodes[b].x - nodes[a].x
      const dy = nodes[b].y - nodes[a].y
      const d = Math.sqrt(dx * dx + dy * dy) || 1
      const f = (d - 90) * 0.02
      vx[a] += (dx / d) * f
      vy[a] += (dy / d) * f
      vx[b] -= (dx / d) * f
      vy[b] -= (dy / d) * f
    }
    // Gravity toward center + integrate
    for (let i = 0; i < nodes.length; i++) {
      vx[i] += (width / 2 - nodes[i].x) * 0.005
      vy[i] += (height / 2 - nodes[i].y) * 0.005
      nodes[i].x += Math.max(-8, Math.min(8, vx[i]))
      nodes[i].y += Math.max(-8, Math.min(8, vy[i]))
      vx[i] *= 0.6
      vy[i] *= 0.6
    }
  }
  return nodes
}

export function GraphView({
  data,
  height = 560,
  interactive = true,
}: {
  data: GraphData
  height?: number
  interactive?: boolean
}) {
  const router = useRouter()
  const svgRef = useRef<SVGSVGElement>(null)
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 })
  const [filter, setFilter] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const dragging = useRef<{ x: number; y: number } | null>(null)

  const width = 900
  const nodes = useMemo(() => layout(data, width, height), [data, height])
  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])

  const kinds = useMemo(() => {
    const s = new Set(data.nodes.map((n) => n.kind))
    return Array.from(s)
  }, [data])

  const visible = (n: PositionedNode) => {
    if (filter && n.kind !== filter) return false
    return true
  }
  const highlighted = (n: PositionedNode) =>
    query.trim() ? n.label.toLowerCase().includes(query.trim().toLowerCase()) : true

  useEffect(() => {
    const svg = svgRef.current
    if (!svg || !interactive) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      setTransform((t) => {
        const k = Math.max(0.3, Math.min(3, t.k * (e.deltaY < 0 ? 1.1 : 0.9)))
        return { ...t, k }
      })
    }
    svg.addEventListener("wheel", onWheel, { passive: false })
    return () => svg.removeEventListener("wheel", onWheel)
  }, [interactive])

  const openNode = (n: PositionedNode) => {
    if (!interactive) return
    router.push(n.kind === "project" ? `/workspace/projects/${n.id}` : `/workspace/items/${n.id}`)
  }

  if (data.nodes.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-border bg-card text-sm text-muted-foreground"
        style={{ height }}
      >
        Your graph is empty. Create projects and items — they connect here automatically.
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card">
      {interactive && (
        <div className="absolute left-3 top-3 z-10 flex flex-wrap items-center gap-1.5">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search nodes..."
            className="h-7 w-36 rounded-md border border-border bg-background/80 px-2 text-xs outline-none backdrop-blur"
          />
          {kinds.map((k) => (
            <button
              key={k}
              onClick={() => setFilter(filter === k ? null : k)}
              className={`rounded-full border px-2 py-0.5 text-[10px] capitalize transition-colors cursor-pointer backdrop-blur ${
                filter === k
                  ? "border-transparent text-white"
                  : "border-border bg-background/80 text-muted-foreground"
              }`}
              style={filter === k ? { backgroundColor: KIND_COLORS[k] || "#8b5cf6" } : undefined}
            >
              {k}
            </button>
          ))}
        </div>
      )}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full cursor-grab active:cursor-grabbing select-none"
        style={{ height }}
        onMouseDown={(e) => {
          if (!interactive) return
          dragging.current = { x: e.clientX, y: e.clientY }
        }}
        onMouseMove={(e) => {
          if (!dragging.current) return
          const dx = e.clientX - dragging.current.x
          const dy = e.clientY - dragging.current.y
          dragging.current = { x: e.clientX, y: e.clientY }
          setTransform((t) => ({ ...t, x: t.x + dx, y: t.y + dy }))
        }}
        onMouseUp={() => (dragging.current = null)}
        onMouseLeave={() => (dragging.current = null)}
      >
        <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
          {data.edges.map((e, i) => {
            const a = nodeById.get(e.source)
            const b = nodeById.get(e.target)
            if (!a || !b || !visible(a) || !visible(b)) return null
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="currentColor"
                className="text-border"
                strokeWidth={e.relation === "belongs_to" ? 1.5 : 1}
                strokeDasharray={e.relation === "belongs_to" ? undefined : "4 3"}
              />
            )
          })}
          {nodes.filter(visible).map((n) => {
            const dim = !highlighted(n)
            const r = n.kind === "project" ? 14 : 9
            return (
              <g
                key={n.id}
                transform={`translate(${n.x} ${n.y})`}
                opacity={dim ? 0.25 : 1}
                onClick={() => openNode(n)}
                className={interactive ? "cursor-pointer" : undefined}
              >
                <circle r={r} fill={KIND_COLORS[n.kind] || "#8b5cf6"} fillOpacity={0.9} />
                <text
                  y={r + 12}
                  textAnchor="middle"
                  className="fill-current text-foreground"
                  fontSize={10}
                >
                  {n.label.length > 22 ? n.label.slice(0, 20) + "…" : n.label}
                </text>
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}
