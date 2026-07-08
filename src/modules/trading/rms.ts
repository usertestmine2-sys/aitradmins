// AITradeMinds — Risk Management System. DETERMINISTIC, explainable, un-bypassable.
// Every order must pass RMS before OMS submits it. No AI here — pure rules.
import { logger, singleton } from "@/kernel";
import { eventBus } from "@/modules/market_data/core/event-bus";
import { symbolMaster } from "@/modules/market_data/services/symbol-master";
import { tradingRepository } from "./repository";
import type { ProviderQuote } from "@/modules/market_data/providers/provider-manager";

export interface RiskLimits {
  maxCapitalPerTradePct: number; // % of starting balance
  maxPortfolioExposurePct: number;
  maxLossPerDayPct: number;
  maxConcurrentTrades: number;
  maxSpreadPct: number; // liquidity/spread filter
}

export const DEFAULT_LIMITS: RiskLimits = {
  maxCapitalPerTradePct: 20,
  maxPortfolioExposurePct: 100,
  maxLossPerDayPct: 5,
  maxConcurrentTrades: 10,
  maxSpreadPct: 1.5,
};

export interface RiskContext {
  accountId: number;
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  quote: ProviderQuote;
  limits?: Partial<RiskLimits>;
}

export interface RiskResult {
  decision: "APPROVED" | "REJECTED";
  rulesPassed: string[];
  rulesFailed: string[];
  detail: string;
}

class RiskEngine {
  async evaluate(ctx: RiskContext): Promise<RiskResult> {
    const limits = { ...DEFAULT_LIMITS, ...(ctx.limits ?? {}) };
    const passed: string[] = [];
    const failed: string[] = [];

    const account = await tradingRepository.getAccount(ctx.accountId);
    if (!account) {
      return this.finalize(ctx, ["ACCOUNT_EXISTS"], ["ACCOUNT_MISSING"], "Account not found");
    }

    const notional = ctx.quantity * ctx.quote.ltp;
    const symbol = await symbolMaster.get(ctx.symbol, ctx.quote.exchange);

    // 1) Max capital per trade
    const maxCapital = (limits.maxCapitalPerTradePct / 100) * account.startingBalance;
    if (notional <= maxCapital) passed.push("MAX_CAPITAL_PER_TRADE");
    else failed.push(`MAX_CAPITAL_PER_TRADE(${notional.toFixed(0)}>${maxCapital.toFixed(0)})`);

    // 2) Buying power (BUY only)
    if (ctx.side === "SELL" || notional <= account.cash) passed.push("BUYING_POWER");
    else failed.push(`BUYING_POWER(need ${notional.toFixed(0)}, have ${account.cash.toFixed(0)})`);

    // 3) Max concurrent trades
    const openCount = await tradingRepository.openPositionCount(ctx.accountId);
    if (openCount < limits.maxConcurrentTrades) passed.push("MAX_CONCURRENT_TRADES");
    else failed.push(`MAX_CONCURRENT_TRADES(${openCount}>=${limits.maxConcurrentTrades})`);

    // 4) Max loss per day
    const dayRealized = await tradingRepository.dayRealized(ctx.accountId);
    const maxLoss = -(limits.maxLossPerDayPct / 100) * account.startingBalance;
    if (dayRealized >= maxLoss) passed.push("MAX_LOSS_PER_DAY");
    else failed.push(`MAX_LOSS_PER_DAY(${dayRealized.toFixed(0)}<${maxLoss.toFixed(0)})`);

    // 5) Spread / liquidity filter
    const spread = ctx.quote.ask - ctx.quote.bid;
    const spreadPct = ctx.quote.ltp > 0 ? (spread / ctx.quote.ltp) * 100 : 100;
    if (spreadPct <= limits.maxSpreadPct) passed.push("SPREAD_FILTER");
    else failed.push(`SPREAD_FILTER(${spreadPct.toFixed(2)}%>${limits.maxSpreadPct}%)`);

    // 6) Circuit filter (reject at circuit bands)
    if (ctx.quote.ltp < ctx.quote.upperCircuit && ctx.quote.ltp > ctx.quote.lowerCircuit) {
      passed.push("CIRCUIT_FILTER");
    } else {
      failed.push("CIRCUIT_FILTER(at circuit band)");
    }

    // 7) Freeze quantity (exchange restriction)
    if (symbol && symbol.freezeQty > 0 && ctx.quantity > symbol.freezeQty) {
      failed.push(`FREEZE_QTY(${ctx.quantity}>${symbol.freezeQty})`);
    } else {
      passed.push("FREEZE_QTY");
    }

    // 8) Quantity sanity
    if (ctx.quantity > 0 && Number.isInteger(ctx.quantity)) passed.push("QUANTITY_VALID");
    else failed.push("QUANTITY_VALID");

    const detail = failed.length === 0
      ? `All ${passed.length} risk rules passed`
      : `Failed: ${failed.join(", ")}`;
    return this.finalize(ctx, passed, failed, detail);
  }

  private async finalize(
    ctx: RiskContext,
    passed: string[],
    failed: string[],
    detail: string,
  ): Promise<RiskResult> {
    const decision = failed.length === 0 ? "APPROVED" : "REJECTED";
    await tradingRepository.recordRisk({
      accountId: ctx.accountId,
      symbol: ctx.symbol,
      decision,
      rulesPassed: passed,
      rulesFailed: failed,
      detail,
    });
    if (decision === "REJECTED") {
      eventBus.publish("trading", {
        event: "risk.rejected",
        accountId: ctx.accountId,
        symbol: ctx.symbol,
        message: detail,
        ts: Date.now(),
      });
      logger.warn("risk.rejected", { symbol: ctx.symbol, failed });
    }
    return { decision, rulesPassed: passed, rulesFailed: failed, detail };
  }
}

export const riskEngine = singleton("trading.rms", () => new RiskEngine());
