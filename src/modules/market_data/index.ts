// AI Arena — Market Data module public surface.
// Single canonical instances re-exported for reuse across the platform.
export * from "./constants";

// Core singletons (one each — do not instantiate parallels).
export { eventBus } from "./core/event-bus";
export type {
  TickEvent,
  CandleEvent,
  QualityEvent,
  ProviderEvent,
  MarketDataEventMap,
} from "./core/event-bus";
export { cache } from "./core/cache";
export { repository } from "./core/repository";

// Infrastructure engines.
export { providerManager } from "./providers/provider-manager";
export type { ProviderQuote, ProviderMetrics } from "./providers/provider-manager";
export { feedPipeline } from "./feed/feed-pipeline";
export { dataQuality } from "./quality/quality";
export { marketSession } from "./session/session";

// Indicator library.
export * as indicators from "./indicators/indicators";
export type { Bar } from "./indicators/indicators";

// Domain engines.
export { historicalManager } from "./services/historical";
export { symbolMaster } from "./services/symbol-master";
export { scannerEngine } from "./services/scanner";
export { optionChainEngine } from "./services/option-chain";
export { corporateActionEngine } from "./services/corporate-action";
export { breadthEngine } from "./services/breadth";
export { sectorIntelligence } from "./services/sector-intelligence";
export { newsIntelligence } from "./services/news";
export { watchlistEngine } from "./services/watchlist";
export { replayEngine } from "./services/replay";
export { featureEngineering } from "./services/feature-engineering";

import { repository } from "./core/repository";
import { symbolMaster } from "./services/symbol-master";
import { historicalManager } from "./services/historical";
import { newsIntelligence } from "./services/news";
import { providerManager } from "./providers/provider-manager";

// Idempotent bootstrap: seed symbol master + baseline candles + heartbeat once.
const globalForBoot = globalThis as typeof globalThis & {
  __arenaMarketBootstrapped?: boolean;
};

export async function bootstrapMarketData(): Promise<{
  symbols: number;
  candlesSeeded: number;
  news: number;
}> {
  await symbolMaster.seed();
  await providerManager.heartbeat();

  const symbolCount = await repository.count("symbols");
  const existingCandles = await repository.count("candles");

  let candlesSeeded = 0;
  if (existingCandles === 0) {
    const seedUniverse = (await repository.listSymbols({ instrumentType: "EQ", limit: 20 })).map(
      (s) => s.symbol,
    );
    for (const symbol of seedUniverse) {
      candlesSeeded += await historicalManager.backfill(symbol, "1D", 260);
      candlesSeeded += await historicalManager.backfill(symbol, "5m", 375);
    }
  }

  let news = 0;
  if ((await repository.count("news")) === 0) {
    news = await newsIntelligence.ingest([
      {
        source: "EXCHANGE",
        category: "Circular",
        headline: "NSE revises lot sizes for F&O contracts",
        impact: "MEDIUM",
      },
      {
        source: "SEBI",
        category: "Regulation",
        headline: "SEBI tightens disclosure norms for related-party transactions",
        impact: "HIGH",
      },
      {
        source: "RBI",
        category: "Policy",
        headline: "RBI keeps repo rate unchanged at 6.50%",
        impact: "HIGH",
      },
      {
        source: "RESULTS",
        category: "Earnings",
        symbol: "TCS",
        headline: "TCS Q4 net profit up 9% YoY, declares dividend",
        impact: "MEDIUM",
      },
      {
        source: "IPO",
        category: "Primary Market",
        headline: "New mainboard IPO opens for subscription this week",
        impact: "LOW",
      },
    ]);
  }

  globalForBoot.__arenaMarketBootstrapped = true;
  return { symbols: symbolCount, candlesSeeded, news };
}

export function isBootstrapped(): boolean {
  return Boolean(globalForBoot.__arenaMarketBootstrapped);
}
