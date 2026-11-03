import type { Metadata } from "next";
import Link from "next/link";
import { RankCheckerTool } from "@/components/tools/rank-checker-tool";
import { ToolPage } from "@/components/tools/tool-page";
import { PUBLIC_RANK_LIMIT } from "@/lib/tools/list";

export const metadata: Metadata = {
  title: "Free App Store Rank Checker: iOS Keyword Ranking",
  description:
    "Check where your iPhone app ranks for any keyword in the App Store, free and without signing up. US, UK, Germany, France, Spain, Italy, Japan, Brazil and India, with the top 5 apps.",
  keywords: ["free iOS keyword rank checker", "app store rank checker", "check app store ranking for keyword", "ios app keyword ranking"],
  alternates: { canonical: "/tools/rank-checker" },
};

export default function RankCheckerPage() {
  return (
    <ToolPage
      slug="rank-checker"
      title="Free App Store rank checker"
      intro="See where your app ranks for a keyword in the App Store, in 9 countries, and which apps beat you to the top 5."
      tool={<RankCheckerTool />}
    >
      <h2>How it works</h2>
      <p>
        We search the App Store in the country you pick, through Apple&apos;s public iTunes Search API, and look for your app in the top 200
        results. That&apos;s close to what a user in that country sees, though Apple personalizes some results, so the live App Store can differ
        by a place or two.
      </p>
      <h2>Reading the result</h2>
      <ul>
        <li>
          <strong>Top 10:</strong> people find you. Keep this keyword in your name, subtitle or keyword field.
        </li>
        <li>
          <strong>11–50:</strong> worth pushing. Moving the keyword into your subtitle, or getting more ratings, often lifts it.
        </li>
        <li>
          <strong>Not in the top 200:</strong> the keyword probably isn&apos;t in your metadata, or the competition is too strong. Check the top 5:
          if they all have tens of thousands of ratings, pick an easier keyword.
        </li>
      </ul>
      <h2>Limits</h2>
      <p>
        The free checker allows {PUBLIC_RANK_LIMIT.checks} checks an hour. A free account checks every keyword in every country in one go, keeps
        the history, and scores volume and difficulty. Not sure your keywords fit? Try the{" "}
        <Link href="/tools/keyword-field-counter">keyword field character counter</Link>.
      </p>
    </ToolPage>
  );
}
