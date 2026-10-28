import "server-only";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

export type DB = BetterSQLite3Database<typeof schema>;

const DB_PATH = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "app.db");

// Kept on globalThis so dev-server hot reloads reuse one connection instead of leaking handles.
const g = globalThis as unknown as { __kpDb?: { db: DB; sqlite: Database.Database } };

/** Opens the database on first use and applies pending migrations from ./drizzle. */
export function getDb(): DB {
  if (g.__kpDb) return g.__kpDb.db;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  g.__kpDb = { db, sqlite };
  return db;
}

/** Closes the connection (tests, scripts). The next getDb() reopens it. */
export function closeDb(): void {
  g.__kpDb?.sqlite.close();
  g.__kpDb = undefined;
}
