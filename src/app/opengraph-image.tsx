import { ImageResponse } from "next/og";
import { BrandMark } from "@/components/seo/brand-mark";
import { SITE } from "@/lib/site";

export const alt = `${SITE.name}: ${SITE.title}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The same one-keyword-per-country idea as the home page hero (Latin script only: the image
// renderer has no CJK font).
const EXAMPLES = [
  ["US", "habit tracker"],
  ["DE", "gewohnheitstracker"],
  ["BR", "rastreador de hábitos"],
];

/** The preview card shown when findurai.com is shared on social sites and chat apps. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          color: "#fafafa",
          // Satori (the image renderer) handles a single linear gradient reliably; stacked radials crash it
          backgroundColor: "#0a0a0a",
          backgroundImage: "linear-gradient(135deg, #1e1b4b 0%, #0a0a0a 45%, #083344 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <BrandMark size={64} />
          <div style={{ fontSize: 34, fontWeight: 600 }}>{SITE.name}</div>
          {/* one text node: Satori rejects a non-flex element with several children */}
          <div style={{ fontSize: 26, color: "#a1a1aa" }}>{`by ${SITE.brand}`}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>Find the words people</div>
          <div style={{ display: "flex", fontSize: 72, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2, color: "#22d3ee" }}>really search</div>
          <div style={{ fontSize: 30, color: "#a1a1aa", marginTop: 6 }}>App Store keyword research, localized for 9 countries</div>
        </div>

        <div style={{ display: "flex", gap: 14 }}>
          {EXAMPLES.map(([country, phrase]) => (
            <div
              key={country}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 20px", borderRadius: 16, border: "1px solid #27272a", background: "#18181b", fontSize: 24 }}
            >
              <span style={{ color: "#71717a", fontWeight: 600 }}>{country}</span>
              <span>{phrase}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
