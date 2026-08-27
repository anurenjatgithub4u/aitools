export function CircularProgress({
  pct,
  size = 34,
  strokeWidth = 3.5,
  showLabel = true,
}: {
  pct: number
  size?: number
  strokeWidth?: number
  showLabel?: boolean
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - pct / 100)
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-primary transition-all"
        />
      </svg>
      {showLabel && (
        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold text-foreground">
          {pct}%
        </span>
      )}
    </div>
  )
}
