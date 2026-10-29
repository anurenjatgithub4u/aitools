// Firebase web config. These values are public by design (they identify the Firebase project, they
// don't grant access), so they use NEXT_PUBLIC_ and ship to the browser. Server-side secrets live
// in lib/firebase/admin.ts.

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Sign-in is on when the Firebase web config is set. Off (local development without Firebase):
 * no login, and everything belongs to the single "local" user, as before accounts existed.
 */
export const authEnabled = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
