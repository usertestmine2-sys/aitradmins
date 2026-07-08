import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { modelMemory } from "@/db/schema";

/**
 * AI Society private memory — append-only, strictly per-model.
 *
 * Isolation guarantee: every exported operation is scoped to exactly one
 * modelId. There is no cross-model read, no bulk read across models, and no
 * update/delete path. A model can therefore never observe or modify another
 * model's memory — by construction, not by convention.
 */

export type ModelMemoryKind = "opinion" | "discussion" | "learning" | "context";

export interface ModelMemoryRow {
  modelId: string;
  kind: ModelMemoryKind;
  key: string;
  payload: Record<string, unknown>;
}

/** Batched append (used by the Model Manager at session finalize). */
export async function appendModelMemory(rows: ModelMemoryRow[]): Promise<number> {
  if (rows.length === 0) return 0;
  await db.insert(modelMemory).values(rows);
  return rows.length;
}

export interface ModelMemoryEntry {
  id: number;
  kind: ModelMemoryKind;
  key: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

/** Read one model's own memory. No cross-model variant exists. */
export async function readModelMemory(
  modelId: string,
  kind: ModelMemoryKind | null,
  limit = 50,
): Promise<ModelMemoryEntry[]> {
  const bounded = Math.min(Math.max(limit, 1), 500);
  const rows = kind
    ? await db
        .select()
        .from(modelMemory)
        .where(and(eq(modelMemory.modelId, modelId), eq(modelMemory.kind, kind)))
        .orderBy(desc(modelMemory.id))
        .limit(bounded)
    : await db
        .select()
        .from(modelMemory)
        .where(eq(modelMemory.modelId, modelId))
        .orderBy(desc(modelMemory.id))
        .limit(bounded);
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind as ModelMemoryKind,
    key: r.key,
    payload: r.payload ?? {},
    createdAt: r.createdAt.toISOString(),
  }));
}
