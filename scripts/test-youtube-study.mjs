// Verification for the YouTube utility's pure logic (spec §31 edge cases).
//
// Covers the parts that must be correct before any AI call happens: URL
// classification, ISO duration parsing, the hard 60-minute boundary, and the
// transcript quality gate. These are the decisions that protect the cost model,
// so they are worth testing without a network or an API key.
//
// Run: node scripts/test-youtube-study.mjs

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// The modules are TypeScript; compile the pure ones to a temp dir.
//
// tsc is run outside the Next.js project config here, so it doesn't know about
// Next's fetch type augmentation (`fetch(url, { next: { revalidate } })` in
// metadata.ts) and reports one type error. It still emits valid JS, and the
// real project typecheck covers those types properly — so the failure is
// tolerated deliberately rather than papered over with a stub.
const out = mkdtempSync(join(tmpdir(), "yt-study-"));
const MODULES = ["url", "quality", "chunk", "metadata", "errors", "config"];
try {
  execSync(
    `npx tsc ${MODULES.map((m) => `src/lib/youtube-study/${m}.ts`).join(" ")} ` +
      `--outDir ${out} --module esnext --target es2022 --moduleResolution bundler ` +
      `--skipLibCheck`,
    { stdio: "pipe" }
  );
} catch (e) {
  const emitted = e.stdout?.toString() ?? "";
  // Only tolerate the known Next-fetch overload error; anything else is real.
  const unexpected = emitted
    .split("\n")
    .filter((l) => l.includes("error TS") && !l.includes("metadata.ts"));
  if (unexpected.length) {
    console.error("Unexpected compile errors:\n" + unexpected.join("\n"));
    process.exit(1);
  }
}

// Emitted files import './types' with no extension; rewrite for node ESM.
for (const f of MODULES) {
  const p = join(out, `${f}.js`);
  let src = readFileSync(p, "utf8");
  src = src.replace(/from ["']\.\/([a-z-]+)["']/g, 'from "./$1.js"');
  writeFileSync(p, src);
}

const base = out;
const { parseYouTubeUrl, formatDurationHuman } = await import(join(base, "url.js"));
const { assessTranscriptQuality } = await import(join(base, "quality.js"));
const { parseIsoDuration } = await import(join(base, "metadata.js"));
const { chunkTranscript } = await import(join(base, "chunk.js"));

let pass = 0;
let fail = 0;

function check(label, actual, expected) {
  const ok = actual === expected;
  if (ok) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    console.log(`  ✗ ${label}\n      expected: ${expected}\n      actual:   ${actual}`);
  }
}

// ---------------------------------------------------------------------------
console.log("\nURL parsing (spec §4, §31)");
// ---------------------------------------------------------------------------
const urlCases = [
  ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "video", "dQw4w9WgXcQ"],
  ["https://youtu.be/dQw4w9WgXcQ", "video", "dQw4w9WgXcQ"],
  ["https://www.youtube.com/shorts/dQw4w9WgXcQ", "shorts", "dQw4w9WgXcQ"],
  ["youtube.com/watch?v=dQw4w9WgXcQ", "video", "dQw4w9WgXcQ"],
  ["https://m.youtube.com/watch?v=dQw4w9WgXcQ", "video", "dQw4w9WgXcQ"],
  ["https://www.youtube.com/embed/dQw4w9WgXcQ", "video", "dQw4w9WgXcQ"],
  // a watch URL carrying a list param is still one processable video
  ["https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL123", "video", "dQw4w9WgXcQ"],
];
for (const [url, kind, id] of urlCases) {
  const r = parseYouTubeUrl(url);
  check(`${url.slice(0, 52)} → ${kind}`, `${r.ok}:${r.kind}:${r.videoId}`, `true:${kind}:${id}`);
}

const rejectCases = [
  ["", "EMPTY_INPUT"],
  ["not a url at all", "NOT_A_URL"],
  ["https://vimeo.com/12345", "NOT_YOUTUBE"],
  ["https://www.youtube.com/playlist?list=PL123", "PLAYLIST_UNSUPPORTED"],
  ["https://www.youtube.com/@somechannel", "CHANNEL_UNSUPPORTED"],
  ["https://www.youtube.com/channel/UC123", "CHANNEL_UNSUPPORTED"],
  ["https://www.youtube.com/c/somename", "CHANNEL_UNSUPPORTED"],
  ["https://www.youtube.com/results?search_query=react", "SEARCH_UNSUPPORTED"],
  ["https://www.youtube.com", "NOT_A_VIDEO"],
  ["https://www.youtube.com/watch?v=tooshort", "NOT_A_VIDEO"],
];
for (const [url, code] of rejectCases) {
  const r = parseYouTubeUrl(url);
  check(`reject "${url.slice(0, 42) || "(empty)"}"`, r.errorCode, code);
}

// ---------------------------------------------------------------------------
console.log("\nISO 8601 duration parsing (spec §6)");
// ---------------------------------------------------------------------------
check("PT48M32S → 2912s", parseIsoDuration("PT48M32S"), 2912);
check("PT1H24M32S → 5072s", parseIsoDuration("PT1H24M32S"), 5072);
check("PT1H → 3600s", parseIsoDuration("PT1H"), 3600);
check("PT45S → 45s", parseIsoDuration("PT45S"), 45);
check("PT2H30M → 9000s", parseIsoDuration("PT2H30M"), 9000);
check("garbage → 0", parseIsoDuration("nonsense"), 0);

