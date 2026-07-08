import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { decisionQuality } from "@/db/schema";
import { appendEvent } from "@/lib/events/audit-store";
import type { MarketIntelligence } from "@/lib/brain/intel";
import type {
  ConsensusResult,
  IndicatorSnapshot,
  MarketContext,
  ModelOpinion,
  SymbolAssessment,
} from "@/lib/brain/types";

/**
 * Decision Quality Layer (Evolution Phase-1).
 * Dynamic risk scoring, reasoning-quality scoring, expected-outcome capture,
 * and expected-vs-actual evaluation with prediction error.
 */

/* ----------------------------- Risk scoring ----------------------------- */

export interface RiskAssessment {
  score: number; // 0..100 (higher = riskier)
  exposureFactor: number; // 0..1 multiplier applied to position size
  components: Record<string, number>;
  notes: string[];
}

/**
 * Dynamic risk score: volatility state + regime alignment + news multiplier
 * + liquidity + model disagreement. Volatility-based exposure reduction is
 * derived directly from the score.
 */
export function assessDecisionRisk(
  direction: 1 | -1,
  indicators: IndicatorSnapshot,
  context: MarketContext,
  consensus: ConsensusResult,
  intel: MarketIntelligence,
  orderNotional: number,
): RiskAssessment {
  const notes: string[] = [];
  const components: Record<string, number> = {};

  // Volatility (0..30): 1% daily vol ≈ calm, 4%+ ≈ chaotic.
  const vol = indicators.volatilityPct ?? 2;
  components.volatility = Math.min(30, Math.max(0, (vol - 0.8) * 9));
  if (vol > 2.5) notes.push(`elevated volatility ${vol.toFixed(2)}%/day`);

  // Regime misalignment (0..20), with dual-index disagreement penalty.
  const regimeSign = context.regime === "BULLISH" ? 1 : context.regime === "BEARISH" ? -1 : 0;
  components.regime = regimeSign === 0 ? 10 : regimeSign === direction ? 0 : 20;
  if (!intel.regimeAgreement && intel.indexRegimes.some((r) => r.regime !== "UNKNOWN")) {
    components.regime = Math.min(20, components.regime + 6);
    notes.push("NIFTY/BANKNIFTY regime disagreement");
  }

  // Model disagreement (0..20).
  components.disagreement = Math.min(20, consensus.disagreement * 25);
  if (consensus.disagreement > 0.6) notes.push(`high model disagreement ${consensus.disagreement}`);

  // Liquidity (0..15): order notional vs 20d avg traded value.
  const advValue = (indicators.avgVolume20 ?? 0) * indicators.close;
  const participation = advValue > 0 ? orderNotional / advValue : 1;
  components.liquidity = Math.min(15, participation * 150);
  if (participation > 0.05) notes.push(`order is ${(participation * 100).toFixed(1)}% of avg daily value`);

  // News-driven multiplier applied to the subtotal (0..15 contribution).
  const subtotal = components.volatility + components.regime + components.disagreement + components.liquidity;
  components.news = Math.min(15, subtotal * (intel.newsRiskMultiplier - 1) * 0.6);
  if (intel.newsRiskMultiplier > 1.2) notes.push(`news risk multiplier ${intel.newsRiskMultiplier}×`);

  const score = Math.round(Math.min(100, subtotal + components.news));

  // Volatility-based exposure reduction: full size ≤40, tapering to 25% at 95.
  const exposureFactor =
    score <= 40 ? 1 : Math.max(0.25, Math.round((1 - ((score - 40) / 55) * 0.75) * 100) / 100);
  if (exposureFactor < 1) notes.push(`exposure reduced to ${(exposureFactor * 100).toFixed(0)}%`);

  for (const k of Object.keys(components)) components[k] = Math.round(components[k] * 10) / 10;
  return { score, exposureFactor, components, notes };
}

/* ------------------------- Reasoning quality ---------------------------- */

