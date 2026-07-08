// AITradeMinds — Portfolio Engine. Positions, realized/unrealized PnL, exposure,
// buying power, sector concentration. Reuses trading repo + live quotes.
import { singleton } from "@/kernel";
import { eventBus } from "@/modules/market_data/core/event-bus";
import { providerManager } from "@/modules/market_data/providers/provider-manager";
import { symbolMaster } from "@/modules/market_data/services/symbol-master";
import { tradingRepository } from "./repository";
import type { TradeFill } from "@/db/schema";

export interface PortfolioSnapshot {
  accountId: number;
  cash: number;
  realizedPnl: number;
  unrealizedPnl: number;
  equity: number;
  investedValue: number;
  buyingPower: number;
  exposurePct: number;
  openPositions: number;
  sectorExposure: Record<string, number>;
  concentration: number; // largest position as % of equity
}

class PortfolioEngine {
  /**
   * Apply a fill to the account + position book (append-only fills, mutable
   * position aggregate). Returns realized PnL delta from this fill (if closing).
   */
  async applyFill(fill: TradeFill, product: string): Promise<{ realizedDelta: number }> {
    const existing = await tradingRepository.openPosition(fill.accountId, fill.symbol, product);
    const signedQty = fill.side === "BUY" ? fill.quantity : -fill.quantity;
    let realizedDelta = 0;
    let cashDelta = fill.side === "BUY" ? -fill.quantity * fill.price : fill.quantity * fill.price;

    if (!existing) {
      await tradingRepository.upsertPosition({
        accountId: fill.accountId,
        symbol: fill.symbol,
        product,
        quantity: signedQty,
        avgPrice: fill.price,
        status: "OPEN",
      });
    } else {
      const newQty = existing.quantity + signedQty;
      const sameDir = Math.sign(existing.quantity) === Math.sign(signedQty) || existing.quantity === 0;
      if (sameDir) {
        // Adding to position → weighted average price.
        const totalCost = existing.avgPrice * Math.abs(existing.quantity) + fill.price * Math.abs(signedQty);
        const avg = Math.abs(newQty) > 0 ? totalCost / Math.abs(newQty) : fill.price;
        await tradingRepository.updatePosition(existing.id, { quantity: newQty, avgPrice: +avg.toFixed(4) });
      } else {
        // Reducing/closing → realize PnL on the closed portion.
        const closedQty = Math.min(Math.abs(existing.quantity), Math.abs(signedQty));
        const direction = existing.quantity > 0 ? 1 : -1;
        realizedDelta = +(direction * (fill.price - existing.avgPrice) * closedQty).toFixed(4);
        const remaining = existing.quantity + signedQty;
        if (remaining === 0) {
          await tradingRepository.updatePosition(existing.id, {
            quantity: 0,
            status: "CLOSED",
            realizedPnl: +(existing.realizedPnl + realizedDelta).toFixed(4),
            closedAt: new Date(),
          });
        } else if (Math.sign(remaining) !== Math.sign(existing.quantity)) {
          // Flipped: close old, open new at fill price.
          await tradingRepository.updatePosition(existing.id, {
            quantity: 0,
            status: "CLOSED",
            realizedPnl: +(existing.realizedPnl + realizedDelta).toFixed(4),
            closedAt: new Date(),
          });
          await tradingRepository.upsertPosition({
            accountId: fill.accountId,
            symbol: fill.symbol,
            product,
            quantity: remaining,
            avgPrice: fill.price,
            status: "OPEN",
          });
        } else {
          await tradingRepository.updatePosition(existing.id, {
            quantity: remaining,
            realizedPnl: +(existing.realizedPnl + realizedDelta).toFixed(4),
          });
        }
      }
    }

    await tradingRepository.adjustCash(fill.accountId, +cashDelta.toFixed(4), realizedDelta);
    eventBus.publish("trading", {
      event: realizedDelta !== 0 ? "position.closed" : "position.opened",
      accountId: fill.accountId,
      symbol: fill.symbol,
      ts: Date.now(),
    });
    return { realizedDelta };
  }

  async snapshot(accountId: number): Promise<PortfolioSnapshot> {
    const account = await tradingRepository.getAccount(accountId);
    const openPositions = await tradingRepository.positions(accountId, "OPEN");

    let unrealized = 0;
    let invested = 0;
    const sectorExposure: Record<string, number> = {};
    let largest = 0;

    for (const p of openPositions) {
      if (p.quantity === 0) continue;
      const quote = await providerManager.getQuote(p.symbol, p.exchange as "NSE" | "BSE");
      const marketValue = Math.abs(p.quantity) * quote.ltp;
      invested += marketValue;
      const direction = p.quantity > 0 ? 1 : -1;
      unrealized += direction * (quote.ltp - p.avgPrice) * Math.abs(p.quantity);
      largest = Math.max(largest, marketValue);
      const sym = await symbolMaster.get(p.symbol, p.exchange);
      const sector = sym?.sector ?? "Unknown";
      sectorExposure[sector] = (sectorExposure[sector] ?? 0) + marketValue;
    }

    const cash = account?.cash ?? 0;
    const realizedPnl = account?.realizedPnl ?? 0;
    const equity = +(cash + invested + unrealized).toFixed(2);
    const startBalance = account?.startingBalance ?? 1;

    return {
      accountId,
      cash: +cash.toFixed(2),
      realizedPnl: +realizedPnl.toFixed(2),
      unrealizedPnl: +unrealized.toFixed(2),
      equity,
      investedValue: +invested.toFixed(2),
      buyingPower: +cash.toFixed(2),
      exposurePct: +((invested / startBalance) * 100).toFixed(2),
      openPositions: openPositions.filter((p) => p.quantity !== 0).length,
      sectorExposure: Object.fromEntries(
        Object.entries(sectorExposure).map(([k, v]) => [k, +v.toFixed(2)]),
      ),
      concentration: equity > 0 ? +((largest / equity) * 100).toFixed(2) : 0,
    };
  }
}

export const portfolioEngine = singleton("trading.portfolio", () => new PortfolioEngine());
