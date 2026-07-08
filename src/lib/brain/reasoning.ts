import { eq } from "drizzle-orm";
import { db } from "@/db";
import { brainStrategies } from "@/db/schema";
import type {
  IndicatorSnapshot,
  MarketContext,
  PatternResult,
  StrategySignal,
} from "@/lib/brain/types";

/**
 * Strategy Manager + Formula Manager + Multi-AI Reasoning Council.
 *
 * AI model rules enforced structurally:
 *  - every model receives the same read-only inputs;
 *  - models cannot see, call, or modify each other;
 *  - only the AI Brain aggregates opinions (equal authority × calibration).
 */

/* ------------------------- Strategy Manager ------------------------- */

interface StrategyConfig {
  direction: 1 | -1;
  minRsi?: number;
  maxRsi?: number;
  requireTrendUp?: boolean;
  requireTrendDown?: boolean;
  requirePattern?: string;
  regimeFilter?: string[]; // allowed regimes
  formula: Record<string, number>; // Formula Manager weights over named signals
  minScore: number;
}

const SEED_STRATEGIES: { id: string; name: string; description: string; config: StrategyConfig }[] = [
  {
    id: "nse-trend-momentum",
    name: "NSE Trend Momentum",
    description: "Long trend continuation on NSE equities: EMA alignment + momentum + breakout confirmation.",
    config: {
      direction: 1,
      minRsi: 50,
      maxRsi: 78,
      requireTrendUp: true,
      regimeFilter: ["BULLISH", "SIDEWAYS"],
      formula: { trend: 0.35, momentum: 0.3, pattern: 0.25, breadth: 0.1 },
      minScore: 0.55,
    },
  },
  {
    id: "nse-mean-reversion",
    name: "NSE Mean Reversion",
    description: "Long oversold quality reversion: deep RSI with stabilizing structure.",
    config: {
      direction: 1,
      maxRsi: 34,
      requirePattern: "oversold-rsi",
      regimeFilter: ["BULLISH", "SIDEWAYS"],
      formula: { reversion: 0.55, pattern: 0.3, breadth: 0.15 },
      minScore: 0.5,
    },
  },
  {
    id: "nse-breakdown-short",
    name: "NSE Breakdown Short",
    description: "Short structural breakdowns in bearish regimes with trend confirmation.",
    config: {
      direction: -1,
      maxRsi: 50,
      requireTrendDown: true,
      requirePattern: "breakdown-20d-low",
      regimeFilter: ["BEARISH"],
      formula: { trend: 0.4, momentum: 0.3, pattern: 0.3 },
      minScore: 0.55,
    },
  },
];

export async function ensureStrategiesSeeded(): Promise<void> {
  for (const s of SEED_STRATEGIES) {
    await db
      .insert(brainStrategies)
      .values({
        id: s.id,
        name: s.name,
        description: s.description,
        config: s.config as unknown as Record<string, unknown>,
      })
      .onConflictDoNothing();
  }
}

export async function getActiveStrategies(): Promise<{ id: string; config: StrategyConfig }[]> {
  const rows = await db.select().from(brainStrategies).where(eq(brainStrategies.active, true));
  return rows.map((r) => ({ id: r.id, config: r.config as unknown as StrategyConfig }));
}

/* ------------------------- Formula Manager -------------------------- */

/** Named signal values in 0..1, produced deterministically from inputs. */
function buildSignalMap(
  ind: IndicatorSnapshot,
  patterns: PatternResult[],
  context: MarketContext,
  direction: 1 | -1,
): Record<string, number> {
  const trendUp =
    ind.ema20 != null && ind.ema50 != null && ind.ema20 > ind.ema50 && ind.close > ind.ema20;
  const trendDown =
    ind.ema20 != null && ind.ema50 != null && ind.ema20 < ind.ema50 && ind.close < ind.ema20;
  const trend = direction === 1 ? (trendUp ? 1 : 0) : trendDown ? 1 : 0;

  const roc = ind.roc10 ?? 0;
  const momentum = direction === 1 ? clamp01(roc / 8) : clamp01(-roc / 8);

  const directionalPatterns = patterns.filter((p) => p.direction === direction);
  const pattern =
    directionalPatterns.length === 0
      ? 0
      : clamp01(Math.max(...directionalPatterns.map((p) => p.strength)));

  const rsi = ind.rsi14 ?? 50;
  const reversion = direction === 1 ? clamp01((35 - rsi) / 20) : clamp01((rsi - 65) / 20);

  const breadth =
    context.breadthPct == null
      ? 0.5
      : direction === 1
        ? clamp01(context.breadthPct / 100)
        : clamp01(1 - context.breadthPct / 100);

  return { trend, momentum, pattern, reversion, breadth };
}

/** Formula evaluation: weighted linear combination, weights normalized. */
export function evaluateFormula(weights: Record<string, number>, signals: Record<string, number>): number {
  let total = 0;
  let weightSum = 0;
  for (const [name, weight] of Object.entries(weights)) {
    if (typeof weight !== "number" || weight <= 0) continue;
    total += (signals[name] ?? 0) * weight;
    weightSum += weight;
  }
  return weightSum > 0 ? total / weightSum : 0;
}

export function evaluateStrategies(
  strategies: { id: string; config: StrategyConfig }[],
  ind: IndicatorSnapshot,
  patterns: PatternResult[],
  context: MarketContext,
): StrategySignal[] {
  return strategies.map(({ id, config }) => {
    const rsi = ind.rsi14;
    const trendUp =
      ind.ema20 != null && ind.ema50 != null && ind.ema20 > ind.ema50 && ind.close > ind.ema20;
    const trendDown =
      ind.ema20 != null && ind.ema50 != null && ind.ema20 < ind.ema50 && ind.close < ind.ema20;

    const failures: string[] = [];
    if (config.regimeFilter && !config.regimeFilter.includes(context.regime)) {
      failures.push(`regime ${context.regime} not in [${config.regimeFilter.join(",")}]`);
    }
    if (config.minRsi != null && (rsi == null || rsi < config.minRsi)) failures.push(`RSI < ${config.minRsi}`);
    if (config.maxRsi != null && (rsi == null || rsi > config.maxRsi)) failures.push(`RSI > ${config.maxRsi}`);
    if (config.requireTrendUp && !trendUp) failures.push("trend not up");
    if (config.requireTrendDown && !trendDown) failures.push("trend not down");
    if (config.requirePattern && !patterns.some((p) => p.name === config.requirePattern)) {
      failures.push(`pattern ${config.requirePattern} absent`);
    }

    if (failures.length > 0) {
      return { strategyId: id, matched: false, direction: 0, score: 0, detail: failures.join("; ") };
    }

    const signals = buildSignalMap(ind, patterns, context, config.direction);
    const score = evaluateFormula(config.formula, signals);
    const matched = score >= config.minScore;
    return {
      strategyId: id,
      matched,
      direction: matched ? config.direction : 0,
      score: Math.round(score * 1000) / 1000,
      detail: matched
        ? `formula score ${score.toFixed(3)} ≥ ${config.minScore}`
        : `formula score ${score.toFixed(3)} < ${config.minScore}`,
    };
  });
}

/*
 * The Multi-AI Reasoning Council has been elevated into the AI Society
 * Runtime (src/lib/brain/society/): independent model entities with
 * lifecycle, private memory, mediated discussion, and a Consensus Engine.
 * Model reasoning lives in society/models.ts; this module remains the
 * single Strategy Manager + Formula Manager.
 */

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
