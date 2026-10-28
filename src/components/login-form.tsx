"use client";

import { Loader2Icon, LockIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";

export function LoginForm({ next }: { next: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="w-full max-w-sm space-y-4 rounded-2xl border bg-card p-6 shadow-sm"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await api("/api/login", { body: { password } });
          // full navigation so the server sees the new cookie on every request
          window.location.assign(next);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Couldn't log in");
          setBusy(false);
        }
      }}
    >
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-lg bg-muted">
          <LockIcon className="size-4" />
        </span>
        <h1 className="font-semibold">Keyword Planner</h1>
      </div>
      <label className="block space-y-1.5 text-sm">
        <span className="font-medium">Password</span>
        <Input type="password" autoComplete="current-password" required autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={busy || !password}>
        {busy && <Loader2Icon className="animate-spin" />} Log in
      </Button>
    </form>
  );
}
