// Shared plumbing for the three PDF Utility route handlers — identity
// resolution, rate limiting, and turning a processed file (or an error)
// into the right NextResponse. Keeps the route handlers themselves thin and
// focused on "parse this request, call the service, done" per spec §20.

import { NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "@/lib/pdf-study/verify-auth";
import { clientIdentifier, consume, type Identity } from "./rate-limit";
import { PdfToolError } from "./types";

export async function resolveIdentity(req: Request, formData: FormData): Promise<Identity> {
  const idToken = formData.get("idToken");
  const uid = await verifyFirebaseIdToken(typeof idToken === "string" ? idToken : undefined);
  return uid ? { tier: "authenticated", id: uid } : { tier: "anonymous", id: clientIdentifier(req.headers) };
}

/** Returns a 429 NextResponse if the identity is over its daily cap, else null. */
export async function checkRateLimit(identity: Identity): Promise<NextResponse | null> {
  const usage = await consume(identity);
  if (usage.allowed) return null;
  return NextResponse.json(
    {
      error: `You've reached today's limit of ${usage.limit} PDF operations. Please try again tomorrow.`,
      code: "rate_limited",
    },
    { status: 429 }
  );
}

export function respondWithError(e: unknown, logTag: string): NextResponse {
  if (e instanceof PdfToolError) {
    return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
  }
  // Never leak parser/library internals or stack traces to the browser.
  console.error(`[pdf-tools:${logTag}] failed:`, e);
  return NextResponse.json(
    {
      error: "We couldn't process this PDF. The file may be corrupted or in an unsupported format.",
      code: "server_error",
    },
    { status: 500 }
  );
}

export function respondWithFile(
  bytes: Uint8Array,
  contentType: string,
  downloadName: string,
  metaHeaders: Record<string, string | number | boolean>
): NextResponse {
  const headers = new Headers();
  headers.set("Content-Type", contentType);
  const safeName = downloadName.replace(/["\r\n]/g, "");
  headers.set(
    "Content-Disposition",
    `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(downloadName)}`
  );
  for (const [key, value] of Object.entries(metaHeaders)) {
    headers.set(`X-${key}`, String(value));
  }
  // Every metadata header this route sets — so the browser client's fetch
  // (running on a different concern than same-origin navigation) is
  // actually allowed to read them via response.headers.get(...).
  headers.set("Access-Control-Expose-Headers", Object.keys(metaHeaders).map((k) => `X-${k}`).join(", "));

  return new NextResponse(new Uint8Array(bytes), { status: 200, headers });
}
