"use client";

import { Loader2Icon, TimerIcon } from "lucide-react";
import { useNow } from "@/hooks/use-now";
import { CountryFlag } from "@/components/country-flag";
import type { CheckProgress } from "@/types";

export function JobProgress({ progress: job }: { progress: CheckProgress }) {
  const now = useNow(1000);
  const pct = job.total ? Math.round((job.done / job.total) * 100) : 0;
  const waitS = job.waiting && now !== null ? Math.max(0, Math.ceil((job.waiting.until - now) / 1000)) : 0;

  return (
    <div className="rounded-lg border bg-card p-3 text-sm" role="status" aria-live="polite">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
        <span className="font-medium tabular-nums">
          Checking {job.done}/{job.total}
        </span>
        {job.current && (
          <span className="min-w-0 truncate text-muted-foreground">
            <CountryFlag code={job.current.country} /> {job.current.keyword}
          </span>
        )}
        {job.waiting && waitS > 0 && (
          <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
            <TimerIcon className="size-3.5" /> {job.waiting.reason}, retrying in {waitS}s
          </span>
        )}
        {job.failed > 0 && <span className="text-destructive">{job.failed} failed</span>}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">Apple limits how fast we can search, so big checks take a few minutes. Keep this page open; finished checks are saved as they go.</p>
    </div>
  );
}
