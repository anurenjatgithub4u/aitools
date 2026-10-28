import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, authEnabled, isValidToken } from "@/lib/auth";

const PUBLIC = new Set(["/login", "/login/", "/api/login", "/api/login/"]);

/** With APP_PASSWORD set, every page and API route needs the login cookie. */
export async function proxy(req: NextRequest) {
  if (!authEnabled() || PUBLIC.has(req.nextUrl.pathname)) return NextResponse.next();
  if (await isValidToken(req.cookies.get(AUTH_COOKIE)?.value)) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized", message: "Log in first" }, { status: 401 });
  }
  const login = new URL("/login", req.url);
  login.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  // everything except Next's static assets and files in /public
  matcher: ["/((?!_next/static|_next/image|fonts/|favicon.ico).*)"],
};
