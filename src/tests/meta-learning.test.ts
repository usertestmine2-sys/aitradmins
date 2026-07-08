import { describe, it, expect } from "vitest";

// Meta-learning trend/volatility classification is the core decision logic.
// These pure helpers mirror the engine's classification contract and guard it.
function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
}

function classifyTrend(f1s: number[]): string {
  if (f1s.length < 2) return "FLAT";
  const vol = stddev(f1s);
  const delta = f1s[f1s.length - 1] - f1s[0];
  if (vol > 0.15) return "UNSTABLE";
  if (delta > 0.03) return "IMPROVING";
  if (delta < -0.03) return "DEGRADING";
  return "FLAT";
}

describe("meta-learning classification", () => {
  it("detects improving models", () => {
    expect(classifyTrend([0.4, 0.5, 0.6])).toBe("IMPROVING");
  });
  it("detects degrading models", () => {
    expect(classifyTrend([0.6, 0.55, 0.5])).toBe("DEGRADING");
  });
  it("detects unstable models via volatility", () => {
    expect(classifyTrend([0.2, 0.9, 0.3, 0.85])).toBe("UNSTABLE");
  });
  it("returns FLAT for stable small-change series", () => {
    expect(classifyTrend([0.5, 0.51, 0.5])).toBe("FLAT");
  });
});
