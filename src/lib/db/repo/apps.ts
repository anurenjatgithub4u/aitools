import "server-only";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import type { CountryCode } from "@/lib/countries";
import type { Project } from "@/types";
import { getDb } from "../client";
import { apps, competitors, keywords, localizedKeywords, rankChecks } from "../schema";

// Every function takes the owner's user id: a project someone else owns behaves as if it
// doesn't exist (null / false), so ids can't be guessed to read other people's data.

const toProject = (r: typeof apps.$inferSelect): Project => ({
  id: r.id,
  name: r.name,
  niche: r.niche,
  audience: r.audience,
  itunesId: r.itunesId,
  icon: r.icon,
  countries: r.countries as CountryCode[],
  createdAt: r.createdAt.getTime(),
});

const owned = (id: number, ownerId: string) => and(eq(apps.id, id), eq(apps.ownerId, ownerId));

export async function listProjects(ownerId: string): Promise<(Project & { keywordCount: number })[]> {
  const rows = await (await getDb())
    .select({ app: apps, keywordCount: count(keywords.id) })
    .from(apps)
    .leftJoin(keywords, eq(keywords.appId, apps.id))
    .where(eq(apps.ownerId, ownerId))
    .groupBy(apps.id)
    .orderBy(desc(apps.createdAt), desc(apps.id));
  return rows.map((r) => ({ ...toProject(r.app), keywordCount: r.keywordCount }));
}

export async function getProject(id: number, ownerId: string): Promise<Project | null> {
  const row = await (await getDb()).query.apps.findFirst({ where: owned(id, ownerId) });
  return row ? toProject(row) : null;
}

export type NewProject = {
  name: string;
  niche?: string | null;
  audience?: string | null;
  itunesId?: number | null;
  icon?: string | null;
  countries?: CountryCode[];
};

/** Inserts a project. Quota checks happen before this, in lib/projects. */
export async function createProject(ownerId: string, p: NewProject): Promise<Project> {
  const [row] = await (await getDb())
    .insert(apps)
    .values({ ...p, ownerId })
    .returning();
  return toProject(row);
}

export async function updateProject(id: number, ownerId: string, p: Partial<NewProject>): Promise<Project | null> {
  const [row] = await (await getDb()).update(apps).set(p).where(owned(id, ownerId)).returning();
  return row ? toProject(row) : null;
}

/** Deletes the project and everything under it (explicitly: a remote libSQL connection may not enforce cascades). */
export async function deleteProject(id: number, ownerId: string): Promise<boolean> {
  const db = await getDb();
  if (!(await db.query.apps.findFirst({ where: owned(id, ownerId), columns: { id: true } }))) return false;
  const kwIds = db.select({ id: keywords.id }).from(keywords).where(eq(keywords.appId, id));
  await db.batch([
    db.delete(localizedKeywords).where(inArray(localizedKeywords.keywordId, kwIds)),
    db.delete(rankChecks).where(inArray(rankChecks.keywordId, kwIds)),
    db.delete(keywords).where(eq(keywords.appId, id)),
    db.delete(competitors).where(eq(competitors.appId, id)),
    db.delete(apps).where(eq(apps.id, id)),
  ]);
  return true;
}
