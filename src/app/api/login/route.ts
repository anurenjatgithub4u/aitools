import { cookies } from "next/headers";
import { z } from "zod";
import { sleep } from "@/lib/async";
import { AUTH_COOKIE, AUTH_MAX_AGE_S, safeEqual, tokenFor } from "@/lib/auth";
import { HttpError, parseBody, route } from "@/lib/http";

export const runtime = "nodejs";

const LoginInput = z.object({ password: z.string().min(1).max(200) });

/** Checks the shared password and sets the login cookie. */
export const POST = route(async (req: Request) => {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return Response.json({ ok: true });
  const { password } = await parseBody(req, LoginInput);
  if (!safeEqual(await tokenFor(password), await tokenFor(expected))) {
    await sleep(600); // slows down guessing
    throw new HttpError(401, "wrong_password", "Wrong password");
  }
  (await cookies()).set(AUTH_COOKIE, await tokenFor(expected), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_MAX_AGE_S,
  });
  return Response.json({ ok: true });
});

/** Logs out. */
export const DELETE = route(async () => {
  (await cookies()).delete(AUTH_COOKIE);
  return new Response(null, { status: 204 });
});
