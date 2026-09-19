// /ads.txt — AdSense needs this at the site root to verify the publisher. Empty until the client id is set.
export const dynamic = "force-static";

export function GET() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const pub = client?.replace(/^ca-/, "");
  const body = pub ? `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n` : "# ads.txt — no ad network configured yet\n";
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
