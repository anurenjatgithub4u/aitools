import type { Metadata } from "next";
import Link from "next/link";
import { SITE, SITE_NAME } from "../seo";
import { Footer } from "../_components/Footer";

export const metadata: Metadata = {
  title: `Privacy Policy — ${SITE_NAME}`,
  description:
    "FindurAI Privacy Policy: what data we collect, how we use it, Google Analytics and AdSense, your rights, and how to contact us.",
  alternates: { canonical: "/privacy-policy/" },
  openGraph: {
    title: `Privacy Policy — ${SITE_NAME}`,
    description: "How FindurAI collects and uses data.",
    url: `${SITE}/privacy-policy/`,
  },
  robots: { index: true, follow: true },
};

const LAST_UPDATED = "26 September 2026";

export default function PrivacyPolicy() {
  return (
    <main className="landing page">
      <nav className="top">
        <Link href="/" className="brand">
          <span className="logo">🌍</span>
          <span><b>FINDURAI</b><small>ONE CITY · COUNTLESS STORIES</small></span>
        </Link>
        <Link href="/" className="cta">Play now →</Link>
      </nav>

      <section className="hero">
        <p className="eyebrow">Legal</p>
        <h1>Privacy Policy</h1>
        <p className="lede">
          Last updated: {LAST_UPDATED}. FindurAI (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) operates the website{" "}
          <a href={SITE}>{SITE}</a> (the &ldquo;Service&rdquo;). This page explains what information we collect,
          why we collect it, and your rights regarding your data.
        </p>
      </section>

      <section>
        <h2>1. Information We Collect</h2>

        <h3>a. Information You Provide</h3>
        <p>
          FindurAI does <strong>not</strong> require you to create an account, provide an email address, a phone number,
          or any real personal information. The only information you provide is:
        </p>
        <ul className="feat">
          <li><b>Display name</b> — a name you choose yourself (can be anything; your real name is not required)</li>
          <li><b>Avatar gender</b> — male or female, chosen from two options</li>
        </ul>
        <p>
          This information is stored <strong>only in your own browser&rsquo;s localStorage</strong> on your device.
          It is not transmitted to our servers except as described in the &ldquo;Multiplayer&rdquo; section below.
        </p>

        <h3>b. Automatically Collected Information</h3>
        <p>When you use FindurAI, we and our third-party partners may automatically collect:</p>
        <ul className="feat">
          <li><b>Log data</b> — IP address, browser type, pages visited, time and date of visit, time spent on pages</li>
          <li><b>Device information</b> — device type, operating system, screen resolution</li>
          <li><b>Usage data</b> — how you interact with the game and website</li>
        </ul>

        <h3>c. Multiplayer Real-Time Data</h3>
        <p>
          When you play in the multiplayer city, your display name, avatar gender, and in-game position are sent to our
          real-time relay server so other players can see you in the world. <strong>This data is ephemeral — it is only
          held in memory for as long as your session is active and is never written to a database or permanent storage.</strong>
        </p>
      </section>

      <section>
        <h2>2. Cookies</h2>
        <p>
          FindurAI itself does not set cookies for tracking purposes. However, our third-party service providers
          (Google Analytics and Google AdSense) use cookies. These are subject to their respective privacy policies
          (see Section 4). You can control or delete cookies through your browser settings.
        </p>
        <p>
          Your game progress (display name, points, coins, friend list, visited places) is stored in your
          browser&rsquo;s <strong>localStorage</strong> — not in cookies. This data stays on your device and is not
          transmitted to any server except the ephemeral multiplayer relay described above.
        </p>
      </section>

      <section>
        <h2>3. How We Use Your Information</h2>
        <p>We use the information we collect to:</p>
        <ul className="feat">
          <li>Operate and improve the FindurAI virtual world</li>
          <li>Show you to other players in the multiplayer city (display name and avatar only)</li>
          <li>Analyse how people use the site so we can make it better</li>
          <li>Serve relevant advertising through Google AdSense</li>
          <li>Detect and prevent technical issues</li>
        </ul>
        <p>We do <strong>not</strong> sell your personal information to third parties.</p>
      </section>

      <section>
        <h2>4. Third-Party Services</h2>

        <h3>Google Analytics 4</h3>
        <p>
          We use Google Analytics 4 to understand how visitors use our site. Google Analytics collects
          information such as how often you visit, what pages you visit, and what sites you came from before
          visiting FindurAI. Google&rsquo;s use of this data is governed by{" "}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google&rsquo;s Privacy Policy</a>.
          You can opt out of Google Analytics by installing the{" "}
          <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">Google Analytics Opt-out Browser Add-on</a>.
        </p>

        <h3>Google AdSense</h3>
        <p>
          We use Google AdSense to display advertisements. Google AdSense uses cookies to serve ads based on your
          prior visits to our website and other websites. Google&rsquo;s use of advertising cookies enables it and its
          partners to serve ads based on your visit to our site and/or other sites on the internet. You may opt out of
          personalized advertising by visiting{" "}
          <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">Google Ads Settings</a>.
          AdSense&rsquo;s use of data is governed by{" "}
          <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer">Google&rsquo;s advertising policies</a>.
        </p>

        <h3>Virtual Entertainment Disclaimer</h3>
        <p>
          FindurAI includes light virtual entertainment features at an in-game venue (Neon Palace), such as
          arcade-style mini-games. <strong>These are purely virtual entertainment features — no real
          money is wagered, no real money prizes are awarded, and no in-game currency can be converted to real money
          or redeemed for anything of real-world value.</strong> These features are for entertainment purposes only
          within the context of a virtual city simulation.
        </p>
      </section>

      <section>
        <h2>5. Data Retention</h2>
        <p>
          Since FindurAI stores your game data locally in your browser&rsquo;s localStorage, you can delete it at
          any time by clearing your browser data. Our real-time multiplayer relay does not retain any player data
          after a session ends. Google Analytics data is retained per{" "}
          <a href="https://support.google.com/analytics/answer/7667196" target="_blank" rel="noopener noreferrer">Google&rsquo;s data retention policies</a>.
        </p>
      </section>

      <section>
        <h2>6. Children&rsquo;s Privacy</h2>
        <p>
          FindurAI is intended for general audiences. We do not knowingly collect personal information from children
          under the age of 13 (or the relevant age of digital consent in your jurisdiction). Since we do not require
          any registration or personal information to play, we have no mechanism to verify users&rsquo; ages.
          If you are a parent or guardian and believe your child has provided us with personal information,
          please contact us at the address below so we can delete it.
        </p>
      </section>

      <section>
        <h2>7. Your Rights</h2>
        <p>
          Depending on your location, you may have rights under applicable data protection laws (such as the GDPR
          for EU residents, or the CCPA for California residents), including:
        </p>
        <ul className="feat">
          <li><b>Right of access</b> — to know what data we hold about you</li>
          <li><b>Right to deletion</b> — to request erasure of your data (your localStorage data can be cleared in your browser at any time)</li>
          <li><b>Right to opt out</b> — of personalised advertising (see Google Ads Settings above)</li>
          <li><b>Right to non-discrimination</b> — we will not treat you differently if you exercise your privacy rights</li>
        </ul>
        <p>
          Because FindurAI does not collect personal information beyond what is described in this policy, and stores
          game data locally on your own device, most requests can be fulfilled by simply clearing your browser data.
          For any other requests, please contact us.
        </p>
      </section>

      <section>
        <h2>8. Security</h2>
        <p>
          We take reasonable measures to help protect your information from loss, theft, misuse and unauthorised
          access. Our real-time relay server uses encrypted WebSocket connections (WSS). However, no method of
          transmission over the Internet or electronic storage is 100% secure.
        </p>
      </section>

      <section>
        <h2>9. Links to Other Websites</h2>
        <p>
          Our website may contain links to other sites. If you click on a third-party link, you will be directed to
          that site. We are not responsible for the content or privacy practices of those external sites.
        </p>
      </section>

      <section>
        <h2>10. Changes to This Privacy Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new
          policy on this page and updating the &ldquo;Last updated&rdquo; date. We encourage you to review this
          policy periodically.
        </p>
      </section>

      <section>
        <h2>11. Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact us at:{" "}
          <a href="mailto:privacy@findurai.com">privacy@findurai.com</a>
        </p>
      </section>

      <p className="lede">
        <Link href="/" className="cta">← Back to FindurAI City</Link>
        {" · "}<Link href="/terms/">Terms of Service</Link>
      </p>

      <Footer />
    </main>
  );
}
