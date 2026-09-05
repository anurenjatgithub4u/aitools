// Shared server-side identity for the product endpoints.
//
// Reuses the existing hand-rolled Firebase ID token verifier (RS256 against
// Google's published x509 certs) — no firebase-admin dependency needed. The
// token travels in the Authorization header, matching api/jobs/[id]/save.
//
// Note for anyone extending this: do NOT follow the api/workspace/* pattern of
// reading `userId` from the request body. That is unverified and lets any
// caller act as any user.

import { verifyFirebaseIdToken } from "@/lib/pdf-study/verify-auth";

export async function requireUser(req: Request): Promise<string | null> {
  const header = req.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : undefined;
  return verifyFirebaseIdToken(bearer).catch(() => null);
}
