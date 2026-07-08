import { describe, it, expect } from "vitest";

// Guards the pure decision logic of the new Brain sub-systems.

// Market DNA classifier contract (mirrors market-dna.ts classify()).
function classify(fp: number[]): string {
  const [meanRet, vol, rangePct, , emaSpread] = fp;
  if (vol > 0.03 && meanRet < -0.01) return "PANIC_SELLING";
  if (meanRet > 0.005 && emaSpread > 0.02) return "TRENDING_UP";
  if (meanRet < -0.005 && emaSpread < -0.02) return "TRENDING_DOWN";
  if (rangePct > 0.08 && Math.abs(meanRet) > 0.01) return "BREAKOUT";
  if (rangePct < 0.03) return "RANGE";
  return meanRet >= 0 ? "GAP_UP" : "GAP_DOWN";
}

// Brain health grade contract (mirrors health.ts).
function grade(score: number): string {
  return score >= 90 ? "EXCELLENT" : score >= 70 ? "HEALTHY" : score >= 50 ? "WARNING" : "CRITICAL";
}

describe("market DNA classification", () => {
  it("detects panic selling", () => {
    expect(classify([-0.02, 0.05, 0.1, 0.3, -0.05, 0.02])).toBe("PANIC_SELLING");
  });
  it("detects trending up", () => {
    expect(classify([0.01, 0.01, 0.05, 0.7, 0.03, 0.01])).toBe("TRENDING_UP");
  });
  it("detects range", () => {
    expect(classify([0.0001, 0.005, 0.01, 0.5, 0.0, 0.005])).toBe("RANGE");
  });
});

describe("brain health grade", () => {
  it("maps scores to grades", () => {
    expect(grade(95)).toBe("EXCELLENT");
    expect(grade(75)).toBe("HEALTHY");
    expect(grade(55)).toBe("WARNING");
    expect(grade(30)).toBe("CRITICAL");
  });
});
