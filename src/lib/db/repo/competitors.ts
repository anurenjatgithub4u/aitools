import "server-only";
import { and, asc, eq } from "drizzle-orm";
import type { Competitor } from "@/types";
import { getDb } from "../client";
import { competitors } from "../schema";

const cols = { id: competitors.id, appId: competitors.appId, itunesId: competitors.itunesId, name: competitors.name, icon: competitors.icon };

export async function listCompetitors(appId: number): Promise<Competitor[]> {
  return (await getDb()).select(cols).from(competitors).where(eq(competitors.appId, appId)).orderBy(asc(competitors.id));
}

/** Adding the same App Store id twice refreshes its name and icon instead of failing. */
export async function addCompetitor(c: Omit<Competitor, "id">): Promise<Competitor> {
  const [row] = await (await getDb())
    .insert(competitors)
    .values(c)
    .onConflictDoUpdate({ target: [competitors.appId, competitors.itunesId], set: { name: c.name, icon: c.icon } })
    .returning(cols);
  return row;
}

export async function removeCompetitor(appId: number, id: number): Promise<boolean> {
  const res = await (await getDb())
    .delete(competitors)
    .where(and(eq(competitors.appId, appId), eq(competitors.id, id)))
    .returning({ id: competitors.id });
  return res.length > 0;
}
