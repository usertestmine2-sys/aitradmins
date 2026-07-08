// AITradeMinds — Trading Repository. Reuses the single db context (@/db).
// Owns accounts, orders, order events, positions, fills, risk decisions.
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  pfLedger,
  pfSnapshots,
  tradeAccounts,
  tradeFills,
  tradeOrderEvents,
  tradeOrders,
  tradePositions,
  tradeRiskDecisions,
  type PfLedgerEntry,
  type PfSnapshot,
  type TradeAccount,
  type TradeFill,
  type TradeOrder,
  type TradePosition,
} from "@/db/schema";
import { singleton } from "@/kernel";

class TradingRepository {
  // ---- Accounts ----
  async ensureAccount(userId: number, kind = "PAPER"): Promise<TradeAccount> {
    const [existing] = await db
      .select()
      .from(tradeAccounts)
      .where(and(eq(tradeAccounts.userId, userId), eq(tradeAccounts.kind, kind)))
      .limit(1);
    if (existing) return existing;
    const [created] = await db
      .insert(tradeAccounts)
      .values({ userId, kind })
      .onConflictDoNothing()
      .returning();
    if (created) return created;
    const [row] = await db
      .select()
      .from(tradeAccounts)
      .where(and(eq(tradeAccounts.userId, userId), eq(tradeAccounts.kind, kind)))
      .limit(1);
    return row;
  }

  async getAccount(accountId: number): Promise<TradeAccount | undefined> {
    const [row] = await db.select().from(tradeAccounts).where(eq(tradeAccounts.id, accountId)).limit(1);
    return row;
  }

  async adjustCash(accountId: number, cashDelta: number, realizedDelta: number): Promise<void> {
    await db
      .update(tradeAccounts)
      .set({
        cash: sql`${tradeAccounts.cash} + ${cashDelta}`,
        realizedPnl: sql`${tradeAccounts.realizedPnl} + ${realizedDelta}`,
        version: sql`${tradeAccounts.version} + 1`,
        updatedAt: sql`now()`,
      })
      .where(eq(tradeAccounts.id, accountId));
  }

  // ---- Orders ----
  async createOrder(row: typeof tradeOrders.$inferInsert): Promise<TradeOrder> {
    const [order] = await db.insert(tradeOrders).values(row).returning();
    return order;
  }

  async updateOrder(id: number, patch: Partial<typeof tradeOrders.$inferInsert>): Promise<void> {
    await db.update(tradeOrders).set({ ...patch, updatedAt: sql`now()` }).where(eq(tradeOrders.id, id));
  }

  async getOrder(id: number): Promise<TradeOrder | undefined> {
    const [row] = await db.select().from(tradeOrders).where(eq(tradeOrders.id, id)).limit(1);
    return row;
  }

  async listOrders(accountId: number, limit = 100): Promise<TradeOrder[]> {
    return db
      .select()
      .from(tradeOrders)
      .where(eq(tradeOrders.accountId, accountId))
      .orderBy(desc(tradeOrders.createdAt))
      .limit(limit);
  }

  async recordOrderEvent(row: typeof tradeOrderEvents.$inferInsert): Promise<void> {
    await db.insert(tradeOrderEvents).values(row);
  }

  async orderEvents(orderId: number) {
    return db
      .select()
      .from(tradeOrderEvents)
      .where(eq(tradeOrderEvents.orderId, orderId))
      .orderBy(tradeOrderEvents.createdAt);
  }

  // ---- Fills ----
  async recordFill(row: typeof tradeFills.$inferInsert): Promise<TradeFill> {
    const [fill] = await db.insert(tradeFills).values(row).returning();
    return fill;
  }

  async fills(accountId: number, limit = 200): Promise<TradeFill[]> {
    return db
      .select()
      .from(tradeFills)
      .where(eq(tradeFills.accountId, accountId))
      .orderBy(desc(tradeFills.createdAt))
      .limit(limit);
  }

