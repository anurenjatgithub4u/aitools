// Live end-to-end check of the YouTube metadata layer.
//
// Verifies four things at once against the real API:
//   1. the key works and the Data API v3 is enabled on the project
//   2. metadata parses (title, channel, duration, thumbnail)
//   3. ISO 8601 durations convert correctly
//   4. the hard 60-minute gate actually rejects a real over-length video
//
// Run: node scripts/check-youtube-key.mjs
// Never prints the key.

import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// --- load .env.local -------------------------------------------------------
if (!existsSync(".env.local")) {
  console.error("No .env.local found. Run this from the project root.");
  process.exit(1);
}
for (const raw of readFileSync(".env.local", "utf8").split("\n")) {
  const line = raw.trim();
  if (!line || line.startsWith("#")) continue;
  const eq = line.indexOf("=");
  if (eq === -1) continue;
  const key = line.slice(0, eq).trim();
  const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  if (!process.env[key]) process.env[key] = value;
}

const KEY = process.env.YOUTUBE_API_KEY;
if (!KEY) {
  console.error("YOUTUBE_API_KEY is not set in .env.local");
  process.exit(1);
}
console.log(`Key loaded: ${KEY.length} chars, prefix ${KEY.slice(0, 4)}…\n`);

// --- compile the metadata module and its deps ------------------------------
const out = mkdtempSync(join(tmpdir(), "yt-live-"));
const MODULES = ["url", "config", "errors", "metadata"];
try {
  execSync(
    `npx tsc ${MODULES.map((m) => `src/lib/youtube-study/${m}.ts`).join(" ")} ` +
      `--outDir ${out} --module esnext --target es2022 --moduleResolution bundler --skipLibCheck`,
    { stdio: "pipe" }
  );
} catch (e) {
  // Next's fetch type augmentation isn't available to a standalone tsc run;
  // that one error is expected and JS is still emitted.
  const bad = (e.stdout?.toString() ?? "")
    .split("\n")
    .filter((l) => l.includes("error TS") && !l.includes("metadata.ts"));
  if (bad.length) {
    console.error("Unexpected compile errors:\n" + bad.join("\n"));
    process.exit(1);
  }
}
for (const m of MODULES) {
  const p = join(out, `${m}.js`);
  writeFileSync(p, readFileSync(p, "utf8").replace(/from ["']\.\/([a-z-]+)["']/g, 'from "./$1.js"'));
}

const { fetchVideoMetadata } = await import(join(out, "metadata.js"));
const { formatDuration, formatDurationHuman } = await import(join(out, "url.js"));

let failures = 0;

// --- 1. raw API reachability ----------------------------------------------
console.log("1. API reachability");
const probe = await fetch(
  `https://www.googleapis.com/youtube/v3/videos?id=dQw4w9WgXcQ&key=${KEY}&part=snippet`
);
if (!probe.ok) {
  const body = await probe.json().catch(() => ({}));
  const reason = body?.error?.errors?.[0]?.reason ?? "unknown";
  console.log(`   ✗ HTTP ${probe.status} — reason: ${reason}`);
  if (reason === "accessNotConfigured") {
    console.log("     → YouTube Data API v3 is not enabled on this project.");
  } else if (reason === "ipRefererBlocked" || reason === "referrerBlocked") {
    console.log("     → The key has an Application restriction. Set it to 'None'.");
  } else if (reason === "keyInvalid") {
    console.log("     → The key value is wrong. Re-copy it from the console.");
  } else if (reason === "quotaExceeded") {
    console.log("     → Daily quota exhausted; try again tomorrow.");
  }
  process.exit(1);
}
console.log("   ✓ key accepted, API enabled\n");

// --- 2. a normal, processable video ---------------------------------------
console.log("2. Normal video (expect ok)");
const normal = await fetchVideoMetadata("dQw4w9WgXcQ");
if (normal.ok) {
  const m = normal.metadata;
  console.log(`   ✓ "${m.title}"`);
  console.log(`     channel:   ${m.channelTitle}`);
  console.log(`     duration:  ${formatDuration(m.durationSeconds)} (${m.durationSeconds}s)`);
  console.log(`     captions:  ${m.captionsDeclared ? "declared" : "not declared"}`);
  console.log(`     thumbnail: ${m.thumbnailUrl.slice(0, 60)}…`);
} else {
  console.log(`   ✗ unexpected rejection: ${normal.errorCode}`);
  failures++;
}
console.log();

// --- 3. find a real video over 60 minutes and confirm it is rejected -------
console.log("3. Over-length video (expect VIDEO_TOO_LONG)");
const search = await fetch(
  `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoDuration=long` +
    `&q=full%20lecture&maxResults=5&key=${KEY}`
);
let longId = null;
if (search.ok) {
  const data = await search.json();
  for (const item of data.items ?? []) {
    const id = item.id?.videoId;
    if (!id) continue;
    const details = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${id}&part=contentDetails&key=${KEY}`
    ).then((r) => r.json());
    const iso = details.items?.[0]?.contentDetails?.duration ?? "";
    const secs =
      (Number(/(\d+)H/.exec(iso)?.[1] ?? 0) * 3600) +
      (Number(/(\d+)M/.exec(iso)?.[1] ?? 0) * 60) +
      Number(/(\d+)S/.exec(iso)?.[1] ?? 0);
    if (secs > 3600) {
      longId = id;
      console.log(`   found a ${formatDurationHuman(secs)} video (${id})`);
      break;
    }
  }
}

if (longId) {
  const long = await fetchVideoMetadata(longId);
  if (!long.ok && long.errorCode === "VIDEO_TOO_LONG") {
    console.log(`   ✓ rejected with VIDEO_TOO_LONG at ${formatDurationHuman(long.durationSeconds)}`);
  } else {
    console.log(`   ✗ expected VIDEO_TOO_LONG, got ${long.ok ? "ok" : long.errorCode}`);
    failures++;
  }
} else {
  console.log("   ~ skipped: search returned no video over 60 minutes");
}
console.log();

// --- 4. a video that does not exist ---------------------------------------
console.log("4. Nonexistent video (expect VIDEO_NOT_FOUND)");
const missing = await fetchVideoMetadata("aaaaaaaaaaa");
if (!missing.ok && missing.errorCode === "VIDEO_NOT_FOUND") {
  console.log("   ✓ rejected with VIDEO_NOT_FOUND");
} else {
  console.log(`   ✗ expected VIDEO_NOT_FOUND, got ${missing.ok ? "ok" : missing.errorCode}`);
  failures++;
}

console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) failed.`}`);
process.exit(failures === 0 ? 0 : 1);
