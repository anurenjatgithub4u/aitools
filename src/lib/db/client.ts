import "server-only";
import fs from "node:fs";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "./schema";

export type DB = LibSQLDatabase<typeof schema>;

/**
 * Hosted (Vercel): a Turso database via TURSO_DATABASE_URL + TURSO_AUTH_TOKEN, which the Vercel
 * Turso integration sets. Local: a SQLite file, ./data/app.db unless DATABASE_PATH says otherwise.
 */
function connection(): { url: string; authToken?: string } {
  const remote = process.env.TURSO_DATABASE_URL;
  if (remote) return { url: remote, authToken: process.env.TURSO_AUTH_TOKEN };
  const file = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "app.db");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  return { url: `file:${file}` };
}

// Kept on globalThis so dev-server hot reloads and warm serverless invocations reuse one client.
const g = globalThis as unknown as { __kpDb?: { db: DB; client: Client; ready: Promise<void> } };

/** Opens the database on first use and applies pending migrations from ./drizzle once per process. */
export async function getDb(): Promise<DB> {
  if (!g.__kpDb) {
    const client = createClient(connection());
    const db = drizzle(client, { schema });
    const ready = (async () => {
      await client.execute("PRAGMA foreign_keys = ON");
      await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
    })();
    g.__kpDb = { db, client, ready };
    // a failed connect/migrate must not be cached forever
    ready.catch(() => (g.__kpDb = undefined));
  }
  await g.__kpDb.ready;
  return g.__kpDb.db;
}

/** Closes the connection (tests, scripts). The next getDb() reopens it. */
export function closeDb(): void {
  g.__kpDb?.client.close();
  g.__kpDb = undefined;
}
