import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// ---------------------------------------------------------------------------
// Lazy database client
//
// During `next build` Vercel does NOT inject runtime secrets, so DATABASE_URL
// is undefined at build time. We defer Pool construction and drizzle() init
// until the first actual query, preventing the build from throwing.
//
// At runtime every query goes through getDb(), which validates DATABASE_URL
// and returns a fully-initialised drizzle client.
// ---------------------------------------------------------------------------

const globalForDb = globalThis as typeof globalThis & {
  __pool?: Pool;
  __db?: ReturnType<typeof drizzle>;
};

function getPool(): Pool {
  if (globalForDb.__pool) return globalForDb.__pool;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add it to your environment variables."
    );
  }

  const pool = new Pool({ connectionString: url });
  globalForDb.__pool = pool;
  return pool;
}

function getDb(): ReturnType<typeof drizzle> {
  if (globalForDb.__db) return globalForDb.__db;

  const poolInstance = getPool();
  const dbInstance = drizzle(poolInstance);

  // Persist across hot-reloads in development only
  if (process.env.NODE_ENV !== "production") {
    globalForDb.__db = dbInstance;
  }

  return dbInstance;
}

// `db` is used exactly like before everywhere in the codebase.
// It is a stable object whose methods are resolved lazily.
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// `pool` is used for diagnostics and active connections querying lazily.
export const pool = new Proxy({} as Pool, {
  get(_target, prop) {
    return (getPool() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
