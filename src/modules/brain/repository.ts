// AITradeMinds — Brain Repository. Reuses the single db context (@/db).
// Owns knowledge graph, feature importance, calibration, and tiered memory.
// Append-only where mandated; edges/importance/calibration are running aggregates.
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  brainCalibration,
  brainFeatureImportance,
  brainKnowledgeEdges,
  brainMemory,
  brainMetaRecommendations,
  brainModelReputation,
  brainMarketDna,
  brainConsensus,
  brainSelfReviews,
  brainRlExperiences,
  type BrainCalibration,
  type BrainFeatureImportance,
  type BrainKnowledgeEdge,
  type BrainMemory,
  type BrainMetaRecommendation,
  type BrainModelReputation,
  type BrainMarketDna,
  type BrainConsensus,
  type BrainSelfReview,
} from "@/db/schema";
import { singleton } from "@/kernel";

class BrainRepository {
  // ---- Knowledge Graph (confidence-weighted edges) ----
  async upsertEdge(row: {
    sourceType: string;
    sourceId: string;
    relation: string;
    targetType: string;
    targetId: string;
    confidenceDelta: number;
  }): Promise<void> {
    // Bayesian-ish running update: shift confidence toward observed signal.
    await db
      .insert(brainKnowledgeEdges)
      .values({
        sourceType: row.sourceType,
        sourceId: row.sourceId,
        relation: row.relation,
        targetType: row.targetType,
        targetId: row.targetId,
        confidence: Math.min(1, Math.max(0, 0.5 + row.confidenceDelta)),
        observations: 1,
      })
      .onConflictDoUpdate({
        target: [
          brainKnowledgeEdges.sourceType,
          brainKnowledgeEdges.sourceId,
          brainKnowledgeEdges.relation,
          brainKnowledgeEdges.targetType,
          brainKnowledgeEdges.targetId,
        ],
        set: {
          confidence: sql`greatest(0, least(1, ${brainKnowledgeEdges.confidence} + ${row.confidenceDelta} / (${brainKnowledgeEdges.observations} + 1.0)))`,
          observations: sql`${brainKnowledgeEdges.observations} + 1`,
          updatedAt: sql`now()`,
        },
      });
  }

  async edgesFrom(sourceType: string, sourceId: string): Promise<BrainKnowledgeEdge[]> {
    return db
      .select()
      .from(brainKnowledgeEdges)
      .where(
        and(
          eq(brainKnowledgeEdges.sourceType, sourceType),
          eq(brainKnowledgeEdges.sourceId, sourceId),
        ),
      )
      .orderBy(desc(brainKnowledgeEdges.confidence))
      .limit(100);
  }

  async topEdges(limit = 100): Promise<BrainKnowledgeEdge[]> {
    return db
      .select()
      .from(brainKnowledgeEdges)
      .orderBy(desc(brainKnowledgeEdges.confidence))
      .limit(limit);
  }

  // ---- Feature Importance ----
  async recordFeature(row: {
    modelKey: string;
    feature: string;
    regime: string | null;
    contribution: number;
    helpful: boolean;
  }): Promise<void> {
    await db
      .insert(brainFeatureImportance)
      .values({
        modelKey: row.modelKey,
        feature: row.feature,
        regime: row.regime,
        contribution: row.contribution,
        helpfulCount: row.helpful ? 1 : 0,
        harmfulCount: row.helpful ? 0 : 1,
      })
      .onConflictDoUpdate({
        target: [
          brainFeatureImportance.modelKey,
          brainFeatureImportance.feature,
          brainFeatureImportance.regime,
        ],
        set: {
          contribution: sql`${brainFeatureImportance.contribution} + ${row.contribution}`,
          helpfulCount: sql`${brainFeatureImportance.helpfulCount} + ${row.helpful ? 1 : 0}`,
          harmfulCount: sql`${brainFeatureImportance.harmfulCount} + ${row.helpful ? 0 : 1}`,
          updatedAt: sql`now()`,
        },
      });
  }

  async featureImportance(modelKey: string): Promise<BrainFeatureImportance[]> {
    return db
      .select()
      .from(brainFeatureImportance)
      .where(eq(brainFeatureImportance.modelKey, modelKey))
      .orderBy(desc(brainFeatureImportance.contribution))
      .limit(50);
  }

  // ---- Confidence Calibration (reliability buckets) ----
  async recordCalibration(row: {
    modelKey: string;
    regime: string;
    bucket: number;
    correct: boolean;
  }): Promise<void> {
    await db
      .insert(brainCalibration)
      .values({
        modelKey: row.modelKey,
        regime: row.regime,
        bucket: row.bucket,
        predicted: 1,
        correct: row.correct ? 1 : 0,
      })
      .onConflictDoUpdate({
        target: [brainCalibration.modelKey, brainCalibration.regime, brainCalibration.bucket],
        set: {
          predicted: sql`${brainCalibration.predicted} + 1`,
          correct: sql`${brainCalibration.correct} + ${row.correct ? 1 : 0}`,
          updatedAt: sql`now()`,
        },
      });
  }

  async calibration(modelKey: string, regime?: string): Promise<BrainCalibration[]> {
    return db
      .select()
      .from(brainCalibration)
      .where(
        regime
          ? and(eq(brainCalibration.modelKey, modelKey), eq(brainCalibration.regime, regime))
          : eq(brainCalibration.modelKey, modelKey),
      )
      .orderBy(brainCalibration.bucket);
  }

  // ---- Tiered Memory (append-only) ----
  async remember(row: typeof brainMemory.$inferInsert): Promise<BrainMemory> {
    const [saved] = await db.insert(brainMemory).values(row).returning();
    return saved;
  }

