// The logo as plain JSX for next/og (Satori): flexbox and inline SVG only, no Tailwind.

export function BrandMark({ size }: { size: number }) {
  const glyph = Math.round(size * 0.58);
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: Math.round(size * 0.22),
        background: "linear-gradient(135deg, #6366f1 0%, #06b6d4 55%, #10b981 100%)",
      }}
    >
      <svg width={glyph} height={glyph} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2.6} strokeLinecap="round">
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="M15.5 15.5 L21 21" />
      </svg>
    </div>
  );
}
