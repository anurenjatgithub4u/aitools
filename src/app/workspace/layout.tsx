import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { WORKSPACE_ENABLED } from "@/lib/workspace/config";

export const metadata: Metadata = {
  title: "Workspace | FindUrAI",
  description:
    "FindurAI Workspace — your AI second brain. Organize, connect, search and reuse prompts, workflows, research and AI knowledge.",
  robots: WORKSPACE_ENABLED ? undefined : { index: false, follow: false },
};

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  // Gated here rather than in each of the fifteen child pages — a layout wraps
  // the whole segment, so one check retires the entire feature. The matching
  // /api/workspace/* routes are gated in src/middleware.ts.
  if (!WORKSPACE_ENABLED) notFound();

  return <WorkspaceShell>{children}</WorkspaceShell>;
}
