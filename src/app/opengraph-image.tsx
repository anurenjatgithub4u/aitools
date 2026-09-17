import { ImageResponse } from "next/og";
import { TAGLINE } from "./seo";

// Social preview card (1200×630), rendered at build time for the static export.
export const dynamic = "force-static";
export const alt = TAGLINE;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
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
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, maxWidth: 1000 }}>A whole city to explore. Free, in your browser.</div>
          <div style={{ fontSize: 32, maxWidth: 1000, opacity: 0.85 }}>
            Hang out & date · drive · 960 m speedway · football · cricket · zombie night · pool, chess, Ludo, carrom · no download
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, fontSize: 26 }}>
          {["🛺 Drive", "🏁 Race", "⚽ Football", "🏏 Cricket", "🧟 Zombies", "💰 Cash hunt", "🎱 Pool", "♟️ Chess"].map((t) => (
            <div key={t} style={{ background: "rgba(23,51,43,.85)", color: "#fff", padding: "10px 20px", borderRadius: 999 }}>{t}</div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
