import "server-only";
import { count, desc, eq } from "drizzle-orm";
import type { CountryCode } from "@/lib/countries";
import type { Project } from "@/types";
import { getDb } from "../client";
import { apps, keywords } from "../schema";

const toProject = (r: typeof apps.$inferSelect): Project => ({
  ...r,
  countries: r.countries as CountryCode[],
  createdAt: r.createdAt.getTime(),
});

export async function listProjects(): Promise<(Project & { keywordCount: number })[]> {
  const rows = await getDb()
    .select({ app: apps, keywordCount: count(keywords.id) })
    .from(apps)
    .leftJoin(keywords, eq(keywords.appId, apps.id))
    .groupBy(apps.id)
    .orderBy(desc(apps.createdAt), desc(apps.id));
  return rows.map((r) => ({ ...toProject(r.app), keywordCount: r.keywordCount }));
}

export async function getProject(id: number): Promise<Project | null> {
  const row = await getDb().query.apps.findFirst({ where: eq(apps.id, id) });
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
  const [row] = await getDb().insert(apps).values(p).returning();
  return toProject(row);
}

export async function updateProject(id: number, p: Partial<NewProject>): Promise<Project | null> {
  const [row] = await getDb().update(apps).set(p).where(eq(apps.id, id)).returning();
  return row ? toProject(row) : null;
}

export async function deleteProject(id: number): Promise<boolean> {
  const res = await getDb().delete(apps).where(eq(apps.id, id)).returning({ id: apps.id });
  return res.length > 0;
}
