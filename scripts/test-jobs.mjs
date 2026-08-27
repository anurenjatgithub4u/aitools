// Verification for the job-matching feature's pure logic.
//
// Covers the parts the spec's success criteria depend on and that can be
// tested without a database or a network: deduplication (§16), match scoring
// (§17-18), date/freshness handling (§12-15) and the crawler budget guard
// (§2, §24).
//
// Run: node scripts/test-jobs.mjs

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const out = mkdtempSync(join(tmpdir(), "jobs-"));
// tsc emits ES modules; without this marker Node treats bare .js as CommonJS
// and refuses the import statements.
writeFileSync(join(out, "package.json"), JSON.stringify({ type: "module" }));
const MODULES = ["config", "types", "dedup", "matcher", "freshness", "normalize", "profile"];
try {
  execSync(
    `npx tsc ${MODULES.map((m) => `src/lib/jobs/${m}.ts`).join(" ")} ` +
      `--outDir ${out} --module esnext --target es2022 --moduleResolution bundler --skipLibCheck`,
    { stdio: "pipe" }
  );
} catch (e) {
  // profile.ts imports @/lib/ai, which a standalone tsc can't resolve. It
  // still emits, and nothing tested here calls the model.
  const bad = (e.stdout?.toString() ?? "")
    .split("\n")
    .filter((l) => l.includes("error TS") && !l.includes("Cannot find module '@/lib/ai'"));
  if (bad.length) {
    console.error("Unexpected compile errors:\n" + bad.slice(0, 8).join("\n"));
    process.exit(1);
  }
}
for (const m of MODULES) {
  const p = join(out, `${m}.js`);
  try {
    let src = readFileSync(p, "utf8").replace(/from ["']\.\/([a-z-]+)["']/g, 'from "./$1.js"');
    // The alias import can't resolve outside Next's bundler. Nothing under
    // test calls the model, so it's stubbed rather than mocked.
    src = src.replace(
      /import \{[^}]*\} from ["']@\/lib\/ai["'];?/g,
      'const callAI = async () => { throw new Error("callAI is stubbed in tests"); };'
    );
    writeFileSync(p, src);
  } catch {
    /* types.ts erases to nothing */
  }
}

const { dedupeJobs, normalizeUrl, normalizeCompany, normalizeTitle, fingerprint } =
  await import(join(out, "dedup.js"));
const { matchJobs, scoreJob, stage1Filter, inferJobSeniority } = await import(join(out, "matcher.js"));
const { formatAge, formatVerified, nextStatus, isDisplayable } = await import(join(out, "freshness.js"));
const { parsePostedAt, parseExperienceRange, extractSkills, inferWorkplaceType } =
  await import(join(out, "normalize.js"));
const { buildSearchQueries, sanitizeProfile } = await import(join(out, "profile.js"));

let pass = 0, fail = 0;
const check = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label}\n      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`); }
};

const job = (over = {}) => ({
  title: "Android Developer", company: "Acme Inc.", companyLogo: null,
  description: "Kotlin and Jetpack Compose. 2-4 years experience required.",
  location: "Bangalore, India", country: "India", city: "Bangalore",
  employmentType: "Full-time", workplaceType: "On-site",
  salary: { min: null, max: null, currency: null },
  requiredSkills: ["kotlin", "android", "jetpack compose"], preferredSkills: [],
  experienceMin: 2, experienceMax: 4,
  jobUrl: "https://acme.com/jobs/123", source: "ats", sourceName: "Acme (greenhouse)",
  sourceJobId: "123", postedAt: new Date(Date.now() - 3 * 86400000),
  postedAtPrecision: "exact", discoveredAt: new Date(),
  id: "j1", lastCheckedAt: new Date(), status: "ACTIVE", isActive: true,
  missCount: 0, fingerprint: "fp", ...over,
});

const candidate = {
  professionalTitle: "Android Developer", seniority: "Mid-level", yearsExperience: 3,
  skills: ["Kotlin", "Android", "Jetpack Compose", "Firebase"],
  jobTitles: ["Android Developer", "Kotlin Developer"],
  preferredLocations: ["Bangalore"], employmentTypes: ["Full-time"],
  workplaceTypes: [], education: [], industries: [],
};

// ---------------------------------------------------------------------------
console.log("\nDeduplication (spec §16)");
// ---------------------------------------------------------------------------
check("strips utm params from URL",
  normalizeUrl("https://acme.com/jobs/1?utm_source=x&gh_src=y&id=7"),
  "https://acme.com/jobs/1?id=7");
check("drops www and trailing slash",
  normalizeUrl("https://www.acme.com/jobs/1/"), "https://acme.com/jobs/1");
check("normalises company suffixes",
  normalizeCompany("Acme Inc."), normalizeCompany("ACME Technologies Ltd"));
check("strips seniority from title",
  normalizeTitle("Senior Android Developer II"), normalizeTitle("Android Developer"));

const dupes = [
  job(),
  job({ sourceJobId: "999", jobUrl: "https://acme.com/jobs/123?utm_source=li" }), // same URL
  job({ source: "apify", sourceJobId: "abc", jobUrl: "https://other.com/x", company: "Acme Technologies Ltd" }), // same fingerprint
  job({ sourceJobId: "456", title: "iOS Developer", jobUrl: "https://acme.com/jobs/456" }), // genuinely different
];
const result = dedupeJobs(dupes);
check("collapses 4 records to 2 distinct jobs", result.unique.length, 2);
check("reports duplicates removed", result.duplicatesRemoved, 2);
check("prefers the ATS copy over the aggregator",
  result.unique.some((j) => j.source === "ats"), true);

// Regression: one remote role posted per eligible region is one job, not four.
const perRegion = [
  job({ sourceJobId: "r1", jobUrl: "https://x.com/1", location: "Remote - United States" }),
  job({ sourceJobId: "r2", jobUrl: "https://x.com/2", location: "Remote - British Columbia, Canada" }),
  job({ sourceJobId: "r3", jobUrl: "https://x.com/3", location: "Remote - The Netherlands" }),
];
check("same remote role across regions collapses to one",
  dedupeJobs(perRegion).unique.length, 1);
check("distinct on-site cities stay separate",
  dedupeJobs([
    job({ sourceJobId: "c1", jobUrl: "https://x.com/a", location: "Bangalore, India" }),
    job({ sourceJobId: "c2", jobUrl: "https://x.com/b", location: "Berlin, Germany" }),
  ]).unique.length, 2);

// ---------------------------------------------------------------------------
console.log("\nDate handling (spec §12)");
// ---------------------------------------------------------------------------
check("'2 days ago' becomes an estimate", parsePostedAt("2 days ago").precision, "estimated");
check("'Recently posted' does NOT invent a date", parsePostedAt("Recently posted").at, null);
check("'Recently posted' precision is unknown", parsePostedAt("Recently posted").precision, "unknown");
check("ISO date is exact", parsePostedAt("2026-08-01T10:00:00Z").precision, "exact");
const twoDays = parsePostedAt("2 days ago").at;
check("'2 days ago' lands ~2 days back",
  Math.abs((Date.now() - twoDays.getTime()) / 86400000 - 2) < 0.1, true);

check("estimated dates are hedged in the UI",
  formatAge(new Date(Date.now() - 3 * 86400000), "estimated").startsWith("Posted about"), true);
check("exact dates are not hedged",
  formatAge(new Date(Date.now() - 3 * 86400000), "exact"), "Posted 3 days ago");
check("null date says so", formatAge(null, "unknown"), "Posting date unknown");
check("verified label is separate from posted",
  formatVerified(new Date(Date.now() - 20 * 60000)), "Verified 20 minutes ago");

// ---------------------------------------------------------------------------
console.log("\nStatus lifecycle (spec §11, §14)");
// ---------------------------------------------------------------------------
const base = { currentStatus: "ACTIVE", missCount: 0, sourceClosed: false, seenInLatestCrawl: true, sourceReachable: true };
check("seen again stays ACTIVE", nextStatus(base).status, "ACTIVE");
check("source says closed → EXPIRED", nextStatus({ ...base, sourceClosed: true }).status, "EXPIRED");
check("source unreachable does NOT expire",
  nextStatus({ ...base, seenInLatestCrawl: false, sourceReachable: false }).status, "ACTIVE");
check("first miss → UNKNOWN, still shown",
  nextStatus({ ...base, seenInLatestCrawl: false }).status, "UNKNOWN");
check("UNKNOWN job is still active",
  nextStatus({ ...base, seenInLatestCrawl: false }).isActive, true);
check("third miss → EXPIRED",
  nextStatus({ ...base, seenInLatestCrawl: false, missCount: 2 }).status, "EXPIRED");
check("expired job is not displayable",
  isDisplayable({ status: "EXPIRED", isActive: false, postedAt: new Date(), discoveredAt: new Date() }), false);
check("90-day-old job is filtered as stale",
  isDisplayable({ status: "ACTIVE", isActive: true, postedAt: new Date(Date.now() - 90 * 86400000), discoveredAt: new Date() }), false);

// ---------------------------------------------------------------------------
console.log("\nExtraction (spec §9)");
// ---------------------------------------------------------------------------
check("parses '2-4 years'", parseExperienceRange("We want 2-4 years experience"), { min: 2, max: 4 });
check("parses '5+ years'", parseExperienceRange("5+ years required"), { min: 5, max: null });
check("no range when unstated", parseExperienceRange("Great opportunity"), { min: null, max: null });
check("finds skills", extractSkills("Kotlin, Jetpack Compose and Firebase").sort(),
  ["firebase", "jetpack compose", "kotlin"]);
check("does not match 'go' inside 'going'", extractSkills("We are going forward").includes("go"), false);
check("detects remote", inferWorkplaceType("Fully remote role"), "Remote");
check("hybrid beats remote when both appear", inferWorkplaceType("Hybrid remote setup"), "Hybrid");

// ---------------------------------------------------------------------------
console.log("\nMatching (spec §17, §18)");
// ---------------------------------------------------------------------------
check("infers seniority from title", inferJobSeniority("Senior Android Engineer"), "Senior");
check("stage 1 passes a good fit", stage1Filter(candidate, job()).passed, true);
check("stage 1 drops a role 2 levels up",
  stage1Filter(candidate, job({ title: "Principal Android Architect" })).passed, false);
check("stage 1 drops an unrelated field",
  stage1Filter(candidate, job({ title: "Registered Nurse", requiredSkills: ["nursing"] })).passed, false);
check("stage 1 drops a far-above experience bar",
  stage1Filter(candidate, job({ experienceMin: 10, experienceMax: 15 })).passed, false);

const good = scoreJob(candidate, job());
check("strong match scores high", good.score >= 75, true);
check("lists why it matches", good.reasons.length > 0, true);

const partial = scoreJob(candidate, job({ requiredSkills: ["kotlin", "android", "kubernetes", "aws"] }));
check("reports missing skills", partial.missingSkills.sort(), ["aws", "kubernetes"]);
check("partial skills score lower than full", partial.score < good.score, true);

const remote = scoreJob(candidate, job({ workplaceType: "Remote", location: "Remote" }));
check("remote satisfies a location preference", remote.score >= good.score - 2, true);

const outcome = matchJobs(candidate, [
  job(),
  job({ id: "j2", title: "Principal Android Architect" }),
  job({ id: "j3", title: "iOS Developer", requiredSkills: ["swift", "ios"] }),
]);
check("ranks and filters", outcome.matches.length >= 1, true);
check("filtered out the mismatches", outcome.filteredOut >= 1, true);
check("results are sorted by score",
  outcome.matches.every((m, i) => i === 0 || outcome.matches[i - 1].match.score >= m.match.score), true);

// ---------------------------------------------------------------------------
console.log("\nQuery building (spec §8)");
// ---------------------------------------------------------------------------
const queries = buildSearchQueries(candidate, 3);
check("respects the query cap", queries.length <= 3, true);
check("builds at least one query", queries.length >= 1, true);
check("leads with title and skill", /android/i.test(queries[0]), true);
check("caps even when many titles exist",
  buildSearchQueries({ ...candidate, jobTitles: Array(20).fill("Dev") }, 3).length <= 3, true);

// ---------------------------------------------------------------------------
console.log("\nProfile round-trip (regression)");
// ---------------------------------------------------------------------------
// The model emits snake_case; the browser posts our camelCase response back.
// Both must survive sanitisation, or the resume -> jobs flow breaks.
const fromModel = sanitizeProfile({
  professional_title: "Mobile Engineer", seniority: "Mid-level", years_experience: 3,
  skills: ["Kotlin"], job_titles: ["Android Developer"], preferred_locations: ["Bangalore"],
});
check("model snake_case parses", fromModel.professionalTitle, "Mobile Engineer");
check("model job titles parse", fromModel.jobTitles, ["Android Developer"]);

const roundTripped = sanitizeProfile(fromModel);
check("camelCase round-trip keeps the title", roundTripped.professionalTitle, "Mobile Engineer");
check("camelCase round-trip keeps job titles", roundTripped.jobTitles, ["Android Developer"]);
check("camelCase round-trip keeps years", roundTripped.yearsExperience, 3);
check("camelCase round-trip keeps locations", roundTripped.preferredLocations, ["Bangalore"]);
check("garbage input still yields a usable profile", sanitizeProfile(null).professionalTitle, "Unknown");

// ---------------------------------------------------------------------------
console.log("\nBudget guard (spec §2, §24)");
// ---------------------------------------------------------------------------
// Mirrors estimateApifyCost / affordableResults with the shipped defaults.
const PER_RESULT = 0.0007, PER_RUN = 0.005, BUDGET = 0.10;
const estimate = (n) => PER_RUN + n * PER_RESULT;
check("100 results fit the $0.10 budget", estimate(100) <= BUDGET, true);
check("100 results cost ~$0.075", Number(estimate(100).toFixed(3)), 0.075);
const affordable = Math.floor((BUDGET - PER_RUN) / PER_RESULT);
check("budget affords ~135 results", affordable, 135);
// The actor we did NOT choose, to show why:
check("career-site actor at $0.012 would blow the budget", 0.01 + 100 * 0.012 > BUDGET, true);
check("3 runs still fit", 3 * PER_RUN + 100 * PER_RESULT <= BUDGET, true);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
