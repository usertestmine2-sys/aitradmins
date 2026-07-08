import { desc, eq, and } from "drizzle-orm";
import { db } from "@/db";
import { brainMemory } from "@/db/schema";
import { MEMORY_DOMAIN_OWNERS, type MemoryDomain } from "@/lib/brain/types";

/**
 * AI Brain memory layer — append-only, domain-scoped.
 *
 * Enforcement: a write is accepted only if the writing module is the
 * registered owner of the domain. There are no update or delete paths;
 * "current state" is always the latest append for a key.
 */

export async function writeMemory(
  domain: MemoryDomain,
  module: string,
  key: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const owner = MEMORY_DOMAIN_OWNERS[domain];
  if (owner !== module) {
    throw new Error(
      `memory violation: module '${module}' attempted to write domain '${domain}' owned by '${owner}'`,
    );
  }
  await db.insert(brainMemory).values({ domain, module, key, payload });
}

export interface MemoryEntry {
  id: number;
  domain: MemoryDomain;
  module: string;
  key: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export async function readLatest(domain: MemoryDomain, key: string): Promise<MemoryEntry | null> {
  const rows = await db
    .select()
    .from(brainMemory)
    .where(and(eq(brainMemory.domain, domain), eq(brainMemory.key, key)))
    .orderBy(desc(brainMemory.id))
    .limit(1);
  if (rows.length === 0) return null;
  return toEntry(rows[0]);
}

export async function readRecent(domain: MemoryDomain, limit = 50): Promise<MemoryEntry[]> {
  const rows = await db
    .select()
    .from(brainMemory)
    .where(eq(brainMemory.domain, domain))
    .orderBy(desc(brainMemory.id))
    .limit(Math.min(Math.max(limit, 1), 500));
  return rows.map(toEntry);
}

export async function readRecentByKey(
  domain: MemoryDomain,
  key: string,
  limit = 20,
): Promise<MemoryEntry[]> {
  const rows = await db
    .select()
    .from(brainMemory)
    .where(and(eq(brainMemory.domain, domain), eq(brainMemory.key, key)))
    .orderBy(desc(brainMemory.id))
    .limit(Math.min(Math.max(limit, 1), 200));
  return rows.map(toEntry);
}

function toEntry(row: typeof brainMemory.$inferSelect): MemoryEntry {
  return {
    id: row.id,
    domain: (row.domain ?? "") as MemoryDomain,
    module: row.module ?? "",
    key: row.key ?? "",
    payload: row.payload ?? {},
    createdAt: row.createdAt.toISOString(),
  };
}
