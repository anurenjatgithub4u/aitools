import "server-only";
import { count, desc, eq, inArray } from "drizzle-orm";
import type { CountryCode } from "@/lib/countries";
import type { Project } from "@/types";
import { getDb } from "../client";
import { apps, competitors, keywords, localizedKeywords, rankChecks } from "../schema";

const toProject = (r: typeof apps.$inferSelect): Project => ({
  ...r,
  countries: r.countries as CountryCode[],
  createdAt: r.createdAt.getTime(),
});

export async function listProjects(): Promise<(Project & { keywordCount: number })[]> {
  const rows = await (await getDb())
    .select({ app: apps, keywordCount: count(keywords.id) })
    .from(apps)
    .leftJoin(keywords, eq(keywords.appId, apps.id))
    .groupBy(apps.id)
    .orderBy(desc(apps.createdAt), desc(apps.id));
  return rows.map((r) => ({ ...toProject(r.app), keywordCount: r.keywordCount }));
}

export async function getProject(id: number): Promise<Project | null> {
  const row = await (await getDb()).query.apps.findFirst({ where: eq(apps.id, id) });
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

export async function createProject(p: NewProject): Promise<Project> {
  const [row] = await (await getDb()).insert(apps).values(p).returning();
  return toProject(row);
}

export async function updateProject(id: number, p: Partial<NewProject>): Promise<Project | null> {
  const [row] = await (await getDb()).update(apps).set(p).where(eq(apps.id, id)).returning();
  return row ? toProject(row) : null;
}

/** Deletes the project and everything under it (explicitly: a remote libSQL connection may not enforce cascades). */
export async function deleteProject(id: number): Promise<boolean> {
  const db = await getDb();
  if (!(await db.query.apps.findFirst({ where: eq(apps.id, id), columns: { id: true } }))) return false;
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
