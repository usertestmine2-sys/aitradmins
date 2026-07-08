// AITradeMinds — Logistic Regression model + evaluation. Real, deterministic math.
// Trained via batch gradient descent on engineered features. No external ML lib
// (built-in only, per dependency policy). Weights are portable JSON (registry-safe).
import { createHash } from "node:crypto";
import type { LabeledRow } from "./dataset-builder";

export interface TrainConfig {
  epochs?: number;
  learningRate?: number;
  l2?: number;
}

export interface EvalMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  winRate: number;
  profitFactor: number;
  sharpe: number;
  sortino: number;
  maxDrawdown: number;
  expectancy: number;
  avgReward: number;
  confidenceCalibration: number;
  samples: number;
}

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

function vectorize(row: LabeledRow, featureNames: string[]): number[] {
  return featureNames.map((n) => {
    const v = row.features[n];
    return Number.isFinite(v) ? v : 0;
  });
}

export interface TrainedModel {
  weights: number[]; // [bias, w1..wn]
  featureNames: string[];
  hash: string;
}

/** Train logistic regression. weights[0] = bias. Deterministic (fixed init). */
export function trainLogistic(
  rows: LabeledRow[],
  featureNames: string[],
  cfg: TrainConfig = {},
): TrainedModel {
  const epochs = cfg.epochs ?? 200;
  const lr = cfg.learningRate ?? 0.05;
  const l2 = cfg.l2 ?? 0.001;
  const n = featureNames.length;
  const weights = new Array(n + 1).fill(0); // deterministic zero init

  if (rows.length === 0) {
    return { weights, featureNames, hash: hashWeights(weights, featureNames) };
  }

  for (let epoch = 0; epoch < epochs; epoch += 1) {
    const grad = new Array(n + 1).fill(0);
    for (const row of rows) {
      const x = vectorize(row, featureNames);
      let z = weights[0];
      for (let j = 0; j < n; j += 1) z += weights[j + 1] * x[j];
      const pred = sigmoid(z);
      const err = pred - row.label;
      grad[0] += err;
      for (let j = 0; j < n; j += 1) grad[j + 1] += err * x[j];
    }
    const m = rows.length;
    weights[0] -= lr * (grad[0] / m);
    for (let j = 1; j <= n; j += 1) {
      weights[j] -= lr * (grad[j] / m + l2 * weights[j]);
    }
  }
  return { weights, featureNames, hash: hashWeights(weights, featureNames) };
}

export function predict(model: TrainedModel, row: LabeledRow): number {
  const x = vectorize(row, model.featureNames);
  let z = model.weights[0];
  for (let j = 0; j < model.featureNames.length; j += 1) z += model.weights[j + 1] * x[j];
  return sigmoid(z);
}

function hashWeights(weights: number[], featureNames: string[]): string {
  return createHash("sha256")
    .update(JSON.stringify({ weights: weights.map((w) => +w.toFixed(6)), featureNames }))
    .digest("hex")
    .slice(0, 16);
}

/** Evaluate classification + trading metrics on a holdout set. */
export function evaluate(model: TrainedModel, rows: LabeledRow[]): EvalMetrics {
  if (rows.length === 0) {
    return {
      accuracy: 0, precision: 0, recall: 0, f1: 0, winRate: 0, profitFactor: 0,
      sharpe: 0, sortino: 0, maxDrawdown: 0, expectancy: 0, avgReward: 0,
      confidenceCalibration: 0, samples: 0,
    };
  }
  let tp = 0, fp = 0, tn = 0, fn = 0;
  const tradeReturns: number[] = [];
  let calibErr = 0;

  for (const row of rows) {
    const p = predict(model, row);
    const predicted = p >= 0.5 ? 1 : 0;
    if (predicted === 1 && row.label === 1) tp += 1;
    else if (predicted === 1 && row.label === 0) fp += 1;
    else if (predicted === 0 && row.label === 0) tn += 1;
    else fn += 1;
    // Simulated trade: take position when model predicts up.
    if (predicted === 1) tradeReturns.push(row.forwardReturn);
    calibErr += Math.abs(p - row.label);
  }

  const accuracy = (tp + tn) / rows.length;
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

  const wins = tradeReturns.filter((r) => r > 0);
  const losses = tradeReturns.filter((r) => r < 0);
  const grossWin = wins.reduce((a, b) => a + b, 0);
  const grossLoss = Math.abs(losses.reduce((a, b) => a + b, 0));
  const winRate = tradeReturns.length ? wins.length / tradeReturns.length : 0;
  const profitFactor = grossLoss === 0 ? (grossWin > 0 ? 99 : 0) : grossWin / grossLoss;

  const mean = tradeReturns.length
    ? tradeReturns.reduce((a, b) => a + b, 0) / tradeReturns.length
    : 0;
  const sd = tradeReturns.length
    ? Math.sqrt(tradeReturns.reduce((a, b) => a + (b - mean) ** 2, 0) / tradeReturns.length)
    : 0;
  const downside = losses.length
    ? Math.sqrt(losses.reduce((a, b) => a + b * b, 0) / losses.length)
    : 0;
  const sharpe = sd === 0 ? 0 : (mean / sd) * Math.sqrt(252);
  const sortino = downside === 0 ? 0 : (mean / downside) * Math.sqrt(252);

  // Max drawdown over the cumulative equity curve of taken trades.
  let equity = 0;
  let peak = 0;
  let maxDd = 0;
  for (const r of tradeReturns) {
    equity += r;
    peak = Math.max(peak, equity);
    maxDd = Math.max(maxDd, peak - equity);
  }

  const avgWin = wins.length ? grossWin / wins.length : 0;
  const avgLoss = losses.length ? grossLoss / losses.length : 0;
  const expectancy = winRate * avgWin - (1 - winRate) * avgLoss;

  return {
    accuracy: +accuracy.toFixed(4),
    precision: +precision.toFixed(4),
    recall: +recall.toFixed(4),
    f1: +f1.toFixed(4),
    winRate: +winRate.toFixed(4),
    profitFactor: +profitFactor.toFixed(4),
    sharpe: +sharpe.toFixed(4),
    sortino: +sortino.toFixed(4),
    maxDrawdown: +maxDd.toFixed(6),
    expectancy: +expectancy.toFixed(6),
    avgReward: +mean.toFixed(6),
    confidenceCalibration: +(1 - calibErr / rows.length).toFixed(4),
    samples: rows.length,
  };
}
