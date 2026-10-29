import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { HttpError } from "@/lib/http";
import { firebaseConfig } from "./config";

// Firebase Admin verifies sign-ins on the server. It needs a service account (Firebase console →
// Project settings → Service accounts → Generate new private key): its client_email and
// private_key go in FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY. Never NEXT_PUBLIC_.

let app: App | null = null;

export function adminAuth(): Auth {
  if (!app) {
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    // env vars often store the key with literal "\n"; turn them back into newlines
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    if (!firebaseConfig.projectId || !clientEmail || !privateKey) {
      throw new HttpError(500, "auth_misconfigured", "Sign-in isn't set up on the server (FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY missing)");
    }
    app = getApps()[0] ?? initializeApp({ credential: cert({ projectId: firebaseConfig.projectId, clientEmail, privateKey }) });
  }
  return getAuth(app);
}
