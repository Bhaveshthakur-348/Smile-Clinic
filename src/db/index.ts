import "server-only";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type DB = PostgresJsDatabase<typeof schema>;

// One pool per server process (survives hot reloads in dev).
const g = globalThis as unknown as { __db?: DB };

export function getDb(): DB {
  if (g.__db) return g.__db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set — copy .env.example to .env.local");
  // prepare:false is required for Supabase's transaction pooler (port 6543).
  const client = postgres(url, { prepare: false, max: 5 });
  g.__db = drizzle({ client, schema });
  return g.__db;
}

/** Postgres unique violation. Drizzle wraps driver errors, so the code sits on `cause`. */
export function isUniqueViolation(e: unknown) {
  const err = e as { code?: string; cause?: { code?: string } } | null;
  return (err?.code ?? err?.cause?.code) === "23505";
}

export { schema };
