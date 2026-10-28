"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2Icon, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { CountryPicker } from "@/components/country-picker";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";
import type { CountryCode } from "@/lib/countries";
import type { Project } from "@/types";

const textarea =
  "min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export function NewProjectDialog({ trigger }: { trigger?: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [niche, setNiche] = useState("");
  const [appStore, setAppStore] = useState("");
  const [countries, setCountries] = useState<CountryCode[]>(["US", "UK"]);

  const create = useMutation({
    mutationFn: () =>
      api<{ project: Project }>("/api/apps", { body: { name, niche: niche || undefined, appStore: appStore || undefined, countries } }),
    onSuccess: ({ project }) => {
      setOpen(false);
      router.push(`/app/${project.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <PlusIcon /> New project
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>An app you have, or just a niche idea you want to research.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">App name or idea</span>
            <Input required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} placeholder="Streakly, or “habit tracker for students”" autoFocus />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">What it does / the niche (optional)</span>
            <textarea className={textarea} maxLength={500} value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="Used for the AI brainstorm" />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">App Store link (optional)</span>
            <Input value={appStore} onChange={(e) => setAppStore(e.target.value)} placeholder="https://apps.apple.com/…/id123456789" />
            <span className="block text-xs text-muted-foreground">Link your live app to track its rank. Leave empty for an idea.</span>
          </label>
          <div className="space-y-1.5 text-sm">
            <span className="font-medium">Countries</span>
            <CountryPicker value={countries} onChange={setCountries} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={create.isPending || !name.trim()}>
              {create.isPending && <Loader2Icon className="animate-spin" />} Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
