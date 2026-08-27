"use client"

// Small segmented-control used throughout the tool for mode/difficulty/
// duration selection. Deliberately plain — no gradients, no heavy rounding —
// to match the rest of FindUrAI's buttons rather than looking like a
// standalone widget.

interface PillOption<T extends string | number> {
  value: T
  label: string
}

interface PillGroupProps<T extends string | number> {
  options: PillOption<T>[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
}

export function PillGroup<T extends string | number>({ options, value, onChange, ariaLabel }: PillGroupProps<T>) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
              active
                ? "bg-foreground text-background border-foreground"
                : "bg-transparent text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
