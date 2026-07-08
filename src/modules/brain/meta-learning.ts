// AITradeMinds — Meta-Learning. The Brain learns HOW it learns.
// Reads existing model/lesson/dataset/calibration history (reuses training +
// brain repositories) and emits RECOMMENDATIONS ONLY. Never auto-activates.
import { logger, singleton } from "@/kernel";
import { eventBus } from "@/modules/market_data/core/event-bus";
import { trainingRepository, type ModelKey } from "@/modules/training";
import type { AiModel } from "@/db/schema";
import { brainRepository } from "./repository";

export interface MetaAnalysis {
  modelKey: string;
  versions: number;
  latestF1: number;
  f1Trend: "IMPROVING" | "DEGRADING" | "FLAT" | "UNSTABLE";
  f1Volatility: number;
  adaptationSpeed: number; // avg F1 gain per version (higher = adapts faster)
  bestFeatureVersion: string | null;
  bestReplaySize: number | null;
  weakestRegime: string | null;
  recommendations: Array<{ kind: string; severity: string; rationale: string }>;
}

function metric(m: AiModel, key: string): number {
  const v = (m.metrics as Record<string, number>)[key];
  return Number.isFinite(v) ? v : 0;
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
}

class MetaLearning {
  /** Analyze one model key's learning history and record recommendations. */
  async analyze(modelKey: ModelKey): Promise<MetaAnalysis> {
    // Reuse existing repositories — no duplicate data access.
    const models = (await trainingRepository.listModels(modelKey, 100)).sort(
      (a, b) => a.version - b.version,
    );
    const lessons = await trainingRepository.listLessons(modelKey, 500);
    const calibration = await brainRepository.calibration(modelKey);

    const f1s = models.map((m) => metric(m, "f1"));
    const latestF1 = f1s.length ? f1s[f1s.length - 1] : 0;
    const f1Volatility = +stddev(f1s).toFixed(4);

    // Trend: compare first vs last third of versions.
    let f1Trend: MetaAnalysis["f1Trend"] = "FLAT";
    if (f1s.length >= 2) {
      const delta = f1s[f1s.length - 1] - f1s[0];
      if (f1Volatility > 0.15) f1Trend = "UNSTABLE";
      else if (delta > 0.03) f1Trend = "IMPROVING";
      else if (delta < -0.03) f1Trend = "DEGRADING";
    }

    // Adaptation speed: average per-version F1 gain.
    let adaptationSpeed = 0;
    for (let i = 1; i < f1s.length; i += 1) adaptationSpeed += f1s[i] - f1s[i - 1];
    adaptationSpeed = f1s.length > 1 ? +(adaptationSpeed / (f1s.length - 1)).toFixed(4) : 0;

    // Which dataset (replay size) produced the best model.
    let bestReplaySize: number | null = null;
    let bestFeatureVersion: string | null = null;
    if (models.length) {
      const best = [...models].sort((a, b) => metric(b, "f1") - metric(a, "f1"))[0];
      const ds = await trainingRepository.getDataset(best.datasetTrainingId);
      bestReplaySize = ds?.rowCount ?? null;
      bestFeatureVersion = ds?.featureVersion ?? null;
    }

    // Which regime performs worst (needs retraining).
    const regimeStats = new Map<string, { wins: number; total: number }>();
    for (const l of lessons) {
      const r = l.regime ?? "UNKNOWN";
      const s = regimeStats.get(r) ?? { wins: 0, total: 0 };
      s.total += 1;
      if (l.result === "WIN") s.wins += 1;
      regimeStats.set(r, s);
    }
    let weakestRegime: string | null = null;
    let worstRate = 1;
    for (const [regime, s] of regimeStats.entries()) {
      if (s.total < 3) continue;
      const rate = s.wins / s.total;
      if (rate < worstRate) {
        worstRate = rate;
        weakestRegime = regime;
      }
    }

    // ---- Generate recommendations (RECOMMEND ONLY — never activates) ----
    const recommendations: MetaAnalysis["recommendations"] = [];

    if (f1Trend === "UNSTABLE") {
      recommendations.push({
        kind: "CALIBRATE",
        severity: "WARN",
        rationale: `F1 volatility ${f1Volatility} across ${f1s.length} versions indicates instability; recalibrate before promotion.`,
      });
    }
    if (f1Trend === "DEGRADING" || latestF1 < 0.45) {
      recommendations.push({
        kind: "RETRAIN",
        severity: latestF1 < 0.35 ? "CRITICAL" : "WARN",
        rationale: `Latest F1 ${latestF1} (trend ${f1Trend}); retrain recommended.`,
      });
    }
    if (bestReplaySize !== null && bestReplaySize < 400) {
      recommendations.push({
        kind: "EXPAND_DATASET",
        severity: "INFO",
        rationale: `Best model trained on only ${bestReplaySize} rows; expand replay window for more signal.`,
      });
    }
    if (weakestRegime && worstRate < 0.4) {
      recommendations.push({
        kind: "RETRAIN",
        severity: "WARN",
        rationale: `Regime "${weakestRegime}" win-rate ${(worstRate * 100).toFixed(0)}%; regime-specific retraining recommended.`,
      });
    }
    // Calibration reliability check.
    const poorlyCalibrated = calibration.filter(
      (c) => c.predicted >= 10 && Math.abs(c.correct / c.predicted - c.bucket / 10) > 0.25,
    );
    if (poorlyCalibrated.length > 0) {
      recommendations.push({
        kind: "CALIBRATE",
        severity: "WARN",
        rationale: `${poorlyCalibrated.length} confidence buckets are mis-calibrated (>25% deviation).`,
      });
    }
    if (recommendations.length === 0) {
      recommendations.push({
        kind: "STABLE",
        severity: "INFO",
        rationale: `Model healthy: F1 ${latestF1}, trend ${f1Trend}, volatility ${f1Volatility}.`,
      });
    }

    // Persist recommendations (append-only). Recommend only — no activation.
    for (const rec of recommendations) {
      await brainRepository.addRecommendation({
        modelKey,
        kind: rec.kind,
        severity: rec.severity,
        rationale: rec.rationale,
        evidence: { latestF1, f1Trend, f1Volatility, adaptationSpeed, bestReplaySize, weakestRegime },
      });
    }
    // Store the meta-observation in RESEARCH memory (does not touch live learning).
    await brainRepository.remember({
      tier: "RESEARCH",
      kind: "RESEARCH",
      subject: `meta:${modelKey}`,
      content: { latestF1, f1Trend, adaptationSpeed, recommendations: recommendations.length },
      importance: 0.4,
    });

    eventBus.publish("training", {
      event: "brain.meta.analyzed",
      modelKey,
      message: `${recommendations.length} recommendation(s); trend ${f1Trend}`,
      ts: Date.now(),
    });
    logger.info("brain.meta.analyzed", { modelKey, f1Trend, recs: recommendations.length });

    return {
      modelKey,
      versions: models.length,
      latestF1,
      f1Trend,
      f1Volatility,
      adaptationSpeed,
      bestFeatureVersion,
      bestReplaySize,
      weakestRegime,
      recommendations,
    };
  }

  async recommendations(modelKey?: ModelKey) {
    return brainRepository.listRecommendations(modelKey, 100);
  }
}

export const metaLearning = singleton("brain.metaLearning", () => new MetaLearning());
