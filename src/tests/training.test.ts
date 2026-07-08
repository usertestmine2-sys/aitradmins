import { describe, it, expect } from "vitest";
import { trainLogistic, evaluate, predict } from "@/modules/training/model";
import type { LabeledRow } from "@/modules/training/dataset-builder";

// Build a linearly-separable synthetic set to prove the trainer actually learns.
function makeRows(n: number): LabeledRow[] {
  const rows: LabeledRow[] = [];
  for (let i = 0; i < n; i += 1) {
    const signal = (i % 2 === 0 ? 1 : -1) * (1 + (i % 5) * 0.1);
    const label = signal > 0 ? 1 : 0;
    rows.push({
      trainingId: "t",
      ts: i,
      features: { momentum: signal, noise: (i % 3) - 1 },
      label,
      forwardReturn: label === 1 ? 0.02 : -0.02,
      regime: "RANGE",
    });
  }
  return rows;
}

describe("training/model", () => {
  it("learns a separable pattern (accuracy > 0.9)", () => {
    const rows = makeRows(200);
    const model = trainLogistic(rows, ["momentum", "noise"], { epochs: 400 });
    const metrics = evaluate(model, rows);
    expect(metrics.accuracy).toBeGreaterThan(0.9);
    expect(metrics.samples).toBe(200);
  });

  it("produces deterministic hashes for identical training", () => {
    const rows = makeRows(50);
    const a = trainLogistic(rows, ["momentum", "noise"], { epochs: 100 });
    const b = trainLogistic(rows, ["momentum", "noise"], { epochs: 100 });
    expect(a.hash).toBe(b.hash);
  });

  it("predicts probabilities in [0,1]", () => {
    const rows = makeRows(20);
    const model = trainLogistic(rows, ["momentum", "noise"], { epochs: 50 });
    for (const r of rows) {
      const p = predict(model, r);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });

  it("handles empty datasets without throwing", () => {
    const model = trainLogistic([], ["a"], {});
    const metrics = evaluate(model, []);
    expect(metrics.samples).toBe(0);
    expect(metrics.accuracy).toBe(0);
  });
});
