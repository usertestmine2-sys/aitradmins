import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { brainStrategies, decisionQuality } from "@/db/schema";
import { appendEvent } from "@/lib/events/audit-store";

/**
 * Strategy Validation (Phase-2, Step 5). Computes the full metric set per
 * strategy from evaluated decision-quality records and classifies each
 * strategy. Strategies are NEVER deleted — Retired only flags them; history
 * and configs remain forever.
 */

export type StrategyClass = "Strong" | "Stable" | "Weak" | "Experimental" | "Retired";

export interface StrategyValidation {
  strategyId: string;
  name: string;
  active: boolean;
  classification: StrategyClass;
  trades: number;
  winRatePct: number | null;
  lossRatePct: number | null;
  avgHoldTimeSec: number | null;
  avgProfitPct: number | null;
  avgLossPct: number | null;
  maxDrawdownPct: number | null;
  sharpe: number | null;
  consistencyScore: number | null; // 0..100
  confidenceTrend: number | null; // late-avg − early-avg confidence
  avgPredictionError: number | null;
}

const MIN_TRADES_FOR_CLASSIFICATION = 5;

function classify(v: {
  trades: number;
  winRatePct: number | null;
  sharpe: number | null;
  consistencyScore: number | null;
  maxDrawdownPct: number | null;
}): StrategyClass {
  if (v.trades < MIN_TRADES_FOR_CLASSIFICATION) return "Experimental";
  const win = v.winRatePct ?? 0;
  const sharpe = v.sharpe ?? 0;
  const consistency = v.consistencyScore ?? 0;
  const dd = Math.abs(v.maxDrawdownPct ?? 0);
  if (win < 30 && sharpe < -0.5) return "Retired";
  if (win >= 55 && sharpe >= 0.8 && consistency >= 60 && dd < 15) return "Strong";
  if (win >= 45 && sharpe >= 0.2) return "Stable";
  return "Weak";
}

export async function validateStrategies(): Promise<StrategyValidation[]> {
  const strategies = await db.select().from(brainStrategies);
  const results: StrategyValidation[] = [];

  for (const strategy of strategies) {
    const records = await db
      .select()
      .from(decisionQuality)
      .where(eq(decisionQuality.strategyId, strategy.id))
      .orderBy(desc(decisionQuality.createdAt))
      .limit(500);
    const evaluated = records.filter((r) => r.status === "evaluated" && r.actualMovePct != null);
    const trades = evaluated.length;

    const returns = evaluated.map((r) => r.actualMovePct as number);
    const wins = returns.filter((r) => r > 0);
    const losses = returns.filter((r) => r <= 0);
    const avg = (xs: number[]) => (xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length);

    // Sharpe over per-trade returns (population stddev, no annualization).
    let sharpe: number | null = null;
    if (returns.length >= 3) {
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const sd = Math.sqrt(returns.reduce((a, r) => a + (r - mean) ** 2, 0) / returns.length);
      sharpe = sd > 0 ? Math.round((mean / sd) * 100) / 100 : null;
    }

    // Max drawdown over the cumulative per-trade return path (chronological).
    let maxDrawdownPct: number | null = null;
    if (returns.length > 0) {
      const chronological = [...returns].reverse();
      let equity = 0;
      let peak = 0;
      let maxDd = 0;
      for (const r of chronological) {
        equity += r;
        peak = Math.max(peak, equity);
        maxDd = Math.max(maxDd, peak - equity);
      }
      maxDrawdownPct = Math.round(maxDd * 100) / 100;
    }

    // Consistency: 100 − dispersion penalty (stable outcomes score high).
    let consistencyScore: number | null = null;
    if (returns.length >= 3) {
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const sd = Math.sqrt(returns.reduce((a, r) => a + (r - mean) ** 2, 0) / returns.length);
      consistencyScore = Math.round(Math.max(0, 100 - sd * 12));
    }

    // Confidence trend: newer-half avg confidence − older-half avg confidence.
    let confidenceTrend: number | null = null;
    if (records.length >= 4) {
      const half = Math.floor(records.length / 2);
      const newer = records.slice(0, half).map((r) => r.confidence);
      const older = records.slice(half).map((r) => r.confidence);
      confidenceTrend = Math.round(((avg(newer) ?? 0) - (avg(older) ?? 0)) * 10) / 10;
    }

    const holdTimes = evaluated
      .map((r) => r.holdingTimeSec)
      .filter((h): h is number => typeof h === "number" && h > 0);

    const metrics = {
      trades,
      winRatePct: trades > 0 ? Math.round((wins.length / trades) * 1000) / 10 : null,
      sharpe,
      consistencyScore,
      maxDrawdownPct,
    };
    const classification = strategy.active ? classify(metrics) : "Retired";

    const validation: StrategyValidation = {
      strategyId: strategy.id,
      name: strategy.name,
      active: strategy.active,
      classification,
      trades,
      winRatePct: metrics.winRatePct,
      lossRatePct: trades > 0 ? Math.round((losses.length / trades) * 1000) / 10 : null,
      avgHoldTimeSec: holdTimes.length > 0 ? Math.round(avg(holdTimes) ?? 0) : null,
      avgProfitPct: wins.length > 0 ? Math.round((avg(wins) ?? 0) * 100) / 100 : null,
      avgLossPct: losses.length > 0 ? Math.round((avg(losses) ?? 0) * 100) / 100 : null,
      maxDrawdownPct,
      sharpe,
      consistencyScore,
      confidenceTrend,
      avgPredictionError:
        evaluated.length > 0
          ? Math.round((avg(evaluated.map((r) => r.predictionError ?? 0)) ?? 0) * 100) / 100
          : null,
    };
    results.push(validation);

    // Persist classification + metrics into strategy stats (extend, never delete).
    const stats = { ...strategy.stats } as Record<string, number>;
    stats["validated_trades"] = trades;
    if (metrics.winRatePct != null) stats["win_rate_pct"] = metrics.winRatePct;
    if (sharpe != null) stats["sharpe"] = sharpe;
    if (consistencyScore != null) stats["consistency"] = consistencyScore;
    if (maxDrawdownPct != null) stats["max_drawdown_pct"] = maxDrawdownPct;
    await db
      .update(brainStrategies)
      .set({
        stats,
        config: { ...strategy.config, classification } as Record<string, unknown>,
      })
      .where(eq(brainStrategies.id, strategy.id));

    await appendEvent("strategy.scored", "brain-strategy-manager", {
      strategyId: strategy.id,
      classification,
      trades,
      winRatePct: metrics.winRatePct,
      sharpe,
      consistencyScore,
      confidenceTrend,
    });
  }

  return results;
}
