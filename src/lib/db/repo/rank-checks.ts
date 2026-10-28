import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { CountryCode } from "@/lib/countries";
import type { RankCheck } from "@/types";
import { getDb } from "../client";
import { keywords, rankChecks } from "../schema";

const toCheck = (r: typeof rankChecks.$inferSelect): RankCheck => ({ ...r, country: r.country as CountryCode });

export async function insertRankCheck(c: Omit<RankCheck, "id">): Promise<RankCheck> {
  const [row] = await (await getDb()).insert(rankChecks).values(c).returning();
  return toCheck(row);
}

/** The most recent check for every keyword × country of a project. */
export async function latestRankChecks(appId: number): Promise<RankCheck[]> {
  const db = await getDb();
  // ids are monotonic, so max(id) per group is the newest check
  const latest = db
    .select({ id: sql<number>`max(${rankChecks.id})` })
    .from(rankChecks)
    .innerJoin(keywords, eq(keywords.id, rankChecks.keywordId))
    .where(eq(keywords.appId, appId))
    .groupBy(rankChecks.keywordId, rankChecks.country);
  const rows = await db.select().from(rankChecks).where(inArray(rankChecks.id, latest));
  return rows.map(toCheck);
}

export async function rankHistory(keywordId: number, country: CountryCode, limit = 30): Promise<RankCheck[]> {
  const rows = await (await getDb())
    .select()
    .from(rankChecks)
    .where(and(eq(rankChecks.keywordId, keywordId), eq(rankChecks.country, country)))
    .orderBy(desc(rankChecks.checkedAt))
    .limit(limit);
  return rows.map(toCheck);
}
