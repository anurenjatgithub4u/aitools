import "server-only";
import { and, eq, lt, sql } from "drizzle-orm";
import type { User } from "@/types";
import { getDb } from "../client";
import { users } from "../schema";

const toUser = (r: typeof users.$inferSelect): User => ({
  id: r.id,
  email: r.email,
  name: r.name,
  photo: r.photo,
  plan: r.plan,
  projectsCreated: r.projectsCreated,
});

export async function getUser(id: string): Promise<User | null> {
  const row = await (await getDb()).query.users.findFirst({ where: eq(users.id, id) });
  return row ? toUser(row) : null;
}

/** Creates the user on first sign-in and refreshes their profile on later ones. Plan and quota are kept. */
export async function upsertUser(p: { id: string; email?: string | null; name?: string | null; photo?: string | null }): Promise<User> {
  const profile = { email: p.email ?? null, name: p.name ?? null, photo: p.photo ?? null };
  const [row] = await (await getDb())
    .insert(users)
    .values({ id: p.id, ...profile })
    .onConflictDoUpdate({ target: users.id, set: profile })
    .returning();
  return toUser(row);
}

/**
 * Uses one project from the user's quota, atomically: the row only updates while
 * projects_created < limit, so two simultaneous requests can't both get the last slot.
 * Returns false when the quota is used up.
 */
export async function takeProjectSlot(userId: string, limit: number): Promise<boolean> {
  const db = await getDb();
  const where = Number.isFinite(limit) ? and(eq(users.id, userId), lt(users.projectsCreated, limit)) : eq(users.id, userId);
  const res = await db
    .update(users)
    .set({ projectsCreated: sql`${users.projectsCreated} + 1` })
    .where(where)
    .returning({ id: users.id });
  return res.length > 0;
}

/** Gives a slot back when creating the project failed after the slot was taken. */
export async function returnProjectSlot(userId: string): Promise<void> {
  await (await getDb())
    .update(users)
    .set({ projectsCreated: sql`max(${users.projectsCreated} - 1, 0)` })
    .where(eq(users.id, userId));
}
