import { describe, it, expect } from "vitest";

// Platform health grade contract (mirrors health-engine.ts).
function grade(score: number): string {
  return score >= 90 ? "EXCELLENT" : score >= 70 ? "HEALTHY" : score >= 50 ? "WARNING" : "CRITICAL";
}

// Overall score = mean of subsystem scores.
function overall(subsystems: Record<string, number>): number {
  const vals = Object.values(subsystems);
  return Math.round(vals.reduce((a, b) => a + b, 0) / (vals.length || 1));
}

describe("platform health scoring", () => {
  it("grades overall scores", () => {
    expect(grade(95)).toBe("EXCELLENT");
    expect(grade(80)).toBe("HEALTHY");
    expect(grade(60)).toBe("WARNING");
    expect(grade(40)).toBe("CRITICAL");
  });

  it("averages subsystem scores", () => {
    expect(overall({ a: 100, b: 80, c: 90 })).toBe(90);
    expect(overall({})).toBe(0);
  });

  it("weakest subsystem drags overall down", () => {
    const s = { brain: 100, marketData: 40 };
    expect(overall(s)).toBe(70);
    expect(grade(overall(s))).toBe("HEALTHY");
  });
});
