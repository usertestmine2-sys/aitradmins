import {
  breadthEngine,
  cache,
  eventBus,
  feedPipeline,
  marketSession,
  newsIntelligence,
  providerManager,
  repository,
  scannerEngine,
  sectorIntelligence,
} from "@/modules/market_data";
import { handle } from "@/modules/market_data/http";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const [nifty, banknifty, rotation, momentum, news, symbolCount, candleCount] =
      await Promise.all([
        breadthEngine.nifty(),
        breadthEngine.bankNifty(),
        sectorIntelligence.rotation(),
        scannerEngine.scan("MOMENTUM"),
        newsIntelligence.feed({ limit: 6 }),
        repository.count("symbols"),
        repository.count("candles"),
      ]);
    return {
      session: marketSession.getState(),
      providers: {
        active: providerManager.activeProvider(),
        status: providerManager.status(),
      },
      breadth: { nifty, banknifty },
      sectorRotation: rotation.ranked.slice(0, 6),
      rotatingInto: rotation.rotatingInto,
      rotatingOut: rotation.rotatingOut,
      topMovers: momentum.matches.slice(0, 8),
      news,
      metrics: {
        symbols: symbolCount,
        candles: candleCount,
        cache: cache.stats(),
        feed: feedPipeline.stats(),
        events: eventBus.metrics(),
      },
    };
  });
}
