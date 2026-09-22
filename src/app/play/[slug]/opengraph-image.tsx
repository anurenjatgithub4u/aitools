import { ImageResponse } from "next/og";
import { PLAY_PAGES } from "../pages";

// One social / search preview card per game page (1200×630), baked at build time.
export const dynamic = "force-static";
export const dynamicParams = false;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const OWN_PAGE = new Set(["monopoly"]);   // has its own route, and its own image
export function generateStaticParams() { return PLAY_PAGES.filter((p) => !OWN_PAGE.has(p.slug)).map((p) => ({ slug: p.slug })); }

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = PLAY_PAGES.find((x) => x.slug === slug)!;
  const headline = p.h1.split(" — ")[0];
  const sub = `${p.description.split(".")[0]}.`;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between",
          padding: 64, background: "linear-gradient(160deg, #bfe3ef 0%, #6fb35e 100%)", fontFamily: "sans-serif", color: "#17332b",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 30, letterSpacing: 10, fontWeight: 700 }}>
          <span style={{ fontSize: 44 }}>🏙️</span> FINDURAI
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{ fontSize: 96 }}>{p.icon}</div>
            <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.05, maxWidth: 900 }}>{headline}</div>
          </div>
          <div style={{ fontSize: 30, maxWidth: 1000, opacity: 0.85 }}>{sub}</div>
        </div>
        <div style={{ display: "flex", gap: 14, fontSize: 26 }}>
          {["Free", "In your browser", "No download", "Phone or PC"].map((t) => (
            <div key={t} style={{ background: "rgba(23,51,43,.85)", color: "#fff", padding: "10px 20px", borderRadius: 999 }}>{t}</div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
