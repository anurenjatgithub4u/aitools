import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { SiteHeader } from "@/components/site-header";
import { authEnabled } from "@/lib/firebase/config";
import { safeNext } from "@/lib/safe-next";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in · Keyword Planner" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ next?: string; mode?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { next, mode } = await searchParams;
  const target = safeNext(next);
  if (authEnabled && (await getCurrentUser())) redirect(target);

  return (
    <>
      <SiteHeader />
      <main className="grid place-items-center px-4 py-12 sm:py-20">
        {authEnabled ? (
          <AuthForm next={target} initialMode={mode === "signup" ? "signup" : "signin"} />
        ) : (
          <div className="max-w-sm rounded-2xl border bg-card p-6 text-center text-sm">
            <p className="font-medium">Sign-in is off on this machine</p>
            <p className="mt-1 text-muted-foreground">Firebase isn&apos;t configured, so you&apos;re using local mode with no account needed.</p>
            <Link href="/" className="mt-4 inline-block underline">
              Go to your projects
            </Link>
          </div>
        )}
      </main>
    </>
  );
}
