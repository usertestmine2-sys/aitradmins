// AITradeMinds — Position Sizing. Kelly, fractional Kelly, ATR, volatility,
// fixed-risk. Pure deterministic math. Returns quantity + capital bounded by caps.

export type SizingMethod =
  | "FRACTIONAL_KELLY"
  | "ATR"
  | "VOLATILITY"
  | "FIXED_RISK"
  | "RISK_PARITY";

export interface SizingInput {
  method: SizingMethod;
  equity: number;
  price: number;
  winProbability: number; // 0..1 (from calibrated confidence)
  payoffRatio: number; // avg win / avg loss (>0)
  atr: number;
  volatility: number; // fractional (e.g. 0.02)
  maxAllocationPct: number; // cap % of equity
  minAllocationPct: number;
  riskPerTradePct: number; // for FIXED_RISK / ATR stop
}

export interface SizingResult {
  method: SizingMethod;
  capital: number;
  quantity: number;
  allocationPct: number;
  rationale: string;
}

// Kelly fraction f* = p - (1-p)/b  (b = payoff ratio). Capped, fractional.
function kellyFraction(p: number, b: number): number {
  if (b <= 0) return 0;
  return Math.max(0, p - (1 - p) / b);
}

export function sizePosition(input: SizingInput): SizingResult {
  const {
    method, equity, price, winProbability, payoffRatio, atr, volatility,
    maxAllocationPct, minAllocationPct, riskPerTradePct,
  } = input;
  let allocationPct = 0;
  let rationale = "";

  switch (method) {
    case "FRACTIONAL_KELLY": {
      const kelly = kellyFraction(winProbability, payoffRatio);
      allocationPct = kelly * 0.5 * 100; // half-Kelly for safety
      rationale = `Half-Kelly f*=${(kelly * 100).toFixed(1)}% (p=${winProbability.toFixed(2)}, b=${payoffRatio.toFixed(2)})`;
      break;
    }
    case "ATR": {
      // Risk riskPerTradePct of equity with an ATR-based stop (2*ATR).
      const riskCapital = (riskPerTradePct / 100) * equity;
      const stop = 2 * atr;
      const qty = stop > 0 ? riskCapital / stop : 0;
      allocationPct = ((qty * price) / equity) * 100;
      rationale = `ATR stop 2*${atr.toFixed(2)}, risk ${riskPerTradePct}% equity`;
      break;
    }
    case "VOLATILITY": {
      // Inverse-volatility sizing: lower vol → larger size.
      const target = 0.02; // target 2% position volatility
      const scale = volatility > 0 ? Math.min(1, target / volatility) : 0.5;
      allocationPct = scale * maxAllocationPct;
      rationale = `Inverse-vol scale ${scale.toFixed(2)} (vol ${(volatility * 100).toFixed(1)}%)`;
      break;
    }
    case "FIXED_RISK": {
      allocationPct = riskPerTradePct;
      rationale = `Fixed ${riskPerTradePct}% of equity`;
      break;
    }
    case "RISK_PARITY": {
      // Placeholder for single-asset context: inverse-vol equal-risk weight.
      const scale = volatility > 0 ? Math.min(1, 0.02 / volatility) : 0.5;
      allocationPct = scale * maxAllocationPct;
      rationale = `Risk-parity inverse-vol weight ${scale.toFixed(2)}`;
      break;
    }
  }

  allocationPct = Math.max(minAllocationPct, Math.min(maxAllocationPct, allocationPct));
  const capital = +((allocationPct / 100) * equity).toFixed(2);
  const quantity = price > 0 ? Math.floor(capital / price) : 0;

  return {
    method,
    capital,
    quantity,
    allocationPct: +allocationPct.toFixed(2),
    rationale,
  };
}
