import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SITE, SITE_NAME } from "../../seo";
import { AdScript, AdSlot } from "../../ads";
import { PLAY_PAGES } from "../pages";

export const dynamic = "force-static";
export const dynamicParams = false;

const OWN_PAGE = new Set(['monopoly']);   // games with a page of their own under /play/
export function generateStaticParams() { return PLAY_PAGES.filter((p) => !OWN_PAGE.has(p.slug)).map((p) => ({ slug: p.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = PLAY_PAGES.find((x) => x.slug === slug);
  if (!p) return {};
  return {
    title: { absolute: p.title },
    description: p.description,
    keywords: p.keywords,
    alternates: { canonical: `/play/${p.slug}/` },
    openGraph: { title: p.title, description: p.description, url: `${SITE}/play/${p.slug}/`, type: "website" },
  };
}

export default async function PlayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = PLAY_PAGES.find((x) => x.slug === slug);
  if (!p) notFound();
  const play = `/?start=${p.start}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": `${SITE}/play/${p.slug}/#page`, url: `${SITE}/play/${p.slug}/`, name: p.title, description: p.description, isPartOf: { "@id": `${SITE}/#website` }, about: { "@id": `${SITE}/#game` } },
      { "@type": "FAQPage", mainEntity: p.faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
      { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE }, { "@type": "ListItem", position: 2, name: "Games", item: `${SITE}/games/` }, { "@type": "ListItem", position: 3, name: p.h1, item: `${SITE}/play/${p.slug}/` }] },
    ],
  };
  const others = PLAY_PAGES.filter((x) => x.slug !== p.slug);
  return (
    <main className="landing page">
      <AdScript />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="top"><Link href="/" className="brand"><span className="logo">🌍</span><span><b>FINDURAI</b><small>ONE CITY · COUNTLESS STORIES</small></span></Link><Link href={play} className="cta">Play now →</Link></nav>
      <section className="hero">
        <p className="eyebrow">{p.icon} Free · in your browser · no download</p>
        <h1>{p.h1}</h1>
        <p className="lede">{p.intro}</p>
        <p><Link href={play} className="cta big">{p.icon} Play now — free</Link></p>
      </section>

      <AdSlot />

      {p.sections.map(([h, body], i) => (
        <section key={h}>
          <h2>{h}</h2>
          <p>{body}</p>
          {i === 1 && <AdSlot />}
        </section>
      ))}

      <section>
        <h2>Questions</h2>
        {p.faq.map(([q, a]) => (<p key={q}><b>{q}</b><br />{a}</p>))}
      </section>

      <section>
        <h2>More to play in the same city</h2>
        <p>{others.map((o, i) => (<span key={o.slug}>{i > 0 && ' · '}<Link href={`/play/${o.slug}/`}>{o.icon} {o.h1.replace(/^(Play |A |Free |Play a )/i, '').split(' — ')[0]}</Link></span>))}</p>
      </section>

      <AdSlot />

      <p className="lede"><Link href={play} className="cta">{p.icon} Play free now →</Link> · <Link href="/how-to-play/">How to play</Link> · <Link href="/map/">City map</Link> · <Link href="/games/">All games</Link></p>
    </main>
  );
}
