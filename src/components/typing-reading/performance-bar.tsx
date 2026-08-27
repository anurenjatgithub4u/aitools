// Results-screen summary bar (spec §10). A plain horizontal fill rather than
// literal block characters — same idea as the mockup, dressed to match the
// rest of FindUrAI instead of looking like ASCII art.

interface PerformanceBarProps {
  label: string
  value: string
  percent: number // 0–100, already computed by the caller
}

export function PerformanceBar({ label, value, percent }: PerformanceBarProps) {
  const clamped = Math.max(0, Math.min(100, percent))
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-sm text-muted-foreground tabular-nums">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden" role="progressbar" aria-label={label} aria-valuenow={Math.round(clamped)} aria-valuemin={0} aria-valuemax={100}>
        <div
          className="h-full rounded-full bg-foreground motion-safe:transition-[width] motion-safe:duration-500"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}
