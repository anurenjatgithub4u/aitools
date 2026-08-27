// Live session metrics during an active test. Kept to a handful of tiles so
// the primary number (WPM, or elapsed time in reading mode) stays obvious —
// see spec §24 "do not overload the interface with too many metrics."

interface MetricTileProps {
  label: string
  value: string
  emphasize?: boolean
}

export function MetricTile({ label, value, emphasize }: MetricTileProps) {
  return (
    <div className="flex flex-col items-center sm:items-start">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className={emphasize ? "text-3xl sm:text-4xl font-bold tabular-nums tracking-tight" : "text-2xl font-semibold tabular-nums tracking-tight text-foreground"}>
        {value}
      </span>
    </div>
  )
}
