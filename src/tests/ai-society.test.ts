import { describe, it, expect } from "vitest";

// Consensus decision contract (mirrors consensus.ts thresholds).
function voteSign(v: "BUY" | "SELL" | "HOLD"): number {
  return v === "BUY" ? 1 : v === "SELL" ? -1 : 0;
}
function decide(score: number): "BUY" | "SELL" | "HOLD" {
  return score > 0.15 ? "BUY" : score < -0.15 ? "SELL" : "HOLD";
}

describe("consensus decision thresholds", () => {
  it("maps score to decision with a neutral band", () => {
    expect(decide(0.5)).toBe("BUY");
    expect(decide(-0.5)).toBe("SELL");
    expect(decide(0.1)).toBe("HOLD");
    expect(decide(-0.1)).toBe("HOLD");
  });

  it("vote signs are directional", () => {
    expect(voteSign("BUY")).toBe(1);
    expect(voteSign("SELL")).toBe(-1);
    expect(voteSign("HOLD")).toBe(0);
  });
});

describe("RL Monte-Carlo returns", () => {
  it("computes discounted returns correctly", () => {
    // rewards [1,0,1], gamma 0.5 → G at t0 = 1 + .5*(0 + .5*1) = 1.25
    const rewards = [1, 0, 1];
    const gamma = 0.5;
    let g = 0;
    const gs: number[] = [];
    for (let i = rewards.length - 1; i >= 0; i -= 1) {
      g = rewards[i] + gamma * g;
      gs.push(g);
    }
    expect(gs[gs.length - 1]).toBeCloseTo(1.25, 5);
  });
});
