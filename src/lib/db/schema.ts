import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";
import type { KeywordKind, TopApp } from "@/types";

// SQLite schema. Only the repo layer (./repo) imports this, so a Postgres port means a pg-core
// copy of this file plus a new client; the repo function signatures stay the same.

const createdAt = () => integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`);

/** A project: either a real app (itunes_id set) or just a niche idea. */
export const apps = sqliteTable("apps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  niche: text("niche"),
  audience: text("audience"),
  itunesId: integer("itunes_id"),
  icon: text("icon"),
  /** Country codes this project targets (see lib/countries). */
  countries: text("countries", { mode: "json" }).$type<string[]>().notNull().default(sql`(json_array('US'))`),
  createdAt: createdAt(),
});

export const keywords = sqliteTable(
  "keywords",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    appId: integer("app_id").notNull().references(() => apps.id, { onDelete: "cascade" }),
    term: text("term").notNull(),
    kind: text("kind").$type<KeywordKind>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [unique().on(t.appId, t.term)],
);

/** The phrase locals actually search for, linked back to the English keyword. One per country. */
export const localizedKeywords = sqliteTable(
  "localized_keywords",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    keywordId: integer("keyword_id").notNull().references(() => keywords.id, { onDelete: "cascade" }),
    country: text("country").notNull(),
    phrase: text("phrase").notNull(),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [unique().on(t.keywordId, t.country)],
);

/** Append-only history: one row per keyword × country × check. */
export const rankChecks = sqliteTable(
  "rank_checks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    keywordId: integer("keyword_id").notNull().references(() => keywords.id, { onDelete: "cascade" }),
    country: text("country").notNull(),
    term: text("term").notNull(),
    checkedAt: integer("checked_at", { mode: "timestamp_ms" }).notNull(),
    resultIds: text("result_ids", { mode: "json" }).$type<number[]>().notNull(),
    top: text("top", { mode: "json" }).$type<TopApp[]>().notNull(),
  },
  (t) => [index("rank_checks_kw_country_time").on(t.keywordId, t.country, t.checkedAt)],
);

export const competitors = sqliteTable(
  "competitors",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    appId: integer("app_id").notNull().references(() => apps.id, { onDelete: "cascade" }),
    itunesId: integer("itunes_id").notNull(),
    name: text("name").notNull(),
    icon: text("icon"),
    createdAt: createdAt(),
  },
  (t) => [unique().on(t.appId, t.itunesId)],
);

/** iTunes response cache (keyed by request URL) so restarts don't re-spend the rate limit. */
export const itunesCache = sqliteTable("itunes_cache", {
  key: text("key").primaryKey(),
  body: text("body").notNull(),
  fetchedAt: integer("fetched_at", { mode: "timestamp_ms" }).notNull(),
});
