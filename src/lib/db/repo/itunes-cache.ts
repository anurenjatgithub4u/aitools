import "server-only";
import { eq, lt } from "drizzle-orm";
import { getDb } from "../client";
import { itunesCache } from "../schema";

export async function getCached(key: string, maxAgeMs: number): Promise<string | null> {
  const row = await (await getDb()).query.itunesCache.findFirst({ where: eq(itunesCache.key, key) });
  return row && Date.now() - row.fetchedAt.getTime() < maxAgeMs ? row.body : null;
}

export async function setCached(key: string, body: string): Promise<void> {
  const fetchedAt = new Date();
  await (await getDb())
    .insert(itunesCache)
    .values({ key, body, fetchedAt })
    .onConflictDoUpdate({ target: itunesCache.key, set: { body, fetchedAt } });
}

export async function pruneCache(olderThanMs: number): Promise<void> {
  await (await getDb()).delete(itunesCache).where(lt(itunesCache.fetchedAt, new Date(Date.now() - olderThanMs)));
}
