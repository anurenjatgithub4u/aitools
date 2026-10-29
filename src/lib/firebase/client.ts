"use client";

import { getApps, initializeApp } from "firebase/app";
import { getAuth, inMemoryPersistence, setPersistence, signOut, type Auth } from "firebase/auth";
import { api } from "@/lib/api-client";
import { firebaseConfig } from "./config";

let auth: Promise<Auth> | null = null;

/**
 * Firebase Auth in the browser, used only to sign in. The server's session cookie is the source of
 * truth afterwards, so Firebase keeps nothing in browser storage (in-memory persistence).
 */
export function firebaseAuth(): Promise<Auth> {
  auth ??= (async () => {
    const app = getApps()[0] ?? initializeApp(firebaseConfig);
    const a = getAuth(app);
    await setPersistence(a, inMemoryPersistence);
    return a;
  })();
  return auth;
}

/** Hands the fresh Firebase ID token to the server, which sets the session cookie. */
export async function startServerSession(idToken: string): Promise<void> {
  await api("/api/session", { body: { idToken } });
}

export async function signOutEverywhere(): Promise<void> {
  await api("/api/session", { method: "DELETE" });
  await signOut(await firebaseAuth()).catch(() => {});
}

/** Friendly text for Firebase Auth error codes. */
export function authErrorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? "";
  const messages: Record<string, string> = {
    "auth/invalid-credential": "Wrong email or password.",
    "auth/wrong-password": "Wrong email or password.",
    "auth/user-not-found": "No account with that email. Sign up instead?",
    "auth/email-already-in-use": "There's already an account with that email. Sign in instead.",
    "auth/weak-password": "Use at least 6 characters for the password.",
    "auth/invalid-email": "That email address doesn't look right.",
    "auth/too-many-requests": "Too many attempts. Wait a minute and try again.",
    "auth/popup-closed-by-user": "The Google window was closed before signing in.",
    "auth/cancelled-popup-request": "The Google window was closed before signing in.",
    "auth/popup-blocked": "Your browser blocked the Google window. Allow pop-ups for this site and try again.",
    "auth/unauthorized-domain": "This website isn't allowed to sign in yet (add it under Firebase → Authentication → Settings → Authorized domains).",
    "auth/operation-not-allowed": "This sign-in method isn't turned on in Firebase yet.",
    "auth/network-request-failed": "Network problem. Check your connection and try again.",
  };
  return messages[code] ?? (e instanceof Error ? e.message : "Sign-in failed. Please try again.");
}
