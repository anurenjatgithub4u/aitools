import { defineConfig } from "drizzle-kit";

// Migrations are generated from the schema (`npm run db:generate`) and applied by the app itself
// on first database access, locally and on Vercel. The credentials here are only for drizzle-kit
// commands that talk to a database (migrate, studio).
export default defineConfig(
  process.env.TURSO_DATABASE_URL
    ? {
        dialect: "turso",
        schema: "./src/lib/db/schema.ts",
        out: "./drizzle",
        dbCredentials: { url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN },
      }
    : {
        dialect: "sqlite",
        schema: "./src/lib/db/schema.ts",
        out: "./drizzle",
        dbCredentials: { url: `file:${process.env.DATABASE_PATH ?? "./data/app.db"}` },
      },
);
