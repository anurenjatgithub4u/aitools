// Live check of the Apify transcript provider.
//
// Dumps the actor's raw output shape (so the defensive field mapping in
// apify.ts can be verified against reality) and then runs the real provider.
//
// Run: node scripts/check-apify-transcript.mjs [videoId]
// Costs roughly $0.0035 per run. Never prints the token.

import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

if (!existsSync(".env.local")) {
  console.error("Run from the project root.");
  process.exit(1);
}
for (const raw of readFileSync(".env.local", "utf8").split("\n")) {
  const line = raw.trim();
  if (!line || line.startsWith("#")) continue;
  const eq = line.indexOf("=");
  if (eq === -1) continue;
  const k = line.slice(0, eq).trim();
  const v = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  if (!process.env[k]) process.env[k] = v;
}

const TOKEN = process.env.APIFY_TOKEN;
if (!TOKEN) {
  console.error("APIFY_TOKEN is not set in .env.local");
  process.exit(1);
}

const videoId = process.argv[2] || "dQw4w9WgXcQ";
const actor = process.env.APIFY_TRANSCRIPT_ACTOR || "codepoetry~youtube-transcript-ai-scraper";

console.log(`Token: ${TOKEN.length} chars, prefix ${TOKEN.slice(0, 10)}…`);
console.log(`Actor: ${actor}`);
console.log(`Video: ${videoId}\n`);

// --- 1. raw actor call, to learn the real output shape ---------------------
console.log("1. Calling the actor (this takes ~20-60s)…");
const started = Date.now();

const res = await fetch(
  `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${TOKEN}&timeout=180`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      startUrls: [{ url: `https://www.youtube.com/watch?v=${videoId}` }],
      languages: ["en"],
      subType: "both",
      outputFormats: ["json", "text"],
      wordLevel: false,
      enableAiFallback: false,
      maxAiMinutes: 0,
      skipAiFallbackIfLongerThan: 60,
    }),
  }
);

console.log(`   HTTP ${res.status} in ${((Date.now() - started) / 1000).toFixed(1)}s`);
if (!res.ok) {
  const body = await res.text().catch(() => "");
  console.error("   Body:", body.slice(0, 600));
  process.exit(1);
}

const items = await res.json();
if (!Array.isArray(items) || items.length === 0) {
  console.error("   Actor returned no dataset items.");
  console.error("   Raw:", JSON.stringify(items).slice(0, 600));
  process.exit(1);
}

const item = items[0];
console.log(`   items: ${items.length}\n`);

console.log("2. Output shape (what apify.ts must map)");
console.log("   top-level keys:", Object.keys(item).join(", "));

for (const key of Object.keys(item)) {
  const v = item[key];
  if (Array.isArray(v)) {
    console.log(`   ${key}: array[${v.length}]`);
    if (v.length && typeof v[0] === "object") {
      console.log(`     element keys: ${Object.keys(v[0]).join(", ")}`);
      console.log(`     first: ${JSON.stringify(v[0]).slice(0, 160)}`);
    }
  } else if (typeof v === "string") {
    console.log(`   ${key}: string(${v.length}) ${JSON.stringify(v.slice(0, 70))}`);
  } else if (v && typeof v === "object") {
    console.log(`   ${key}: object {${Object.keys(v).join(", ")}}`);
  } else {
    console.log(`   ${key}: ${JSON.stringify(v)}`);
  }
}

// --- 2. run the actual provider -------------------------------------------
console.log("\n3. Running the real provider (apify.ts)");

const out = mkdtempSync(join(tmpdir(), "yt-apify-"));
const MODULES = [
  "config", "url", "errors",
  "transcript/provider", "transcript/timedtext", "transcript/apify",
];
try {
  execSync(
    `npx tsc ${MODULES.map((m) => `src/lib/youtube-study/${m}.ts`).join(" ")} ` +
      `--outDir ${out} --module esnext --target es2022 --moduleResolution bundler --skipLibCheck`,
    { stdio: "pipe" }
  );
} catch (e) {
  const bad = (e.stdout?.toString() ?? "").split("\n").filter((l) => l.includes("error TS"));
  if (bad.length) {
    console.error("Compile errors:\n" + bad.join("\n"));
    process.exit(1);
  }
}
for (const f of ["config.js", "url.js", "errors.js", "transcript/provider.js", "transcript/timedtext.js", "transcript/apify.js"]) {
  const p = join(out, f);
  writeFileSync(
    p,
    readFileSync(p, "utf8").replace(/from ["'](\.\.?\/[a-z-]+(?:\/[a-z-]+)?)["']/g, 'from "$1.js"')
  );
}

const { apifyProvider } = await import(join(out, "transcript/apify.js"));
const result = await apifyProvider.fetch(videoId);

if (result.ok) {
  const t = result.transcript;
  console.log(`   ✓ source: ${t.source} | language: ${t.languageCode}`);
  console.log(`     segments: ${t.segments.length} | words: ${t.wordCount} | chars: ${t.charCount}`);
  console.log(`     timestamps: ${t.segments.length > 1 ? "preserved" : "NOT preserved (plain text only)"}`);
  if (t.segments.length > 1) {
    console.log(`     first segment: ${JSON.stringify(t.segments[0])}`);
  }
  console.log(`     text starts: ${JSON.stringify(t.text.slice(0, 140))}`);
  console.log("\nProvider works.");
} else {
  console.log(`   ✗ FAILED: ${result.errorCode}`);
  console.log("\nThe field mapping in apify.ts needs adjusting — compare with the shape above.");
  process.exit(1);
}
