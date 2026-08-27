import type { Metadata } from "next";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

export const metadata: Metadata = {
  title: "Workspace | FindUrAI",
  description:
    "FindurAI Workspace — your AI second brain. Organize, connect, search and reuse prompts, workflows, research and AI knowledge.",
};

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
