// Minimal, dependency-free SVG bar chart for the progress dashboard
// (spec §22: "keep charts clean and minimal"). Renders oldest → newest,
// left to right, so the most recent session is on the right.

interface MiniBarChartProps {
  values: number[]
  suffix?: string
  emptyLabel: string
}

export function MiniBarChart({ values, suffix = "", emptyLabel }: MiniBarChartProps) {
  if (values.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border/60 text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    )
  }

  const chronological = [...values].reverse() // stored newest-first, chart reads left→right
  const max = Math.max(...chronological, 1)
  const width = 320
  const height = 96
  const barGap = 4
  const barWidth = Math.max(4, width / chronological.length - barGap)

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full h-24"
        role="img"
        aria-label={`Chart showing ${chronological.length} recent sessions, most recent value ${chronological[chronological.length - 1]}${suffix}`}
      >
        {chronological.map((v, i) => {
          const barHeight = Math.max(2, (v / max) * (height - 8))
          const x = i * (barWidth + barGap)
          const y = height - barHeight
          const isLast = i === chronological.length - 1
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={2}
              className={isLast ? "fill-foreground" : "fill-muted-foreground/25"}
            />
          )
        })}
      </svg>
    </div>
  )
}
