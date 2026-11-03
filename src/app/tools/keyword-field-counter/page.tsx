import type { Metadata } from "next";
import Link from "next/link";
import { ToolPage } from "@/components/tools/tool-page";
import { KeywordFieldTool } from "@/components/tools/keyword-field-tool";

export const metadata: Metadata = {
  title: "App Store Keyword Field Character Counter (Free)",
  description:
    "Free App Store keyword field checker: counts the 100-character limit, removes duplicates and words already in your app name or subtitle, and gives you a clean comma-separated list to paste.",
  keywords: ["app store keyword field character limit", "app store keyword counter", "ios keyword field 100 characters", "app store connect keywords"],
  alternates: { canonical: "/tools/keyword-field-counter" },
};

export default function KeywordFieldCounterPage() {
  return (
    <ToolPage
      slug="keyword-field-counter"
      title="App Store keyword field character counter"
      intro="Paste your keywords and get a clean list that fits Apple's 100-character keyword field: no spaces, no duplicates, no words you already use in your app name or subtitle."
      tool={<KeywordFieldTool />}
    >
      <h2>The rules this tool applies</h2>
      <ul>
        <li>
          <strong>100 characters</strong> for the keyword field, <strong>30</strong> for the app name and <strong>30</strong> for the subtitle, per
          language. Each country&apos;s App Store has its own set.
        </li>
        <li>
          <strong>Commas, no spaces.</strong> &quot;habit, routine&quot; wastes a character that &quot;habit,routine&quot; doesn&apos;t.
        </li>
        <li>
          <strong>Don&apos;t repeat words from your name or subtitle.</strong> They&apos;re already searchable, so repeating them in the keyword field
          only takes space.
        </li>
        <li>
          <strong>List each word once.</strong> Apple combines words from your name, subtitle and keywords, so &quot;habit,tracker&quot; can match
          &quot;habit tracker&quot;.
        </li>
      </ul>
      <h2>What to do with the space you free up</h2>
      <p>
        Fill it with more keywords that people actually search, ideally ones where the top apps aren&apos;t giants. Our{" "}
        <Link href="/tools/rank-checker">free rank checker</Link> shows where you rank for any keyword, and a free account finds new keywords and
        scores how hard each one is.
      </p>
    </ToolPage>
  );
}
