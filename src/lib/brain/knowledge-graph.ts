import { desc, eq, and, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { brainMemory, decisionQuality, knowledgeEdges, marketIntel } from "@/db/schema";
import { appendEvent } from "@/lib/events/audit-store";

/**
 * KNOWLEDGE GRAPH (Phase-3) — ONE graph relating existing entities by
 * reference. Edges point INTO existing stores (decisions, memory, intel,
 * strategies); no payload is ever copied — memory is never duplicated.
 */

export interface EdgeInput {
  fromType: string;
  fromId: string;
  relation: string;
  toType: string;
  toId: string;
  weight?: number;
  evidence?: Record<string, unknown>;
}

export async function linkEntities(edge: EdgeInput): Promise<boolean> {
  const inserted = await db
    .insert(knowledgeEdges)
    .values({
      fromType: edge.fromType,
      fromId: edge.fromId,
      relation: edge.relation,
      toType: edge.toType,
      toId: edge.toId,
      weight: edge.weight ?? 1,
      evidence: edge.evidence ?? {},
    })
    .onConflictDoNothing()
    .returning({ id: knowledgeEdges.id });
  return inserted.length > 0;
}

/**
 * Graph synchronization: derives edges from existing platform data.
 * Idempotent (unique edge constraint); safe to run every cycle.
 */
export async function syncKnowledgeGraph(): Promise<{ newEdges: number }> {
  let newEdges = 0;
  const add = async (edge: EdgeInput) => {
    if (await linkEntities(edge)) newEdges += 1;
  };

  // Stocks → sectors (from intel sector_map).
  const sectorRows = await db.select().from(marketIntel).where(eq(marketIntel.kind, "sector_map")).limit(500);
  for (const row of sectorRows) {
    if (row.symbol && row.sector) {
      await add({ fromType: "stock", fromId: row.symbol, relation: "BELONGS_TO", toType: "sector", toId: row.sector });
    }
  }

  // News / political / economic events → stocks or sectors.
  const eventRows = await db
    .select()
    .from(marketIntel)
    .where(or(eq(marketIntel.kind, "news"), eq(marketIntel.kind, "rbi_event"), eq(marketIntel.kind, "budget_event"), eq(marketIntel.kind, "corporate_action")))
    .orderBy(desc(marketIntel.id))
    .limit(300);
  for (const row of eventRows) {
    const eventId = `intel-${row.id}`;
    if (row.symbol) {
      await add({ fromType: "event", fromId: eventId, relation: "AFFECTS", toType: "stock", toId: row.symbol, weight: row.impact === "high" ? 1 : row.impact === "medium" ? 0.6 : 0.3, evidence: { kind: row.kind, title: row.title, horizon: row.horizon } });
    } else if (row.sector) {
      await add({ fromType: "event", fromId: eventId, relation: "AFFECTS", toType: "sector", toId: row.sector, evidence: { kind: row.kind, title: row.title } });
    } else if (row.kind === "rbi_event" || row.kind === "budget_event") {
      await add({ fromType: "event", fromId: eventId, relation: "AFFECTS", toType: "market", toId: "INDIA", weight: row.impact === "high" ? 1 : 0.5, evidence: { kind: row.kind, title: row.title } });
    }
  }

  // Decisions → stocks, strategies, regimes, participating models.
  const decisions = await db.select().from(decisionQuality).orderBy(desc(decisionQuality.createdAt)).limit(300);
  for (const d of decisions) {
    await add({ fromType: "decision", fromId: d.decisionId, relation: "ON_SYMBOL", toType: "stock", toId: d.symbol, weight: d.confidence / 100 });
    if (d.strategyId) {
      await add({ fromType: "decision", fromId: d.decisionId, relation: "USED_STRATEGY", toType: "strategy", toId: d.strategyId });
    }
    await add({ fromType: "decision", fromId: d.decisionId, relation: "IN_REGIME", toType: "regime", toId: d.marketRegime });
    for (const model of d.modelsParticipated) {
      await add({ fromType: "model", fromId: model, relation: "VOTED_ON", toType: "decision", toId: d.decisionId });
    }
    if (d.status === "evaluated" && d.outcome) {
      await add({ fromType: "decision", fromId: d.decisionId, relation: "RESULTED_IN", toType: "outcome", toId: d.outcome, weight: Math.min(1, (d.predictionError ?? 0) / 20), evidence: { actualMovePct: d.actualMovePct } });
    }
  }

  // Lessons → stocks + regimes (from learning memory).
  const lessons = await db
    .select()
    .from(brainMemory)
    .where(and(eq(brainMemory.domain, "learning"), sql`${brainMemory.key} like 'lesson-%'`))
    .orderBy(desc(brainMemory.id))
    .limit(200);
  for (const lesson of lessons) {
    const symbol = lesson.payload?.["symbol"];
    const regime = lesson.payload?.["regime"];
    if (typeof symbol === "string" && lesson.key) {
      await add({ fromType: "lesson", fromId: lesson.key, relation: "ABOUT", toType: "stock", toId: symbol });
    }
    if (typeof regime === "string" && lesson.key) {
      await add({ fromType: "lesson", fromId: lesson.key, relation: "LEARNED_IN", toType: "regime", toId: regime });
    }
  }

  if (newEdges > 0) {
    await appendEvent("knowledge.linked", "brain-knowledge-manager", { newEdges });
  }
  return { newEdges };
}

export async function getNeighbors(entityType: string, entityId: string, limit = 50) {
  const rows = await db
    .select()
    .from(knowledgeEdges)
    .where(
      or(
        and(eq(knowledgeEdges.fromType, entityType), eq(knowledgeEdges.fromId, entityId)),
        and(eq(knowledgeEdges.toType, entityType), eq(knowledgeEdges.toId, entityId)),
      ),
    )
    .orderBy(desc(knowledgeEdges.weight))
    .limit(Math.min(limit, 200));
  return rows.map((r) => ({
    from: { type: r.fromType, id: r.fromId },
    relation: r.relation,
    to: { type: r.toType, id: r.toId },
    weight: r.weight,
    evidence: r.evidence,
  }));
}

export async function getGraphStats() {
  const [edgeCount] = await db.select({ n: sql<number>`count(*)::int` }).from(knowledgeEdges);
  const byRelation = await db
    .select({ relation: knowledgeEdges.relation, n: sql<number>`count(*)::int` })
    .from(knowledgeEdges)
    .groupBy(knowledgeEdges.relation);
  return {
    totalEdges: edgeCount?.n ?? 0,
    relations: Object.fromEntries(byRelation.map((r) => [r.relation, r.n])),
  };
}
