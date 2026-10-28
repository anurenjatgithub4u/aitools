import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import type { CountryCode } from "@/lib/countries";
import type { Keyword, KeywordKind, LocalizedKeyword } from "@/types";
import { getDb } from "../client";
import { keywords, localizedKeywords } from "../schema";

export async function listKeywords(appId: number): Promise<Keyword[]> {
  return getDb().select().from(keywords).where(eq(keywords.appId, appId)).orderBy(asc(keywords.id));
}

export async function getKeywordsByIds(appId: number, ids: number[]): Promise<Keyword[]> {
  if (!ids.length) return [];
  return getDb().select().from(keywords).where(and(eq(keywords.appId, appId), inArray(keywords.id, ids)));
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
  return getDb()
    .insert(keywords)
    .values(fresh.map((k) => ({ appId, term: k.term.trim(), kind: k.kind })))
    .returning();
}

export async function deleteKeyword(appId: number, id: number): Promise<boolean> {
  const res = await getDb()
    .delete(keywords)
    .where(and(eq(keywords.appId, appId), eq(keywords.id, id)))
    .returning({ id: keywords.id });
  return res.length > 0;
}

export async function listLocalized(appId: number): Promise<LocalizedKeyword[]> {
  const rows = await getDb()
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
  getDb().transaction((tx) => {
    for (const r of rows) {
      tx.insert(localizedKeywords)
        .values({ keywordId: r.keywordId, country: r.country, phrase: r.phrase, note: r.note ?? null })
        .onConflictDoUpdate({
          target: [localizedKeywords.keywordId, localizedKeywords.country],
          set: { phrase: r.phrase, note: r.note ?? null },
        })
        .run();
    }
  });
}
