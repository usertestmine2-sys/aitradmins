// AI Arena — Historical Data Manager.
// Backfill, gap repair, incremental update, resampling/compression, retention.
import {
  CACHE_NS,
  CACHE_TTL,
  TIMEFRAME_SECONDS,
  type Timeframe,
} from "../constants";
import { cache } from "../core/cache";
import { repository } from "../core/repository";
import { dataQuality } from "../quality/quality";
import { providerManager } from "../providers/provider-manager";
import type { Bar } from "../indicators/indicators";
import type { MdCandle, MdCandleInsert } from "@/db/schema";

const RETENTION_DAYS: Partial<Record<Timeframe, number>> = {
  "1m": 30,
  "3m": 60,
  "5m": 90,
  "15m": 180,
  "60m": 365,
};

class HistoricalDataManager {
  toBars(candles: MdCandle[]): Bar[] {
    return candles.map((c) => ({
      ts: c.ts.getTime(),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
    }));
  }

  async getHistory(
    symbol: string,
    timeframe: Timeframe,
    opts: { from?: Date; to?: Date; limit?: number; exchange?: string } = {},
  ): Promise<MdCandle[]> {
    const cacheId = `${symbol}:${timeframe}:${opts.from?.getTime() ?? 0}:${opts.to?.getTime() ?? 0}:${opts.limit ?? 0}`;
    return cache.getOrSet(CACHE_NS.candles, cacheId, CACHE_TTL.candles, () =>
      repository.getCandles(symbol, timeframe, opts),
    );
  }

  // Generate a deterministic 1m base series via provider quote as anchor, then
  // persist. Real providers replace the synthesis path transparently.
  async backfill(
    symbol: string,
    timeframe: Timeframe,
    bars: number,
    exchange: "NSE" | "BSE" = "NSE",
  ): Promise<number> {
    const quote = await providerManager.getQuote(symbol, exchange);
    const sec = TIMEFRAME_SECONDS[timeframe];
    const now = Math.floor(Date.now() / 1000 / sec) * sec;
    const rows: MdCandleInsert[] = [];
    let price = quote.prevClose || quote.ltp;
    for (let i = bars; i > 0; i -= 1) {
      const ts = (now - i * sec) * 1000;
      // Deterministic pseudo-walk from symbol+ts seed.
      const seed = Math.abs(Math.sin((ts + symbol.length) * 0.000001));
      const change = (seed - 0.5) * price * 0.02;
      const open = +price.toFixed(2);
      const close = +(price + change).toFixed(2);
      const high = +(Math.max(open, close) * (1 + seed * 0.004)).toFixed(2);
      const low = +(Math.min(open, close) * (1 - seed * 0.004)).toFixed(2);
      const candle = {
        open,
        high,
        low,
        close,
        volume: Math.floor(10_000 + seed * 500_000),
        ts,
      };
      if (dataQuality.validateCandle(candle).ok) {
        rows.push({
          symbol,
          exchange,
          timeframe,
          ts: new Date(ts),
          open,
          high,
          low,
          close,
          volume: candle.volume,
          oi: 0,
        });
      }
      price = close;
    }
    const written = await repository.upsertCandles(rows);
    cache.invalidate(CACHE_NS.candles, `${symbol}:${timeframe}`);
    return written;
  }

  // Incremental update: append candles newer than the latest stored bar.
  async incrementalUpdate(
    symbol: string,
    timeframe: Timeframe,
    exchange: "NSE" | "BSE" = "NSE",
  ): Promise<number> {
    const latest = await repository.latestCandle(symbol, timeframe, exchange);
    const sec = TIMEFRAME_SECONDS[timeframe];
    const nowBucket = Math.floor(Date.now() / 1000 / sec) * sec;
    if (!latest) return this.backfill(symbol, timeframe, 200, exchange);
    const missing = Math.max(0, Math.floor((nowBucket - latest.ts.getTime() / 1000) / sec));
    if (missing === 0) return 0;
    return this.backfill(symbol, timeframe, Math.min(missing, 500), exchange);
  }

  // Gap repair: detect missing buckets and backfill them.
  async repairGaps(
    symbol: string,
    timeframe: Timeframe,
    exchange: "NSE" | "BSE" = "NSE",
  ): Promise<{ gaps: number; repaired: number }> {
    const candles = await repository.getCandles(symbol, timeframe, { exchange, limit: 5000 });
    const bars = this.toBars(candles);
    const gaps = dataQuality.detectGaps(bars, TIMEFRAME_SECONDS[timeframe]);
    if (gaps.length === 0) return { gaps: 0, repaired: 0 };
    const sec = TIMEFRAME_SECONDS[timeframe];
    const rows: MdCandleInsert[] = [];
    for (const gapTs of gaps) {
      const ref = candles.find((c) => c.ts.getTime() <= gapTs);
      const base = ref?.close ?? 100;
      rows.push({
        symbol,
        exchange,
        timeframe,
        ts: new Date(Math.floor(gapTs / 1000 / sec) * sec * 1000),
        open: base,
        high: base,
        low: base,
        close: base,
        volume: 0,
        oi: 0,
      });
    }
    const repaired = await repository.upsertCandles(rows);
    cache.invalidate(CACHE_NS.candles, `${symbol}:${timeframe}`);
    return { gaps: gaps.length, repaired };
  }

  // Compression: resample a base timeframe into a higher one.
  resample(candles: MdCandle[], target: Timeframe): Bar[] {
    const sec = TIMEFRAME_SECONDS[target];
    const buckets = new Map<number, Bar>();
    for (const c of candles) {
      const bucket = Math.floor(c.ts.getTime() / 1000 / sec) * sec * 1000;
      const existing = buckets.get(bucket);
      if (!existing) {
        buckets.set(bucket, {
          ts: bucket,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume,
        });
      } else {
        existing.high = Math.max(existing.high, c.high);
        existing.low = Math.min(existing.low, c.low);
        existing.close = c.close;
        existing.volume += c.volume;
      }
    }
    return [...buckets.values()].sort((a, b) => a.ts - b.ts);
  }

  // Retention: purge candles older than the configured window per timeframe.
  async applyRetention(): Promise<Record<string, number>> {
    const result: Record<string, number> = {};
    for (const [tf, days] of Object.entries(RETENTION_DAYS)) {
      if (!days) continue;
      const cutoff = new Date(Date.now() - days * 86_400_000);
      result[tf] = await repository.deleteCandlesBefore(cutoff, tf as Timeframe);
    }
    return result;
  }
}

export const historicalManager = new HistoricalDataManager();
