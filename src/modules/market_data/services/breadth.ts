// AI Arena — Market Breadth Engine. Advance/Decline, sector & index breadth.
import { CACHE_NS, CACHE_TTL } from "../constants";
import { cache } from "../core/cache";
import { repository } from "../core/repository";
import { providerManager } from "../providers/provider-manager";

export interface BreadthResult {
  scope: string;
  advances: number;
  declines: number;
  unchanged: number;
  advanceDeclineRatio: number;
  breadthPct: number;
  total: number;
  ts: number;
}

const NIFTY_CONSTITUENTS = [
  "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "SBIN", "BHARTIARTL",
  "ITC", "LT", "AXISBANK", "KOTAKBANK", "HINDUNILVR", "MARUTI", "TATAMOTORS",
  "SUNPHARMA", "WIPRO", "ADANIENT", "TITAN", "ASIANPAINT", "BAJFINANCE",
];
const BANKNIFTY_CONSTITUENTS = ["HDFCBANK", "ICICIBANK", "SBIN", "AXISBANK", "KOTAKBANK"];

class BreadthEngine {
  private async computeFor(scope: string, symbols: string[]): Promise<BreadthResult> {
    let advances = 0;
    let declines = 0;
    let unchanged = 0;
    for (const symbol of symbols) {
      const q = await providerManager.getQuote(symbol, "NSE");
      const change = q.ltp - q.prevClose;
      if (change > 0) advances += 1;
      else if (change < 0) declines += 1;
      else unchanged += 1;
    }
    const total = symbols.length || 1;
    return {
      scope,
      advances,
      declines,
      unchanged,
      advanceDeclineRatio: declines === 0 ? advances : +(advances / declines).toFixed(2),
      breadthPct: +((advances / total) * 100).toFixed(2),
      total: symbols.length,
      ts: Date.now(),
    };
  }

  async nifty(): Promise<BreadthResult> {
    return cache.getOrSet(CACHE_NS.breadth, "NIFTY", CACHE_TTL.breadth, () =>
      this.computeFor("NIFTY", NIFTY_CONSTITUENTS),
    );
  }

  async bankNifty(): Promise<BreadthResult> {
    return cache.getOrSet(CACHE_NS.breadth, "BANKNIFTY", CACHE_TTL.breadth, () =>
      this.computeFor("BANKNIFTY", BANKNIFTY_CONSTITUENTS),
    );
  }

  async sector(sector: string): Promise<BreadthResult> {
    return cache.getOrSet(CACHE_NS.breadth, `sector:${sector}`, CACHE_TTL.breadth, async () => {
      const rows = await repository.listSymbols({ sector, instrumentType: "EQ", limit: 200 });
      return this.computeFor(`SECTOR:${sector}`, rows.map((r) => r.symbol));
    });
  }

  async industry(industry: string): Promise<BreadthResult> {
    return cache.getOrSet(CACHE_NS.breadth, `industry:${industry}`, CACHE_TTL.breadth, async () => {
      const all = await repository.listSymbols({ instrumentType: "EQ", limit: 500 });
      const symbols = all.filter((s) => s.industry === industry).map((s) => s.symbol);
      return this.computeFor(`INDUSTRY:${industry}`, symbols);
    });
  }

  async overall(): Promise<BreadthResult> {
    return cache.getOrSet(CACHE_NS.breadth, "MARKET", CACHE_TTL.breadth, async () => {
      const rows = await repository.listSymbols({ instrumentType: "EQ", limit: 500 });
      return this.computeFor("MARKET", rows.map((r) => r.symbol));
    });
  }
}

export const breadthEngine = new BreadthEngine();
