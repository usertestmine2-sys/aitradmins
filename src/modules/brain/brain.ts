// AITradeMinds — THE single AI Brain. Highest authority. Everything feeds it;
// nothing bypasses it. It ORCHESTRATES existing singletons (training, learning,
// calibration, knowledge graph, memory) — it never re-implements them.
import { errors, logger, singleton } from "@/kernel";
import { eventBus } from "@/modules/market_data/core/event-bus";
import {
  learningEngine,
  trainingManager,
  trainingRepository,
  type ModelKey,
  type TradeOutcome,
} from "@/modules/training";
import { brainRepository } from "./repository";
import { confidenceCalibration, confidenceBucket } from "./calibration";
import { knowledgeGraph } from "./knowledge-graph";
import { modelReputation } from "./reputation";

export interface Explanation {
  decision: string;
  why: string[];
  whyNot: string[];
  rejectedStrategies: string[];
  riskFactors: string[];
  confidenceReason: string;
  supportingEvidence: string[];
  historicalSimilarity: string;
}

class AiBrain {
  // ------------------------------------------------------------------
  // SELF-EVOLUTION — the mandatory learn loop. Everything append-only.
  // Called after every completed paper (or backtest) trade.
  // ------------------------------------------------------------------
  async evolve(outcome: TradeOutcome & { features?: Record<string, number> }): Promise<{
    lessonId: number;
    result: string;
    calibratedConfidence: number;
  }> {
    const regime = outcome.regime ?? "UNKNOWN";
    const correct =
      (outcome.actualReward > 0 && outcome.confidence >= 0.5) ||
      (outcome.actualReward <= 0 && outcome.confidence < 0.5);

    // 1) Append-only lesson via the existing Learning Engine (no duplication).
    const learned = await learningEngine.learn(outcome);

    // 1b) Update model reputation → Brain dynamically adjusts its influence.
    await modelReputation.record({
      modelKey: outcome.modelKey,
      regime,
      reward: outcome.actualReward,
      drawdown: outcome.drawdown,
    });

    // 2) Confidence calibration update.
    await confidenceCalibration.observe(outcome.modelKey, regime, outcome.confidence, correct);
    const calibratedConfidence = await confidenceCalibration.calibrate(
      outcome.modelKey,
      regime,
      outcome.confidence,
    );

    // 3) Feature importance update (which features helped/hurt this outcome).
    if (outcome.features) {
      const helpful = outcome.actualReward > 0;
      for (const [feature, value] of Object.entries(outcome.features)) {
        await brainRepository.recordFeature({
          modelKey: outcome.modelKey,
          feature,
          regime,
          contribution: Math.abs(value) * Math.sign(outcome.actualReward || 1),
          helpful,
        });
      }
    }

    // 4) Knowledge graph: reinforce symbol↔strategy and regime→outcome edges.
    await knowledgeGraph.observe({
      sourceType: "STOCK",
      sourceId: outcome.symbol,
      relation: outcome.actualReward > 0 ? "PROFITS_IN" : "LOSES_IN",
      targetType: "REGIME",
      targetId: regime,
      confidenceDelta: outcome.actualReward > 0 ? 0.05 : -0.05,
    });
    if (outcome.strategy) {
      await knowledgeGraph.observe({
        sourceType: "STRATEGY",
        sourceId: outcome.strategy,
        relation: "APPLIES_TO",
        targetType: "STOCK",
        targetId: outcome.symbol,
        confidenceDelta: outcome.actualReward > 0 ? 0.04 : -0.04,
      });
    }

    // 5) Tiered memory: short-term for every trade; long-term for strong signals.
    await brainRepository.remember({
      tier: "SHORT",
      kind: "LESSON",
      subject: outcome.symbol,
      content: { ...outcome, result: learned.result, calibratedConfidence },
      importance: Math.min(1, Math.abs(outcome.actualReward) * 10),
    });
    if (Math.abs(outcome.actualReward) > 0.03) {
      await brainRepository.remember({
        tier: "LONG",
        kind: "OBSERVATION",
        subject: outcome.symbol,
        content: { regime, actualReward: outcome.actualReward, strategy: outcome.strategy },
        importance: 0.9,
      });
    }

    eventBus.publish("training", {
      event: "brain.evolved",
      modelKey: outcome.modelKey,
      message: learned.result,
      ts: Date.now(),
    });
    logger.info("brain.evolved", { modelKey: outcome.modelKey, result: learned.result });
    return { ...learned, calibratedConfidence };
  }

