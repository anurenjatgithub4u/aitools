import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { appsRepo, usersRepo } from "@/lib/db";
import { adminAuth } from "@/lib/firebase/admin";
import { authEnabled } from "@/lib/firebase/config";
import { HttpError } from "@/lib/http";
import type { Project, User } from "@/types";

export const SESSION_COOKIE = "kp_session";
export const SESSION_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000; // Firebase's maximum

/** The single user when sign-in is off (local development). Unlimited, owns pre-account projects. */
export const LOCAL_USER: User = { id: "local", email: null, name: "Local", photo: null, plan: "premium", projectsCreated: 0 };

/**
 * The signed-in user from the session cookie, or null. Cached per request. The cookie is a Firebase
 * session cookie: verified locally against Google's public keys (no network call per request).
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  if (!authEnabled) {
    // Local mode (everyone is one unlimited user) is for a developer's machine only. On Vercel a
    // missing Firebase config must fail closed, never open the site up.
    if (process.env.VERCEL) throw new HttpError(503, "auth_not_configured", "Sign-in isn't configured on this deployment (NEXT_PUBLIC_FIREBASE_* missing)");
    return LOCAL_USER;
  }
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!cookie) return null;
  try {
    const decoded = await adminAuth().verifySessionCookie(cookie);
    return (await usersRepo.getUser(decoded.uid)) ?? (await usersRepo.upsertUser({ id: decoded.uid, email: decoded.email }));
  } catch (e) {
    if (e instanceof HttpError) throw e;
    return null; // expired or tampered cookie: treat as signed out
  }
});

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "unauthorized", "Sign in to continue");
  return user;
}

/** The signed-in user's project, or 404 (also when it belongs to someone else). */
export async function requireProject(appId: number): Promise<{ user: User; project: Project }> {
  const user = await requireUser();
  const project = await appsRepo.getProject(appId, user.id);
  if (!project) throw new HttpError(404, "not_found", "Project not found");
  return { user, project };
}

/** Exchanges a fresh Firebase ID token for a session cookie and records the user. */
export async function startSession(idToken: string): Promise<User> {
  const auth = adminAuth();
  let decoded;
  try {
    decoded = await auth.verifyIdToken(idToken);
  } catch {
    throw new HttpError(401, "invalid_token", "Sign-in failed, please try again");
  }
  // only mint a long session from a sign-in that just happened (Firebase's recommendation)
  if (Date.now() / 1000 - decoded.auth_time > 5 * 60) throw new HttpError(401, "stale_sign_in", "Please sign in again");

  const session = await auth.createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_MS });
  (await cookies()).set(SESSION_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_MS / 1000,
  });
  return usersRepo.upsertUser({ id: decoded.uid, email: decoded.email, name: decoded.name as string | undefined, photo: decoded.picture });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
