import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { proxy } from "@/proxy";
import { AUTH_COOKIE, safeEqual, safeNext, tokenFor } from "./auth";

afterEach(() => vi.unstubAllEnvs());

const req = (path: string, cookie?: string) =>
  new NextRequest(`http://localhost${path}`, { headers: cookie ? { cookie: `${AUTH_COOKIE}=${cookie}` } : {} });

describe("auth helpers", () => {
  it("tokens are stable, password-specific hex", async () => {
    expect(await tokenFor("a")).toBe(await tokenFor("a"));
    expect(await tokenFor("a")).not.toBe(await tokenFor("b"));
    expect(await tokenFor("a")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("safeEqual", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "ab")).toBe(false);
  });

  it("safeNext only allows same-site paths", () => {
    expect(safeNext("/app/3?x=1")).toBe("/app/3?x=1");
    for (const bad of [undefined, "", "https://evil.com", "//evil.com", "/\\evil.com", "app/3"]) expect(safeNext(bad)).toBe("/");
  });
});

describe("proxy (password gate)", () => {
  it("lets everything through when APP_PASSWORD is unset", async () => {
    vi.stubEnv("APP_PASSWORD", "");
    expect((await proxy(req("/app/1"))).headers.get("x-middleware-next")).toBe("1");
  });

  it("redirects pages to /login with ?next, and 401s API calls, without a valid cookie", async () => {
    vi.stubEnv("APP_PASSWORD", "s3cret");
    const page = await proxy(req("/app/1?tab=x"));
    expect(page.status).toBe(307);
    expect(page.headers.get("location")).toBe("http://localhost/login?next=%2Fapp%2F1%3Ftab%3Dx");
    expect((await proxy(req("/api/apps"))).status).toBe(401);
    expect((await proxy(req("/api/apps", "wrong"))).status).toBe(401);
  });

  it("allows the login page and a valid cookie", async () => {
    vi.stubEnv("APP_PASSWORD", "s3cret");
    expect((await proxy(req("/login"))).headers.get("x-middleware-next")).toBe("1");
    expect((await proxy(req("/api/login"))).headers.get("x-middleware-next")).toBe("1");
    expect((await proxy(req("/api/apps", await tokenFor("s3cret")))).headers.get("x-middleware-next")).toBe("1");
  });
});
