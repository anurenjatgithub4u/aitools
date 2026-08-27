import type { Metadata } from "next"

// Search-result permutations (?q=, ?category=) are thin/duplicate, so they are
// noindex,follow: crawlers follow the links out but don't index the variants.
// Canonical collapses every variant to the base /search URL.
export const metadata: Metadata = {
  title: "Search AI Tools",
  description: "Search and filter the best AI tools by task, category, pricing and features on FindurAI.",
  alternates: { canonical: "/search" },
  robots: { index: false, follow: true },
}

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children
}
