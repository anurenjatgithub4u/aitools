import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { SITE, SITE_NAME, TAGLINE, DESCRIPTION } from "./seo";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], display: "swap", weight: ["500", "600"], variable: "--font-playfair" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: TAGLINE, template: `%s · ${SITE_NAME}` },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "free browser game", "3D open world game online", "no download game", "virtual city to hang out with friends", "metaverse in browser",
    "hangout with friends online game", "multiplayer city game", "tuk-tuk driving game", "car racing game online", "chess online free",
    "ludo online", "carrom online", "8 ball pool online", "treasure hunt game", "low poly game", "play in browser mobile game",
    "FindurAI",
  ],
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
};

export const viewport: Viewport = {
  themeColor: "#1e4d3a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body>{children}</body>
    </html>
  );
}