/** 0..100: evidence depth, participation, confidence, agreement, context fit. */
export function scoreReasoningQuality(
  opinions: ModelOpinion[],
  consensus: ConsensusResult,
  strategyAligned: boolean,
): number {
  if (opinions.length === 0) return 0;
  const evidenceDepth =
    opinions.reduce((a, o) => a + Math.min(3, (o.evidence ?? []).length), 0) / (opinions.length * 3);
  const participation = opinions.filter((o) => Math.abs(o.stance) >= 0.05).length / opinions.length;
  const score =
    evidenceDepth * 25 +
    participation * 15 +
    consensus.avgConfidence * 20 +
    (consensus.agreementPct / 100) * 15 +
    consensus.contextAlignment * 10 +
    (strategyAligned ? 15 : 0);
  return Math.round(Math.min(100, score));
}

/* ----------------------- Expectation + evaluation ----------------------- */

export interface DecisionExpectation {
  expectedMovePct: number;
  targetPrice: number;
  stopPrice: number;
  horizonBars: number;
}

/** Expected outcome: 2×ATR risk, 3×ATR reward in trade direction, 10-bar horizon. */
export function buildExpectation(direction: 1 | -1, price: number, atr: number): DecisionExpectation {
  const target = price + direction * atr * 3;
  const stop = price - direction * atr * 2;
  return {
    expectedMovePct: Math.round(((direction * atr * 3) / price) * 10000) / 100,
    targetPrice: Math.round(target * 100) / 100,
    stopPrice: Math.round(stop * 100) / 100,
    horizonBars: 10,
  };
}

export interface QualityRecordInput {
  decisionId: string;
  cycleId: string;
  assessment: SymbolAssessment;
  strategyId: string | null;
  riskScore: number;
  reasoningQuality: number;
  expectation: DecisionExpectation;
  entryPrice: number | null;
  marketRegime: string;
  quantity: number;
}

export async function recordDecisionQuality(input: QualityRecordInput): Promise<void> {
  const price = input.entryPrice ?? input.assessment.indicators.close;
  await db
    .insert(decisionQuality)
    .values({
      decisionId: input.decisionId,
      cycleId: input.cycleId,
      symbol: input.assessment.symbol,
      action: input.assessment.action,
      strategyId: input.strategyId,
      confidence: Math.round(input.assessment.conviction * 100),
      reasoningQuality: input.reasoningQuality,
      riskScore: input.riskScore,
      expectedMovePct: input.expectation.expectedMovePct,
      targetPrice: input.expectation.targetPrice,
      stopPrice: input.expectation.stopPrice,
      horizonBars: input.expectation.horizonBars,
      expectedReward: Math.round(Math.abs(input.expectation.targetPrice - price) * input.quantity * 100) / 100,
      expectedRisk: Math.round(Math.abs(price - input.expectation.stopPrice) * input.quantity * 100) / 100,
      marketRegime: input.marketRegime,
      modelsParticipated: input.assessment.opinions.map((o) => o.model),
      entryPrice: input.entryPrice,
      status: "pending",
    })
    .onConflictDoNothing();
}

export interface EvaluationResult {
  decisionId: string;
  actualMovePct: number;
  predictionError: number;
  outcome: string;
  strategyId: string | null;
}

/** Compare expected vs actual on position close; store the learning delta. */
export async function evaluateDecisionOutcome(
  symbol: string,
  entrySide: "BUY" | "SHORT",
  exitFill: number,
  holdingTimeSec?: number,
): Promise<EvaluationResult | null> {
  const rows = await db
    .select()
    .from(decisionQuality)
    .where(
      and(
        eq(decisionQuality.symbol, symbol),
        eq(decisionQuality.action, entrySide),
        eq(decisionQuality.status, "pending"),
      ),
    )
    .limit(1);
  const record = rows[0];
  if (!record) return null;

  const basePrice = record.entryPrice ?? (entrySide === "BUY" ? record.stopPrice + 0 : record.stopPrice);
  const direction = entrySide === "BUY" ? 1 : -1;
  const actualMovePct =
    basePrice > 0 ? Math.round(((exitFill - basePrice) / basePrice) * direction * 10000) / 100 : 0;
  const predictionError = Math.round(Math.abs(record.expectedMovePct - actualMovePct) * 100) / 100;
  const outcome =
    direction * (exitFill - record.targetPrice) >= 0
      ? "target_hit"
      : direction * (exitFill - record.stopPrice) <= 0
        ? "stopped"
        : actualMovePct > 0
          ? "closed_profit"
          : "closed_loss";

  await db
    .update(decisionQuality)
    .set({
      status: "evaluated",
      actualMovePct,
      predictionError,
      outcome,
      holdingTimeSec: holdingTimeSec != null ? Math.round(holdingTimeSec) : null,
      evaluatedAt: new Date(),
    })
    .where(eq(decisionQuality.decisionId, record.decisionId));

  return {
    decisionId: record.decisionId,
    actualMovePct,
    predictionError,
    outcome,
    strategyId: record.strategyId,
  };
}

