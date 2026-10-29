"use client";

import { createUserWithEmailAndPassword, GoogleAuthProvider, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, updateProfile, type UserCredential } from "firebase/auth";
import { Loader2Icon, MailIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authErrorMessage, firebaseAuth, startServerSession } from "@/lib/firebase/client";
import { PLAN_LIMITS } from "@/lib/plans";

type Mode = "signin" | "signup";

export function AuthForm({ next, initialMode }: { next: string; initialMode: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"google" | "email" | "reset" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  /** Runs a Firebase sign-in, swaps its ID token for our session cookie, then goes to `next`. */
  const finish = async (kind: "google" | "email", signIn: () => Promise<UserCredential>) => {
    setBusy(kind);
    setError(null);
    setNotice(null);
    try {
      const cred = await signIn();
      await startServerSession(await cred.user.getIdToken());
      // full navigation so every server-rendered page sees the new cookie
      window.location.assign(next);
    } catch (e) {
      setError(authErrorMessage(e));
      setBusy(null);
    }
  };

  const google = () => finish("google", async () => signInWithPopup(await firebaseAuth(), new GoogleAuthProvider()));

  const withEmail = () =>
    finish("email", async () => {
      const auth = await firebaseAuth();
      if (mode === "signin") return signInWithEmailAndPassword(auth, email.trim(), password);
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (name.trim()) {
        await updateProfile(cred.user, { displayName: name.trim() });
        await cred.user.getIdToken(true); // so the token the server sees carries the name
      }
      return cred;
    });

  const reset = async () => {
    if (!email.trim()) return setError("Type your email above first, then click “Forgot password?” again.");
    setBusy("reset");
    setError(null);
    try {
      await sendPasswordResetEmail(await firebaseAuth(), email.trim());
      setNotice(`If ${email.trim()} has an account, a reset link is on its way.`);
    } catch (e) {
      setError(authErrorMessage(e));
    }
    setBusy(null);
  };

  const signup = mode === "signup";
  return (
    <div className="w-full max-w-sm space-y-5 rounded-2xl border bg-card p-6 shadow-sm">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold">{signup ? "Create your account" : "Welcome back"}</h1>
        <p className="text-sm text-muted-foreground">
          {signup ? `${PLAN_LIMITS.free.projects} projects free, no card needed.` : "Sign in to see your projects."}
        </p>
      </div>

      <Tabs
        value={mode}
        onValueChange={(v) => {
          setMode(v as Mode);
          setError(null);
          setNotice(null);
        }}
      >
        <TabsList className="w-full">
          <TabsTrigger value="signin">Sign in</TabsTrigger>
          <TabsTrigger value="signup">Sign up</TabsTrigger>
        </TabsList>
      </Tabs>

      <Button type="button" variant="outline" className="w-full" disabled={busy !== null} onClick={google}>
        {busy === "google" ? <Loader2Icon className="animate-spin" /> : <GoogleMark />}
        Continue with Google
      </Button>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or with email <span className="h-px flex-1 bg-border" />
      </div>

      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void withEmail();
        }}
      >
        {signup && (
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">Name (optional)</span>
            <Input autoComplete="name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        )}
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">Email</span>
          <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="flex items-center justify-between font-medium">
            Password
            {!signup && (
              <button type="button" className="text-xs font-normal text-muted-foreground underline-offset-2 hover:underline" disabled={busy !== null} onClick={reset}>
                {busy === "reset" ? "Sending…" : "Forgot password?"}
              </button>
            )}
          </span>
          <Input
            type="password"
            autoComplete={signup ? "new-password" : "current-password"}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
            {notice}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={busy !== null}>
          {busy === "email" ? <Loader2Icon className="animate-spin" /> : <MailIcon />}
          {signup ? "Create account" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.7V6.6H1.4a12 12 0 0 0 0 10.9l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
    </svg>
  );
}
