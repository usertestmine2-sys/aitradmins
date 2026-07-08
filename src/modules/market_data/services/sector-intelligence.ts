// AI Arena — Sector Intelligence. Rotation, leaders/laggards, momentum ranking.
import { CACHE_NS, CACHE_TTL } from "../constants";
import { cache } from "../core/cache";
import { repository } from "../core/repository";
import { providerManager } from "../providers/provider-manager";

export interface SectorRank {
  sector: string;
  avgChangePct: number;
  momentum: number;
  leaders: { symbol: string; changePct: number }[];
  laggards: { symbol: string; changePct: number }[];
  constituents: number;
}

export interface RotationResult {
  ranked: SectorRank[];
  rotatingInto: string[];
  rotatingOut: string[];
  ts: number;
}

class SectorIntelligence {
  private async sectorRank(sector: string): Promise<SectorRank | null> {
    const rows = await repository.listSymbols({ sector, instrumentType: "EQ", limit: 100 });
    if (rows.length === 0) return null;
    const perf: { symbol: string; changePct: number }[] = [];
    for (const row of rows) {
      const q = await providerManager.getQuote(row.symbol, "NSE");
      perf.push({ symbol: row.symbol, changePct: +(((q.ltp - q.prevClose) / q.prevClose) * 100).toFixed(2) });
    }
    perf.sort((a, b) => b.changePct - a.changePct);
    const avg = perf.reduce((a, b) => a + b.changePct, 0) / perf.length;
    // Momentum = breadth-weighted average performance.
    const positives = perf.filter((p) => p.changePct > 0).length;
    const momentum = +(avg * (positives / perf.length)).toFixed(3);
    return {
      sector,
      avgChangePct: +avg.toFixed(2),
      momentum,
      leaders: perf.slice(0, 3),
      laggards: perf.slice(-3).reverse(),
      constituents: perf.length,
    };
  }

  async rotation(): Promise<RotationResult> {
    return cache.getOrSet(CACHE_NS.sector, "rotation", CACHE_TTL.sector, async () => {
      const sectors = await repository.sectors();
      const ranked: SectorRank[] = [];
      for (const sector of sectors) {
        if (sector === "Index" || sector === "ETF") continue;
        const rank = await this.sectorRank(sector);
        if (rank) ranked.push(rank);
      }
      ranked.sort((a, b) => b.momentum - a.momentum);
      return {
        ranked,
        rotatingInto: ranked.slice(0, 3).map((r) => r.sector),
        rotatingOut: ranked.slice(-3).map((r) => r.sector),
        ts: Date.now(),
      };
    });
  }

  // Industry rotation is the same algorithm at industry granularity.
  async industryRotation(): Promise<{ ranked: { industry: string; avgChangePct: number }[]; ts: number }> {
    const all = await repository.listSymbols({ instrumentType: "EQ", limit: 500 });
    const byIndustry = new Map<string, string[]>();
    for (const s of all) {
      if (!s.industry) continue;
      const list = byIndustry.get(s.industry) ?? [];
      list.push(s.symbol);
      byIndustry.set(s.industry, list);
    }
    const ranked: { industry: string; avgChangePct: number }[] = [];
    for (const [industry, symbols] of byIndustry.entries()) {
      let sum = 0;
      for (const symbol of symbols) {
        const q = await providerManager.getQuote(symbol, "NSE");
        sum += ((q.ltp - q.prevClose) / q.prevClose) * 100;
      }
      ranked.push({ industry, avgChangePct: +(sum / symbols.length).toFixed(2) });
    }
    ranked.sort((a, b) => b.avgChangePct - a.avgChangePct);
    return { ranked, ts: Date.now() };
  }
}

export const sectorIntelligence = new SectorIntelligence();
