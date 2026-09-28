import type { Metadata } from "next";
import Link from "next/link";
import { SITE, SITE_NAME } from "../seo";
import { Footer } from "../_components/Footer";

export const metadata: Metadata = {
  title: `Terms of Service — ${SITE_NAME}`,
  description:
    "FindurAI Terms of Service: acceptable use, rules of the virtual city, intellectual property, disclaimers, and limitation of liability.",
  alternates: { canonical: "/terms/" },
  openGraph: {
    title: `Terms of Service — ${SITE_NAME}`,
    description: "Rules and terms for using FindurAI.",
    url: `${SITE}/terms/`,
  },
  robots: { index: true, follow: true },
};

const LAST_UPDATED = "26 September 2026";

export default function Terms() {
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
        <h1>Terms of Service</h1>
        <p className="lede">
          Last updated: {LAST_UPDATED}. Please read these Terms of Service carefully before using FindurAI.
          By accessing or playing FindurAI, you agree to be bound by these terms.
        </p>
      </section>

      <section>
        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing and using FindurAI (&ldquo;the Service&rdquo;) at <a href={SITE}>{SITE}</a>, you accept and
          agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree to these Terms,
          please do not use the Service. We reserve the right to update these Terms at any time; continued use of the
          Service after changes constitutes acceptance.
        </p>
      </section>

      <section>
        <h2>2. Description of Service</h2>
        <p>
          FindurAI is a free, browser-based multiplayer 3D virtual world (the &ldquo;City&rdquo;) where users can
          explore, socialise, and play games together. The Service includes:
        </p>
        <ul className="feat">
          <li>A 3D virtual city accessible directly in the browser — no download required</li>
          <li>Real-time multiplayer interaction with other users</li>
          <li>In-city games: cricket, football, racing, zombie survival, pool, chess, Ludo, carrom</li>
          <li>A standalone Monopoly board game</li>
          <li>Virtual social features: chat, friend requests, gifts, dates</li>
          <li>Virtual entertainment venues, including a few light arcade-style mini-games for fun only</li>
        </ul>
        <p>
          <strong>FindurAI is entirely free to use.</strong> There are no paid subscriptions, no in-app purchases,
          and no real-money transactions of any kind.
        </p>
      </section>

      <section>
        <h2>3. Virtual Currency and Entertainment</h2>
        <p>
          FindurAI contains virtual in-game currency (coins and points) and virtual entertainment activities,
          including a few arcade-style mini-games at the in-game Neon Palace venue.
        </p>
        <ul className="feat">
          <li>All virtual currency exists solely within the game and has <strong>no real-world monetary value</strong></li>
          <li>Virtual currency cannot be purchased with real money, sold, transferred, or redeemed for anything of real-world value</li>
          <li>These mini-games are <strong>purely for entertainment</strong> — no real money is wagered and no real prizes are awarded</li>
          <li>Winning or losing in any simulated game has no financial consequence whatsoever</li>
        </ul>
      </section>

      <section>
        <h2>4. Eligibility and Age Requirements</h2>
        <p>
          FindurAI is intended for users aged 13 and over. By using the Service, you represent that you are at
          least 13 years old. Users under 18 should use the Service with parental awareness. Parents and guardians
          are responsible for monitoring their children&rsquo;s online activities.
        </p>
      </section>

      <section>
        <h2>5. User Conduct</h2>
        <p>When using FindurAI, you agree <strong>not</strong> to:</p>
        <ul className="feat">
          <li>Use offensive, abusive, harassing, or discriminatory language in chat</li>
          <li>Impersonate other users or real people</li>
          <li>Attempt to exploit bugs, glitches, or technical vulnerabilities</li>
          <li>Use automated bots, scripts, or cheating tools</li>
          <li>Transmit spam, malware, or disruptive content</li>
          <li>Interfere with the experience of other users</li>
          <li>Attempt to access parts of the Service you are not authorised to access</li>
          <li>Use the Service for any unlawful purpose</li>
        </ul>
        <p>
          We reserve the right to terminate access for users who violate these conduct rules, without notice.
        </p>
      </section>

      <section>
        <h2>6. Display Names and Avatars</h2>
        <p>
          You may choose any display name and avatar. You agree not to choose a display name that:
        </p>
        <ul className="feat">
          <li>Is offensive, hateful, or sexually explicit</li>
          <li>Impersonates a real person, brand, or public figure</li>
          <li>Infringes any third-party trademark or intellectual property rights</li>
        </ul>
        <p>
          We reserve the right to refuse or remove any display name that violates these guidelines.
        </p>
      </section>

      <section>
        <h2>7. Intellectual Property</h2>
        <p>
          All content on FindurAI — including the 3D world, game mechanics, artwork, code, sounds, and text — is
          the property of FindurAI and its developers, protected by copyright and other intellectual property laws.
          You may not copy, reproduce, distribute, or create derivative works from any part of the Service without
          our express written permission.
        </p>
        <p>
          The Monopoly-style board game included in FindurAI is an independently developed game inspired by
          classic board game mechanics. &ldquo;Monopoly&rdquo; is a registered trademark of Hasbro, Inc.
          FindurAI is not affiliated with, endorsed by, or sponsored by Hasbro, Inc.
        </p>
      </section>

      <section>
        <h2>8. Privacy</h2>
        <p>
          Your use of FindurAI is also governed by our <Link href="/privacy-policy/">Privacy Policy</Link>,
          which is incorporated into these Terms by reference. Please review the Privacy Policy to understand
          our practices.
        </p>
      </section>

      <section>
        <h2>9. Advertisements</h2>
        <p>
          FindurAI is free to use and is supported by advertising through Google AdSense. By using the Service,
          you agree to the display of advertisements. We are not responsible for the content of third-party
          advertisements.
        </p>
      </section>

      <section>
        <h2>10. Disclaimer of Warranties</h2>
        <p>
          FindurAI is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without any warranties of any kind,
          express or implied. We do not warrant that the Service will be uninterrupted, error-free, or free of
          viruses or other harmful components. We do not warrant that the results obtained from the use of the
          Service will be accurate or reliable. Your use of the Service is at your sole risk.
        </p>
      </section>

      <section>
        <h2>11. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by applicable law, FindurAI and its developers shall not be liable for
          any indirect, incidental, special, consequential, or punitive damages — including loss of data, loss of
          profits, or loss of goodwill — arising out of or in connection with your use of or inability to use the
          Service, even if we have been advised of the possibility of such damages. Our total liability to you for
          any claims arising under these Terms is limited to the amount you have paid us (which is zero, as the
          Service is free).
        </p>
      </section>

      <section>
        <h2>12. Third-Party Services and Links</h2>
        <p>
          FindurAI may contain links to third-party websites. We are not responsible for the content, privacy
          policies, or practices of any third-party sites. Accessing third-party links is at your own risk.
        </p>
      </section>

      <section>
        <h2>13. Termination</h2>
        <p>
          We may terminate or suspend your access to the Service immediately, without prior notice, for any
          conduct that we believe violates these Terms or is harmful to other users, us, third parties, or the
          Service. Upon termination, all provisions of these Terms which by their nature should survive will
          survive, including without limitation disclaimers and limitations of liability.
        </p>
      </section>

      <section>
        <h2>14. Governing Law</h2>
        <p>
          These Terms shall be governed by and construed in accordance with the laws of India,
          without regard to its conflict of law provisions. Any disputes arising from these Terms
          shall be subject to the exclusive jurisdiction of the courts of Kerala, India.
        </p>
      </section>

      <section>
        <h2>15. Contact</h2>
        <p>
          If you have any questions about these Terms, please contact us at:{" "}
          <a href="mailto:support@findurai.com">support@findurai.com</a>
        </p>
      </section>

      <p className="lede">
        <Link href="/" className="cta">← Back to FindurAI City</Link>
        {" · "}<Link href="/privacy-policy/">Privacy Policy</Link>
      </p>

      <Footer />
    </main>
  );
}
