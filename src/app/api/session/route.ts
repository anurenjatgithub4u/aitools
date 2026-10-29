import { z } from "zod";
import { parseBody, route } from "@/lib/http";
import { endSession, getCurrentUser, startSession } from "@/lib/session";

export const runtime = "nodejs";

const SessionInput = z.object({ idToken: z.string().min(20).max(5000) });

/** Who is signed in (null when nobody). */
export const GET = route(async () => Response.json({ user: await getCurrentUser() }));

/** Sign in: the browser sends the ID token it just got from Firebase; we set the session cookie. */
export const POST = route(async (req: Request) => {
  const { idToken } = await parseBody(req, SessionInput);
  return Response.json({ user: await startSession(idToken) });
});

/** Sign out. */
export const DELETE = route(async () => {
  await endSession();
  return new Response(null, { status: 204 });
});
