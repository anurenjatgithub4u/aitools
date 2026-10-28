"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, Settings2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CountryPicker } from "@/components/country-picker";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";
import type { CountryCode } from "@/lib/countries";
import type { Project } from "@/types";

export function SettingsDialog({ project }: { project: Project }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [countries, setCountries] = useState<CountryCode[]>(project.countries);
  const [appStore, setAppStore] = useState(project.itunesId ? String(project.itunesId) : "");

  const save = useMutation({
    mutationFn: () =>
      api<{ project: Project }>(`/api/apps/${project.id}`, {
        method: "PATCH",
        body: { countries, ...(appStore.trim() !== String(project.itunesId ?? "") && { appStore: appStore.trim() || null }) },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["board", project.id] });
      toast.success("Saved");
      setOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setCountries(project.countries);
          setAppStore(project.itunesId ? String(project.itunesId) : "");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Settings2Icon /> Settings
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Project settings</DialogTitle>
          <DialogDescription>Countries to research, and the app whose rank you want to track.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="space-y-1.5 text-sm">
            <span className="font-medium">Countries</span>
            <CountryPicker value={countries} onChange={setCountries} />
          </div>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">My app</span>
            <Input value={appStore} onChange={(e) => setAppStore(e.target.value)} placeholder="App Store link, id, or exact name (empty for a niche idea)" />
          </label>
          <DialogFooter>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Loader2Icon className="animate-spin" />} Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
