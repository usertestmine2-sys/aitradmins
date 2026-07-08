import { okResponse, toResponse } from "@/kernel";
import { requireAuth } from "@/modules/identity";
import { analyticsService, bootstrapAnalytics } from "@/modules/analytics";

export const dynamic = "force-dynamic";

// Compact key metrics feed (for widgets / polling). Reuses analytics service.
export async function GET(req: Request) {
  try {
    await requireAuth(req);
    bootstrapAnalytics();
    const [brain, system, learning] = await Promise.all([
      analyticsService.brain(),
      analyticsService.system(),
      analyticsService.learning(),
    ]);
    return okResponse({
      brainHealth: brain.health.score,
      brainGrade: brain.health.grade,
      knowledgeGrowth: brain.knowledgeGrowth,
      openRecommendations: brain.openRecommendations,
      symbols: system.counts.symbols,
      candles: system.counts.candles,
      cacheHitRatio:
        system.cache.hits + system.cache.misses > 0
          ? +(system.cache.hits / (system.cache.hits + system.cache.misses)).toFixed(3)
          : 0,
      activeProvider: system.providers.active,
      learning: learning.perModel,
      ts: Date.now(),
    });
  } catch (err) {
    return toResponse(err);
  }
}
