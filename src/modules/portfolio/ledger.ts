// AITradeMinds — Portfolio Ledger. Append-only double-entry accounting.
// Records the cash/position/PnL legs of every economic event. Reuses the single
// tradingRepository. Never mutates history.
import { singleton } from "@/kernel";
import { eventBus } from "@/modules/market_data/core/event-bus";
import { tradingRepository } from "@/modules/trading";
import type { TradeFill } from "@/db/schema";

export type LedgerEntryType =
  | "TRADE"
  | "FEE"
  | "TAX"
  | "CHARGE"
  | "DIVIDEND"
  | "BONUS"
  | "SPLIT"
  | "RIGHTS"
  | "INTEREST"
  | "MARGIN"
  | "SETTLEMENT"
  | "DEPOSIT";

class PortfolioLedger {
  /** Record the double-entry legs for a trade fill (+ optional fees/taxes). */
  async recordFill(fill: TradeFill, opts: { fees?: number; taxes?: number } = {}): Promise<void> {
    const gross = fill.quantity * fill.price;
    const fees = opts.fees ?? +(gross * 0.0003).toFixed(2); // brokerage proxy
    const taxes = opts.taxes ?? +(gross * (fill.side === "SELL" ? 0.00025 : 0)).toFixed(2); // STT on sell

    const cashBalance = await tradingRepository.ledgerBalance(fill.accountId, "CASH");
    const rows = [];

    // BUY: cash debit, position credit. SELL: cash credit, position debit.
    if (fill.side === "BUY") {
      rows.push({ accountId: fill.accountId, entryType: "TRADE" as const, account: "CASH", direction: "DEBIT", amount: gross, symbol: fill.symbol, refType: "FILL", refId: String(fill.id), balanceAfter: +(cashBalance - gross).toFixed(2) });
      rows.push({ accountId: fill.accountId, entryType: "TRADE" as const, account: "POSITION", direction: "CREDIT", amount: gross, symbol: fill.symbol, refType: "FILL", refId: String(fill.id) });
    } else {
      rows.push({ accountId: fill.accountId, entryType: "TRADE" as const, account: "CASH", direction: "CREDIT", amount: gross, symbol: fill.symbol, refType: "FILL", refId: String(fill.id), balanceAfter: +(cashBalance + gross).toFixed(2) });
      rows.push({ accountId: fill.accountId, entryType: "TRADE" as const, account: "POSITION", direction: "DEBIT", amount: gross, symbol: fill.symbol, refType: "FILL", refId: String(fill.id) });
    }
    if (fees > 0) rows.push({ accountId: fill.accountId, entryType: "FEE" as const, account: "FEES", direction: "DEBIT", amount: fees, symbol: fill.symbol, refType: "FILL", refId: String(fill.id) });
    if (taxes > 0) rows.push({ accountId: fill.accountId, entryType: "TAX" as const, account: "TAX", direction: "DEBIT", amount: taxes, symbol: fill.symbol, refType: "FILL", refId: String(fill.id) });

    await tradingRepository.appendLedger(rows);
    eventBus.publish("trading", {
      event: "portfolio.ledger.updated",
      accountId: fill.accountId,
      symbol: fill.symbol,
      message: `${fill.side} ${fill.quantity}@${fill.price} fees=${fees}`,
      ts: Date.now(),
    });
  }

  /** Record a corporate-action ledger entry (dividend/bonus/split/rights/interest). */
  async recordCorporateAction(
    accountId: number,
    entryType: LedgerEntryType,
    symbol: string,
    amount: number,
    note?: string,
  ): Promise<void> {
    const direction = amount >= 0 ? "CREDIT" : "DEBIT";
    await tradingRepository.appendLedger([
      { accountId, entryType, account: "CASH", direction, amount: Math.abs(amount), symbol, refType: "CORP_ACTION", note },
    ]);
    eventBus.publish("trading", {
      event: "portfolio.ledger.updated",
      accountId,
      symbol,
      message: `${entryType} ${amount}`,
      ts: Date.now(),
    });
  }

  async statement(accountId: number, limit = 200) {
    const entries = await tradingRepository.ledger(accountId, limit);
    const [cash, fees, tax] = await Promise.all([
      tradingRepository.ledgerBalance(accountId, "CASH"),
      tradingRepository.ledgerBalance(accountId, "FEES"),
      tradingRepository.ledgerBalance(accountId, "TAX"),
    ]);
    return { entries, balances: { cash: +cash.toFixed(2), fees: +fees.toFixed(2), tax: +tax.toFixed(2) } };
  }
}

export const portfolioLedger = singleton("portfolio.ledger", () => new PortfolioLedger());
