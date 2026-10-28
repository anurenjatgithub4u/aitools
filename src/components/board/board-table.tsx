"use client";

import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, InfoIcon, Loader2Icon, RefreshCwIcon, Trash2Icon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { taskKey } from "@/lib/task-key";
import { VerdictBadge, VERDICTS } from "@/components/board/verdict-badge";
import { useNow } from "@/hooks/use-now";
import { getCountry } from "@/lib/countries";
import { compactNumber, timeAgo } from "@/lib/format";
import { FORMULA_HELP, VERDICT_RULES } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import { CountryFlag } from "@/components/country-flag";
import type { BoardRow, Competitor, Rank } from "@/types";

type SortKey = "keyword" | "country" | "rank" | "volume" | "difficulty" | "verdict" | "checked";
type Sort = { key: SortKey; dir: "asc" | "desc" };

// Sort values; unchecked rows always sink to the bottom.
const LAST = Number.POSITIVE_INFINITY;
const sortValue: Record<SortKey, (r: BoardRow) => string | number> = {
  keyword: (r) => r.keyword,
  country: (r) => r.country,
  rank: (r) => (r.checkedAt === null ? LAST : (r.rank ?? 201)),
  volume: (r) => r.volume ?? -1,
  difficulty: (r) => r.difficulty ?? LAST,
  verdict: (r) => (r.verdict ? VERDICTS.indexOf(r.verdict) : LAST),
  checked: (r) => r.checkedAt ?? 0,
};

export function sortRows(rows: BoardRow[], sort: Sort): BoardRow[] {
  const get = sortValue[sort.key];
  const sign = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = get(a);
    const y = get(b);
    const c = typeof x === "string" ? x.localeCompare(y as string) : (x as number) - (y as number);
    return c * sign || a.keyword.localeCompare(b.keyword);
  });
}

