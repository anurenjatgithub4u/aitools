"use client"

import { SlidersHorizontal, X } from "lucide-react"
import type { JobCardData } from "./job-card"

// Filters and sort (spec §33).
//
// Applied client-side over results already returned, so changing a filter is
// instant and costs nothing. Options are derived from the actual result set
// rather than hard-coded — offering "Remote" when no remote jobs came back
// just wastes a click.

export interface FilterState {
  workplace: string
  employment: string
  minScore: number
  postedWithin: string
  location: string
  sort: "match" | "newest" | "salary"
}

export const DEFAULT_FILTERS: FilterState = {
  workplace: "any",
  employment: "any",
  minScore: 0,
  postedWithin: "any",
  location: "any",
  sort: "match",
}

const POSTED_OPTIONS = [
  { value: "any", label: "Any time" },
  { value: "1", label: "Past 24 hours" },
  { value: "7", label: "Past week" },
  { value: "30", label: "Past month" },
]

const SCORE_OPTIONS = [
  { value: 0, label: "Any match" },
  { value: 60, label: "60%+" },
  { value: 75, label: "75%+" },
  { value: 85, label: "85%+" },
]

const SORT_OPTIONS: { value: FilterState["sort"]; label: string }[] = [
  { value: "match", label: "Best Match" },
  { value: "newest", label: "Newest" },
  { value: "salary", label: "Salary" },
]

/** Days since posting, parsed back from the label the server produced.
 *  The label is the only date signal the client receives. */
function daysFromLabel(label: string): number | null {
  if (/just now|hour|minute/i.test(label)) return 0
  const days = /(\d+)\s*day/i.exec(label)
  if (days) return Number(days[1])
  const months = /(\d+)\s*month/i.exec(label)
  if (months) return Number(months[1]) * 30
  return null
}

export function applyFilters(jobs: JobCardData[], filters: FilterState): JobCardData[] {
  const filtered = jobs.filter((job) => {
    if (filters.workplace !== "any" && job.workplaceType !== filters.workplace) return false
    if (filters.employment !== "any" && job.employmentType !== filters.employment) return false
    if (job.matchScore < filters.minScore) return false
    if (filters.location !== "any" && job.location !== filters.location) return false

    if (filters.postedWithin !== "any") {
      const days = daysFromLabel(job.postedLabel)
      // Jobs with no known date are kept rather than hidden — an unknown date
      // is not evidence the job is old (spec §12).
      if (days !== null && days > Number(filters.postedWithin)) return false
    }
    return true
  })

  const sorted = [...filtered]
  if (filters.sort === "newest") {
    sorted.sort((a, b) => (daysFromLabel(a.postedLabel) ?? 999) - (daysFromLabel(b.postedLabel) ?? 999))
  } else if (filters.sort === "salary") {
    // Jobs without salary sink rather than sorting as zero.
    sorted.sort((a, b) => (b.salary.max ?? b.salary.min ?? -1) - (a.salary.max ?? a.salary.min ?? -1))
  } else {
    sorted.sort((a, b) => b.matchScore - a.matchScore)
  }
  return sorted
}

interface JobFiltersProps {
  jobs: JobCardData[]
  filters: FilterState
  onChange: (filters: FilterState) => void
  resultCount: number
}

export function JobFilters({ jobs, filters, onChange, resultCount }: JobFiltersProps) {
  const set = <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
    onChange({ ...filters, [key]: value })

  const workplaces = [...new Set(jobs.map((j) => j.workplaceType))].filter((w) => w !== "Unknown").sort()
  const employments = [...new Set(jobs.map((j) => j.employmentType))].filter((e) => e !== "Unknown").sort()
  const locations = [...new Set(jobs.map((j) => j.location))].filter(Boolean).sort().slice(0, 12)

  const active =
    filters.workplace !== "any" ||
    filters.employment !== "any" ||
    filters.minScore !== 0 ||
    filters.postedWithin !== "any" ||
    filters.location !== "any"

  const selectClass =
    "rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"

  return (
    <div className="rounded-2xl border border-border bg-card/40 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          Filters
        </span>

        <select
          aria-label="Match score"
          value={filters.minScore}
          onChange={(e) => set("minScore", Number(e.target.value))}
          className={selectClass}
        >
          {SCORE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {workplaces.length > 1 && (
          <select
            aria-label="Workplace type"
            value={filters.workplace}
            onChange={(e) => set("workplace", e.target.value)}
            className={selectClass}
          >
            <option value="any">Any location type</option>
            {workplaces.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        )}

        {employments.length > 1 && (
          <select
            aria-label="Employment type"
            value={filters.employment}
            onChange={(e) => set("employment", e.target.value)}
            className={selectClass}
          >
            <option value="any">Any job type</option>
            {employments.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        )}

        {locations.length > 1 && (
          <select
            aria-label="Location"
            value={filters.location}
            onChange={(e) => set("location", e.target.value)}
            className={selectClass}
          >
            <option value="any">Any place</option>
            {locations.map((l) => (
              <option key={l} value={l}>{l.length > 32 ? `${l.slice(0, 32)}…` : l}</option>
            ))}
          </select>
        )}

        <select
          aria-label="Posted within"
          value={filters.postedWithin}
          onChange={(e) => set("postedWithin", e.target.value)}
          className={selectClass}
        >
          {POSTED_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-2">
          {active && (
            <button
              type="button"
              onClick={() => onChange({ ...DEFAULT_FILTERS, sort: filters.sort })}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-3 w-3" aria-hidden="true" />
              Clear
            </button>
          )}
          <select
            aria-label="Sort by"
            value={filters.sort}
            onChange={(e) => set("sort", e.target.value as FilterState["sort"])}
            className={selectClass}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <p className="mt-2.5 text-xs text-muted-foreground" role="status" aria-live="polite">
        {resultCount} {resultCount === 1 ? "job" : "jobs"}
        {active && " after filters"}
      </p>
    </div>
  )
}
