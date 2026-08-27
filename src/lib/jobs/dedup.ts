// Job deduplication (spec §16).
//
// The same role reaches us from several sources with different ids, different
// URL tracking parameters and slightly different company spellings. Showing
// the same job three times is the fastest way to look broken, so this runs
// before anything is stored or displayed.
//
// Three levels, cheapest and most certain first:
//   1. source + source_job_id   — exact, same provider
//   2. canonical URL            — same posting, different discovery path
//   3. fingerprint              — company + title + location, normalised
//
// Level 3 is a heuristic and can over-merge in one specific case, noted below.

import crypto from "crypto";
import type { NormalizedJob } from "./types";

/** Tracking and session parameters that don't identify the posting. */
const NOISE_PARAMS = [
  /^utm_/i, /^gh_src$/i, /^ref$/i, /^referer$/i, /^referrer$/i, /^source$/i,
  /^src$/i, /^trk$/i, /^trackingId$/i, /^lipi$/i, /^refId$/i, /^originalSubdomain$/i,
];

/** Suffixes that appear in a company's legal name but not in conversation. */
const COMPANY_SUFFIXES =
  /\b(inc|inc\.|llc|l\.l\.c\.|ltd|ltd\.|limited|corp|corp\.|corporation|gmbh|pvt|private|plc|co|co\.|company|technologies|technology|labs|holdings|group)\b/gi;

/** Seniority and noise words that vary between postings of the same role. */
const TITLE_NOISE =
  /\b(senior|sr\.?|junior|jr\.?|lead|staff|principal|i{1,3}|iv|v|1|2|3|4|5|full[- ]?time|part[- ]?time|contract|remote|hybrid|onsite|on[- ]site|urgent|hiring|immediate|joiner|w\/m\/d|m\/f\/d|\(.*?\))\b/gi;

export function normalizeUrl(raw: string): string {
  try {
    const url = new URL(raw);
    url.hash = "";
    url.protocol = "https:";
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");

    for (const key of [...url.searchParams.keys()]) {
      if (NOISE_PARAMS.some((re) => re.test(key))) url.searchParams.delete(key);
    }
    // Sort remaining params so ?a=1&b=2 and ?b=2&a=1 collapse together.
    url.searchParams.sort();
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";

    return url.toString();
  } catch {
    return raw.trim().toLowerCase();
  }
}

export function normalizeCompany(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,]/g, " ")
    .replace(COMPANY_SUFFIXES, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(TITLE_NOISE, " ")
    .replace(/[^a-z0-9+# ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeLocation(location: string): string {
  const lower = location.toLowerCase();

  // Remote roles collapse to a single bucket regardless of the region named.
  //
  // Companies routinely post one remote job once per eligible geography —
  // "Remote - United States", "Remote - British Columbia, Canada",
  // "Remote - The Netherlands" are the same opening. Keeping the geography
  // here would make each a distinct fingerprint, and a candidate searching for
  // remote work would see the same role four times. The deliberate trade-off
  // is that two genuinely separate remote roles with an identical title at the
  // same company also merge; the apply link still resolves to a real posting
  // where eligibility is stated.
  if (/\bremote\b/.test(lower)) return "remote";

  return lower
    .replace(/\b(hybrid|on-?site)\b/g, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    // Only the leading components matter: "Bangalore, Karnataka, India" and
    // "Bangalore, India" are the same place.
    .split(" ")
    .slice(0, 3)
    .join(" ");
}

/**
 * Stable level-3 identity for a posting.
 *
 * Known limitation: a company advertising two genuinely different openings
 * with the same title in the same city — say two "Backend Engineer" roles on
 * different teams — collapses to one entry. That is the right trade here:
 * candidates apply through the same page anyway, and showing one is better
 * than showing an apparent duplicate.
 */
export function fingerprint(job: Pick<NormalizedJob, "company" | "title" | "location">): string {
  const basis = [
    normalizeCompany(job.company),
    normalizeTitle(job.title),
    normalizeLocation(job.location),
  ].join("|");
  return crypto.createHash("sha1").update(basis).digest("hex").slice(0, 24);
}

export interface DedupResult<T extends NormalizedJob = NormalizedJob> {
  unique: T[];
  duplicatesRemoved: number;
}

/**
 * Removes duplicates within a batch, keeping the best copy of each.
 *
 * "Best" means the record with the most information — a posting with a real
 * date and a fuller description is more useful than a sparse duplicate, even
 * if the sparse one arrived first.
 */
export function dedupeJobs<T extends NormalizedJob>(jobs: T[]): DedupResult<T> {
  const byKey = new Map<string, T>();
  let duplicatesRemoved = 0;

  const richness = (job: T): number =>
    (job.postedAt ? 4 : 0) +
    (job.postedAtPrecision === "exact" ? 2 : 0) +
    Math.min(3, Math.floor(job.description.length / 1000)) +
    (job.salary.min !== null ? 2 : 0) +
    (job.requiredSkills.length > 0 ? 1 : 0) +
    // Direct ATS links beat aggregator links for the same role.
    (job.source === "ats" ? 3 : 0);

  for (const job of jobs) {
    const keys = [
      `id:${job.source}:${job.sourceJobId}`,
      `url:${normalizeUrl(job.jobUrl)}`,
      `fp:${fingerprint(job)}`,
    ];

    const existingKey = keys.find((k) => byKey.has(k));
    if (existingKey) {
      const existing = byKey.get(existingKey)!;
      duplicatesRemoved++;
      if (richness(job) > richness(existing)) {
        // Re-point every key at the better copy.
        for (const k of keys) byKey.set(k, job);
      }
      continue;
    }

    for (const k of keys) byKey.set(k, job);
  }

  // A job owns three keys, so collapse back to distinct records.
  const seen = new Set<T>();
  const unique: T[] = [];
  for (const job of byKey.values()) {
    if (seen.has(job)) continue;
    seen.add(job);
    unique.push(job);
  }

  return { unique, duplicatesRemoved };
}
