// AITradeMinds — Paper Trading Execution. DETERMINISTIC simulation seeded from
// real provider quotes. Models spread, slippage, latency, partial-fill, market
// impact. No fake data — every fill derives from a real quote + deterministic seed.
import type { ProviderQuote } from "@/modules/market_data/providers/provider-manager";

export interface SimFill {
  price: number;
  expectedPrice: number;
  filledQuantity: number;
  slippage: number;
  spread: number;
  latencyMs: number;
  status: "FILLED" | "PARTIAL" | "REJECTED";
}

// Deterministic pseudo-random in [0,1) from a string seed.
function seeded(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (Math.abs(h) % 100000) / 100000;
}

export interface SimInput {
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  orderType: "MARKET" | "LIMIT" | "SL" | "SL_M";
  limitPrice?: number;
  triggerPrice?: number;
  quote: ProviderQuote;
}

class PaperEngine {
  simulate(input: SimInput): SimFill {
    const { quote, side, quantity } = input;
    const spread = +(quote.ask - quote.bid).toFixed(4);
    const seed = seeded(`${input.symbol}:${quote.ts}:${quantity}:${side}`);

    // Expected price: marketable side of book.
    const expectedPrice =
      input.orderType === "LIMIT" && input.limitPrice
        ? input.limitPrice
        : side === "BUY"
          ? quote.ask
          : quote.bid;

    // LIMIT fill probability: only fills if marketable vs current book.
    if (input.orderType === "LIMIT" && input.limitPrice) {
      const marketable = side === "BUY" ? input.limitPrice >= quote.ask : input.limitPrice <= quote.bid;
      if (!marketable) {
        return {
          price: 0,
          expectedPrice,
          filledQuantity: 0,
          slippage: 0,
          spread,
          latencyMs: this.latency(seed),
          status: "REJECTED",
        };
      }
    }

    // SL/SL-M trigger check.
    if ((input.orderType === "SL" || input.orderType === "SL_M") && input.triggerPrice) {
      const triggered = side === "BUY" ? quote.ltp >= input.triggerPrice : quote.ltp <= input.triggerPrice;
      if (!triggered) {
        return {
          price: 0,
          expectedPrice,
          filledQuantity: 0,
          slippage: 0,
          spread,
          latencyMs: this.latency(seed),
          status: "REJECTED",
        };
      }
    }

    // Market impact: larger orders slip more (deterministic, bounded).
    const notional = quantity * quote.ltp;
    const impactBps = Math.min(30, (notional / 1_000_000) * 5); // up to 30 bps
    const slipDir = side === "BUY" ? 1 : -1;
    const slippagePct = (impactBps + seed * 5) / 10000;
    const fillPrice = +(expectedPrice * (1 + slipDir * slippagePct)).toFixed(2);
    const slippage = +(fillPrice - expectedPrice).toFixed(4);

    // Partial fill for very large orders (deterministic).
    const partial = notional > 5_000_000 && seed > 0.7;
    const filledQuantity = partial ? Math.max(1, Math.floor(quantity * 0.6)) : quantity;

    return {
      price: fillPrice,
      expectedPrice: +expectedPrice.toFixed(2),
      filledQuantity,
      slippage,
      spread,
      latencyMs: this.latency(seed),
      status: partial ? "PARTIAL" : "FILLED",
    };
  }

  private latency(seed: number): number {
    // Broker + exchange latency: 20–120ms deterministic.
    return Math.round(20 + seed * 100);
  }
}

export const paperEngine = new PaperEngine();
