// Verification for the read-aloud logic.
//
// The alignment algorithm is the heart of the utility — if it mis-reports a
// word, the user is told they made a mistake they didn't make. These tests
// cover the cases the spec calls out plus the ones that broke naive
// implementations.
//
// Run: node scripts/test-reading.mjs

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const out = mkdtempSync(join(tmpdir(), "reading-"));
writeFileSync(join(out, "package.json"), JSON.stringify({ type: "module" }));
const MODULES = ["normalize", "alignment", "scoring", "pauses", "live"];
try {
  execSync(
    `npx tsc ${MODULES.map((m) => `src/lib/reading/${m}.ts`).join(" ")} ` +
      `--outDir ${out} --module esnext --target es2022 --moduleResolution bundler --skipLibCheck`,
    { stdio: "pipe" }
  );
} catch (e) {
  const bad = (e.stdout?.toString() ?? "").split("\n").filter((l) => l.includes("error TS"));
  if (bad.length) {
    console.error("Compile errors:\n" + bad.slice(0, 8).join("\n"));
    process.exit(1);
  }
}
for (const m of MODULES) {
  const p = join(out, `${m}.js`);
  writeFileSync(p, readFileSync(p, "utf8").replace(/from ["']\.\/([a-z-]+)["']/g, 'from "./$1.js"'));
}

const { tokenize, tokenizeForDisplay, isEndingSlip, areHomophones } = await import(join(out, "normalize.js"));
const { alignTranscriptToPassage, summarizeAlignment, wordsToPractice, statusByExpectedIndex } =
  await import(join(out, "alignment.js"));
const { calculateWpm, calculateScore, paceScore, calculateFluency } = await import(join(out, "scoring.js"));
const { classifyPause, summarizePauses, PauseTracker } = await import(join(out, "pauses.js"));
const { buildLiveView, liveAccuracy, liveWpm, frontierIndex } = await import(join(out, "live.js"));

let pass = 0, fail = 0;
const check = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label}\n      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`); }
};
const statuses = (expected, spoken) =>
  alignTranscriptToPassage(expected, spoken).map((w) => `${w.expected ?? "+" + w.spoken}:${w.status}`);

// ---------------------------------------------------------------------------
console.log("\nNormalisation");
// ---------------------------------------------------------------------------
check("strips punctuation and case",
  tokenize("The company, introduced!"), ["the", "company", "introduced"]);
check("expands contractions", tokenize("don't"), ["do", "not"]);
check("digits become words", tokenize("5 employees"), ["five", "employees"]);
check("hyphenated words split", tokenize("state-of-the-art"), ["state", "of", "the", "art"]);
check("curly apostrophes normalise", tokenize("don’t"), ["do", "not"]);
check("fillers stripped when asked",
  tokenize("um the uh company", { stripFillers: true }), ["the", "company"]);
check("fillers kept by default",
  tokenize("um the company").length, 3);
check("detects dropped ending", isEndingSlip("employees", "employee"), true);
check("detects dropped -ed", isEndingSlip("introduced", "introduce"), true);
check("different words are not ending slips", isEndingSlip("company", "computer"), false);
check("their/there are homophones", areHomophones("their", "there"), true);
check("unrelated words are not homophones", areHomophones("cat", "dog"), false);

const display = tokenizeForDisplay("The company, introduced a plan.");
check("display keeps original spelling", display.tokens[1].raw, "company,");
check("display maps to compare index", display.tokens[1].compareIndex, 1);
check("compare words are clean", display.compareWords, ["the", "company", "introduced", "a", "plan"]);

// ---------------------------------------------------------------------------
console.log("\nAlignment — the spec's own example");
// ---------------------------------------------------------------------------
// Expected: "The company introduced a new strategy for remote employees."
// Spoken:   "The company introduce a new strategy for remote employee."
const specCase = alignTranscriptToPassage(
  "The company introduced a new strategy for remote employees.",
  "The company introduce a new strategy for remote employee."
);
check("aligns 9 words", specCase.length, 9);
check("'introduced' marked incorrect", specCase[2].status, "incorrect");
check("'employees' marked incorrect", specCase[8].status, "incorrect");
check("everything else correct",
  specCase.filter((w) => w.status === "correct").length, 7);
check("ending slips identified as such",
  specCase.filter((w) => w.slip === "ending").length, 2);

// ---------------------------------------------------------------------------
console.log("\nAlignment — skipped words (the naive-approach killer)");
// ---------------------------------------------------------------------------
// A naive index comparison marks every word after the skip as wrong.
check("one skipped word doesn't cascade",
  statuses("I really enjoy reading books every evening", "I enjoy reading books every evening"),
  ["i:correct", "really:skipped", "enjoy:correct", "reading:correct", "books:correct",
   "every:correct", "evening:correct"]);

check("extra word doesn't cascade",
  statuses("I enjoy reading books", "I really enjoy reading books"),
  ["i:correct", "+really:extra", "enjoy:correct", "reading:correct", "books:correct"]);

check("skip in the middle stays local",
  statuses("one two three four five", "one two four five"),
  ["one:correct", "two:correct", "three:skipped", "four:correct", "five:correct"]);

check("stopping early marks the rest skipped",
  statuses("one two three four five", "one two"),
  ["one:correct", "two:correct", "three:skipped", "four:skipped", "five:skipped"]);

check("saying nothing skips everything",
  statuses("one two three", ""),
  ["one:skipped", "two:skipped", "three:skipped"]);

// ---------------------------------------------------------------------------
console.log("\nAlignment — harmless differences must not be red");
// ---------------------------------------------------------------------------
check("punctuation differences are not mistakes",
  alignTranscriptToPassage("Hello, world! How are you?", "hello world how are you")
    .every((w) => w.status === "correct"), true);
check("capitalisation is not a mistake",
  alignTranscriptToPassage("The Company", "the company").every((w) => w.status === "correct"), true);
check("contraction form is not a mistake",
  alignTranscriptToPassage("I don't know", "I do not know").every((w) => w.status === "correct"), true);
check("fillers are not extra words",
  alignTranscriptToPassage("the company grew", "um the uh company grew")
    .filter((w) => w.status === "extra").length, 0);
check("homophones are uncertain, never wrong",
  alignTranscriptToPassage("their plan", "there plan")[0].status, "uncertain");

// ---------------------------------------------------------------------------
console.log("\nSummary and practice list");
// ---------------------------------------------------------------------------
const summary = summarizeAlignment(specCase);
check("counts correct words", summary.correct, 7);
check("counts incorrect words", summary.incorrect, 2);
check("accuracy is 7/9", summary.accuracy, 78);
check("completion is 100% when all reached", summary.completion, 100);
check("uncertain counts toward accuracy",
  summarizeAlignment(alignTranscriptToPassage("their plan", "there plan")).accuracy, 100);

const partial = summarizeAlignment(alignTranscriptToPassage("one two three four", "one two"));
check("completion reflects stopping early", partial.completion, 50);

const streak = summarizeAlignment(alignTranscriptToPassage(
  "alpha bravo charlie delta echo foxtrot", "alpha bravo charlie WRONG echo foxtrot"));
check("best streak measured", streak.bestStreak, 3);

const practice = wordsToPractice(specCase);
check("practice list has the two mistakes", practice.map((p) => p.expected), ["introduced", "employees"]);
check("short function words excluded from practice",
  wordsToPractice(alignTranscriptToPassage("the cat sat", "a cat sat")).length, 0);

const byIndex = statusByExpectedIndex(specCase);
check("status map is positional", byIndex[2], "incorrect");
check("status map length matches passage", byIndex.length, 9);

// ---------------------------------------------------------------------------
console.log("\nScoring — speed must not buy a good score");
// ---------------------------------------------------------------------------
check("wpm from words and time", calculateWpm(150, 60_000), 150);
check("comfortable pace scores full", paceScore(150), 1);
check("slow pace scores lower", paceScore(60) < 1, true);
check("very fast pace is penalised", paceScore(300) < 1, true);

const careful = calculateScore({ accuracy: 95, fluency: 80, wpm: 140 });
const reckless = calculateScore({ accuracy: 45, fluency: 80, wpm: 260 });
check("careful reader beats fast-and-wrong reader", careful > reckless, true);
check("fast-and-wrong stays below 50", reckless < 50, true);
check("perfect reading scores high",
  calculateScore({ accuracy: 100, fluency: 95, wpm: 150 }) >= 95, true);
check("comprehension shifts the score",
  calculateScore({ accuracy: 90, fluency: 90, wpm: 150, comprehension: 0 }) <
  calculateScore({ accuracy: 90, fluency: 90, wpm: 150, comprehension: 100 }), true);

// ---------------------------------------------------------------------------
console.log("\nPauses — natural breathing must not be punished");
// ---------------------------------------------------------------------------
check("word gaps are not pauses", classifyPause(400), null);
check("a breath is a short pause", classifyPause(1000), "short");
check("a beat at a full stop is normal", classifyPause(2000), "normal");
check("stopping is a long pause", classifyPause(5000), "long");

check("short pauses don't hurt continuity",
  summarizePauses([{ durationMs: 900, kind: "short", atMs: 0 },
                   { durationMs: 1000, kind: "short", atMs: 1 }]).continuity, 1);
check("normal pauses don't hurt continuity",
  summarizePauses([{ durationMs: 2000, kind: "normal", atMs: 0 }]).continuity, 1);
check("long pauses reduce continuity",
  summarizePauses([{ durationMs: 4000, kind: "long", atMs: 0 }]).continuity < 1, true);

const tracker = new PauseTracker(0);
tracker.mark(0);
tracker.mark(500);    // word gap, ignored
tracker.mark(4000);   // long pause
check("tracker records only real pauses", tracker.getEvents().length, 1);
check("tracker classifies correctly", tracker.getEvents()[0].kind, "long");
tracker.reset(0);
check("tracker resets", tracker.getEvents().length, 0);

check("fluency drops with many long pauses",
  calculateFluency(150, 100, summarizePauses(Array(5).fill({ durationMs: 4000, kind: "long", atMs: 0 }))) <
  calculateFluency(150, 100, summarizePauses([])), true);

// ---------------------------------------------------------------------------
console.log("\nLive view — mid-reading must not count unread words as failed");
// ---------------------------------------------------------------------------
// Regression for the bug seen in testing: reading two lines of a long passage
// reported 10% accuracy and 343 WPM, because alignment marks every unreached
// word "skipped" and those were counted as attempted.
const PASSAGE =
  "Walking is one of the simplest habits a person can build, yet it is often " +
  "overlooked because it seems too ordinary to matter. Unlike many forms of " +
  "exercise, walking requires no special equipment, no membership, and very " +
  "little planning.";

const readSoFar = "Walking is one of the simplest habits a person can build";
const midway = buildLiveView(PASSAGE, readSoFar, "");

check("unread words are not given a status", midway.statuses.length, 11);
check("attempted counts only words reached", midway.attempted, 11);
check("all eleven matched", midway.matched, 11);
check("live accuracy is 100%, not 10%", liveAccuracy(midway), 100);
check("cursor sits at the next word", midway.cursor, 11);
check("spoken count comes from the transcript", midway.spokenWordCount, 11);

// 11 words in 36 seconds is ~18 WPM, not 343.
check("live WPM reflects words actually spoken", liveWpm(midway, 36_000), 18);
check("WPM suppressed in the first seconds", liveWpm(midway, 2000), null);

// A finished reading still reports skipped words — the live view is the only
// place truncation applies.
const finishedAligned = alignTranscriptToPassage(PASSAGE, readSoFar);
check("finished alignment still marks the rest skipped",
  summarizeAlignment(finishedAligned).skipped > 0, true);

// ---------------------------------------------------------------------------
console.log("\nLive view — interim results paint green, never red");
// ---------------------------------------------------------------------------
const withInterim = buildLiveView(PASSAGE, "Walking is one of", "the simplest habits");
check("interim words are highlighted immediately", withInterim.attempted, 7);
check("interim words show as correct", withInterim.statuses[6], "correct");

// A misread word in interim text must stay neutral until the engine commits.
const wrongInterim = buildLiveView(PASSAGE, "Walking is one of", "the simplex habit");
check("interim mismatch is NOT marked red",
  wrongInterim.statuses.filter((s) => s === "incorrect").length, 0);

// Once finalised, the same mistake does show.
const wrongFinal = buildLiveView(PASSAGE, "Walking is one of the simplex", "");
check("finalised mismatch IS marked incorrect",
  wrongFinal.statuses.filter((s) => s === "incorrect").length >= 1, true);

check("frontier ignores trailing skips",
  frontierIndex(alignTranscriptToPassage("one two three four five", "one two")), 1);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
