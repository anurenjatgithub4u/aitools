// Shared-password gate. Off unless APP_PASSWORD is set (it is on Vercel; usually not locally).
// The cookie holds a SHA-256 of the password, not the password; changing APP_PASSWORD signs
// everyone out. Web Crypto only, so this runs in the proxy as well as in route handlers.

export const AUTH_COOKIE = "kp_auth";
export const AUTH_MAX_AGE_S = 60 * 60 * 24 * 30;

export const authEnabled = () => Boolean(process.env.APP_PASSWORD);

export async function tokenFor(password: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`keyword-planner:${password}`));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time string comparison, so response timing doesn't leak how much of a token matched. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function isValidToken(token: string | undefined): Promise<boolean> {
  const password = process.env.APP_PASSWORD;
  if (!password) return true;
  return token !== undefined && safeEqual(token, await tokenFor(password));
}

/** Only same-site relative paths, so /login?next= can't redirect to another site. */
export function safeNext(next: string | null | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}
