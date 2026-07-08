// AITradeMinds — Training Repository. Reuses the single db context (@/db).
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  aiDatasets,
  aiLessons,
  aiModels,
  type AiDataset,
  type AiLesson,
  type AiModel,
} from "@/db/schema";
import { singleton } from "@/kernel";

class TrainingRepository {
  // ---- Datasets ----
  async saveDataset(row: typeof aiDatasets.$inferInsert): Promise<AiDataset> {
    const [saved] = await db
      .insert(aiDatasets)
      .values(row)
      .onConflictDoUpdate({
        target: aiDatasets.trainingId,
        set: {
          rows: sql`excluded.rows`,
          rowCount: sql`excluded.row_count`,
          featureNames: sql`excluded.feature_names`,
          updatedAt: sql`now()`,
        },
      })
      .returning();
    return saved;
  }

  async getDataset(trainingId: string): Promise<AiDataset | undefined> {
    const [row] = await db
      .select()
      .from(aiDatasets)
      .where(eq(aiDatasets.trainingId, trainingId))
      .limit(1);
    return row;
  }

  async listDatasets(limit = 50): Promise<AiDataset[]> {
    return db.select().from(aiDatasets).orderBy(desc(aiDatasets.createdAt)).limit(limit);
  }

  // ---- Models ----
  async nextVersion(modelKey: string): Promise<number> {
    const [row] = await db
      .select({ v: sql<number>`coalesce(max(${aiModels.version}), 0)::int` })
      .from(aiModels)
      .where(eq(aiModels.modelKey, modelKey));
    return (row?.v ?? 0) + 1;
  }

  async saveModel(row: typeof aiModels.$inferInsert): Promise<AiModel> {
    const [saved] = await db.insert(aiModels).values(row).returning();
    return saved;
  }

  async listModels(modelKey?: string, limit = 50): Promise<AiModel[]> {
    return db
      .select()
      .from(aiModels)
      .where(modelKey ? eq(aiModels.modelKey, modelKey) : undefined)
      .orderBy(desc(aiModels.createdAt))
      .limit(limit);
  }

  async activeModel(modelKey: string): Promise<AiModel | undefined> {
    const [row] = await db
      .select()
      .from(aiModels)
      .where(and(eq(aiModels.modelKey, modelKey), eq(aiModels.active, true)))
      .limit(1);
    return row;
  }

  async getModel(modelKey: string, version: number): Promise<AiModel | undefined> {
    const [row] = await db
      .select()
      .from(aiModels)
      .where(and(eq(aiModels.modelKey, modelKey), eq(aiModels.version, version)))
      .limit(1);
    return row;
  }

  /** Atomically activate one version and deactivate the rest of that model key. */
  async activateModel(modelKey: string, version: number): Promise<void> {
    await db.transaction(async (tx) => {
      await tx
        .update(aiModels)
        .set({ active: false, updatedAt: sql`now()` })
        .where(eq(aiModels.modelKey, modelKey));
      await tx
        .update(aiModels)
        .set({ active: true, approvalStatus: "APPROVED", updatedAt: sql`now()` })
        .where(and(eq(aiModels.modelKey, modelKey), eq(aiModels.version, version)));
    });
  }

  // ---- Lessons (append-only learning history) ----
  async appendLesson(row: typeof aiLessons.$inferInsert): Promise<AiLesson> {
    const [saved] = await db.insert(aiLessons).values(row).returning();
    return saved;
  }

  async listLessons(modelKey?: string, limit = 100): Promise<AiLesson[]> {
    return db
      .select()
      .from(aiLessons)
      .where(modelKey ? eq(aiLessons.modelKey, modelKey) : undefined)
      .orderBy(desc(aiLessons.createdAt))
      .limit(limit);
  }

  async lessonStats(modelKey: string): Promise<{ wins: number; losses: number; total: number }> {
    const rows = await db
      .select({ result: aiLessons.result, c: sql<number>`count(*)::int` })
      .from(aiLessons)
      .where(eq(aiLessons.modelKey, modelKey))
      .groupBy(aiLessons.result);
    let wins = 0;
    let losses = 0;
    let total = 0;
    for (const r of rows) {
      total += r.c;
      if (r.result === "WIN") wins = r.c;
      if (r.result === "LOSS") losses = r.c;
    }
    return { wins, losses, total };
  }
}

export const trainingRepository = singleton(
  "training.repository",
  () => new TrainingRepository(),
);
