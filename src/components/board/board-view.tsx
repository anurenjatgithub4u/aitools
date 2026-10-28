"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangleIcon, LanguagesIcon, Loader2Icon, PlayIcon, SparklesIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { AddKeywordsDialog } from "@/components/board/add-keywords-dialog";
import { BoardTable } from "@/components/board/board-table";
import { CompetitorsBar } from "@/components/board/competitors-bar";
import { JobProgress } from "@/components/board/job-progress";
import { SettingsDialog } from "@/components/board/settings-dialog";
import { useCheckRunner } from "@/components/board/use-check-runner";
import { VERDICTS } from "@/components/board/verdict-badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import { getCountry, isEnglish } from "@/lib/countries";
import { CountryFlag, CountryFlags } from "@/components/country-flag";
import type { Board, BoardRow } from "@/types";

const ALL = "all";
const UNCHECKED = "unchecked";

export function BoardView({ appId, initialBoard }: { appId: number; initialBoard: Board }) {
  const qc = useQueryClient();
  const board = useQuery({ queryKey: ["board", appId], queryFn: () => api<Board>(`/api/apps/${appId}`), initialData: initialBoard });
  const { progress, running, pending, start } = useCheckRunner(appId);
  const [country, setCountry] = useState(ALL);
  const [verdict, setVerdict] = useState(ALL);

  const localize = useMutation({
    mutationFn: () => api("/api/localize", { body: { appId } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["board", appId] });
      toast.success("Localized phrases updated");
    },
    onError: (e) => toast.error(e.message),
  });
  const removeKeyword = useMutation({
    mutationFn: (row: BoardRow) => api(`/api/apps/${appId}/keywords/${row.keywordId}`, { method: "DELETE" }),
    onSuccess: (_r, row) => {
      void qc.invalidateQueries({ queryKey: ["board", appId] });
      toast.success(`Deleted "${row.keyword}"`);
    },
    onError: (e) => toast.error(e.message),
  });

  // English storefronts can search the English keyword; others need a localized phrase first
  const checkAll = (all: BoardRow[]) => {
    const ready = all.filter((r) => r.phrase || isEnglish(r.country));
    if (ready.length < all.length) toast.info(`${all.length - ready.length} rows skipped`, { description: "Localize those keywords for their country first." });
    start(ready);
  };

  if (board.isError && !board.data) return <ErrorState message={board.error.message} onRetry={() => board.refetch()} />;
  if (!board.data) return <BoardSkeleton />;

  const { project, competitors, rows } = board.data;
  const visible = rows.filter(
    (r) => (country === ALL || r.country === country) && (verdict === ALL || (verdict === UNCHECKED ? r.verdict === null : r.verdict === verdict)),
  );
  const needsLocalizing = rows.some((r) => !r.phrase && !isEnglish(r.country));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {project.icon ? (
          <Image src={project.icon} alt="" width={40} height={40} unoptimized className="size-10 rounded-xl" />
        ) : (
          <div className="grid size-10 place-items-center rounded-xl bg-muted text-lg font-semibold">{project.name[0]?.toUpperCase()}</div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold">{project.name}</h1>
          <p className="truncate text-sm text-muted-foreground">
            <CountryFlags codes={project.countries} /> · {new Set(rows.map((r) => r.keywordId)).size} keywords
            {!project.itunesId && " · niche idea (no app linked)"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AddKeywordsDialog project={project} />
          <Button
            variant="outline"
            onClick={() => localize.mutate()}
            disabled={localize.isPending || !rows.length}
            title="Write the phrase locals search for, per country"
          >
            {localize.isPending ? <Loader2Icon className="animate-spin" /> : <LanguagesIcon />}
            {localize.isPending ? "Localizing…" : "Localize"}
          </Button>
          <Button variant="outline" onClick={() => checkAll(rows)} disabled={running || !rows.length}>
            {running ? <Loader2Icon className="animate-spin" /> : <PlayIcon />} Check all
          </Button>
          <SettingsDialog project={project} />
        </div>
      </div>

      <CompetitorsBar appId={appId} competitors={competitors} />

      {progress && <JobProgress progress={progress} />}

      {needsLocalizing && !localize.isPending && (
        <p className="flex items-center gap-2 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <LanguagesIcon className="size-4 shrink-0" /> Some non-English countries have no local phrase yet. Click Localize before checking them.
        </p>
      )}

      {rows.length === 0 ? (
        <EmptyState project={project} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger aria-label="Filter by country" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All countries</SelectItem>
                {project.countries.map((c) => (
                  <SelectItem key={c} value={c}>
                    <CountryFlag code={c} /> {getCountry(c).name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={verdict} onValueChange={setVerdict}>
              <SelectTrigger aria-label="Filter by verdict" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All verdicts</SelectItem>
                {VERDICTS.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
                <SelectItem value={UNCHECKED}>Not checked</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              {visible.length} of {rows.length} rows
            </span>
          </div>
          {visible.length ? (
            <BoardTable
              rows={visible}
              competitors={competitors}
              hasApp={project.itunesId !== null}
              pending={pending}
              onCheck={(r) => start([r], { force: true })}
              onDelete={(r) => removeKeyword.mutate(r)}
            />
          ) : (
            <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">No rows match these filters.</div>
          )}
        </>
      )}
    </div>
  );
}

function EmptyState({ project }: { project: Board["project"] }) {
  return (
    <div className="rounded-xl border border-dashed p-10 text-center">
      <SparklesIcon className="mx-auto size-8 text-muted-foreground" />
      <h2 className="mt-3 font-semibold">No keywords yet</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">Brainstorm about 30 ideas with AI, or paste keywords you already have. Then localize and check them.</p>
      <div className="mt-4">
        <AddKeywordsDialog project={project} />
      </div>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-destructive/40 p-10 text-center">
      <AlertTriangleIcon className="mx-auto size-8 text-destructive" />
      <h2 className="mt-3 font-semibold">Couldn&apos;t load this project</h2>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      <Button className="mt-4" variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-64" />
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}