  async recall(tier: string, limit = 50): Promise<BrainMemory[]> {
    return db
      .select()
      .from(brainMemory)
      .where(eq(brainMemory.tier, tier))
      .orderBy(desc(brainMemory.createdAt))
      .limit(limit);
  }

  async memoryCounts(): Promise<Record<string, number>> {
    const rows = await db
      .select({ tier: brainMemory.tier, c: sql<number>`count(*)::int` })
      .from(brainMemory)
      .groupBy(brainMemory.tier);
    return Object.fromEntries(rows.map((r) => [r.tier, r.c]));
  }

  // ---- Meta-Learning recommendations (append-only, recommend-only) ----
  async addRecommendation(
    row: typeof brainMetaRecommendations.$inferInsert,
  ): Promise<BrainMetaRecommendation> {
    const [saved] = await db.insert(brainMetaRecommendations).values(row).returning();
    return saved;
  }

  async listRecommendations(
    modelKey?: string,
    limit = 100,
  ): Promise<BrainMetaRecommendation[]> {
    return db
      .select()
      .from(brainMetaRecommendations)
      .where(modelKey ? eq(brainMetaRecommendations.modelKey, modelKey) : undefined)
      .orderBy(desc(brainMetaRecommendations.createdAt))
      .limit(limit);
  }

  // ---- Model Reputation (running aggregates per model/regime) ----
  async updateReputation(row: {
    modelKey: string;
    regime: string;
    win: boolean;
    reward: number;
    drawdown: number;
  }): Promise<void> {
    const recentDelta = row.win ? 0.05 : -0.05;
    await db
      .insert(brainModelReputation)
      .values({
        modelKey: row.modelKey,
        regime: row.regime,
        trades: 1,
        wins: row.win ? 1 : 0,
        cumReward: row.reward,
        cumReturnSq: row.reward * row.reward,
        maxDrawdown: row.drawdown,
        recentScore: Math.min(1, Math.max(0, 0.5 + recentDelta)),
      })
      .onConflictDoUpdate({
        target: [brainModelReputation.modelKey, brainModelReputation.regime],
        set: {
          trades: sql`${brainModelReputation.trades} + 1`,
          wins: sql`${brainModelReputation.wins} + ${row.win ? 1 : 0}`,
          cumReward: sql`${brainModelReputation.cumReward} + ${row.reward}`,
          cumReturnSq: sql`${brainModelReputation.cumReturnSq} + ${row.reward * row.reward}`,
          maxDrawdown: sql`greatest(${brainModelReputation.maxDrawdown}, ${row.drawdown})`,
          recentScore: sql`greatest(0, least(1, ${brainModelReputation.recentScore} + ${recentDelta}))`,
          updatedAt: sql`now()`,
        },
      });
  }

  async setInfluence(modelKey: string, regime: string, influence: number): Promise<void> {
    await db
      .update(brainModelReputation)
      .set({ influence, updatedAt: sql`now()` })
      .where(
        and(eq(brainModelReputation.modelKey, modelKey), eq(brainModelReputation.regime, regime)),
      );
  }

  async reputations(modelKey?: string): Promise<BrainModelReputation[]> {
    return db
      .select()
      .from(brainModelReputation)
      .where(modelKey ? eq(brainModelReputation.modelKey, modelKey) : undefined)
      .orderBy(desc(brainModelReputation.recentScore));
  }

  // ---- Market DNA ----
  async saveDna(row: typeof brainMarketDna.$inferInsert): Promise<BrainMarketDna> {
    const [saved] = await db.insert(brainMarketDna).values(row).returning();
    return saved;
  }

  async dnaForSymbol(symbol: string, limit = 500): Promise<BrainMarketDna[]> {
    return db
      .select()
      .from(brainMarketDna)
      .where(eq(brainMarketDna.symbol, symbol))
      .orderBy(desc(brainMarketDna.ts))
      .limit(limit);
  }

  async dnaCount(): Promise<number> {
    const [r] = await db.select({ c: sql<number>`count(*)::int` }).from(brainMarketDna);
    return r?.c ?? 0;
  }

  // ---- Consensus (append-only) ----
  async saveConsensus(row: typeof brainConsensus.$inferInsert): Promise<BrainConsensus> {
    const [saved] = await db.insert(brainConsensus).values(row).returning();
    return saved;
  }

  async recentConsensus(symbol?: string, limit = 50): Promise<BrainConsensus[]> {
    return db
      .select()
      .from(brainConsensus)
      .where(symbol ? eq(brainConsensus.symbol, symbol) : undefined)
      .orderBy(desc(brainConsensus.createdAt))
      .limit(limit);
  }

  // ---- Self-reviews (append-only) ----
  async saveSelfReview(row: typeof brainSelfReviews.$inferInsert): Promise<BrainSelfReview> {
    const [saved] = await db.insert(brainSelfReviews).values(row).returning();
    return saved;
  }

  async selfReviews(limit = 20): Promise<BrainSelfReview[]> {
    return db.select().from(brainSelfReviews).orderBy(desc(brainSelfReviews.createdAt)).limit(limit);
  }

  // ---- RL experiences (research-only, append-only) ----
  async saveExperience(row: typeof brainRlExperiences.$inferInsert): Promise<void> {
    await db.insert(brainRlExperiences).values(row);
  }

  async replayBuffer(episode: string, limit = 500) {
    return db
      .select()
      .from(brainRlExperiences)
      .where(eq(brainRlExperiences.episode, episode))
      .orderBy(brainRlExperiences.createdAt)
      .limit(limit);
  }
}

export const brainRepository = singleton("brain.repository", () => new BrainRepository());