export function BoardTable(props: {
  rows: BoardRow[];
  competitors: Competitor[];
  hasApp: boolean;
  pending: Set<string>;
  onCheck: (row: BoardRow) => void;
  onDelete: (row: BoardRow) => void;
}) {
  const [sort, setSort] = useState<Sort>({ key: "volume", dir: "desc" });
  const now = useNow(30_000);
  const rows = sortRows(props.rows, sort);

  const header = (key: SortKey, label: string, help?: React.ReactNode, className?: string) => {
    const active = sort.key === key;
    const Icon = !active ? ArrowUpDownIcon : sort.dir === "asc" ? ArrowUpIcon : ArrowDownIcon;
    return (
      <TableHead className={className} aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="inline-flex items-center gap-1 hover:text-foreground"
            onClick={() => setSort({ key, dir: active && sort.dir === "desc" ? "asc" : active ? "desc" : defaultDir(key) })}
          >
            {label}
            <Icon className={cn("size-3", !active && "opacity-40")} />
          </button>
          {help && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" aria-label={`About ${label}`} className="text-muted-foreground hover:text-foreground">
                  <InfoIcon className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-72 text-left">{help}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </TableHead>
    );
  };

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {header("keyword", "Keyword")}
            {header("country", "Country")}
            {header("rank", "Rank", FORMULA_HELP.rank)}
            {header("volume", "Volume", <><strong>Estimate.</strong> {FORMULA_HELP.volume}</>)}
            {header("difficulty", "Difficulty", FORMULA_HELP.difficulty)}
            <TableHead className="hidden md:table-cell">Top 5</TableHead>
            {header("verdict", "Verdict", <VerdictHelp />)}
            {header("checked", "Checked", undefined, "hidden sm:table-cell")}
            <TableHead className="w-0">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const busy = props.pending.has(taskKey(r.keywordId, r.country));
            const c = getCountry(r.country);
            return (
              <TableRow key={taskKey(r.keywordId, r.country)} data-busy={busy || undefined} className="data-[busy]:bg-muted/40">
                <TableCell className="max-w-64">
                  <div className="truncate font-medium" title={r.keyword}>
                    {r.keyword}
                  </div>
                  {r.phrase && r.phrase !== r.keyword && (
                    <div className="truncate text-xs text-muted-foreground" title={r.phrase}>
                      {r.phrase}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <CountryFlag code={r.country} className="text-lg" />
                  <span className="ml-1 text-xs text-muted-foreground">{c.code}</span>
                </TableCell>
                <TableCell>
                  <RankCell row={r} hasApp={props.hasApp} competitors={props.competitors} />
                </TableCell>
                <TableCell>
                  <ScoreCell value={r.volume} tone="volume" />
                </TableCell>
                <TableCell>
                  <ScoreCell value={r.difficulty} tone="difficulty" />
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <TopIcons row={r} />
                </TableCell>
                <TableCell>
                  {r.verdict ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <VerdictBadge verdict={r.verdict} />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>{r.verdictWhy}</TooltipContent>
                    </Tooltip>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="hidden whitespace-nowrap text-xs text-muted-foreground sm:table-cell">
                  {r.checkedAt ? timeAgo(r.checkedAt, now) : "never"}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Check ${r.keyword} in ${c.name} now`}
                      title="Check now"
                      disabled={busy || (!r.phrase && !c.language.startsWith("en"))}
                      onClick={() => props.onCheck(r)}
                    >
                      {busy ? <Loader2Icon className="animate-spin" /> : <RefreshCwIcon />}
                    </Button>
                    <Button variant="ghost" size="icon-sm" aria-label={`Delete ${r.keyword}`} title="Delete keyword" onClick={() => props.onDelete(r)}>
                      <Trash2Icon />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

const defaultDir = (key: SortKey): Sort["dir"] => (key === "volume" || key === "checked" ? "desc" : "asc");

function RankCell({ row, hasApp, competitors }: { row: BoardRow; hasApp: boolean; competitors: Competitor[] }) {
  if (row.checkedAt === null) return <span className="text-muted-foreground">—</span>;
  const fmt = (r: Rank) => (r === null ? "200+" : `#${r}`);
  return (
    <div className="space-y-0.5">
      {hasApp ? (
        <span className={cn("font-semibold tabular-nums", row.rank !== null && row.rank <= 10 && "text-emerald-600 dark:text-emerald-400")}>{fmt(row.rank)}</span>
      ) : (
        <span className="text-muted-foreground" title="Link your app in Settings to see your rank">
          —
        </span>
      )}
      {competitors.length > 0 && (
        <div className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
          {competitors.map((c) => (
            <span key={c.id} title={c.name} className="whitespace-nowrap tabular-nums">
              {c.name.split(/[\s:–-]/)[0].slice(0, 10)} {fmt(row.competitorRanks[c.id] ?? null)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ScoreCell({ value, tone }: { value: number | null; tone: "volume" | "difficulty" }) {
  if (value === null) return <span className="text-muted-foreground">—</span>;
  // volume: more is better (green); difficulty: more is worse (red)
  const good = tone === "volume" ? value : 100 - value;
  const color = good >= 60 ? "bg-emerald-500" : good >= 35 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="flex items-center gap-2">
      <span className="w-7 text-right tabular-nums">{value}</span>
      <div className="hidden h-1.5 w-12 overflow-hidden rounded-full bg-muted lg:block">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function TopIcons({ row }: { row: BoardRow }) {
  if (!row.top5.length) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex -space-x-1.5">
      {row.top5.map((a, i) => (
        <Tooltip key={a.trackId}>
          <TooltipTrigger asChild>
            <a href={`https://apps.apple.com/app/id${a.trackId}`} target="_blank" rel="noreferrer" className="rounded-md ring-2 ring-background">
              {a.icon ? (
                <Image src={a.icon} alt={a.name} width={24} height={24} unoptimized className="size-6 rounded-md" />
              ) : (
                <span className="grid size-6 place-items-center rounded-md bg-muted text-[10px]">{i + 1}</span>
              )}
            </a>
          </TooltipTrigger>
          <TooltipContent>
            #{i + 1} {a.name} · {a.rating ? a.rating.toFixed(1) : "–"}★ · {compactNumber(a.ratingCount)} ratings
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

function VerdictHelp() {
  return (
    <div className="space-y-1">
      <p>First matching rule wins:</p>
      <ul className="space-y-0.5">
        {VERDICT_RULES.map((r, i) => (
          <li key={i}>
            <strong>{r.verdict}</strong>: {r.why}
          </li>
        ))}
      </ul>
    </div>
  );
}
