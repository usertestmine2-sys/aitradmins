import type {
  IndicatorSnapshot,
  MarketContext,
  PatternResult,
  StrategySignal,
} from "@/lib/brain/types";

/**
 * AI Society — model definitions and per-model analytical reasoning.
 *
 * Each model is an independent analytical entity with an assigned analytical
 * role. Analyzers are pure functions over identical read-only inputs: models
 * cannot see, call, command, or modify one another. Strategy evaluation is
 * NOT hardcoded here — models consult the Strategy Manager's signals for the
 * strategies assigned to them and treat matches as evidence.
 *
 * Model IDs are stable continuations of the AI Brain Core council — existing
 * calibration and learning state carries forward without loss.
 */

export const MODEL_IDS = [
  "trend-model",
  "momentum-model",
  "meanreversion-model",
  "volatility-risk-model",
] as const;
export type ModelId = (typeof MODEL_IDS)[number];

export interface ModelDefinition {
  id: ModelId;
  name: string;
  role: string;
  /** Strategies (from the single Strategy Manager) this model evaluates. */
  assignedStrategyIds: string[];
}

export const MODEL_DEFINITIONS: ModelDefinition[] = [
  {
    id: "trend-model",
    name: "Trend AI",
    role: "Directional trend structure analysis (EMA alignment, price location)",
    assignedStrategyIds: ["nse-trend-momentum"],
  },
  {
    id: "momentum-model",
    name: "Momentum AI",
    role: "Rate-of-change and momentum persistence analysis",
    assignedStrategyIds: ["nse-trend-momentum"],
  },
  {
    id: "meanreversion-model",
    name: "Mean Reversion AI",
    role: "Exhaustion and reversion-to-mean analysis (contrarian)",
    assignedStrategyIds: ["nse-mean-reversion"],
  },
  {
    id: "volatility-risk-model",
    name: "Volatility & Risk AI",
    role: "Tape stability, pattern-conditioned risk assessment",
    assignedStrategyIds: ["nse-breakdown-short"],
  },
];

export interface AnalysisInput {
  indicators: IndicatorSnapshot;
  patterns: PatternResult[];
  context: MarketContext;
  strategySignals: StrategySignal[];
}

export interface RawOpinion {
  stance: number; // -1..1
  confidence: number; // 0..1
  reasoning: string;
  evidence: string[];
  evidenceStrength: number; // 0..1
}

/** Run one model's private reasoning. Pure: no I/O, no shared state. */
export function analyzeAs(definition: ModelDefinition, input: AnalysisInput): RawOpinion {
  const base = baseAnalysis(definition.id, input);

  // Assigned-strategy evaluation: a matched, stance-aligned assigned strategy
  // is corroborating evidence; a matched opposing one tempers confidence.
  const assignedMatches = input.strategySignals.filter(
    (s) => definition.assignedStrategyIds.includes(s.strategyId) && s.matched,
  );
  let { confidence, evidenceStrength } = base;
  const evidence = [...base.evidence];
  for (const match of assignedMatches) {
    if (base.stance !== 0 && match.direction === Math.sign(base.stance)) {
      confidence = Math.min(1, confidence + 0.1);
      evidenceStrength = Math.min(1, evidenceStrength + match.score * 0.3);
      evidence.push(`assigned strategy ${match.strategyId} matched (score ${match.score})`);
    } else if (base.stance !== 0 && match.direction === -Math.sign(base.stance)) {
      confidence = Math.max(0.1, confidence - 0.1);
      evidence.push(`assigned strategy ${match.strategyId} matched AGAINST stance`);
    }
  }

  return { ...base, confidence, evidenceStrength, evidence };
}

function baseAnalysis(modelId: ModelId, input: AnalysisInput): RawOpinion {
  const { indicators: ind, patterns, context } = input;

  switch (modelId) {
    case "trend-model": {
      let stance = 0;
      const evidence: string[] = [];
      if (ind.ema20 != null && ind.ema50 != null) {
        const spread = ((ind.ema20 - ind.ema50) / ind.ema50) * 100;
        stance = clampSigned(spread / 2);
        evidence.push(`EMA20/50 spread ${spread.toFixed(2)}%`);
        if (ind.close > ind.ema20) {
          stance = clampSigned(stance + 0.2);
          evidence.push("price above EMA20");
        } else {
          stance = clampSigned(stance - 0.2);
          evidence.push("price below EMA20");
        }
      }
      return {
        stance,
        confidence: ind.ema50 != null ? 0.8 : 0.3,
        reasoning: evidence.join("; ") || "insufficient trend history",
        evidence,
        evidenceStrength: ind.ema50 != null ? clamp01(Math.abs(stance)) : 0.1,
      };
    }
    case "momentum-model": {
      const roc = ind.roc10;
      const stance = roc == null ? 0 : clampSigned(roc / 6);
      const evidence = roc == null ? [] : [`10d ROC ${roc.toFixed(2)}%`];
      return {
        stance,
        confidence: roc == null ? 0.2 : Math.min(0.85, 0.4 + Math.abs(roc) / 10),
        reasoning: roc == null ? "insufficient momentum history" : `10d ROC ${roc.toFixed(2)}%`,
        evidence,
        evidenceStrength: roc == null ? 0.1 : clamp01(Math.abs(roc) / 6),
      };
    }
    case "meanreversion-model": {
      const rsi = ind.rsi14;
      let stance = 0;
      let reasoning = "RSI neutral zone — no reversion edge";
      const evidence: string[] = [];
      if (rsi != null) {
        if (rsi <= 35) {
          stance = clampSigned((35 - rsi) / 20);
          reasoning = `RSI14 ${rsi.toFixed(1)} oversold — reversion long bias`;
          evidence.push(reasoning);
        } else if (rsi >= 65) {
          stance = clampSigned(-(rsi - 65) / 20);
          reasoning = `RSI14 ${rsi.toFixed(1)} overbought — reversion short bias`;
          evidence.push(reasoning);
        }
      }
      return {
        stance,
        confidence: rsi == null ? 0.2 : stance === 0 ? 0.3 : 0.7,
        reasoning,
        evidence,
        evidenceStrength: clamp01(Math.abs(stance)),
      };
    }
    case "volatility-risk-model": {
      const vol = ind.volatilityPct;
      const patternBias = patterns.reduce((acc, p) => acc + p.direction * p.strength, 0);
      const calm = vol != null && vol < 2.5;
      const stance = clampSigned(patternBias * (calm ? 0.5 : 0.2));
      const evidence =
        vol == null
          ? []
          : [
              `daily vol ${vol.toFixed(2)}% (${calm ? "orderly" : "elevated"})`,
              `pattern bias ${patternBias.toFixed(2)}`,
            ];
      return {
        stance,
        confidence: vol == null ? 0.2 : calm ? 0.6 : 0.35,
        reasoning:
          vol == null
            ? "volatility unknown"
            : `${evidence.join("; ")}; regime ${context.regime}`,
        evidence,
        evidenceStrength: clamp01(Math.abs(patternBias) * (calm ? 0.7 : 0.4)),
      };
    }
  }
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function clampSigned(v: number): number {
  return Math.max(-1, Math.min(1, v));
}
