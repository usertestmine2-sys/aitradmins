// AITradeMinds — Trade Replay Engine. Reconstructs a historical paper trade
// step-by-step: signal → consensus → risk → OMS routing → execution → learning.
// Reuses order events, fills, risk decisions, execution quality. Append-only replay.
import { singleton, errors } from "@/kernel";
import { eventBus } from "@/modules/market_data/core/event-bus";
import { tradingRepository } from "@/modules/trading";
import { executionRepository } from "./repository";

export interface ReplayStep {
  index: number;
  phase: string;
  status: string;
  detail: string;
  latencyMs: number;
  ts: string;
}

class ReplayEngine {
  async replay(orderId: number): Promise<{
    orderId: number;
    symbol: string;
    steps: ReplayStep[];
    outcome: Record<string, unknown>;
  }> {
    const order = await tradingRepository.getOrder(orderId);
    if (!order) throw errors.notFound(`Order ${orderId} not found`);

    // Parallel reads — no N+1.
    const [events, fills, risk, quality] = await Promise.all([
      tradingRepository.orderEvents(orderId),
      tradingRepository.fills(order.accountId, 500),
      tradingRepository.riskDecisions(order.accountId, 200),
      executionRepository.quality(order.accountId, 500),
    ]);

    const steps: ReplayStep[] = [];
    let idx = 0;

    // 1) Signal + consensus context (from the order's strategy/confidence).
    steps.push({
      index: idx++, phase: "SIGNAL", status: "GENERATED",
      detail: `${order.side} ${order.symbol} strategy=${order.strategy ?? "manual"} confidence=${order.confidence ?? "n/a"}`,
      latencyMs: 0, ts: order.createdAt.toISOString(),
    });

    // 2) Risk decision for this symbol closest to order time.
    const riskForSymbol = risk.find((r) => r.symbol === order.symbol);
    if (riskForSymbol) {
      steps.push({
        index: idx++, phase: "RMS", status: riskForSymbol.decision,
        detail: riskForSymbol.detail ?? "", latencyMs: 0, ts: riskForSymbol.createdAt.toISOString(),
      });
    }

    // 3) OMS lifecycle transitions.
    for (const e of events) {
      steps.push({
        index: idx++, phase: "OMS", status: e.toStatus,
        detail: `${e.fromStatus ?? "-"} -> ${e.toStatus}${e.reason ? ` (${e.reason})` : ""}`,
        latencyMs: e.latencyMs, ts: e.createdAt.toISOString(),
      });
    }

    // 4) Execution fills for this order.
    const orderFills = fills.filter((f) => f.orderId === orderId);
    for (const f of orderFills) {
      steps.push({
        index: idx++, phase: "EXECUTION", status: "FILL",
        detail: `${f.quantity}@${f.price} (expected ${f.expectedPrice}, slip ${f.slippage})`,
        latencyMs: f.latencyMs, ts: f.createdAt.toISOString(),
      });
    }

    // 5) Execution quality result.
    const q = quality.find((x) => x.orderId === orderId);
    if (q) {
      steps.push({
        index: idx++, phase: "QUALITY", status: "SCORED",
        detail: `score=${q.executionScore} slippageBps=${q.slippageBps} fillRatio=${q.fillRatio}`,
        latencyMs: 0, ts: q.createdAt.toISOString(),
      });
    }

    const outcome: Record<string, unknown> = {
      finalStatus: order.status,
      filledQuantity: order.filledQuantity,
      avgFillPrice: order.avgFillPrice,
      executionScore: q?.executionScore ?? null,
    };

    const saved = await executionRepository.saveReplay({
      orderId, accountId: order.accountId, symbol: order.symbol, steps, outcome,
    });
    eventBus.publish("trading", {
      event: "trade.replayed",
      accountId: order.accountId,
      orderId,
      symbol: order.symbol,
      message: `${steps.length} steps`,
      ts: Date.now(),
    });
    void saved;
    return { orderId, symbol: order.symbol, steps, outcome };
  }
}

export const replayEngine = singleton("execution.replay", () => new ReplayEngine());
