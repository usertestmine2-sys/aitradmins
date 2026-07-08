// AI Arena — THE single Market Data repository. All DB access flows through here.
// Do not create another repository. Every engine reuses this instance.
import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  mdCandles,
  mdCorporateActions,
  mdNews,
  mdOptionSnapshots,
  mdSymbols,
  mdWatchlistItems,
  mdWatchlists,
  type MdCandle,
  type MdCandleInsert,
  type MdCorporateAction,
  type MdNews,
  type MdSymbol,
  type MdSymbolInsert,
  type MdWatchlist,
  type MdWatchlistItem,
} from "@/db/schema";
import type { Timeframe } from "../constants";

class MarketDataRepository {
  // ---- Symbol Master ----
  async upsertSymbols(rows: MdSymbolInsert[]): Promise<number> {
    if (rows.length === 0) return 0;
    await db
      .insert(mdSymbols)
      .values(rows)
      .onConflictDoUpdate({
        target: [
          mdSymbols.exchange,
          mdSymbols.symbol,
          mdSymbols.instrumentType,
          mdSymbols.expiry,
          mdSymbols.strike,
          mdSymbols.optionType,
        ],
        set: {
          name: sql`excluded.name`,
          sector: sql`excluded.sector`,
          industry: sql`excluded.industry`,
          lotSize: sql`excluded.lot_size`,
          tickSize: sql`excluded.tick_size`,
          freezeQty: sql`excluded.freeze_qty`,
          faceValue: sql`excluded.face_value`,
          status: sql`excluded.status`,
          token: sql`excluded.token`,
          updatedAt: sql`now()`,
        },
      });
    return rows.length;
  }

  async findSymbol(symbol: string, exchange = "NSE"): Promise<MdSymbol | undefined> {
    const [row] = await db
      .select()
      .from(mdSymbols)
      .where(and(eq(mdSymbols.symbol, symbol), eq(mdSymbols.exchange, exchange)))
      .limit(1);
    return row;
  }

  async searchSymbols(query: string, limit = 50): Promise<MdSymbol[]> {
    const like = `%${query.toUpperCase()}%`;
    return db
      .select()
      .from(mdSymbols)
      .where(sql`upper(${mdSymbols.symbol}) like ${like} or upper(${mdSymbols.name}) like ${like}`)
      .limit(limit);
  }

  async listSymbols(filters: {
    instrumentType?: string;
    sector?: string;
    status?: string;
    limit?: number;
  }): Promise<MdSymbol[]> {
    const conds = [];
    if (filters.instrumentType) conds.push(eq(mdSymbols.instrumentType, filters.instrumentType));
    if (filters.sector) conds.push(eq(mdSymbols.sector, filters.sector));
    if (filters.status) conds.push(eq(mdSymbols.status, filters.status));
    return db
      .select()
      .from(mdSymbols)
      .where(conds.length ? and(...conds) : undefined)
      .limit(filters.limit ?? 500);
  }

  async sectors(): Promise<string[]> {
    const rows = await db
      .selectDistinct({ sector: mdSymbols.sector })
      .from(mdSymbols)
      .where(sql`${mdSymbols.sector} is not null`);
    return rows.map((r) => r.sector).filter((s): s is string => Boolean(s));
  }

