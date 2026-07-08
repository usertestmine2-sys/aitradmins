// AITradeMinds — Portfolio Risk Budget. VaR / CVaR / beta / vol / concentration
// from real open positions + historical candles. Deterministic, read-only.
import { singleton } from "@/kernel";
import { eventBus } from "@/modules/market_data/core/event-bus";
import { repository } from "@/modules/market_data/core/repository";
import { providerManager } from "@/modules/market_data/providers/provider-manager";
import { symbolMaster } from "@/modules/market_data/services/symbol-master";
import { historicalManager } from "@/modules/market_data/services/historical";
import { tradingRepository } from "@/modules/trading";
import { portfolioIntelRepository } from "./repository";

export interface RiskBudget {
  var95: number; // 1-day 95% Value at Risk (currency)
  cvar95: number; // Conditional VaR (expected shortfall)
  portfolioBeta: number;
  portfolioVol: number;
  concentration: number; // largest position % of equity
  sectorRisk: Record<string, number>;
  positions: number;
}

function dailyReturns(closes: number[]): number[] {
  const r: number[] = [];
  for (let i = 1; i < closes.length; i += 1) {
    if (closes[i - 1] > 0) r.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  return r;
}

class RiskBudgetEngine {
  async compute(accountId: number): Promise<RiskBudget> {
    const positions = (await tradingRepository.positions(accountId, "OPEN")).filter((p) => p.quantity !== 0);
    const account = await tradingRepository.getAccount(accountId);
    const startBalance = account?.startingBalance ?? 1;

    let portfolioValue = 0;
    let weightedVol = 0;
    let weightedBeta = 0;
    let largest = 0;
    const sectorRisk: Record<string, number> = {};
    const posReturns: Array<{ value: number; returns: number[] }> = [];

    for (const p of positions) {
      const quote = await providerManager.getQuote(p.symbol, p.exchange as "NSE" | "BSE");
      const value = Math.abs(p.quantity) * quote.ltp;
      portfolioValue += value;
      largest = Math.max(largest, value);

      const candles = await repository.getCandles(p.symbol, "1D", { limit: 120, exchange: p.exchange });
      const closes = historicalManager.toBars(candles).map((b) => b.close);
      const rets = dailyReturns(closes);
      const mean = rets.reduce((a, b) => a + b, 0) / (rets.length || 1);
      const vol = Math.sqrt(rets.reduce((a, b) => a + (b - mean) ** 2, 0) / (rets.length || 1));
      weightedVol += value * vol;
      // Beta proxy vs its own scaled vol (no index series persisted): use vol/0.012.
      weightedBeta += value * Math.min(2.5, vol / 0.012);
      posReturns.push({ value, returns: rets });

      const sym = await symbolMaster.get(p.symbol, p.exchange);
      const sector = sym?.sector ?? "Unknown";
      sectorRisk[sector] = (sectorRisk[sector] ?? 0) + value;
    }

    const portfolioVol = portfolioValue > 0 ? weightedVol / portfolioValue : 0;
    const portfolioBeta = portfolioValue > 0 ? weightedBeta / portfolioValue : 0;

    // Portfolio daily returns (value-weighted) for VaR/CVaR.
    const maxLen = Math.max(0, ...posReturns.map((p) => p.returns.length));
    const portReturns: number[] = [];
    for (let i = 0; i < maxLen; i += 1) {
      let r = 0;
      for (const p of posReturns) {
        const idx = p.returns.length - maxLen + i;
        if (idx >= 0 && portfolioValue > 0) r += (p.value / portfolioValue) * p.returns[idx];
      }
      portReturns.push(r);
    }
    const sorted = [...portReturns].sort((a, b) => a - b);
    const q = Math.floor(sorted.length * 0.05);
    const varPct = sorted.length ? -sorted[q] : 0;
    const tail = sorted.slice(0, Math.max(1, q));
    const cvarPct = tail.length ? -(tail.reduce((a, b) => a + b, 0) / tail.length) : 0;

    const budget: RiskBudget = {
      var95: +(varPct * portfolioValue).toFixed(2),
      cvar95: +(cvarPct * portfolioValue).toFixed(2),
      portfolioBeta: +portfolioBeta.toFixed(4),
      portfolioVol: +portfolioVol.toFixed(6),
      concentration: portfolioValue > 0 ? +((largest / portfolioValue) * 100).toFixed(2) : 0,
      sectorRisk: Object.fromEntries(
        Object.entries(sectorRisk).map(([k, v]) => [k, +((v / (portfolioValue || 1)) * 100).toFixed(2)]),
      ),
      positions: positions.length,
    };

    await portfolioIntelRepository.saveRiskBudget({ accountId, ...budget });
    void startBalance;
    eventBus.publish("trading", {
      event: "risk.updated",
      accountId,
      message: `VaR95 ${budget.var95}`,
      ts: Date.now(),
    });
    return budget;
  }
}

export const riskBudgetEngine = singleton("portfolio_intel.riskBudget", () => new RiskBudgetEngine());