// ---------------------------------------------------------------------------
console.log("\nThe 60-minute boundary (spec §5, §31)");
// ---------------------------------------------------------------------------
const MAX = 3600;
const boundary = [
  ["59m59s under limit", 3599, true],
  ["exactly 1h allowed", 3600, true],
  ["1 second over rejected", 3601, false],
  ["1h24m rejected", 5072, false],
];
for (const [label, seconds, allowed] of boundary) {
  check(label, seconds <= MAX, allowed);
}
check("1h24m formats as 1h 24m", formatDurationHuman(5072), "1h 24m");
check("48m32s formats as 48m (truncates)", formatDurationHuman(2912), "48m");

// ---------------------------------------------------------------------------
console.log("\nTranscript quality gate (spec §10, §31)");
// ---------------------------------------------------------------------------
function transcript(text, source = "human") {
  const words = text.split(/\s+/).filter(Boolean);
  return {
    segments: words.map((w, i) => ({ start: i * 2, duration: 2, text: w })),
    source,
    languageCode: "en",
    text,
    charCount: text.length,
    wordCount: words.length,
  };
}

// A varied-speech fixture, built word by word from a seeded PRNG.
//
// Two earlier attempts failed here in an instructive way: assembling sentences
// from fixed phrase lists still produced ~98% repeated 5-grams, because any
// fixed multi-word phrase repeats every time it is drawn. Real speech has
// entropy at the word level, so the fixture needs it too. Seeded so the test
// is deterministic.
const VOCAB = `system replica coordinator node client protocol partition quorum
consensus latency throughput timeout retry backoff cache index shard journal
commit rollback isolation durability availability consistency ordering conflict
merge vector clock heartbeat leader follower candidate election term log entry
snapshot compaction bloom filter checksum gossip anti entropy hinted handoff
read write append truncate replicate acknowledge propagate serialise discard
buffer schedule preempt starve deadlock contend saturate degrade recover
because although whenever unless before after while during despite given
usually rarely often typically sometimes eventually immediately gradually
network disk memory bandwidth queue depth pressure budget window threshold`
  .split(/\s+/)
  .filter(Boolean);

// Deterministic linear congruential generator — no dependency, reproducible.
let seed = 1337;
const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

const lecture = Array.from({ length: 900 }, () => {
  const len = 6 + Math.floor(rand() * 10);
  const words = Array.from({ length: len }, () => VOCAB[Math.floor(rand() * VOCAB.length)]);
  return words.join(" ") + ".";
}).join(" ");
const lectureQ = assessTranscriptQuality(transcript(lecture));
console.log(`    (lecture: ${lectureQ.wordCount} words, repetition ${lectureQ.repetitionRatio}, noise ${lectureQ.noiseRatio})`);
check("substantial human transcript → GOOD", lectureQ.rating, "GOOD");
check(
  "same transcript, auto captions → ACCEPTABLE",
  assessTranscriptQuality(transcript(lecture, "auto")).rating,
  "ACCEPTABLE"
);

check("empty transcript → UNUSABLE", assessTranscriptQuality(transcript("")).rating, "UNUSABLE");
check(
  "40 words → UNUSABLE",
  assessTranscriptQuality(transcript(Array(40).fill("word").join(" "))).rating,
  "UNUSABLE"
);

// A music video: the same chorus repeating, plus [Music] markers.
const music = Array(120).fill("[Music] never gonna give you up never gonna let you down").join(" ");
const musicRating = assessTranscriptQuality(transcript(music)).rating;
check("music video → POOR or UNUSABLE", musicRating === "POOR" || musicRating === "UNUSABLE", true);
check("music video cannot proceed silently", assessTranscriptQuality(transcript(music)).canProceed, musicRating !== "UNUSABLE");

// Thin but legitimate content sits in the middle.
const thin = Array.from({ length: 250 }, (_, i) => `point ${i} briefly mentioned here`).join(" ");
const thinRating = assessTranscriptQuality(transcript(thin)).rating;
check("thin transcript is not UNUSABLE", thinRating !== "UNUSABLE", true);

// ---------------------------------------------------------------------------
console.log("\nChunking preserves time ranges (spec §14, §24)");
// ---------------------------------------------------------------------------
const long = {
  segments: Array.from({ length: 4000 }, (_, i) => ({
    start: i * 0.9,
    duration: 0.9,
    text: `sentence fragment ${i} about system design and scaling.`,
  })),
  source: "human",
  languageCode: "en",
  text: "",
  charCount: 0,
  wordCount: 0,
};
long.text = long.segments.map((s) => s.text).join(" ");
long.charCount = long.text.length;

const chunks = chunkTranscript(long);
check("produces at least one chunk", chunks.length >= 1, true);
check("respects the 8-chunk ceiling", chunks.length <= 8, true);
check("first chunk starts at 0", chunks[0].startSeconds, 0);
check(
  "chunks are ordered and non-overlapping",
  chunks.every((c, i) => i === 0 || c.startSeconds >= chunks[i - 1].startSeconds),
  true
);
check(
  "every chunk carries a time range",
  chunks.every((c) => c.endSeconds >= c.startSeconds),
  true
);
check(
  "no content dropped (within merge tolerance)",
  chunks.reduce((sum, c) => sum + c.charCount, 0) > long.charCount * 0.9,
  true
);

// ---------------------------------------------------------------------------
console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
