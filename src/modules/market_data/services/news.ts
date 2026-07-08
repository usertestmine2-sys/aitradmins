// AI Arena — News Intelligence. Circulars, announcements, SEBI/RBI, calendar.
import { CACHE_NS, CACHE_TTL, type NewsSource } from "../constants";
import { cache } from "../core/cache";
import { repository } from "../core/repository";
import type { MdNews } from "@/db/schema";

interface IngestInput {
  source: NewsSource;
  category: string;
  headline: string;
  symbol?: string;
  body?: string;
  url?: string;
  impact?: "LOW" | "MEDIUM" | "HIGH";
  publishedAt?: Date;
}

class NewsIntelligence {
  async ingest(items: IngestInput[]): Promise<number> {
    const rows = items.map((i) => ({
      source: i.source,
      category: i.category,
      headline: i.headline,
      symbol: i.symbol ?? null,
      body: i.body ?? null,
      url: i.url ?? null,
      impact: i.impact ?? "LOW",
      publishedAt: i.publishedAt ?? new Date(),
    }));
    const count = await repository.insertNews(rows);
    cache.invalidate(CACHE_NS.news);
    return count;
  }

  async feed(filters: { source?: NewsSource; symbol?: string; limit?: number } = {}): Promise<MdNews[]> {
    const cacheId = `${filters.source ?? "ALL"}:${filters.symbol ?? "ALL"}:${filters.limit ?? 100}`;
    return cache.getOrSet(CACHE_NS.news, cacheId, CACHE_TTL.news, () =>
      repository.listNews(filters),
    );
  }

  // Economic Calendar view — filter to calendar/results/dividend/IPO sources.
  async calendar(): Promise<MdNews[]> {
    const all = await this.feed({ limit: 200 });
    const calendarSources: NewsSource[] = [
      "ECONOMIC_CALENDAR",
      "RESULTS",
      "DIVIDEND",
      "SPLIT",
      "IPO",
    ];
    return all.filter((n) => (calendarSources as string[]).includes(n.source));
  }
}

export const newsIntelligence = new NewsIntelligence();
