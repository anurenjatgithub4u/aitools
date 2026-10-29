"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderSearchIcon, Loader2Icon, SparklesIcon, Trash2Icon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { NewProjectDialog } from "@/components/projects/new-project-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNow } from "@/hooks/use-now";
import { api } from "@/lib/api-client";
import { timeAgo } from "@/lib/format";
import { CountryFlags } from "@/components/country-flag";
import type { Project } from "@/types";

type ProjectItem = Project & { keywordCount: number };

/** `quota` is set for Free users: free projects left out of the total. Null = no limit. */
export function ProjectsView({ initialProjects, quota }: { initialProjects: ProjectItem[]; quota: { left: number; total: number } | null }) {
  const qc = useQueryClient();
  const now = useNow(60_000);
  const [toDelete, setToDelete] = useState<ProjectItem | null>(null);
  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: async () => (await api<{ projects: ProjectItem[] }>("/api/apps")).projects,
    initialData: initialProjects,
  });

  const remove = useMutation({
    mutationFn: (p: ProjectItem) => api(`/api/apps/${p.id}`, { method: "DELETE" }),
    onSuccess: (_r, p) => {
      setToDelete(null);
      void qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success(`Deleted ${p.name}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const list = projects.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Apps and niche ideas you&apos;re researching keywords for.
            {quota && quota.left > 0 && (
              <span className="ml-1 font-medium text-foreground">
                {quota.left} of {quota.total} free projects left.
              </span>
            )}
          </p>
        </div>
        {quota?.left === 0 ? null : <NewProjectDialog />}
      </div>

      {quota?.left === 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
          <SparklesIcon className="size-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">You&apos;ve used your {quota.total} free projects</p>
            <p className="text-muted-foreground">Premium unlocks unlimited projects. Payments are coming soon.</p>
          </div>
        </div>
      )}

      {projects.isError && <p className="text-sm text-destructive">Couldn&apos;t refresh projects: {projects.error.message}</p>}

      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <FolderSearchIcon className="mx-auto size-8 text-muted-foreground" />
          <h2 className="mt-3 font-semibold">No projects yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">Start with your app or a niche idea. You&apos;ll brainstorm keywords, localize them and see where they rank.</p>
          <div className="mt-4">
            <NewProjectDialog />
          </div>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => (
            <li key={p.id} className="group relative rounded-xl border bg-card p-4 transition-colors hover:border-primary/50">
              <div className="flex items-start gap-3">
                {p.icon ? (
                  <Image src={p.icon} alt="" width={40} height={40} unoptimized className="size-10 rounded-xl" />
                ) : (
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted font-semibold">{p.name[0]?.toUpperCase()}</div>
                )}
                <div className="min-w-0 flex-1">
                  <Link href={`/app/${p.id}`} className="block truncate font-medium after:absolute after:inset-0">
                    {p.name}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">{p.niche ?? (p.itunesId ? "Linked app" : "Niche idea")}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Delete ${p.name}`}
                  className="relative z-10 opacity-60 group-hover:opacity-100"
                  onClick={() => setToDelete(p)}
                >
                  <Trash2Icon />
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                <CountryFlags codes={p.countries} /> · {p.keywordCount} keywords{now !== null && ` · created ${timeAgo(p.createdAt, now)}`}
              </p>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={toDelete !== null} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {toDelete?.name}?</DialogTitle>
            <DialogDescription>This removes its keywords, localized phrases, competitors and rank history. It can&apos;t be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" disabled={remove.isPending} onClick={() => toDelete && remove.mutate(toDelete)}>
              {remove.isPending && <Loader2Icon className="animate-spin" />} Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
