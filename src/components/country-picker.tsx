"use client";

import { COUNTRIES, type CountryCode } from "@/lib/countries";
import { CountryFlag } from "@/components/country-flag";
import { cn } from "@/lib/utils";

/** Toggle chips for choosing target countries; at least one stays selected. */
export function CountryPicker({ value, onChange }: { value: CountryCode[]; onChange: (v: CountryCode[]) => void }) {
  const toggle = (code: CountryCode) => {
    const next = value.includes(code) ? value.filter((c) => c !== code) : [...value, code];
    if (next.length) onChange(COUNTRIES.map((c) => c.code).filter((c) => next.includes(c)));
  };
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Countries">
      {COUNTRIES.map((c) => {
        const on = value.includes(c.code);
        return (
          <button
            key={c.code}
            type="button"
            aria-pressed={on}
            title={`${c.name} · ${c.languageName}`}
            onClick={() => toggle(c.code)}
            className={cn(
              "flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors",
              on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            <CountryFlag code={c.code} />
            {c.code}
          </button>
        );
      })}
    </div>
  );
}
