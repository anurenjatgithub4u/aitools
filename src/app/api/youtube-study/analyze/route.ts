// POST /api/youtube-study/analyze — validation and metadata only (spec §3).
//
// Pressing "Analyze Video" must NOT start expensive AI processing. This route
// does the cheap, fast checks — URL shape, then one YouTube metadata call —
// and returns the preview plus whether we already hold cached knowledge.
//
// Everything here is a server-side check. A client claiming a duration, a
// video ID, or a quota state is ignored entirely (spec §32).

import { NextRequest, NextResponse } from "next/server";
import { parseYouTubeUrl } from "@/lib/youtube-study/url";
import { fetchVideoMetadata } from "@/lib/youtube-study/metadata";
import { findCachedKnowledge } from "@/lib/youtube-study/pipeline";
import { logInternalError, tooLongError, userError } from "@/lib/youtube-study/errors";
import { clientIdentifier } from "@/lib/youtube-study/rate-limit";
import { verifyFirebaseIdToken } from "@/lib/pdf-study/verify-auth";
import type { VideoErrorCode } from "@/lib/youtube-study/types";

export const runtime = "nodejs";

function fail(code: VideoErrorCode, durationSeconds?: number) {
  const error = code === "VIDEO_TOO_LONG" && durationSeconds
    ? tooLongError(durationSeconds)
    : userError(code);

  return NextResponse.json(
    {
      ok: false,
      errorCode: error.code,
      error: error.message,
      hint: error.hint,
      action: error.action,
      ...(durationSeconds ? { durationSeconds } : {}),
    },
    { status: error.status }
  );
}

export async function POST(req: NextRequest) {
  let body: { url?: string; idToken?: string };
  try {
    body = await req.json();
  } catch {
    return fail("NOT_A_URL");
  }

  // ---- 1. URL shape (no network) -------------------------------------------
  const parsed = parseYouTubeUrl(body.url ?? "");
  if (!parsed.ok || !parsed.videoId) {
    return fail(parsed.errorCode ?? "NOT_A_VIDEO");
  }

  // ---- 2. Metadata, including the hard duration limit ----------------------
  const meta = await fetchVideoMetadata(parsed.videoId);
  if (!meta.ok) {
    return fail(meta.errorCode, meta.durationSeconds);
  }

  // Region restrictions are advisory in the API response; surface them here
  // rather than failing later during transcript fetch.
  if (meta.metadata.regionBlocked) {
    return fail("VIDEO_REGION_BLOCKED");
  }

  // ---- 3. Cache probe ------------------------------------------------------
  // Tells the client it can skip straight to output selection, and lets us
  // report the cache hit rate from the very first call (spec §30).
  let cached = false;
  try {
    const existing = await findCachedKnowledge(parsed.videoId);
    cached = !!existing;
  } catch (e) {
    logInternalError("analyze", "UNKNOWN", e);
  }

  // Identity is resolved here only so the client can show the right remaining
  // allowance. No quota is consumed — nothing expensive has happened yet.
  const uid = await verifyFirebaseIdToken(body.idToken).catch(() => null);
  const tier = uid ? "authenticated" : "anonymous";

  return NextResponse.json({
    ok: true,
    videoId: parsed.videoId,
    metadata: meta.metadata,
    cached,
    tier,
    // Advisory only — the client uses this for the "shorts" badge.
    isShort: parsed.kind === "shorts",
    identifier: uid ? undefined : clientIdentifier(req.headers),
  });
}
