// AITradeMinds — Execution Quality Tracker. Scores each fill (slippage/spread/
// latency/fill-quality/partial/market-impact) and persists an append-only record.
// Reuses tradingRepository fills + executionRepository. Emits quality event.
import { singleton } from "@/kernel";
import { eventBus } from "@/modules/market_data/core/event-bus";
import type { TradeFill, TradeOrder } from "@/db/schema";
import { executionRepository } from "./repository";

export interface QualityScore {
  executionScore: number;
  slippageBps: number;
  marketImpactBps: number;
  fillRatio: number;
}

class QualityTracker {
  /**
   * Score a single fill and persist an immutable quality record.
   * executionScore 0..100: penalizes slippage, wide spread, latency, partial fill.
   */
  async track(order: TradeOrder, fill: TradeFill): Promise<QualityScore> {
    const slippageBps = fill.expectedPrice > 0 ? (Math.abs(fill.slippage) / fill.expectedPrice) * 10000 : 0;
    const spreadBps = fill.price > 0 ? (fill.spread / fill.price) * 10000 : 0;
    const fillRatio = order.quantity > 0 ? fill.quantity / order.quantity : 0;
    // Market impact proxy: notional-driven, deterministic.
    const notional = fill.quantity * fill.price;
    const marketImpactBps = Math.min(30, (notional / 1_000_000) * 5);

    // Score: start 100, subtract penalties (bounded).
    let score = 100;
    score -= Math.min(40, slippageBps * 2); // slippage penalty
    score -= Math.min(20, spreadBps); // spread penalty
    score -= Math.min(20, fill.latencyMs / 10); // latency penalty
    score -= (1 - fillRatio) * 20; // partial-fill penalty
    score = Math.max(0, Math.round(score));

    await executionRepository.saveQuality({
      accountId: fill.accountId,
      orderId: order.id,
      fillId: fill.id,
      symbol: fill.symbol,
      side: fill.side,
      expectedPrice: fill.expectedPrice,
      fillPrice: fill.price,
      slippage: fill.slippage,
      slippageBps: +slippageBps.toFixed(3),
      spread: fill.spread,
      latencyMs: fill.latencyMs,
      requestedQty: order.quantity,
      filledQty: fill.quantity,
      fillRatio: +fillRatio.toFixed(4),
      marketImpactBps: +marketImpactBps.toFixed(3),
      executionScore: score,
    });

    eventBus.publish("trading", {
      event: "execution.quality.updated",
      accountId: fill.accountId,
      orderId: order.id,
      symbol: fill.symbol,
      message: `score=${score} slip=${slippageBps.toFixed(1)}bps`,
      ts: Date.now(),
    });

    return {
      executionScore: score,
      slippageBps: +slippageBps.toFixed(3),
      marketImpactBps: +marketImpactBps.toFixed(3),
      fillRatio: +fillRatio.toFixed(4),
    };
  }

  async history(accountId: number, limit = 200) {
    return executionRepository.quality(accountId, limit);
  }
}

export const qualityTracker = singleton("execution.qualityTracker", () => new QualityTracker());
