// AITradeMinds — Portfolio Snapshot Engine. Persists IMMUTABLE snapshots of the
// live portfolio state (from portfolioEngine) into an append-only timeline, and
// feeds the AI Brain memory. Reuses existing state — no re-implementation.
import { singleton } from "@/kernel";
import { eventBus } from "@/modules/market_data/core/event-bus";
import { portfolioEngine, tradingRepository } from "@/modules/trading";
import { brainRepository } from "@/modules/brain";
import type { PfSnapshot } from "@/db/schema";

class SnapshotEngine {
  /** Capture an immutable snapshot of the account's current portfolio. */
  async capture(accountId: number): Promise<PfSnapshot> {
    const state = await portfolioEngine.snapshot(accountId);
    const prev = await tradingRepository.lastSnapshot(accountId);
    const dailyReturn =
      prev && prev.equity > 0 ? +((state.equity - prev.equity) / prev.equity).toFixed(6) : 0;

    const snapshot = await tradingRepository.saveSnapshot({
      accountId,
      equity: state.equity,
      cash: state.cash,
      investedValue: state.investedValue,
      unrealizedPnl: state.unrealizedPnl,
      realizedPnl: state.realizedPnl,
      exposurePct: state.exposurePct,
      openPositions: state.openPositions,
      concentration: state.concentration,
      sectorExposure: state.sectorExposure,
      dailyReturn,
    });

    // Portfolio history becomes Brain memory (append-only).
    await brainRepository.remember({
      tier: "LONG",
      kind: "OBSERVATION",
      subject: `portfolio:${accountId}`,
      content: { equity: state.equity, dailyReturn, exposurePct: state.exposurePct, openPositions: state.openPositions },
      importance: 0.5,
    });

    eventBus.publish("trading", {
      event: "portfolio.snapshot",
      accountId,
      message: `equity=${state.equity} dailyReturn=${(dailyReturn * 100).toFixed(2)}%`,
      ts: Date.now(),
    });
    return snapshot;
  }

  async timeline(accountId: number, limit = 200) {
    return tradingRepository.snapshots(accountId, limit);
  }
}

export const snapshotEngine = singleton("portfolio.snapshotEngine", () => new SnapshotEngine());
