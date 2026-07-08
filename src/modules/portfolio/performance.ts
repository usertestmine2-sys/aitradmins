// AITradeMinds — Portfolio Performance. Computes returns/risk metrics from the
// immutable snapshot timeline + closed positions. Deterministic, read-only.
import { singleton } from "@/kernel";
import { tradingRepository } from "@/modules/trading";

export interface PerformanceReport {
  snapshots: number;
  startEquity: number;
  currentEquity: number;
  absoluteReturn: number;
  cagr: number;
  dailyReturnAvg: number;
  volatility: number;
  sharpe: number;
  sortino: number;
  calmar: number;
  maxDrawdown: number;
  currentDrawdown: number;
  winRate: number;
  lossRate: number;
  avgGain: number;
  avgLoss: number;
  profitFactor: number;
  closedTrades: number;
}

const ANNUAL = 252;

class PerformanceEngine {
  async report(accountId: number): Promise<PerformanceReport> {
    const snaps = (await tradingRepository.snapshots(accountId, 5000)).sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
    const closed = (await tradingRepository.positions(accountId, "CLOSED"));

    const empty: PerformanceReport = {
      snapshots: snaps.length, startEquity: 0, currentEquity: 0, absoluteReturn: 0, cagr: 0,
      dailyReturnAvg: 0, volatility: 0, sharpe: 0, sortino: 0, calmar: 0, maxDrawdown: 0,
      currentDrawdown: 0, winRate: 0, lossRate: 0, avgGain: 0, avgLoss: 0, profitFactor: 0,
      closedTrades: closed.length,
    };
    if (snaps.length < 2) {
      if (snaps.length === 1) {
        empty.startEquity = snaps[0].equity;
        empty.currentEquity = snaps[0].equity;
      }
      return this.withTradeStats(empty, closed);
    }

    const equities = snaps.map((s) => s.equity);
    const rets = snaps.map((s) => s.dailyReturn).filter((r) => Number.isFinite(r));
    const start = equities[0];
    const current = equities[equities.length - 1];

    const mean = rets.reduce((a, b) => a + b, 0) / (rets.length || 1);
    const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / (rets.length || 1);
    const vol = Math.sqrt(variance);
    const downside = rets.filter((r) => r < 0);
    const downVol = downside.length
      ? Math.sqrt(downside.reduce((a, b) => a + b * b, 0) / downside.length)
      : 0;

    // Max & current drawdown over the equity curve.
    let peak = equities[0];
    let maxDd = 0;
    for (const e of equities) {
      peak = Math.max(peak, e);
      maxDd = Math.max(maxDd, (peak - e) / peak);
    }
    const currentDd = peak > 0 ? (peak - current) / peak : 0;

    const periods = snaps.length;
    const totalReturn = start > 0 ? current / start : 1;
    const cagr = start > 0 ? Math.pow(totalReturn, ANNUAL / periods) - 1 : 0;
    const sharpe = vol === 0 ? 0 : (mean / vol) * Math.sqrt(ANNUAL);
    const sortino = downVol === 0 ? 0 : (mean / downVol) * Math.sqrt(ANNUAL);
    const calmar = maxDd === 0 ? 0 : cagr / maxDd;

    const report: PerformanceReport = {
      snapshots: snaps.length,
      startEquity: +start.toFixed(2),
      currentEquity: +current.toFixed(2),
      absoluteReturn: +((current - start) / start).toFixed(6),
      cagr: +cagr.toFixed(6),
      dailyReturnAvg: +mean.toFixed(6),
      volatility: +vol.toFixed(6),
      sharpe: +sharpe.toFixed(4),
      sortino: +sortino.toFixed(4),
      calmar: +calmar.toFixed(4),
      maxDrawdown: +maxDd.toFixed(6),
      currentDrawdown: +currentDd.toFixed(6),
      winRate: 0, lossRate: 0, avgGain: 0, avgLoss: 0, profitFactor: 0,
      closedTrades: closed.length,
    };
    return this.withTradeStats(report, closed);
  }

  private withTradeStats(
    report: PerformanceReport,
    closed: Awaited<ReturnType<typeof tradingRepository.positions>>,
  ): PerformanceReport {
    const realized = closed.map((p) => p.realizedPnl);
    const wins = realized.filter((r) => r > 0);
    const losses = realized.filter((r) => r < 0);
    const grossWin = wins.reduce((a, b) => a + b, 0);
    const grossLoss = Math.abs(losses.reduce((a, b) => a + b, 0));
    report.winRate = realized.length ? +(wins.length / realized.length).toFixed(4) : 0;
    report.lossRate = realized.length ? +(losses.length / realized.length).toFixed(4) : 0;
    report.avgGain = wins.length ? +(grossWin / wins.length).toFixed(2) : 0;
    report.avgLoss = losses.length ? +(grossLoss / losses.length).toFixed(2) : 0;
    report.profitFactor = grossLoss === 0 ? (grossWin > 0 ? 99 : 0) : +(grossWin / grossLoss).toFixed(4);
    return report;
  }
}

export const performanceEngine = singleton("portfolio.performance", () => new PerformanceEngine());
