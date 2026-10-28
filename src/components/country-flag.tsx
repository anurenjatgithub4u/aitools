import { getCountry } from "@/lib/countries";
import { cn } from "@/lib/utils";

// "Twemoji Country Flags" only contains flag glyphs and is loaded (by Providers) only on systems
// that can't draw flag emoji, e.g. Windows. Elsewhere the native emoji font is used.
const FLAG_FONT = '"Twemoji Country Flags", "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

export function CountryFlag({ code, className }: { code: string; className?: string }) {
  const c = getCountry(code);
  return (
    <span role="img" aria-label={c.name} title={c.name} className={cn("leading-none", className)} style={{ fontFamily: FLAG_FONT }}>
      {c.flag}
    </span>
  );
}

export function CountryFlags({ codes }: { codes: string[] }) {
  return (
    <span className="inline-flex gap-1 align-middle">
      {codes.map((c) => (
        <CountryFlag key={c} code={c} />
      ))}
    </span>
  );
}
