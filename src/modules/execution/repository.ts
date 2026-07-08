// AITradeMinds — Execution Intelligence Repository. APPEND-ONLY (no update/delete).
// Reuses the single db context. Batch inserts, indexed reads. No parallel repo.
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  executionJournal,
  executionQuality,
  executionReplay,
  executionTimeline,
  type ExecutionJournalRow,
  type ExecutionQualityRow,
  type ExecutionReplayRow,
  type ExecutionTimelineRow,
} from "@/db/schema";
import { singleton } from "@/kernel";

class ExecutionRepository {
  // ---- Execution Quality ----
  async saveQuality(row: typeof executionQuality.$inferInsert): Promise<ExecutionQualityRow> {
    const [saved] = await db.insert(executionQuality).values(row).returning();
    return saved;
  }
  async quality(accountId: number, limit = 200): Promise<ExecutionQualityRow[]> {
    return db
      .select()
      .from(executionQuality)
      .where(eq(executionQuality.accountId, accountId))
      .orderBy(desc(executionQuality.createdAt))
      .limit(limit);
  }

  // ---- Journal (append-only; batch) ----
  async journalBatch(rows: (typeof executionJournal.$inferInsert)[]): Promise<void> {
    if (rows.length === 0) return;
    await db.insert(executionJournal).values(rows);
  }
  async journal(accountId: number, limit = 300): Promise<ExecutionJournalRow[]> {
    return db
      .select()
      .from(executionJournal)
      .where(eq(executionJournal.accountId, accountId))
      .orderBy(desc(executionJournal.createdAt))
      .limit(limit);
  }
  async journalForOrder(orderId: number): Promise<ExecutionJournalRow[]> {
    return db
      .select()
      .from(executionJournal)
      .where(eq(executionJournal.orderId, orderId))
      .orderBy(executionJournal.createdAt);
  }

  // ---- Timeline ----
  async saveTimeline(row: typeof executionTimeline.$inferInsert): Promise<void> {
    await db.insert(executionTimeline).values(row).onConflictDoNothing();
  }
  async timeline(orderId: number): Promise<ExecutionTimelineRow | undefined> {
    const [row] = await db
      .select()
      .from(executionTimeline)
      .where(eq(executionTimeline.orderId, orderId))
      .limit(1);
    return row;
  }

  // ---- Replay ----
  async saveReplay(row: typeof executionReplay.$inferInsert): Promise<ExecutionReplayRow> {
    const [saved] = await db.insert(executionReplay).values(row).returning();
    return saved;
  }
  async replay(orderId: number): Promise<ExecutionReplayRow | undefined> {
    const [row] = await db
      .select()
      .from(executionReplay)
      .where(eq(executionReplay.orderId, orderId))
      .orderBy(desc(executionReplay.createdAt))
      .limit(1);
    return row;
  }

  // ---- Aggregates (single-pass SQL, no N+1) ----
  async aggregates(accountId: number): Promise<{
    trades: number;
    avgSlippageBps: number;
    avgSpread: number;
    avgLatencyMs: number;
    avgFillRatio: number;
    avgExecutionScore: number;
  }> {
    const [row] = await db
      .select({
        trades: sql<number>`count(*)::int`,
        avgSlippageBps: sql<number>`coalesce(avg(${executionQuality.slippageBps}),0)`,
        avgSpread: sql<number>`coalesce(avg(${executionQuality.spread}),0)`,
        avgLatencyMs: sql<number>`coalesce(avg(${executionQuality.latencyMs}),0)`,
        avgFillRatio: sql<number>`coalesce(avg(${executionQuality.fillRatio}),0)`,
        avgExecutionScore: sql<number>`coalesce(avg(${executionQuality.executionScore}),0)`,
      })
      .from(executionQuality)
      .where(eq(executionQuality.accountId, accountId));
    return {
      trades: row?.trades ?? 0,
      avgSlippageBps: +(row?.avgSlippageBps ?? 0).toFixed(3),
      avgSpread: +(row?.avgSpread ?? 0).toFixed(4),
      avgLatencyMs: Math.round(row?.avgLatencyMs ?? 0),
      avgFillRatio: +(row?.avgFillRatio ?? 0).toFixed(4),
      avgExecutionScore: +(row?.avgExecutionScore ?? 0).toFixed(2),
    };
  }
}

export const executionRepository = singleton("execution.repository", () => new ExecutionRepository());