  // ---- Candles ----
  async upsertCandles(rows: MdCandleInsert[]): Promise<number> {
    if (rows.length === 0) return 0;
    // Chunk to stay within parameter limits.
    const chunkSize = 500;
    let total = 0;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      await db
        .insert(mdCandles)
        .values(chunk)
        .onConflictDoUpdate({
          target: [mdCandles.symbol, mdCandles.exchange, mdCandles.timeframe, mdCandles.ts],
          set: {
            open: sql`excluded.open`,
            high: sql`excluded.high`,
            low: sql`excluded.low`,
            close: sql`excluded.close`,
            volume: sql`excluded.volume`,
            oi: sql`excluded.oi`,
          },
        });
      total += chunk.length;
    }
    return total;
  }

  async getCandles(
    symbol: string,
    timeframe: Timeframe,
    opts: { from?: Date; to?: Date; limit?: number; exchange?: string } = {},
  ): Promise<MdCandle[]> {
    const conds = [
      eq(mdCandles.symbol, symbol),
      eq(mdCandles.timeframe, timeframe),
      eq(mdCandles.exchange, opts.exchange ?? "NSE"),
    ];
    if (opts.from) conds.push(gte(mdCandles.ts, opts.from));
    if (opts.to) conds.push(lte(mdCandles.ts, opts.to));
    return db
      .select()
      .from(mdCandles)
      .where(and(...conds))
      .orderBy(asc(mdCandles.ts))
      .limit(opts.limit ?? 5000);
  }

  async latestCandle(
    symbol: string,
    timeframe: Timeframe,
    exchange = "NSE",
  ): Promise<MdCandle | undefined> {
    const [row] = await db
      .select()
      .from(mdCandles)
      .where(
        and(
          eq(mdCandles.symbol, symbol),
          eq(mdCandles.timeframe, timeframe),
          eq(mdCandles.exchange, exchange),
        ),
      )
      .orderBy(desc(mdCandles.ts))
      .limit(1);
    return row;
  }

  async deleteCandlesBefore(cutoff: Date, timeframe: Timeframe): Promise<number> {
    const res = await db
      .delete(mdCandles)
      .where(and(eq(mdCandles.timeframe, timeframe), lte(mdCandles.ts, cutoff)))
      .returning({ id: mdCandles.id });
    return res.length;
  }

  // ---- Corporate Actions ----
  async insertCorporateAction(
    row: typeof mdCorporateActions.$inferInsert,
  ): Promise<MdCorporateAction> {
    const [inserted] = await db
      .insert(mdCorporateActions)
      .values(row)
      .onConflictDoUpdate({
        target: [
          mdCorporateActions.symbol,
          mdCorporateActions.exchange,
          mdCorporateActions.actionType,
          mdCorporateActions.exDate,
        ],
        set: {
          ratioFrom: sql`excluded.ratio_from`,
          ratioTo: sql`excluded.ratio_to`,
          value: sql`excluded.value`,
          details: sql`excluded.details`,
        },
      })
      .returning();
    return inserted;
  }

  async corporateActionsFor(symbol: string): Promise<MdCorporateAction[]> {
    return db
      .select()
      .from(mdCorporateActions)
      .where(eq(mdCorporateActions.symbol, symbol))
      .orderBy(desc(mdCorporateActions.exDate));
  }

  async pendingCorporateActions(): Promise<MdCorporateAction[]> {
    return db
      .select()
      .from(mdCorporateActions)
      .where(eq(mdCorporateActions.applied, false))
      .orderBy(asc(mdCorporateActions.exDate));
  }

  async markCorporateActionApplied(id: number): Promise<void> {
    await db
      .update(mdCorporateActions)
      .set({ applied: true })
      .where(eq(mdCorporateActions.id, id));
  }

  // ---- Watchlists ----
  async createWatchlist(row: typeof mdWatchlists.$inferInsert): Promise<MdWatchlist> {
    const [inserted] = await db.insert(mdWatchlists).values(row).returning();
    return inserted;
  }

  async listWatchlists(): Promise<MdWatchlist[]> {
    return db
      .select()
      .from(mdWatchlists)
      .orderBy(desc(mdWatchlists.pinned), asc(mdWatchlists.name));
  }

  async deleteWatchlist(id: number): Promise<void> {
    await db.delete(mdWatchlistItems).where(eq(mdWatchlistItems.watchlistId, id));
    await db.delete(mdWatchlists).where(eq(mdWatchlists.id, id));
  }

  async addWatchlistItem(
    row: typeof mdWatchlistItems.$inferInsert,
  ): Promise<MdWatchlistItem | undefined> {
    const [inserted] = await db
      .insert(mdWatchlistItems)
      .values(row)
      .onConflictDoNothing()
      .returning();
    return inserted;
  }

  async removeWatchlistItem(watchlistId: number, symbol: string): Promise<void> {
    await db
      .delete(mdWatchlistItems)
      .where(
        and(eq(mdWatchlistItems.watchlistId, watchlistId), eq(mdWatchlistItems.symbol, symbol)),
      );
  }

  async watchlistItems(watchlistId: number): Promise<MdWatchlistItem[]> {
    return db
      .select()
      .from(mdWatchlistItems)
      .where(eq(mdWatchlistItems.watchlistId, watchlistId))
      .orderBy(asc(mdWatchlistItems.symbol));
  }

  // ---- News ----
  async insertNews(rows: (typeof mdNews.$inferInsert)[]): Promise<number> {
    if (rows.length === 0) return 0;
    await db.insert(mdNews).values(rows);
    return rows.length;
  }

  async listNews(filters: { source?: string; symbol?: string; limit?: number }): Promise<MdNews[]> {
    const conds = [];
    if (filters.source) conds.push(eq(mdNews.source, filters.source));
    if (filters.symbol) conds.push(eq(mdNews.symbol, filters.symbol));
    return db
      .select()
      .from(mdNews)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(mdNews.publishedAt))
      .limit(filters.limit ?? 100);
  }

  // ---- Option Snapshots ----
  async saveOptionSnapshot(row: typeof mdOptionSnapshots.$inferInsert): Promise<void> {
    await db.insert(mdOptionSnapshots).values(row);
  }

  async latestOptionSnapshot(underlying: string) {
    const [row] = await db
      .select()
      .from(mdOptionSnapshots)
      .where(eq(mdOptionSnapshots.underlying, underlying))
      .orderBy(desc(mdOptionSnapshots.ts))
      .limit(1);
    return row;
  }

  // ---- Bulk quotes-support (used by breadth / scanner) ----
  async latestClosesForSymbols(
    symbols: string[],
    timeframe: Timeframe,
  ): Promise<Map<string, MdCandle>> {
    if (symbols.length === 0) return new Map();
    const rows = await db
      .select()
      .from(mdCandles)
      .where(
        and(inArray(mdCandles.symbol, symbols), eq(mdCandles.timeframe, timeframe)),
      )
      .orderBy(asc(mdCandles.ts));
    const map = new Map<string, MdCandle>();
    for (const row of rows) map.set(row.symbol, row); // last wins = latest ts
    return map;
  }

  async count(table: "symbols" | "candles" | "news"): Promise<number> {
    const target = table === "symbols" ? mdSymbols : table === "candles" ? mdCandles : mdNews;
    const [row] = await db.select({ c: sql<number>`count(*)::int` }).from(target);
    return row?.c ?? 0;
  }
}

const globalForRepo = globalThis as typeof globalThis & {
  __arenaMarketRepository?: MarketDataRepository;
};

export const repository: MarketDataRepository =
  globalForRepo.__arenaMarketRepository ?? new MarketDataRepository();

if (!globalForRepo.__arenaMarketRepository) {
  globalForRepo.__arenaMarketRepository = repository;
}
