import { NextRequest, NextResponse } from "next/server";

// Extract metadata from a URL so "Save a link" can prefill title/description/tags.
// Detects YouTube / GitHub / docs links for smarter defaults (MVP plan, Phase 2).

function detectKind(url: URL): { kind: string; emoji: string; tags: string[] } {
  const host = url.hostname.replace(/^www\./, "");
  if (host === "youtube.com" || host === "youtu.be") {
    return { kind: "youtube", emoji: "📺", tags: ["youtube", "video"] };
  }
  if (host === "github.com") {
    return { kind: "github", emoji: "🐙", tags: ["github", "code"] };
  }
  if (host.startsWith("docs.") || url.pathname.startsWith("/docs")) {
    return { kind: "docs", emoji: "📄", tags: ["documentation"] };
  }
  return { kind: "link", emoji: "🔗", tags: [] };
}

function pick(html: string, patterns: RegExp[]): string {
  for (const rx of patterns) {
    const m = html.match(rx);
    if (m?.[1]) return m[1].trim();
  }
  return "";
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

export async function GET(req: NextRequest) {
  try {
    const raw = req.nextUrl.searchParams.get("url") || "";
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    let url: URL;
    try {
      url = new URL(withProtocol);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const { kind, emoji, tags } = detectKind(url);
    let title = "";
    let description = "";

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url.toString(), {
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; FindUrAI/1.0)" },
        redirect: "follow",
      });
      clearTimeout(timer);
      const html = (await res.text()).slice(0, 200_000);
      title = decodeEntities(
        pick(html, [
          /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
          /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
          /<title[^>]*>([^<]+)<\/title>/i,
        ])
      );
      description = decodeEntities(
        pick(html, [
          /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
          /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
          /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i,
        ])
      );
    } catch {
      // Unreachable page still gets saved — just without metadata
    }

    return NextResponse.json({
      url: url.toString(),
      title: title || url.hostname.replace(/^www\./, ""),
      description: description.slice(0, 500),
      kind,
      emoji,
      tags,
    });
  } catch (error: any) {
    console.error("Workspace extract error:", error);
    return NextResponse.json({ error: "Failed to read the link" }, { status: 500 });
  }
}
