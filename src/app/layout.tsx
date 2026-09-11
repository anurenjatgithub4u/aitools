import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], display: "swap", weight: ["500", "600"], variable: "--font-playfair" });

export const metadata: Metadata = {
  title: { default: "Wander · walk the world's wonders", template: "%s · Wander" },
  description:
    "Tiny low-poly worlds of real places — Kochi, Bengaluru, the Taj Mahal, Paris and Giza. Pick one, step inside, wander with other explorers, drive a tuk-tuk and collect local treats.",
  applicationName: "Wander",
  icons: { icon: "/favicon.svg" },
  openGraph: { type: "website", siteName: "Wander", title: "Wander · walk the world's wonders" },
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
