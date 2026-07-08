// AI Arena — THE single feed pipeline.
// Ingest tick -> quality gate -> cache -> event bus -> live candle aggregation.
// Every real-time consumer subscribes to the event bus this pipeline feeds.
import { CACHE_NS, CACHE_TTL, TIMEFRAME_SECONDS, type Timeframe } from "../constants";
import { cache } from "../core/cache";
import { eventBus, type TickEvent } from "../core/event-bus";
import { repository } from "../core/repository";
import { dataQuality } from "../quality/quality";
import { providerManager } from "../providers/provider-manager";

interface LiveBar {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  oi: number;
  bucketTs: number;
}

class FeedPipeline {
  // Rolling in-progress candles keyed by symbol|tf.
  private readonly liveBars = new Map<string, LiveBar>();
  private ingested = 0;
  private rejected = 0;

  private bucketStart(ts: number, tf: Timeframe): number {
    const sec = TIMEFRAME_SECONDS[tf];
    return Math.floor(ts / 1000 / sec) * sec * 1000;
  }

  // Core ingest path — used by both live providers and replay engine.
  async ingestTick(tick: TickEvent, timeframes: Timeframe[] = ["1m", "5m"]): Promise<boolean> {
    const quality = dataQuality.validateTick(tick);
    if (!quality.ok) {
      this.rejected += 1;
      return false;
    }
    this.ingested += 1;

    cache.set(CACHE_NS.quote, `${tick.exchange}:${tick.symbol}`, tick, CACHE_TTL.quote);
    eventBus.publish("tick", tick);

    for (const tf of timeframes) {
      const key = `${tick.exchange}:${tick.symbol}:${tf}`;
      const bucketTs = this.bucketStart(tick.ts, tf);
      const existing = this.liveBars.get(key);

      if (!existing || existing.bucketTs !== bucketTs) {
        if (existing) {
          // Finalize the completed candle: publish + persist.
          await this.finalizeBar(tick.symbol, tick.exchange, tf, existing);
        }
        this.liveBars.set(key, {
          open: tick.ltp,
          high: tick.ltp,
          low: tick.ltp,
          close: tick.ltp,
          volume: tick.volume,
          oi: tick.oi ?? 0,
          bucketTs,
        });
      } else {
        existing.high = Math.max(existing.high, tick.ltp);
        existing.low = Math.min(existing.low, tick.ltp);
        existing.close = tick.ltp;
        existing.volume += tick.volume;
        existing.oi = tick.oi ?? existing.oi;
      }
    }
    return true;
  }

  private async finalizeBar(
    symbol: string,
    exchange: string,
    tf: Timeframe,
    bar: LiveBar,
  ): Promise<void> {
    eventBus.publish("candle", {
      symbol,
      exchange,
      timeframe: tf,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: bar.volume,
      oi: bar.oi,
      ts: bar.bucketTs,
    });
    await repository.upsertCandles([
      {
        symbol,
        exchange,
        timeframe: tf,
        ts: new Date(bar.bucketTs),
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
        oi: bar.oi,
      },
    ]);
    cache.invalidate(CACHE_NS.candles, `${symbol}:${tf}`);
  }

  // Poll a symbol through the provider manager and push a tick into the pipeline.
  async pollSymbol(symbol: string, exchange: "NSE" | "BSE" = "NSE"): Promise<boolean> {
    const quote = await providerManager.getQuote(symbol, exchange);
    return this.ingestTick({
      symbol,
      exchange,
      ltp: quote.ltp,
      volume: quote.volume,
      oi: quote.oi,
      ts: quote.ts,
      provider: quote.provider,
    });
  }

  stats() {
    return {
      ingested: this.ingested,
      rejected: this.rejected,
      liveBars: this.liveBars.size,
    };
  }
}

const globalForFeed = globalThis as typeof globalThis & {
  __arenaFeedPipeline?: FeedPipeline;
};

export const feedPipeline: FeedPipeline =
  globalForFeed.__arenaFeedPipeline ?? new FeedPipeline();

if (!globalForFeed.__arenaFeedPipeline) {
  globalForFeed.__arenaFeedPipeline = feedPipeline;
}
