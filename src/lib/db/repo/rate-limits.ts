import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "../client";
import { rateLimits } from "../schema";

/**
 * Counts one request against `key` in a fixed window and returns the count so far, atomically:
 * a single upsert, so parallel requests on different serverless instances can't both slip past
 * the limit. A window older than `windowMs` starts over at 1.
 */
export async function hit(key: string, windowMs: number): Promise<{ count: number; windowStart: Date }> {
  const now = new Date();
  const expired = sql`${rateLimits.windowStart} <= ${now.getTime() - windowMs}`;
  const [row] = await (await getDb())
    .insert(rateLimits)
    .values({ key, windowStart: now, count: 1 })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${expired} then 1 else ${rateLimits.count} + 1 end`,
        windowStart: sql`case when ${expired} then ${now.getTime()} else ${rateLimits.windowStart} end`,
      },
    })
    .returning();
  return { count: row.count, windowStart: row.windowStart };
}
