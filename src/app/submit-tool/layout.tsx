import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Submit Your AI Tool",
  description: "Submit your AI tool to the FindurAI directory for review and listing.",
  alternates: { canonical: "/submit-tool" },
}

export default function SubmitToolLayout({ children }: { children: React.ReactNode }) {
  return children
}
