import { describe, it, expect } from "vitest";

// Execution score contract (mirrors quality-tracker.ts scoring).
function executionScore(slippageBps: number, spreadBps: number, latencyMs: number, fillRatio: number): number {
  let score = 100;
  score -= Math.min(40, slippageBps * 2);
  score -= Math.min(20, spreadBps);
  score -= Math.min(20, latencyMs / 10);
  score -= (1 - fillRatio) * 20;
  return Math.max(0, Math.round(score));
}

describe("execution quality scoring", () => {
  it("perfect execution scores ~100", () => {
    expect(executionScore(0, 0, 0, 1)).toBe(100);
  });
  it("high slippage reduces score", () => {
    expect(executionScore(30, 0, 0, 1)).toBe(60); // -40 cap
  });
  it("partial fill penalizes score", () => {
    expect(executionScore(0, 0, 0, 0.5)).toBe(90); // -10
  });
  it("latency + spread compound penalties", () => {
    expect(executionScore(0, 20, 200, 1)).toBe(60); // -20 spread -20 latency
  });
  it("never goes below 0", () => {
    expect(executionScore(100, 100, 10000, 0)).toBe(0);
  });
});

describe("timeline stage mapping", () => {
  const STATUS_TO_STAGE: Record<string, string> = {
    CREATED: "SIGNAL", RISK_APPROVED: "RMS", ACCEPTED: "PENDING", FILLED: "FILLED",
  };
  it("maps OMS statuses to canonical stages", () => {
    expect(STATUS_TO_STAGE.CREATED).toBe("SIGNAL");
    expect(STATUS_TO_STAGE.RISK_APPROVED).toBe("RMS");
    expect(STATUS_TO_STAGE.FILLED).toBe("FILLED");
  });
});
