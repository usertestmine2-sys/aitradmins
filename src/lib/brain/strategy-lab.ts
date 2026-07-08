import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { brainStrategies } from "@/db/schema";
import { appendEvent } from "@/lib/events/audit-store";
import { computeIndicators, detectPatterns, type Bar } from "@/lib/brain/indicators";
import { getSeries } from "@/lib/brain/market";
import { evaluateStrategies } from "@/lib/brain/reasoning";
import type { MarketContext } from "@/lib/brain/types";

/**
 * STRATEGY LABORATORY (Phase-3) — extends the single Strategy Manager.
 * AI can generate, clone, mutate, version, backtest, retire and archive
 * strategies. Every operation creates NEW rows (append-only lineage via
 * parentId/version). Nothing is ever deleted.
 */

interface LabConfig {
  direction: 1 | -1;
  minRsi?: number;
  maxRsi?: number;
  requireTrendUp?: boolean;
  requireTrendDown?: boolean;
  requirePattern?: string;
  regimeFilter?: string[];
  formula: Record<string, number>;
  minScore: number;
  classification?: string;
}

function jitter(value: number, pct: number, rand: () => number): number {
  return Math.round(value * (1 + (rand() * 2 - 1) * pct) * 1000) / 1000;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function loadStrategy(id: string) {
  const rows = await db.select().from(brainStrategies).where(eq(brainStrategies.id, id)).limit(1);
  return rows[0] ?? null;
}

async function insertVariant(
  base: typeof brainStrategies.$inferSelect | null,
  name: string,
  description: string,
  config: LabConfig,
  createdBy: string,
  status: string,
): Promise<string> {
  const id = `lab-${randomUUID().slice(0, 8)}`;
  await db.insert(brainStrategies).values({
    id,
    name,
    description,
    config: config as unknown as Record<string, unknown>,
    active: status === "active" || status === "experimental",
    version: base ? base.version + 1 : 1,
    parentId: base?.id ?? null,
    status,
    createdBy,
  });
  return id;
}

/** AI-generated strategy: regime-appropriate template with bounded parameters. */
export async function generateStrategy(regime: string, seed?: number): Promise<string> {
  const rand = mulberry32(seed ?? Date.now() % 2147483647);
  const bullish = regime !== "BEARISH";
  const config: LabConfig = bullish
    ? {
        direction: 1,
        minRsi: Math.round(45 + rand() * 10),
        maxRsi: Math.round(72 + rand() * 8),
        requireTrendUp: true,
        regimeFilter: ["BULLISH", "SIDEWAYS"],
        formula: {
          trend: jitter(0.35, 0.3, rand),
          momentum: jitter(0.3, 0.3, rand),
          pattern: jitter(0.25, 0.3, rand),
          breadth: jitter(0.1, 0.3, rand),
        },
        minScore: jitter(0.55, 0.1, rand),
      }
    : {
        direction: -1,
        maxRsi: Math.round(45 + rand() * 10),
        requireTrendDown: true,
        requirePattern: "breakdown-20d-low",
        regimeFilter: ["BEARISH"],
        formula: { trend: jitter(0.4, 0.3, rand), momentum: jitter(0.3, 0.3, rand), pattern: jitter(0.3, 0.3, rand) },
        minScore: jitter(0.55, 0.1, rand),
      };
  const id = await insertVariant(
    null,
    `AI Generated ${bullish ? "Long" : "Short"} ${new Date().toISOString().slice(0, 10)}`,
    `AI-generated ${bullish ? "trend-long" : "breakdown-short"} candidate for ${regime} regime. Must prove itself in backtest + paper before classification.`,
    config,
    "ai-brain",
    "experimental",
  );
  await appendEvent("strategy.generated", "brain-strategy-manager", { strategyId: id, regime, basis: "template+bounded-search" });
  return id;
}

export async function cloneStrategy(sourceId: string): Promise<string | null> {
  const base = await loadStrategy(sourceId);
  if (!base) return null;
  const id = await insertVariant(
    base,
    `${base.name} (clone v${base.version + 1})`,
    base.description,
    base.config as unknown as LabConfig,
    "ai-brain",
    "experimental",
  );
  await appendEvent("strategy.cloned", "brain-strategy-manager", { strategyId: id, sourceId });
  return id;
}

export async function mutateStrategy(sourceId: string, seed?: number): Promise<string | null> {
  const base = await loadStrategy(sourceId);
  if (!base) return null;
  const rand = mulberry32(seed ?? Date.now() % 2147483647);
  const config = JSON.parse(JSON.stringify(base.config)) as LabConfig;
  for (const key of Object.keys(config.formula)) config.formula[key] = Math.max(0.05, jitter(config.formula[key], 0.25, rand));
  config.minScore = Math.min(0.8, Math.max(0.4, jitter(config.minScore, 0.12, rand)));
  if (config.minRsi != null) config.minRsi = Math.round(Math.min(70, Math.max(30, jitter(config.minRsi, 0.1, rand))));
  if (config.maxRsi != null) config.maxRsi = Math.round(Math.min(90, Math.max(40, jitter(config.maxRsi, 0.1, rand))));
  const id = await insertVariant(
    base,
    `${base.name.replace(/ \(mutation.*\)$/, "")} (mutation v${base.version + 1})`,
    base.description,
    config,
    "ai-brain",
    "experimental",
  );
  await appendEvent("strategy.mutated", "brain-strategy-manager", { strategyId: id, sourceId, mutatedFields: ["formula", "minScore", "rsiBands"] });
  return id;
}

export async function retireStrategy(id: string): Promise<boolean> {
  const base = await loadStrategy(id);
  if (!base) return false;
  await db.update(brainStrategies).set({ active: false, status: "retired" }).where(eq(brainStrategies.id, id));
  await appendEvent("strategy.retired", "brain-strategy-manager", { strategyId: id });
  return true;
}

export async function archiveStrategy(id: string): Promise<boolean> {
  const base = await loadStrategy(id);
  if (!base) return false;
  await db.update(brainStrategies).set({ active: false, status: "archived" }).where(eq(brainStrategies.id, id));
  await appendEvent("strategy.archived", "brain-strategy-manager", { strategyId: id });
  return true;
}

export interface BacktestResult {
  strategyId: string;
  symbolsTested: number;
  trades: number;
  wins: number;
  losses: number;
  winRatePct: number | null;
  totalReturnPct: number;
  avgReturnPct: number | null;
  maxDrawdownPct: number;
}

/**
 * Point-in-time backtest over stored bars: at each bar, indicators/patterns
 * are computed only on the prefix (no look-ahead), the strategy is evaluated,
 * and entries exit at 3×ATR target / 2×ATR stop / 10-bar horizon.
 */
export async function backtestStrategy(
  strategyId: string,
  symbols: string[],
  context: MarketContext,
): Promise<BacktestResult | null> {
  const strategy = await loadStrategy(strategyId);
  if (!strategy) return null;
  const cfg = { id: strategy.id, config: strategy.config as never };

  const returns: number[] = [];
  for (const symbol of symbols.slice(0, 10)) {
    const series = await getSeries(symbol, 400);
    if (series.length < 60) continue;
    let cooldownUntil = -1;
    for (let t = 50; t < series.length - 1; t++) {
      if (t < cooldownUntil) continue;
      const prefix = series.slice(0, t + 1);
      const ind = computeIndicators(prefix);
      const patterns = detectPatterns(prefix, ind);
      const signals = evaluateStrategies([cfg], ind, patterns, context);
      const signal = signals[0];
      if (!signal?.matched || ind.atr14 == null) continue;
      const direction = signal.direction as 1 | -1;
      const entry = series[t + 1].open; // next-bar-open entry (no look-ahead)
      const target = entry + direction * ind.atr14 * 3;
      const stop = entry - direction * ind.atr14 * 2;
      let exit = series[Math.min(series.length - 1, t + 11)].close;
      let exitBar = Math.min(series.length - 1, t + 11);
      for (let k = t + 1; k <= Math.min(series.length - 1, t + 11); k++) {
        const bar: Bar = series[k];
        if (direction === 1 ? bar.low <= stop : bar.high >= stop) {
          exit = stop;
          exitBar = k;
          break;
        }
        if (direction === 1 ? bar.high >= target : bar.low <= target) {
          exit = target;
          exitBar = k;
          break;
        }
      }
      returns.push(((exit - entry) / entry) * direction * 100);
      cooldownUntil = exitBar + 1;
    }
  }

  const wins = returns.filter((r) => r > 0).length;
  let equity = 0;
  let peak = 0;
  let maxDd = 0;
  for (const r of returns) {
    equity += r;
    peak = Math.max(peak, equity);
    maxDd = Math.max(maxDd, peak - equity);
  }
  const result: BacktestResult = {
    strategyId,
    symbolsTested: Math.min(symbols.length, 10),
    trades: returns.length,
    wins,
    losses: returns.length - wins,
    winRatePct: returns.length > 0 ? Math.round((wins / returns.length) * 1000) / 10 : null,
    totalReturnPct: Math.round(equity * 100) / 100,
    avgReturnPct: returns.length > 0 ? Math.round((equity / returns.length) * 100) / 100 : null,
    maxDrawdownPct: Math.round(maxDd * 100) / 100,
  };

  const stats = { ...strategy.stats };
  stats["backtest_trades"] = result.trades;
  if (result.winRatePct != null) stats["backtest_win_rate"] = result.winRatePct;
  stats["backtest_total_return"] = result.totalReturnPct;
  stats["backtest_max_dd"] = result.maxDrawdownPct;
  await db.update(brainStrategies).set({ stats }).where(eq(brainStrategies.id, strategyId));
  await appendEvent("strategy.scored", "brain-strategy-manager", { source: "backtest", ...result });
  return result;
}

export async function getStrategyLineage() {
  const rows = await db.select().from(brainStrategies).orderBy(desc(brainStrategies.createdAt));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    version: r.version,
    parentId: r.parentId,
    status: r.status,
    createdBy: r.createdBy,
    active: r.active,
    stats: r.stats,
    createdAt: r.createdAt.toISOString(),
  }));
}
