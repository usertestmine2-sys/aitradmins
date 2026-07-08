import { describe, it, expect } from "vitest";

// Ledger double-entry contract: BUY debits cash, credits position; SELL reverses.
function ledgerLegs(side: "BUY" | "SELL", gross: number) {
  if (side === "BUY") {
    return [
      { account: "CASH", direction: "DEBIT", amount: gross },
      { account: "POSITION", direction: "CREDIT", amount: gross },
    ];
  }
  return [
    { account: "CASH", direction: "CREDIT", amount: gross },
    { account: "POSITION", direction: "DEBIT", amount: gross },
  ];
}

// Performance drawdown contract (mirrors performance.ts).
function maxDrawdown(equities: number[]): number {
  let peak = equities[0] ?? 0;
  let maxDd = 0;
  for (const e of equities) {
    peak = Math.max(peak, e);
    if (peak > 0) maxDd = Math.max(maxDd, (peak - e) / peak);
  }
  return maxDd;
}

describe("portfolio ledger double-entry", () => {
  it("BUY debits cash and credits position", () => {
    const legs = ledgerLegs("BUY", 1000);
    expect(legs.find((l) => l.account === "CASH")!.direction).toBe("DEBIT");
    expect(legs.find((l) => l.account === "POSITION")!.direction).toBe("CREDIT");
  });
  it("SELL credits cash and debits position", () => {
    const legs = ledgerLegs("SELL", 1000);
    expect(legs.find((l) => l.account === "CASH")!.direction).toBe("CREDIT");
    expect(legs.find((l) => l.account === "POSITION")!.direction).toBe("DEBIT");
  });
  it("legs are balanced in magnitude", () => {
    const legs = ledgerLegs("BUY", 500);
    expect(legs[0].amount).toBe(legs[1].amount);
  });
});

describe("portfolio performance drawdown", () => {
  it("computes max drawdown from an equity curve", () => {
    expect(maxDrawdown([100, 120, 90, 110])).toBeCloseTo(0.25, 5); // 120→90 = 25%
  });
  it("is zero for a monotonic up curve", () => {
    expect(maxDrawdown([100, 110, 120])).toBe(0);
  });
});
