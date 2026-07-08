// AITradeMinds — Execution Metrics Aggregator. Combines execution-quality
// aggregates with portfolio/position stats into an execution score. Reuses
// executionRepository + tradingRepository. Parallel reads, no N+1.
import { singleton } from "@/kernel";
import { tradingRepository } from "@/modules/trading";
import { executionRepository } from "./repository";

export interface ExecutionMetrics {
  trades: number;
  avgLatencyMs: number;
  avgSlippageBps: number;
  avgSpread: number;
  fillPct: number;
  winPct: number;
  lossPct: number;
  avgHoldMinutes: number;
  brokerEfficiency: number;
  executionScore: number;
}

class MetricsAggregator {
  async compute(accountId: number): Promise<ExecutionMetrics> {
    const [agg, closed] = await Promise.all([
      executionRepository.aggregates(accountId),
      tradingRepository.positions(accountId, "CLOSED"),
    ]);

    const realized = closed.map((p) => p.realizedPnl);
    const wins = realized.filter((r) => r > 0).length;
    const losses = realized.filter((r) => r < 0).length;
    const total = realized.length;

    // Average hold time from closed positions (opened→closed).
    let holdMinutes = 0;
    let holdCount = 0;
    for (const p of closed) {
      if (p.closedAt) {
        holdMinutes += (p.closedAt.getTime() - p.openedAt.getTime()) / 60000;
        holdCount += 1;
      }
    }

    // Broker efficiency: latency-inverse score (100 = instant, decays with latency).
    const brokerEfficiency = agg.avgLatencyMs > 0 ? Math.max(0, 100 - agg.avgLatencyMs / 5) : 100;

    return {
      trades: agg.trades,
      avgLatencyMs: agg.avgLatencyMs,
      avgSlippageBps: agg.avgSlippageBps,
      avgSpread: agg.avgSpread,
      fillPct: +(agg.avgFillRatio * 100).toFixed(2),
      winPct: total ? +((wins / total) * 100).toFixed(2) : 0,
      lossPct: total ? +((losses / total) * 100).toFixed(2) : 0,
      avgHoldMinutes: holdCount ? +(holdMinutes / holdCount).toFixed(2) : 0,
      brokerEfficiency: +brokerEfficiency.toFixed(2),
      executionScore: agg.avgExecutionScore,
    };
  }
}

export const metricsAggregator = singleton("execution.metrics", () => new MetricsAggregator());
