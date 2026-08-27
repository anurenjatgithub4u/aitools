// Server-side verification of a Firebase ID token.
//
// Why this exists rather than firebase-admin: the app only uses the Firebase
// *client* SDK, and a higher generation limit for signed-in users is only
// meaningful if the server can prove who the caller is — a client simply
// asserting "I'm logged in" would be trivially spoofable. Firebase ID tokens
// are RS256 JWTs signed by Google, and Google documents the manual
// verification procedure, so this does exactly that with Node's built-in
// crypto and no new dependency.
//
// Any failure returns null (treated as anonymous). This never throws, so a
// Google outage degrades the limit tier instead of breaking generation.

import crypto from "crypto";

const CERT_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

// Must match the projectId in src/lib/firebase.ts.
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "findurai";

let certCache: { certs: Record<string, string>; expiresAt: number } | null = null;

async function getCerts(): Promise<Record<string, string>> {
  if (certCache && certCache.expiresAt > Date.now()) return certCache.certs;

  const res = await fetch(CERT_URL);
  if (!res.ok) throw new Error("Could not fetch Google signing certificates");
  const certs = (await res.json()) as Record<string, string>;

  // Honour Google's cache header so we're not refetching on every request but
  // still pick up key rotation.
  const cacheControl = res.headers.get("cache-control") || "";
  const maxAge = Number(/max-age=(\d+)/.exec(cacheControl)?.[1] ?? 3600);
  certCache = { certs, expiresAt: Date.now() + maxAge * 1000 };
  return certs;
}

function base64UrlDecode(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

/** Returns the verified Firebase uid, or null if the token is absent or invalid. */
export async function verifyFirebaseIdToken(idToken: string | undefined): Promise<string | null> {
  if (!idToken || typeof idToken !== "string") return null;

  try {
    const parts = idToken.split(".");
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts;

    const header = JSON.parse(base64UrlDecode(headerB64).toString("utf8"));
    const payload = JSON.parse(base64UrlDecode(payloadB64).toString("utf8"));

    if (header.alg !== "RS256" || !header.kid) return null;

    const now = Math.floor(Date.now() / 1000);
    if (payload.aud !== FIREBASE_PROJECT_ID) return null;
    if (payload.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`) return null;
    if (typeof payload.sub !== "string" || !payload.sub) return null;
    if (typeof payload.exp !== "number" || payload.exp <= now) return null;
    if (typeof payload.iat !== "number" || payload.iat > now + 60) return null;

    const certs = await getCerts();
    const cert = certs[header.kid];
    if (!cert) return null;

    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(`${headerB64}.${payloadB64}`);
    verifier.end();

    const valid = verifier.verify(cert, base64UrlDecode(signatureB64));
    return valid ? (payload.sub as string) : null;
  } catch {
    return null;
  }
}
