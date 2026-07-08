import { describe, it, expect } from "vitest";
import { paperEngine } from "@/modules/trading/paper-engine";
import type { ProviderQuote } from "@/modules/market_data/providers/provider-manager";

function quote(overrides: Partial<ProviderQuote> = {}): ProviderQuote {
  return {
    symbol: "TEST",
    exchange: "NSE",
    ltp: 100,
    open: 100,
    high: 101,
    low: 99,
    close: 100,
    prevClose: 100,
    volume: 100000,
    oi: 0,
    bid: 99.95,
    ask: 100.05,
    upperCircuit: 110,
    lowerCircuit: 90,
    ts: 1_700_000_000_000,
    provider: "SIMULATION",
    ...overrides,
  };
}

describe("paper engine (deterministic)", () => {
  it("fills a market BUY at/above ask with slippage", () => {
    const fill = paperEngine.simulate({
      symbol: "TEST", side: "BUY", quantity: 100, orderType: "MARKET", quote: quote(),
    });
    expect(fill.status).toBe("FILLED");
    expect(fill.filledQuantity).toBe(100);
    expect(fill.price).toBeGreaterThanOrEqual(fill.expectedPrice);
  });

  it("is deterministic for identical inputs", () => {
    const a = paperEngine.simulate({ symbol: "TEST", side: "BUY", quantity: 50, orderType: "MARKET", quote: quote() });
    const b = paperEngine.simulate({ symbol: "TEST", side: "BUY", quantity: 50, orderType: "MARKET", quote: quote() });
    expect(a.price).toBe(b.price);
    expect(a.latencyMs).toBe(b.latencyMs);
  });

  it("rejects a non-marketable LIMIT buy", () => {
    const fill = paperEngine.simulate({
      symbol: "TEST", side: "BUY", quantity: 10, orderType: "LIMIT", limitPrice: 90, quote: quote(),
    });
    expect(fill.status).toBe("REJECTED");
    expect(fill.filledQuantity).toBe(0);
  });

  it("does not trigger an untriggered SL", () => {
    const fill = paperEngine.simulate({
      symbol: "TEST", side: "SELL", quantity: 10, orderType: "SL", triggerPrice: 90, quote: quote(),
    });
    expect(fill.status).toBe("REJECTED");
  });
});
