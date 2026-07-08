import { describe, it, expect } from "vitest";
import { sizePosition } from "@/modules/portfolio_intel/sizing";
import { optimize } from "@/modules/portfolio_intel/optimizer";

describe("position sizing", () => {
  it("half-Kelly returns positive size for favorable edge", () => {
    const r = sizePosition({
      method: "FRACTIONAL_KELLY", equity: 1_000_000, price: 100,
      winProbability: 0.6, payoffRatio: 2, atr: 2, volatility: 0.02,
      maxAllocationPct: 20, minAllocationPct: 0, riskPerTradePct: 2,
    });
    expect(r.allocationPct).toBeGreaterThan(0);
    expect(r.allocationPct).toBeLessThanOrEqual(20);
    expect(r.quantity).toBeGreaterThan(0);
  });

  it("respects the max allocation cap", () => {
    const r = sizePosition({
      method: "FIXED_RISK", equity: 1_000_000, price: 100,
      winProbability: 0.9, payoffRatio: 5, atr: 1, volatility: 0.01,
      maxAllocationPct: 5, minAllocationPct: 0, riskPerTradePct: 50,
    });
    expect(r.allocationPct).toBeLessThanOrEqual(5);
  });
});

describe("portfolio optimizer", () => {
  const assets = [
    { symbol: "A", expectedReturn: 0.02, volatility: 0.01, score: 0.5 },
    { symbol: "B", expectedReturn: 0.01, volatility: 0.04, score: 0.3 },
  ];

  it("equal weight sums to 1", () => {
    const r = optimize("EQUAL_WEIGHT", assets);
    const sum = r.weights.reduce((a, w) => a + w.weight, 0);
    expect(sum).toBeCloseTo(1, 4);
    expect(r.weights[0].weight).toBeCloseTo(0.5, 4);
  });

  it("min variance favors the lower-vol asset", () => {
    const r = optimize("MIN_VARIANCE", assets);
    const a = r.weights.find((w) => w.symbol === "A")!;
    const b = r.weights.find((w) => w.symbol === "B")!;
    expect(a.weight).toBeGreaterThan(b.weight);
    expect(r.diversificationScore).toBeGreaterThan(0);
  });

  it("handles empty asset list", () => {
    const r = optimize("MEAN_VARIANCE", []);
    expect(r.weights).toHaveLength(0);
  });
});
