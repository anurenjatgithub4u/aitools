import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";
import { safeNext } from "@/lib/auth";

export const metadata: Metadata = { title: "Log in · Keyword Planner", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <LoginForm next={safeNext(next)} />
    </main>
  );
}
