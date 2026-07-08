// AITradeMinds — Portfolio Intelligence. Brain-owned institutional allocation.
// Level-1: AI Society consensus per symbol (reused). Level-2: portfolio optimizer
// + position sizing + risk budget. Recommend-only — NEVER auto-executes.
import { logger, singleton } from "@/kernel";
import { eventBus } from "@/modules/market_data/core/event-bus";
import { providerManager } from "@/modules/market_data/providers/provider-manager";
import { repository } from "@/modules/market_data/core/repository";
import { historicalManager } from "@/modules/market_data/services/historical";
import { atr, last, type Bar } from "@/modules/market_data/indicators/indicators";
import { consensusEngine, confidenceCalibration } from "@/modules/brain";
import { tradingRepository, portfolioEngine } from "@/modules/trading";
import { optimize, type OptimizerMethod, type AssetEstimate } from "./optimizer";
import { sizePosition, type SizingMethod } from "./sizing";
import { riskBudgetEngine } from "./risk-budget";
import { portfolioIntelRepository } from "./repository";

export interface AllocationTarget {
  symbol: string;
  decision: string;
  consensusScore: number;
  agreement: number;
  weight: number;
  suggestedCapital: number;
  suggestedQuantity: number;
  sizing: string;
  whyNot?: string;
}

export interface PortfolioPlan {
  accountId: number;
  optimizer: OptimizerMethod;
  regime: string;
  equity: number;
  targets: AllocationTarget[];
  expectedReturn: number;
  expectedRisk: number;
  diversificationScore: number;
  rejected: Array<{ symbol: string; reason: string }>;
}

interface AssetSnapshot {
  bar: Bar[];
  atr: number;
  vol: number;
  price: number;
}

class PortfolioIntelligence {
  private async estimate(symbol: string, exchange: "NSE" | "BSE"): Promise<AssetSnapshot> {
    const candles = await repository.getCandles(symbol, "1D", { limit: 120, exchange });
    const bars = historicalManager.toBars(candles);
    const closes = bars.map((b) => b.close);
    const rets: number[] = [];
    for (let i = 1; i < closes.length; i += 1) if (closes[i - 1] > 0) rets.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    const mean = rets.reduce((a, b) => a + b, 0) / (rets.length || 1);
    const vol = Math.sqrt(rets.reduce((a, b) => a + (b - mean) ** 2, 0) / (rets.length || 1)) || 0.02;
    const quote = await providerManager.getQuote(symbol, exchange);
    return { bar: bars, atr: last(atr(bars)) || quote.ltp * 0.02, vol, price: quote.ltp };
  }

