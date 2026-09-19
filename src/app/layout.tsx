import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { SITE, SITE_NAME, TAGLINE, DESCRIPTION, KEYWORDS } from "./seo";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], display: "swap", weight: ["500", "600"], variable: "--font-playfair" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: TAGLINE, template: `%s · ${SITE_NAME}` },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: KEYWORDS,
  authors: [{ name: SITE_NAME, url: SITE }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "games",
  alternates: { canonical: "/" },
  icons: { icon: "/favicon.svg" },
  manifest: "/manifest.webmanifest",
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  openGraph: {
    type: "website",
    url: SITE,
    siteName: SITE_NAME,
    title: TAGLINE,
    description: DESCRIPTION,
    locale: "en_IN",
  },
  twitter: { card: "summary_large_image", title: TAGLINE, description: DESCRIPTION, creator: "@findurai" },
  formatDetection: { telephone: false },
  // AdSense site verification (the game page carries no ad script, so the account is claimed with this tag + /ads.txt)
  ...(process.env.NEXT_PUBLIC_ADSENSE_CLIENT ? { other: { "google-adsense-account": process.env.NEXT_PUBLIC_ADSENSE_CLIENT } } : {}),
};

export const viewport: Viewport = {
  themeColor: "#1e4d3a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// Structured data: the site, the game itself and what it is for. Helps the "free 3D city game" and
// "games like Little Kerala" queries show a rich result.
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", "@id": `${SITE}/#website`, url: SITE, name: SITE_NAME, description: DESCRIPTION, inLanguage: "en-IN" },
    {
      "@type": "VideoGame", "@id": `${SITE}/#game`, name: "FindurAI City", url: SITE, description: DESCRIPTION,
      applicationCategory: "GameApplication", operatingSystem: "Any (web browser)", gamePlatform: ["Web browser", "Android", "iOS", "Windows", "macOS"],
      genre: ["Open world", "Social", "Racing", "Sports", "Survival"], playMode: ["MultiPlayer", "SinglePlayer"], numberOfPlayers: { "@type": "QuantitativeValue", minValue: 1 },
      isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
      keywords: "free 3D city game, browser metaverse, virtual dating, hang out with friends, little kerala, kerala dhilber, kerala game, football, cricket, zombie survival, racing",
      author: { "@type": "Organization", name: SITE_NAME, url: SITE }, image: `${SITE}/opengraph-image`,
    },
    { "@type": "Organization", "@id": `${SITE}/#org`, name: SITE_NAME, url: SITE, logo: `${SITE}/favicon.svg` },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body>
        {children}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      </body>
    </html>
  );
}
