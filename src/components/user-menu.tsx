"use client";

import { Loader2Icon, LogOutIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { signOutEverywhere } from "@/lib/firebase/client";
import { PLAN_LIMITS, projectsLeft } from "@/lib/plans";
import type { User } from "@/types";

/** Avatar button that opens a small account panel with plan, usage and Sign out. */
export function UserMenu({ user }: { user: User }) {
  const [busy, setBusy] = useState(false);
  const label = user.name || user.email || "Account";
  const initial = label[0]?.toUpperCase() ?? "?";
  const free = user.plan === "free";

  const signOut = async () => {
    setBusy(true);
    try {
      await signOutEverywhere();
      window.location.assign("/");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't sign out");
      setBusy(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" aria-label={`Account: ${label}`} className="rounded-full ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          {user.photo ? (
            <Image src={user.photo} alt="" width={32} height={32} unoptimized className="size-8 rounded-full" />
          ) : (
            <span className="grid size-8 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{initial}</span>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border p-3 text-sm">
          <p className="font-medium">{PLAN_LIMITS[user.plan].label} plan</p>
          <p className="text-muted-foreground">
            {free
              ? `${projectsLeft(user.plan, user.projectsCreated)} of ${PLAN_LIMITS.free.projects} free projects left. Premium is coming soon.`
              : "Unlimited projects."}
          </p>
        </div>
        <Button variant="outline" onClick={signOut} disabled={busy}>
          {busy ? <Loader2Icon className="animate-spin" /> : <LogOutIcon />} Sign out
        </Button>
      </DialogContent>
    </Dialog>
  );
}
