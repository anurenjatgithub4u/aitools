import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { WORKSPACE_ENABLED } from "@/lib/workspace/config";

// The workspace pages are gated in src/app/workspace/layout.tsx, but its API
// routes need gating too — an unlinked page is invisible, an unlinked endpoint
// is still callable. These particular ones matter more than most: every
// /api/workspace/* handler trusts a `userId` passed in the query string or
// body without verifying a token, so while they're reachable, anyone who
// guesses a uid can read or write that person's data.
//
// Next recommends reaching for this file only as a last resort, and that's the
// case here: one matcher retires all ~25 endpoints, where gating each handler
// individually would be fifty edits to code that's being switched off anyway.
export function proxy(request: NextRequest) {
  if (!WORKSPACE_ENABLED && request.nextUrl.pathname.startsWith("/api/workspace")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/workspace/:path*"],
};
