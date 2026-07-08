// AITradeMinds — Infra Repository. Reuses the SINGLE db context (@/db).
// No new pool/connection. Persists realtime job runs, offsets, dead letters.
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  rtDeadLetter,
  rtJobs,
  rtStreamOffsets,
  type RtJob,
} from "@/db/schema";
import { singleton } from "@/kernel";

class InfraRepository {
  async startJob(name: string, tenantId?: string): Promise<number> {
    const [row] = await db
      .insert(rtJobs)
      .values({ name, status: "RUNNING", tenantId })
      .returning({ id: rtJobs.id });
    return row.id;
  }

  async finishJob(
    id: number,
    status: "SUCCESS" | "FAILED",
    durationMs: number,
    error?: string,
  ): Promise<void> {
    await db
      .update(rtJobs)
      .set({ status, durationMs, error, finishedAt: sql`now()`, updatedAt: sql`now()` })
      .where(eq(rtJobs.id, id));
  }

  async recentJobs(limit = 50): Promise<RtJob[]> {
    return db.select().from(rtJobs).orderBy(desc(rtJobs.startedAt)).limit(limit);
  }

  async saveOffset(stream: string, group: string, offset: string): Promise<void> {
    await db
      .insert(rtStreamOffsets)
      .values({ stream, consumerGroup: group, lastOffset: offset })
      .onConflictDoUpdate({
        target: [rtStreamOffsets.stream, rtStreamOffsets.consumerGroup],
        set: { lastOffset: offset, updatedAt: sql`now()` },
      });
  }

  async getOffset(stream: string, group: string): Promise<string | null> {
    const [row] = await db
      .select()
      .from(rtStreamOffsets)
      .where(
        and(eq(rtStreamOffsets.stream, stream), eq(rtStreamOffsets.consumerGroup, group)),
      )
      .limit(1);
    return row?.lastOffset ?? null;
  }

  async deadLetter(topic: string, payload: unknown, error: string): Promise<void> {
    await db.insert(rtDeadLetter).values({ topic, payload, error });
  }
}

export const infraRepository = singleton("infra.repository", () => new InfraRepository());
