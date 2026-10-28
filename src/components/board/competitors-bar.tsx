"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, PlusIcon, XIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";
import type { Competitor, TopApp } from "@/types";

export function CompetitorsBar({ appId, competitors }: { appId: number; competitors: Competitor[] }) {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["board", appId] });

  const add = useMutation({
    mutationFn: (q: string) => api<{ competitor: Competitor; alternatives: TopApp[] }>(`/api/apps/${appId}/competitors`, { body: { query: q } }),
    onSuccess: (r) => {
      setQuery("");
      void refresh();
      toast.success(`Added ${r.competitor.name}`, {
        description: r.alternatives.length ? `Not the right one? Paste its App Store link instead. Other matches: ${r.alternatives.map((a) => a.name).join(", ")}` : undefined,
      });
    },
    onError: (e) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: number) => api(`/api/apps/${appId}/competitors/${id}`, { method: "DELETE" }),
    onSuccess: () => void refresh(),
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium">Competitors</span>
      {competitors.map((c) => (
        <span key={c.id} className="flex items-center gap-1.5 rounded-full border bg-card py-0.5 pr-1 pl-1 text-xs">
          {c.icon && <Image src={c.icon} alt="" width={18} height={18} unoptimized className="size-4.5 rounded" />}
          <span className="max-w-32 truncate">{c.name}</span>
          <button type="button" aria-label={`Remove ${c.name}`} className="rounded-full p-0.5 hover:bg-muted" onClick={() => remove.mutate(c.id)}>
            <XIcon className="size-3" />
          </button>
        </span>
      ))}
      <form
        className="flex items-center gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim()) add.mutate(query.trim());
        }}
      >
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name or App Store link" aria-label="Add competitor" className="h-7 w-52 text-xs" />
        <Button type="submit" size="icon-sm" variant="outline" aria-label="Add competitor" disabled={add.isPending}>
          {add.isPending ? <Loader2Icon className="animate-spin" /> : <PlusIcon />}
        </Button>
      </form>
    </div>
  );
}