/** Mark entry fill price once paper validation confirms execution. */
export async function attachEntryFill(decisionId: string, fillPrice: number): Promise<void> {
  await db
    .update(decisionQuality)
    .set({ entryPrice: fillPrice })
    .where(and(eq(decisionQuality.decisionId, decisionId), eq(decisionQuality.status, "pending")));
}

/* ----------------------------- Reporting -------------------------------- */

export async function getQualityReport(limit = 50) {
  const rows = await db.select().from(decisionQuality).limit(Math.min(limit, 200));
  const evaluated = rows.filter((r) => r.status === "evaluated");
  const avg = (xs: number[]) =>
    xs.length === 0 ? null : Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100;
  return {
    totalDecisions: rows.length,
    evaluated: evaluated.length,
    pending: rows.filter((r) => r.status === "pending").length,
    avgConfidence: avg(rows.map((r) => r.confidence)),
    avgReasoningQuality: avg(rows.map((r) => r.reasoningQuality)),
    avgRiskScore: avg(rows.map((r) => r.riskScore)),
    avgPredictionError: avg(evaluated.map((r) => r.predictionError ?? 0)),
    hitRate:
      evaluated.length > 0
        ? Math.round(
            (evaluated.filter((r) => r.outcome === "target_hit" || r.outcome === "closed_profit").length /
              evaluated.length) *
              1000,
          ) / 10
        : null,
    decisions: rows
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
      .map((r) => ({
        decisionId: r.decisionId,
        symbol: r.symbol,
        action: r.action,
        confidence: r.confidence,
        reasoningQuality: r.reasoningQuality,
        riskScore: r.riskScore,
        expectedMovePct: r.expectedMovePct,
        actualMovePct: r.actualMovePct,
        predictionError: r.predictionError,
        outcome: r.outcome,
        status: r.status,
      })),
  };
}

/** Emit the six mandated decision.* events for one decision. */
export async function emitDecisionEvents(
  decisionId: string,
  assessment: SymbolAssessment,
  risk: RiskAssessment,
  reasoningQuality: number,
  expectation: DecisionExpectation,
  quantity: number,
): Promise<void> {
  const base = { decisionId, symbol: assessment.symbol };
  await appendEvent("decision.created", "ai-brain", { ...base, action: assessment.action, quantity });
  await appendEvent("decision.reasoning", "ai-brain", {
    ...base,
    reasoningQuality,
    factors: assessment.opinions.map((o) => ({
      model: o.model,
      stance: o.stance,
      confidence: o.confidence,
      evidence: (o.evidence ?? []).slice(0, 3),
    })),
    riskNotes: assessment.riskNotes,
  });
  await appendEvent("decision.confidence", "ai-brain", {
    ...base,
    confidence: Math.round(assessment.conviction * 100),
  });
  await appendEvent("decision.risk_score", "ai-brain", {
    ...base,
    riskScore: risk.score,
    exposureFactor: risk.exposureFactor,
    components: risk.components,
  });
  await appendEvent("decision.expected_outcome", "ai-brain", { ...base, ...expectation });
  await appendEvent("decision.final_action", "ai-brain", {
    ...base,
    action: assessment.action,
    quantity,
  });
}
