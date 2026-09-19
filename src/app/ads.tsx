// AdSense on the content pages only (about, games, guides, map…). The game route never loads this.
// Set NEXT_PUBLIC_ADSENSE_CLIENT (ca-pub-…) to switch it on; without it nothing renders.
// Auto ads (anchors, in-article) work with just the script; NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE adds fixed
// in-article units where <AdSlot /> is placed.
"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
const SLOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE;

export function AdScript() {
  if (!CLIENT) return null;
  return <Script async strategy="afterInteractive" src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`} crossOrigin="anonymous" />;
}

/** One responsive in-article unit. Renders nothing until both the client and a slot id are configured. */
export function AdSlot({ label = "Advertisement" }: { label?: string }) {
  const ref = useRef<HTMLModElement>(null);
  useEffect(() => {
    if (!CLIENT || !SLOT || !ref.current || ref.current.dataset.loaded) return;
    ref.current.dataset.loaded = "1";
    try { const w = window as Window & { adsbygoogle?: unknown[] }; (w.adsbygoogle = w.adsbygoogle || []).push({}); } catch { /* blocked */ }
  }, []);
  if (!CLIENT || !SLOT) return null;
  return (
    <aside className="adbox" aria-label={label}>
      <small>{label}</small>
      <ins ref={ref} className="adsbygoogle" style={{ display: "block", textAlign: "center" }} data-ad-client={CLIENT} data-ad-slot={SLOT} data-ad-layout="in-article" data-ad-format="fluid" />
    </aside>
  );
}
