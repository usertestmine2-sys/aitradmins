import type { ConsensusResult, MarketContext, ModelOpinion } from "@/lib/brain/types";

/**
 * Consensus Engine — the single point where the AI Society's opinions become
 * one unified recommendation. Inputs per opinion:
 *   stance × confidence × historical-performance weight × evidence factor.
 * Context alignment (majority direction vs market regime) applies a bounded
 * adjustment. Disagreement is measured and preserved, never suppressed.
 */

const NEUTRAL_BAND = 0.05;

export function computeConsensus(
  symbol: string,
  opinions: ModelOpinion[],
  context: MarketContext,
  historicalWeights: Record<string, number>,
): ConsensusResult {
  if (opinions.length === 0) {
    return {
      symbol,
      score: 0,
      agreementPct: 0,
      disagreement: 0,
      avgConfidence: 0,
      evidenceStrength: 0,
      contextAlignment: 0.5,
      opinionCount: 0,
    };
  }

  // Raw weighted score (equal authority × calibrated historical performance).
  const contributions = opinions.map((o) => {
    const weight = historicalWeights[o.model] ?? 1;
    const evidenceFactor = 0.75 + 0.25 * (o.evidenceStrength ?? 0.5);
    return o.stance * o.confidence * weight * evidenceFactor;
  });
  let score = contributions.reduce((a, b) => a + b, 0) / opinions.length;

  // Agreement: share of non-neutral opinions on the majority side.
  const committed = opinions.filter((o) => Math.abs(o.stance) >= NEUTRAL_BAND);
  const bulls = committed.filter((o) => o.stance > 0).length;
  const bears = committed.length - bulls;
  const majoritySign = bulls === bears ? 0 : bulls > bears ? 1 : -1;
  const agreementPct =
    committed.length === 0 ? 0 : (Math.max(bulls, bears) / committed.length) * 100;

  // Disagreement: stance standard deviation.
  const mean = opinions.reduce((a, o) => a + o.stance, 0) / opinions.length;
  const variance = opinions.reduce((a, o) => a + (o.stance - mean) ** 2, 0) / opinions.length;
  const disagreement = Math.sqrt(variance);

  const avgConfidence = opinions.reduce((a, o) => a + o.confidence, 0) / opinions.length;
  const evidenceStrength =
    opinions.reduce((a, o) => a + (o.evidenceStrength ?? 0.5) * o.confidence, 0) /
    Math.max(0.0001, opinions.reduce((a, o) => a + o.confidence, 0));

  // Market context alignment: does the majority agree with the regime?
  const regimeSign = context.regime === "BULLISH" ? 1 : context.regime === "BEARISH" ? -1 : 0;
  const contextAlignment =
    regimeSign === 0 || majoritySign === 0 ? 0.5 : majoritySign === regimeSign ? 1 : 0;

  // Bounded context adjustment: counter-regime consensus is dampened, never erased.
  score = score * (0.85 + 0.15 * contextAlignment);

  return {
    symbol,
    score: clampSigned(round3(score)),
    agreementPct: Math.round(agreementPct * 10) / 10,
    disagreement: round3(disagreement),
    avgConfidence: round3(avgConfidence),
    evidenceStrength: round3(evidenceStrength),
    contextAlignment,
    opinionCount: opinions.length,
  };
}

function clampSigned(v: number): number {
  return Math.max(-1, Math.min(1, v));
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}
