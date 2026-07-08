// AITradeMinds — Confidence Calibration. Maps raw model confidence to
// statistically-calibrated probability using historical reliability buckets.
import { singleton } from "@/kernel";
import { brainRepository } from "./repository";

export function confidenceBucket(confidence: number): number {
  return Math.min(9, Math.max(0, Math.floor(confidence * 10)));
}

class ConfidenceCalibration {
  /** Record an observed prediction outcome for calibration. */
  async observe(
    modelKey: string,
    regime: string,
    confidence: number,
    correct: boolean,
  ): Promise<void> {
    await brainRepository.recordCalibration({
      modelKey,
      regime,
      bucket: confidenceBucket(confidence),
      correct,
    });
  }

  /**
   * Return calibrated probability for a raw confidence given history.
   * Falls back to raw confidence when insufficient samples (Laplace-smoothed).
   */
  async calibrate(modelKey: string, regime: string, confidence: number): Promise<number> {
    const bucket = confidenceBucket(confidence);
    const rows = await brainRepository.calibration(modelKey, regime);
    const match = rows.find((r) => r.bucket === bucket);
    if (!match || match.predicted < 5) return confidence;
    // Laplace smoothing to avoid 0/1 extremes.
    return +((match.correct + 1) / (match.predicted + 2)).toFixed(4);
  }

  async reliability(modelKey: string): Promise<
    Array<{ bucket: number; regime: string; predicted: number; accuracy: number }>
  > {
    const rows = await brainRepository.calibration(modelKey);
    return rows.map((r) => ({
      bucket: r.bucket,
      regime: r.regime,
      predicted: r.predicted,
      accuracy: r.predicted ? +(r.correct / r.predicted).toFixed(4) : 0,
    }));
  }
}

export const confidenceCalibration = singleton(
  "brain.calibration",
  () => new ConfidenceCalibration(),
);
