import type { Metadata } from "next"
import { TOOL_DIRECTORY_ENABLED } from "@/lib/tools/config"

export const metadata: Metadata = {
  title: "Submit Your AI Tool",
  description: "Submit your AI tool to the FindurAI directory for review and listing.",
  alternates: { canonical: "/submit-tool" },
  robots: TOOL_DIRECTORY_ENABLED ? undefined : { index: false, follow: false },
}

export default function SubmitToolLayout({ children }: { children: React.ReactNode }) {
  return children
}
