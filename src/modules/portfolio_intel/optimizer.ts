// AITradeMinds — Portfolio Optimizer. Deterministic weight allocation across
// candidate assets. Supports equal-weight, min-variance, max-Sharpe, risk-parity,
// mean-variance. Pure math over per-asset expected return + volatility estimates.

export type OptimizerMethod =
  | "EQUAL_WEIGHT"
  | "MIN_VARIANCE"
  | "MAX_SHARPE"
  | "RISK_PARITY"
  | "MEAN_VARIANCE";

export interface AssetEstimate {
  symbol: string;
  expectedReturn: number; // fractional
  volatility: number; // fractional, > 0
  score: number; // consensus score (signed)
}

export interface OptimizedWeight {
  symbol: string;
  weight: number; // 0..1
}

export interface OptimizerResult {
  method: OptimizerMethod;
  weights: OptimizedWeight[];
  expectedReturn: number;
  expectedRisk: number;
  diversificationScore: number;
}

function normalize(weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + Math.max(0, b), 0);
  if (sum <= 0) return weights.map(() => 1 / weights.length);
  return weights.map((w) => Math.max(0, w) / sum);
}

export function optimize(method: OptimizerMethod, assets: AssetEstimate[]): OptimizerResult {
  if (assets.length === 0) {
    return { method, weights: [], expectedReturn: 0, expectedRisk: 0, diversificationScore: 0 };
  }
  let raw: number[];
  switch (method) {
    case "EQUAL_WEIGHT":
      raw = assets.map(() => 1);
      break;
    case "MIN_VARIANCE":
      raw = assets.map((a) => 1 / (a.volatility * a.volatility || 1e-6));
      break;
    case "RISK_PARITY":
      raw = assets.map((a) => 1 / (a.volatility || 1e-6));
      break;
    case "MAX_SHARPE":
      raw = assets.map((a) => Math.max(0, a.expectedReturn) / (a.volatility || 1e-6));
      break;
    case "MEAN_VARIANCE":
    default:
      // Utility = expectedReturn - 0.5 * riskAversion * variance, weighted by score.
      raw = assets.map((a) => {
        const util = a.expectedReturn - 0.5 * 3 * a.volatility * a.volatility;
        return Math.max(0, util) * Math.max(0, a.score + 0.5);
      });
      break;
  }
  const weights = normalize(raw);

  const expectedReturn = assets.reduce((acc, a, i) => acc + weights[i] * a.expectedReturn, 0);
  // Portfolio vol assuming zero cross-correlation (conservative estimate).
  const variance = assets.reduce((acc, a, i) => acc + (weights[i] * a.volatility) ** 2, 0);
  const expectedRisk = Math.sqrt(variance);
  // Diversification: 1 - Herfindahl index (0 concentrated, →1 diversified).
  const hhi = weights.reduce((acc, w) => acc + w * w, 0);
  const diversificationScore = +(1 - hhi).toFixed(4);

  return {
    method,
    weights: assets.map((a, i) => ({ symbol: a.symbol, weight: +weights[i].toFixed(4) })),
    expectedReturn: +expectedReturn.toFixed(6),
    expectedRisk: +expectedRisk.toFixed(6),
    diversificationScore,
  };
}
