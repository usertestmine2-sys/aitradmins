// AI Arena — Watchlist Engine. User/Sector/AI/Strategy/Pinned watchlists.
import { type WatchlistType } from "../constants";
import { repository } from "../core/repository";
import { providerManager } from "../providers/provider-manager";
import { scannerEngine } from "./scanner";
import type { MdWatchlist, MdWatchlistItem } from "@/db/schema";

export interface WatchlistView {
  watchlist: MdWatchlist;
  items: Array<
    MdWatchlistItem & {
      ltp: number;
      changePct: number;
    }
  >;
}

class WatchlistEngine {
  async create(name: string, type: WatchlistType = "USER", pinned = false): Promise<MdWatchlist> {
    return repository.createWatchlist({ name, type, pinned });
  }

  async list(): Promise<MdWatchlist[]> {
    return repository.listWatchlists();
  }

  async remove(id: number): Promise<void> {
    return repository.deleteWatchlist(id);
  }

  async addSymbol(watchlistId: number, symbol: string, exchange = "NSE"): Promise<void> {
    await repository.addWatchlistItem({ watchlistId, symbol, exchange });
  }

  async removeSymbol(watchlistId: number, symbol: string): Promise<void> {
    await repository.removeWatchlistItem(watchlistId, symbol);
  }

  async view(watchlistId: number): Promise<WatchlistView | null> {
    const lists = await repository.listWatchlists();
    const watchlist = lists.find((l) => l.id === watchlistId);
    if (!watchlist) return null;
    const items = await repository.watchlistItems(watchlistId);
    const enriched = [];
    for (const item of items) {
      const q = await providerManager.getQuote(item.symbol, item.exchange as "NSE" | "BSE");
      enriched.push({
        ...item,
        ltp: q.ltp,
        changePct: +(((q.ltp - q.prevClose) / q.prevClose) * 100).toFixed(2),
      });
    }
    return { watchlist, items: enriched };
  }

  // Auto-build a sector watchlist from the symbol master.
  async buildSectorWatchlist(sector: string): Promise<MdWatchlist> {
    const wl = await this.create(`${sector} Sector`, "SECTOR", false);
    const symbols = await repository.listSymbols({ sector, instrumentType: "EQ", limit: 100 });
    for (const s of symbols) await this.addSymbol(wl.id, s.symbol, s.exchange);
    return wl;
  }

  // Auto-build an AI watchlist from a scanner result (momentum leaders).
  async buildAiWatchlist(name = "AI Momentum"): Promise<MdWatchlist> {
    const wl = await this.create(name, "AI", true);
    const scan = await scannerEngine.scan("MOMENTUM");
    for (const match of scan.matches.slice(0, 15)) await this.addSymbol(wl.id, match.symbol);
    return wl;
  }
}

export const watchlistEngine = new WatchlistEngine();
