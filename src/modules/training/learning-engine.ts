// AITradeMinds — Learning Engine. Append-only lesson generation from trade
// outcomes. Ready to consume Paper Trading (Phase 8) results the moment they
// exist; today it accepts outcomes via API/event. Never overwrites history.
import { logger, singleton } from "@/kernel";
import { eventBus } from "@/modules/market_data/core/event-bus";
import { trainingRepository } from "./repository";
import type { ModelKey } from "./trainer";

export interface TradeOutcome {
  modelKey: ModelKey;
  symbol: string;
  strategy?: string;
  regime?: string;
  expectedReward: number;
  actualReward: number;
  confidence: number;
  holdingTime?: number;
  drawdown?: number;
  slippage?: number;
  source?: "PAPER" | "LIVE" | "BACKTEST";
}

class LearningEngine {
  private lessonText(o: TradeOutcome, result: string): string {
    const delta = o.actualReward - o.expectedReward;
    const dir = delta >= 0 ? "outperformed" : "underperformed";
    return (
      `[${result}] ${o.symbol} (${o.regime ?? "regime?"}) ${dir} expectation by ` +
      `${(delta * 100).toFixed(2)}% at ${(o.confidence * 100).toFixed(0)}% confidence` +
      (o.drawdown ? `; drawdown ${(o.drawdown * 100).toFixed(2)}%` : "")
    );
  }

  /** Record a trade outcome as an append-only lesson + update calibration signal. */
  async learn(outcome: TradeOutcome): Promise<{ lessonId: number; result: string }> {
    const result =
      outcome.actualReward > 0 ? "WIN" : outcome.actualReward < 0 ? "LOSS" : "FLAT";
    const lesson = await trainingRepository.appendLesson({
      modelKey: outcome.modelKey,
      symbol: outcome.symbol,
      strategy: outcome.strategy,
      regime: outcome.regime,
      expectedReward: outcome.expectedReward,
      actualReward: outcome.actualReward,
      confidence: outcome.confidence,
      holdingTime: outcome.holdingTime,
      drawdown: outcome.drawdown,
      slippage: outcome.slippage,
      result,
      lesson: this.lessonText(outcome, result),
      source: outcome.source ?? "PAPER",
    });

    eventBus.publish("training", {
      event: "learning.completed",
      modelKey: outcome.modelKey,
      message: result,
      ts: Date.now(),
    });
    eventBus.publish("training", {
      event: "confidence.updated",
      modelKey: outcome.modelKey,
      message: `${(outcome.confidence * 100).toFixed(0)}%`,
      ts: Date.now(),
    });
    logger.info("learning.completed", { modelKey: outcome.modelKey, result });
    return { lessonId: lesson.id, result };
  }

  async stats(modelKey: ModelKey) {
    const s = await trainingRepository.lessonStats(modelKey);
    const winRate = s.total ? +(s.wins / s.total).toFixed(4) : 0;
    return { ...s, winRate };
  }
}

export const learningEngine = singleton("training.learningEngine", () => new LearningEngine());
