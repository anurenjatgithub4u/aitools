import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import type { CountryCode } from "@/lib/countries";
import type { Keyword, KeywordKind, LocalizedKeyword } from "@/types";
import { getDb } from "../client";
import { keywords, localizedKeywords, rankChecks } from "../schema";

export async function listKeywords(appId: number): Promise<Keyword[]> {
  return (await getDb()).select().from(keywords).where(eq(keywords.appId, appId)).orderBy(asc(keywords.id));
}

export async function getKeywordsByIds(appId: number, ids: number[]): Promise<Keyword[]> {
  if (!ids.length) return [];
  return (await getDb()).select().from(keywords).where(and(eq(keywords.appId, appId), inArray(keywords.id, ids)));
}

/** Inserts new terms (case-insensitive duplicates of existing ones are skipped) and returns the inserted rows. */
export async function addKeywords(appId: number, items: { term: string; kind: KeywordKind }[]): Promise<Keyword[]> {
  const seen = new Set((await listKeywords(appId)).map((k) => k.term.toLowerCase()));
  const fresh = items.filter((k) => {
    const key = k.term.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (!fresh.length) return [];
  return (await getDb())
    .insert(keywords)
    .values(fresh.map((k) => ({ appId, term: k.term.trim(), kind: k.kind })))
    .returning();
}

/** Deletes the keyword with its phrases and history (explicitly: a remote libSQL connection may not enforce cascades). */
export async function deleteKeyword(appId: number, id: number): Promise<boolean> {
  const db = await getDb();
  const [found] = await db.select({ id: keywords.id }).from(keywords).where(and(eq(keywords.appId, appId), eq(keywords.id, id)));
  if (!found) return false;
  await db.batch([
    db.delete(localizedKeywords).where(eq(localizedKeywords.keywordId, id)),
    db.delete(rankChecks).where(eq(rankChecks.keywordId, id)),
    db.delete(keywords).where(eq(keywords.id, id)),
  ]);
  return true;
}

export async function listLocalized(appId: number): Promise<LocalizedKeyword[]> {
  const rows = await (await getDb())
    .select({ l: localizedKeywords })
    .from(localizedKeywords)
    .innerJoin(keywords, eq(keywords.id, localizedKeywords.keywordId))
    .where(eq(keywords.appId, appId));
  return rows.map(({ l }) => ({ id: l.id, keywordId: l.keywordId, country: l.country as CountryCode, phrase: l.phrase, note: l.note }));
}

/** One phrase per keyword × country; re-localizing replaces the old phrase. */
export async function upsertLocalized(
  rows: { keywordId: number; country: CountryCode; phrase: string; note?: string | null }[],
): Promise<void> {
  if (!rows.length) return;
  const db = await getDb();
  // one round trip, applied atomically (matters on a remote database)
  const [first, ...rest] = rows.map((r) =>
    db
      .insert(localizedKeywords)
      .values({ keywordId: r.keywordId, country: r.country, phrase: r.phrase, note: r.note ?? null })
      .onConflictDoUpdate({
        target: [localizedKeywords.keywordId, localizedKeywords.country],
        set: { phrase: r.phrase, note: r.note ?? null },
      }),
  );
  await db.batch([first, ...rest]);
}
