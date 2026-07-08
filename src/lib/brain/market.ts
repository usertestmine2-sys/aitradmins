import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { marketBars } from "@/db/schema";
import { computeIndicators, ema, volatilityPct, type Bar } from "@/lib/brain/indicators";
import type { MarketContext, MarketRegime } from "@/lib/brain/types";

/**
 * Market Data + Market Context modules (Indian market first: NSE/BSE).
 * Index symbols (NIFTY, BANKNIFTY, SENSEX) drive regime detection.
 */

export const NSE_SYMBOL_PATTERN = /^[A-Z0-9.&-]{1,20}$/;
export const INDEX_SYMBOLS = ["NIFTY", "NIFTY50", "BANKNIFTY", "SENSEX"] as const;
/** Global/context factor series: analysis inputs, never trading candidates. */
export const FACTOR_SYMBOLS = ["OIL", "USDINR", "GOLD", "INDIAVIX"] as const;

export interface IngestBar {
  symbol: string;
  exchange: string;
  barDate: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** Idempotent bar ingestion: (symbol, date) conflicts update in place. */
export async function ingestBars(bars: IngestBar[]): Promise<number> {
  let written = 0;
  for (const bar of bars) {
    await db
      .insert(marketBars)
      .values(bar)
      .onConflictDoUpdate({
        target: [marketBars.symbol, marketBars.barDate],
        set: { open: bar.open, high: bar.high, low: bar.low, close: bar.close, volume: bar.volume },
      });
    written += 1;
  }
  return written;
}

export async function getSeries(symbol: string, limit = 120): Promise<Bar[]> {
  // Most recent `limit` bars, returned oldest → newest.
  const rows = (
    await db
      .select()
      .from(marketBars)
      .where(eq(marketBars.symbol, symbol))
      .orderBy(desc(marketBars.barDate))
      .limit(limit)
  ).reverse();
  return rows.map((r) => ({
    date: r.barDate,
    open: r.open,
    high: r.high,
    low: r.low,
    close: r.close,
    volume: r.volume,
  }));
}

/** All non-index symbols with at least `minBars` bars — the analyzable universe. */
export async function getUniverse(minBars = 30): Promise<string[]> {
  const rows = await db
    .select({ symbol: marketBars.symbol, count: sql<number>`count(*)::int` })
    .from(marketBars)
    .groupBy(marketBars.symbol);
  return rows
    .filter(
      (r) =>
        r.count >= minBars &&
        !(INDEX_SYMBOLS as readonly string[]).includes(r.symbol) &&
        !(FACTOR_SYMBOLS as readonly string[]).includes(r.symbol),
    )
    .map((r) => r.symbol)
    .sort();
}

/** Regime from the broadest available Indian index; breadth from the universe. */
export async function buildMarketContext(universe: string[]): Promise<MarketContext> {
  let regime: MarketRegime = "UNKNOWN";
  let regimeSource = "none";
  let asOfDate: string | null = null;

  for (const index of INDEX_SYMBOLS) {
    const series = await getSeries(index);
    if (series.length >= 50) {
      const closes = series.map((b) => b.close);
      const e20 = ema(closes, 20);
      const e50 = ema(closes, 50);
      const vol = volatilityPct(closes, 20);
      const close = closes[closes.length - 1];
      asOfDate = series[series.length - 1].date;
      if (e20 != null && e50 != null) {
        const spreadPct = ((e20 - e50) / e50) * 100;
        if (close > e20 && spreadPct > 0.25) regime = "BULLISH";
        else if (close < e20 && spreadPct < -0.25) regime = "BEARISH";
        else regime = "SIDEWAYS";
        regimeSource = `${index} (EMA20/50 spread ${spreadPct.toFixed(2)}%, vol ${vol?.toFixed(2) ?? "?"}%)`;
      }
      break;
    }
  }

  let advancers = 0;
  let decliners = 0;
  let aboveEma20 = 0;
  let counted = 0;
  for (const symbol of universe) {
    const series = await getSeries(symbol);
    if (series.length < 21) continue;
    counted += 1;
    const closes = series.map((b) => b.close);
    const last = closes[closes.length - 1];
    const prev = closes[closes.length - 2];
    if (last > prev) advancers += 1;
    else if (last < prev) decliners += 1;
    const e20 = ema(closes, 20);
    if (e20 != null && last > e20) aboveEma20 += 1;
    if (!asOfDate) asOfDate = series[series.length - 1].date;
  }

  return {
    regime,
    regimeSource,
    breadthPct: counted > 0 ? Math.round((aboveEma20 / counted) * 1000) / 10 : null,
    advancers,
    decliners,
    universeSize: universe.length,
    asOfDate,
  };
}

export { computeIndicators };