  // ------------------------------------------------------------------
  // EXPLAINABLE AI — every prediction is explainable.
  // ------------------------------------------------------------------
  async explain(
    modelKey: ModelKey,
    symbol: string,
    rawConfidence: number,
    regime: string,
  ): Promise<Explanation> {
    const calibrated = await confidenceCalibration.calibrate(modelKey, regime, rawConfidence);
    const importance = await brainRepository.featureImportance(modelKey);
    const edges = await knowledgeGraph.neighbors("STOCK", symbol);
    const top = importance.slice(0, 5);

    const decision = calibrated >= 0.55 ? "ENTER" : calibrated <= 0.45 ? "AVOID" : "HOLD";
    return {
      decision,
      why: top
        .filter((f) => f.helpfulCount >= f.harmfulCount)
        .map((f) => `${f.feature} historically helpful (${f.helpfulCount} wins)`),
      whyNot: top
        .filter((f) => f.harmfulCount > f.helpfulCount)
        .map((f) => `${f.feature} historically misleading (${f.harmfulCount} losses)`),
      rejectedStrategies: edges
        .filter((e) => e.confidence < 0.4)
        .map((e) => `${e.relation}->${e.targetId} (low confidence ${e.confidence.toFixed(2)})`),
      riskFactors:
        regime.includes("VOLATILE") || regime.includes("DOWN")
          ? [`Adverse regime: ${regime}`]
          : [],
      confidenceReason: `raw ${rawConfidence.toFixed(2)} calibrated to ${calibrated.toFixed(2)} (bucket ${confidenceBucket(rawConfidence)})`,
      supportingEvidence: edges
        .filter((e) => e.confidence >= 0.6)
        .slice(0, 5)
        .map((e) => `${e.sourceId} ${e.relation} ${e.targetId} @ ${e.confidence.toFixed(2)}`),
      historicalSimilarity: `${edges.length} learned relationships for ${symbol}`,
    };
  }

  // ------------------------------------------------------------------
  // MODEL SAFETY — Brain + human approval gate. No self-activation.
  // ------------------------------------------------------------------
  async approveModel(
    modelKey: ModelKey,
    version: number,
    humanApproved: boolean,
  ): Promise<{ activated: boolean }> {
    if (!humanApproved) {
      throw errors.forbidden("Human approval required for production activation");
    }
    const model = await trainingRepository.getModel(modelKey, version);
    if (!model) throw errors.notFound(`Model ${modelKey} v${version} not found`);
    // Brain sanity gate: refuse to activate models with degenerate metrics.
    const f1 = (model.metrics as Record<string, number>).f1 ?? 0;
    if (f1 <= 0) {
      throw errors.conflict("Brain rejects activation: non-positive F1");
    }
    await trainingManager.approve(modelKey, version);
    await brainRepository.remember({
      tier: "LONG",
      kind: "DECISION",
      subject: `${modelKey}:v${version}`,
      content: { action: "ACTIVATE", f1 },
      importance: 1,
    });
    return { activated: true };
  }

  // ------------------------------------------------------------------
  // RESEARCH MODE — replay without touching live memory (RESEARCH tier only).
  // ------------------------------------------------------------------
  async research(
    modelKey: ModelKey,
    symbol: string,
    timeframe: string,
    window: "1M" | "3M" | "6M" | "1Y" | "5Y",
  ): Promise<{ recommendation: string; note: string }> {
    const limitByWindow: Record<string, number> = {
      "1M": 22, "3M": 66, "6M": 132, "1Y": 260, "5Y": 1300,
    };
    // Uses the existing trainer read-path (no live activation, RESEARCH memory only).
    const result = await trainingManager.train(modelKey, symbol, timeframe as never, {
      limit: limitByWindow[window],
      activate: false,
    });
    const recommendation =
      result.metrics.f1 > 0.5 && result.metrics.sharpe > 0 ? "PROMOTE_CANDIDATE" : "DISCARD";
    await brainRepository.remember({
      tier: "RESEARCH",
      kind: "RESEARCH",
      subject: `${modelKey}:${symbol}:${window}`,
      content: { metrics: result.metrics, recommendation },
      importance: 0.3,
    });
    return {
      recommendation,
      note: `Research replay ${window}: f1=${result.metrics.f1} sharpe=${result.metrics.sharpe}. Brain decides; not auto-learned.`,
    };
  }

  async status() {
    const [memory, edges] = await Promise.all([
      brainRepository.memoryCounts(),
      brainRepository.topEdges(10),
    ]);
    return {
      authority: "AI_BRAIN",
      memory,
      knowledgeEdges: edges.length,
      topRelationships: edges.map((e) => ({
        rel: `${e.sourceId} ${e.relation} ${e.targetId}`,
        confidence: e.confidence,
      })),
    };
  }
}

export const aiBrain = singleton("brain.core", () => new AiBrain());