  /**
   * Build a Brain-approved portfolio allocation plan across candidate symbols.
   * Two-level consensus: AI Society per symbol → portfolio optimizer + sizing.
   * Recommend-only: returns a plan, persists it, never places orders.
   */
  async plan(
    userId: number,
    symbols: string[],
    opts: {
      optimizer?: OptimizerMethod;
      sizing?: SizingMethod;
      regime?: string;
      maxAllocationPct?: number;
      minAllocationPct?: number;
      riskPerTradePct?: number;
    } = {},
  ): Promise<PortfolioPlan> {
    const account = await tradingRepository.ensureAccount(userId, "PAPER");
    const snapshot = await portfolioEngine.snapshot(account.id);
    const equity = snapshot.equity || account.startingBalance;
    const optimizer = opts.optimizer ?? "MEAN_VARIANCE";
    const sizingMethod = opts.sizing ?? "FRACTIONAL_KELLY";
    const regime = opts.regime ?? "RANGE";
    const maxAllocationPct = opts.maxAllocationPct ?? 20;
    const minAllocationPct = opts.minAllocationPct ?? 0;
    const riskPerTradePct = opts.riskPerTradePct ?? 2;

    // Level-1: AI Society consensus per symbol (reuse consensus engine).
    const candidates: AssetEstimate[] = [];
    const rejected: Array<{ symbol: string; reason: string }> = [];
    const perSymbol = new Map<string, { decision: string; score: number; agreement: number; est: AssetSnapshot }>();

    for (const symbol of symbols) {
      const consensus = await consensusEngine.decide(symbol, regime, "REPUTATION", "NSE");
      if (consensus.decision !== "BUY") {
        rejected.push({ symbol, reason: `Consensus ${consensus.decision} (score ${consensus.score})` });
        continue;
      }
      const est = await this.estimate(symbol, "NSE");
      candidates.push({
        symbol,
        expectedReturn: Math.max(0, consensus.score) * 0.02, // score→expected daily return proxy
        volatility: est.vol,
        score: consensus.score,
      });
      perSymbol.set(symbol, { decision: consensus.decision, score: consensus.score, agreement: consensus.agreement, est });
    }

    // Level-2: portfolio optimizer over BUY candidates.
    const optimized = optimize(optimizer, candidates);

    // Position sizing per target, bounded by optimizer weight × equity.
    const targets: AllocationTarget[] = [];
    for (const w of optimized.weights) {
      const info = perSymbol.get(w.symbol)!;
      const calibrated = await confidenceCalibration.calibrate("TREND", regime, 0.5 + info.score / 2);
      const sizing = sizePosition({
        method: sizingMethod,
        equity: equity * w.weight, // optimizer-scaled sub-equity
        price: info.est.price,
        winProbability: calibrated,
        payoffRatio: 1.5,
        atr: info.est.atr,
        volatility: info.est.vol,
        maxAllocationPct: 100, // already scoped by optimizer weight
        minAllocationPct,
        riskPerTradePct,
      });
      targets.push({
        symbol: w.symbol,
        decision: info.decision,
        consensusScore: info.score,
        agreement: info.agreement,
        weight: w.weight,
        suggestedCapital: sizing.capital,
        suggestedQuantity: sizing.quantity,
        sizing: sizing.rationale,
      });
    }

    await portfolioIntelRepository.saveAllocation({
      accountId: account.id,
      optimizer,
      regime,
      targets,
      expectedReturn: optimized.expectedReturn,
      expectedRisk: optimized.expectedRisk,
      diversificationScore: optimized.diversificationScore,
      rationale: `${targets.length} BUY targets via ${optimizer}; ${rejected.length} rejected`,
    });

    eventBus.publish("trading", {
      event: "optimizer.completed",
      accountId: account.id,
      message: `${optimizer}: ${targets.length} targets`,
      ts: Date.now(),
    });

    logger.info("portfolio_intel.plan", { accountId: account.id, targets: targets.length });
    return {
      accountId: account.id,
      optimizer,
      regime,
      equity,
      targets,
      expectedReturn: optimized.expectedReturn,
      expectedRisk: optimized.expectedRisk,
      diversificationScore: optimized.diversificationScore,
      rejected,
    };
  }

  /** Generate rebalance recommendations vs current holdings (recommend-only). */
  async rebalance(userId: number, symbols: string[], optimizer?: OptimizerMethod): Promise<{
    actions: Array<{ symbol: string; action: string; from: number; to: number }>;
    plan: PortfolioPlan;
  }> {
    const account = await tradingRepository.ensureAccount(userId, "PAPER");
    const plan = await this.plan(userId, symbols, { optimizer });
    const current = await tradingRepository.positions(account.id, "OPEN");
    const currentMap = new Map(current.filter((p) => p.quantity !== 0).map((p) => [p.symbol, p.quantity]));
    const targetMap = new Map(plan.targets.map((t) => [t.symbol, t.suggestedQuantity]));

    const actions: Array<{ symbol: string; action: string; from: number; to: number }> = [];
    for (const symbol of new Set([...currentMap.keys(), ...targetMap.keys()])) {
      const from = currentMap.get(symbol) ?? 0;
      const to = targetMap.get(symbol) ?? 0;
      if (to > from) actions.push({ symbol, action: "INCREASE", from, to });
      else if (to < from) actions.push({ symbol, action: to === 0 ? "EXIT" : "REDUCE", from, to });
    }

    await portfolioIntelRepository.saveRebalance({
      accountId: account.id,
      reason: `Rebalance to ${plan.optimizer} targets`,
      actions,
      status: "RECOMMENDED",
    });
    eventBus.publish("trading", {
      event: "rebalance.created",
      accountId: account.id,
      message: `${actions.length} rebalance actions (recommended)`,
      ts: Date.now(),
    });
    return { actions, plan };
  }

  async riskBudget(userId: number) {
    const account = await tradingRepository.ensureAccount(userId, "PAPER");
    return riskBudgetEngine.compute(account.id);
  }

  async history(userId: number) {
    const account = await tradingRepository.ensureAccount(userId, "PAPER");
    return {
      allocations: await portfolioIntelRepository.allocations(account.id, 20),
      rebalances: await portfolioIntelRepository.rebalances(account.id, 20),
      riskBudgets: await portfolioIntelRepository.riskBudgets(account.id, 20),
    };
  }
}

export const portfolioIntelligence = singleton(
  "portfolio_intel.core",
  () => new PortfolioIntelligence(),
);