  // ---- Positions ----
  async openPosition(accountId: number, symbol: string, product: string): Promise<TradePosition | undefined> {
    const [row] = await db
      .select()
      .from(tradePositions)
      .where(
        and(
          eq(tradePositions.accountId, accountId),
          eq(tradePositions.symbol, symbol),
          eq(tradePositions.product, product),
          eq(tradePositions.status, "OPEN"),
        ),
      )
      .limit(1);
    return row;
  }

  async upsertPosition(row: typeof tradePositions.$inferInsert): Promise<TradePosition> {
    const [saved] = await db.insert(tradePositions).values(row).returning();
    return saved;
  }

  async updatePosition(id: number, patch: Partial<typeof tradePositions.$inferInsert>): Promise<void> {
    await db.update(tradePositions).set({ ...patch, updatedAt: sql`now()` }).where(eq(tradePositions.id, id));
  }

  async positions(accountId: number, status?: string): Promise<TradePosition[]> {
    return db
      .select()
      .from(tradePositions)
      .where(
        status
          ? and(eq(tradePositions.accountId, accountId), eq(tradePositions.status, status))
          : eq(tradePositions.accountId, accountId),
      )
      .orderBy(desc(tradePositions.updatedAt));
  }

  // ---- Risk decisions ----
  async recordRisk(row: typeof tradeRiskDecisions.$inferInsert): Promise<void> {
    await db.insert(tradeRiskDecisions).values(row);
  }

  async riskDecisions(accountId: number, limit = 100) {
    return db
      .select()
      .from(tradeRiskDecisions)
      .where(eq(tradeRiskDecisions.accountId, accountId))
      .orderBy(desc(tradeRiskDecisions.createdAt))
      .limit(limit);
  }

  // ---- Aggregates ----
  async dayRealized(accountId: number): Promise<number> {
    const [row] = await db
      .select({ s: sql<number>`coalesce(sum(${tradePositions.realizedPnl}),0)` })
      .from(tradePositions)
      .where(eq(tradePositions.accountId, accountId));
    return row?.s ?? 0;
  }

  async openPositionCount(accountId: number): Promise<number> {
    const [row] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(tradePositions)
      .where(and(eq(tradePositions.accountId, accountId), eq(tradePositions.status, "OPEN")));
    return row?.c ?? 0;
  }

  // ---- Ledger (append-only double-entry) ----
  async appendLedger(rows: (typeof pfLedger.$inferInsert)[]): Promise<void> {
    if (rows.length === 0) return;
    await db.insert(pfLedger).values(rows);
  }

  async ledger(accountId: number, limit = 200): Promise<PfLedgerEntry[]> {
    return db
      .select()
      .from(pfLedger)
      .where(eq(pfLedger.accountId, accountId))
      .orderBy(desc(pfLedger.createdAt))
      .limit(limit);
  }

  async ledgerBalance(accountId: number, account: string): Promise<number> {
    const [row] = await db
      .select({
        bal: sql<number>`coalesce(sum(case when ${pfLedger.direction} = 'CREDIT' then ${pfLedger.amount} else -${pfLedger.amount} end), 0)`,
      })
      .from(pfLedger)
      .where(and(eq(pfLedger.accountId, accountId), eq(pfLedger.account, account)));
    return row?.bal ?? 0;
  }

  // ---- Snapshots (immutable, append-only) ----
  async saveSnapshot(row: typeof pfSnapshots.$inferInsert): Promise<PfSnapshot> {
    const [saved] = await db.insert(pfSnapshots).values(row).returning();
    return saved;
  }

  async snapshots(accountId: number, limit = 200): Promise<PfSnapshot[]> {
    return db
      .select()
      .from(pfSnapshots)
      .where(eq(pfSnapshots.accountId, accountId))
      .orderBy(desc(pfSnapshots.createdAt))
      .limit(limit);
  }

  async lastSnapshot(accountId: number): Promise<PfSnapshot | undefined> {
    const [row] = await db
      .select()
      .from(pfSnapshots)
      .where(eq(pfSnapshots.accountId, accountId))
      .orderBy(desc(pfSnapshots.createdAt))
      .limit(1);
    return row;
  }
}

export const tradingRepository = singleton("trading.repository", () => new TradingRepository());
