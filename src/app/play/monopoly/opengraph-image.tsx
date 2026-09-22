import { ImageResponse } from "next/og";

// Social / search preview card for the Monopoly page (1200×630), baked at build time.
export const dynamic = "force-static";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Monopoly game online free — play in your browser";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between",
          padding: 64, background: "linear-gradient(160deg, #f4f1ea 0%, #cfe3d4 100%)", fontFamily: "sans-serif", color: "#17332b",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 30, letterSpacing: 10, fontWeight: 700 }}>
          <span style={{ fontSize: 44 }}>🏙️</span> FINDURAI
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{ fontSize: 96 }}>🎩</div>
            <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.05, maxWidth: 900 }}>Play Monopoly online free</div>
          </div>
          <div style={{ fontSize: 30, maxWidth: 1000, opacity: 0.85 }}>
            A world tour of countries — you against three computer players. Houses, hotels, rent, jail.
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, fontSize: 26 }}>
          {["Free", "In your browser", "No download", "4 players"].map((t) => (
            <div key={t} style={{ background: "rgba(23,51,43,.85)", color: "#fff", padding: "10px 20px", borderRadius: 999 }}>{t}</div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
