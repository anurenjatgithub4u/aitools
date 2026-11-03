"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2Icon, SearchIcon } from "lucide-react";
import { useState } from "react";
import { CountryFlag } from "@/components/country-flag";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";
import { COUNTRIES, type CountryCode } from "@/lib/countries";
import type { PublicRankResult } from "@/lib/tools/rank-check";
import type { TopApp } from "@/types";

function AppRow({ app, rank, highlight }: { app: TopApp; rank?: number; highlight?: boolean }) {
  return (
    <div className={`flex items-center gap-3 rounded-lg p-2 ${highlight ? "bg-primary/10" : ""}`}>
      {rank !== undefined && <span className="w-5 text-right text-sm tabular-nums text-muted-foreground">{rank}</span>}
      {app.icon ? (
        // eslint-disable-next-line @next/next/no-img-element -- Apple's CDN, tiny icons
        <img src={app.icon} alt="" width={36} height={36} className="size-9 shrink-0 rounded-lg" />
      ) : (
        <span className="size-9 shrink-0 rounded-lg bg-muted" />
      )}
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{app.name}</span>
      <span className="shrink-0 text-xs text-muted-foreground">{app.ratingCount.toLocaleString("en-US")} ratings</span>
    </div>
  );
}

export function RankCheckerTool() {
  const [app, setApp] = useState("");
  const [keyword, setKeyword] = useState("");
  const [country, setCountry] = useState<CountryCode>("US");

  const check = useMutation({
    mutationFn: (body: { app: string; keyword: string; country: CountryCode }) =>
      api<{ result: PublicRankResult }>("/api/tools/rank", { body }).then((r) => r.result),
  });
  const r = check.data;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (app.trim() && keyword.trim()) check.mutate({ app, keyword, country });
  }

  return (
    <div className="grid gap-6 rounded-2xl border bg-card p-4 sm:p-6 lg:grid-cols-2">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="rc-app" className="text-sm font-medium">Your app</label>
          <Input id="rc-app" value={app} onChange={(e) => setApp(e.target.value)} placeholder="App name or App Store link" maxLength={200} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="rc-keyword" className="text-sm font-medium">Keyword</label>
          <Input id="rc-keyword" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="habit tracker" maxLength={100} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="rc-country" className="text-sm font-medium">Country</label>
          <select
            id="rc-country"
            value={country}
            onChange={(e) => setCountry(e.target.value as CountryCode)}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-base md:text-sm dark:bg-input/30"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={check.isPending || !app.trim() || !keyword.trim()}>
          {check.isPending ? <Loader2Icon className="animate-spin" /> : <SearchIcon />}
          Check rank
        </Button>
      </form>

      <div aria-live="polite" className="min-h-40">
        {check.isError && <p className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive">{check.error.message}</p>}
        {!r && !check.isError && (
          <p className="text-sm text-muted-foreground">
            Enter your app and a keyword. We search the App Store in that country, the same way a user would, and show where you appear in the top
            200.
          </p>
        )}
        {r && (
          <div className="space-y-4">
            <div>
              <AppRow app={r.app} />
              <p className="mt-2 text-2xl font-semibold">
                {r.rank ? `#${r.rank}` : "Not in the top 200"}
                <span className="ml-2 align-middle text-sm font-normal text-muted-foreground">
                  for &quot;{r.keyword}&quot; in <CountryFlag code={r.country} />
                </span>
              </p>
              {r.alternatives.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Not your app? Paste its App Store link instead. Similar names: {r.alternatives.map((a) => a.name).join(", ")}
                </p>
              )}
            </div>
            <div>
              <h3 className="text-sm font-medium">Top 5 for this keyword</h3>
              <div className="mt-1">
                {r.top5.map((a, i) => (
                  <AppRow key={a.trackId} app={a} rank={i + 1} highlight={a.trackId === r.app.trackId} />
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {r.checksLeft} free checks left this hour. Results can be up to an hour old.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
