"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, PlusIcon, SparklesIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api-client";
import type { Keyword, Project } from "@/types";

const textarea =
  "min-h-24 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export function AddKeywordsDialog({ project, trigger }: { project: Project; trigger?: React.ReactNode }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState(project.niche ?? "");
  const [audience, setAudience] = useState(project.audience ?? "");
  const [terms, setTerms] = useState("");
  const done = (n: number) => {
    void qc.invalidateQueries({ queryKey: ["board", project.id] });
    toast.success(n ? `Added ${n} keywords` : "No new keywords (all already on the board)");
    setOpen(false);
  };

  const brainstorm = useMutation({
    mutationFn: () =>
      api<{ added: Keyword[] }>("/api/brainstorm", { body: { appId: project.id, name: project.name, description, audience: audience || undefined } }),
    onSuccess: (r) => done(r.added.length),
    onError: (e) => toast.error(e.message),
  });
  const add = useMutation({
    mutationFn: () => api<{ added: Keyword[] }>(`/api/apps/${project.id}/keywords`, { body: { terms } }),
    onSuccess: (r) => {
      setTerms("");
      done(r.added.length);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <PlusIcon /> Add keywords
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add keywords</DialogTitle>
          <DialogDescription>Let AI brainstorm about 30 ideas, or paste your own.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="ai">
          <TabsList className="w-full">
            <TabsTrigger value="ai">
              <SparklesIcon /> AI brainstorm
            </TabsTrigger>
            <TabsTrigger value="manual">Type them</TabsTrigger>
          </TabsList>
          <TabsContent value="ai">
            <form
              className="space-y-3 pt-2"
              onSubmit={(e) => {
                e.preventDefault();
                brainstorm.mutate();
              }}
            >
              <label className="block space-y-1 text-sm">
                <span className="font-medium">What does {project.name} do?</span>
                <textarea className={textarea} required maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A habit tracker with streaks and reminders for building routines" />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="font-medium">Target audience (optional)</span>
                <Input maxLength={200} value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Students and young professionals" />
              </label>
              <DialogFooter>
                <Button type="submit" disabled={brainstorm.isPending || !description.trim()}>
                  {brainstorm.isPending ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />}
                  {brainstorm.isPending ? "Brainstorming…" : "Brainstorm 30 keywords"}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
          <TabsContent value="manual">
            <form
              className="space-y-3 pt-2"
              onSubmit={(e) => {
                e.preventDefault();
                add.mutate();
              }}
            >
              <label className="block space-y-1 text-sm">
                <span className="font-medium">One per line, or comma separated</span>
                <textarea className={textarea} required value={terms} onChange={(e) => setTerms(e.target.value)} placeholder={"habit tracker\ndaily routine planner"} />
              </label>
              <DialogFooter>
                <Button type="submit" disabled={add.isPending || !terms.trim()}>
                  {add.isPending && <Loader2Icon className="animate-spin" />} Add
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
