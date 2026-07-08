// AITradeMinds — Training Dataset Builder.
// Reuses the existing Feature Engineering pipeline (no duplicate feature math) and
// attaches forward-return labels + market-regime context to build a supervised,
// versioned training dataset. Real data only (historical market + indicators).
import { randomUUID } from "node:crypto";
import { featureEngineering } from "@/modules/market_data/services/feature-engineering";
import { repository } from "@/modules/market_data/core/repository";
import type { Timeframe } from "@/modules/market_data/constants";

export const FEATURE_VERSION = "fe-v1";

export interface LabeledRow {
  trainingId: string;
  ts: number;
  features: Record<string, number>;
  label: number; // 1 if forward return > threshold else 0
  forwardReturn: number;
  regime: string;
}

export interface BuiltDataset {
  trainingId: string;
  symbol: string;
  timeframe: Timeframe;
  featureVersion: string;
  featureNames: string[];
  regime: string;
  rows: LabeledRow[];
}

// Classify market regime from a trailing return window (real, deterministic).
function classifyRegime(returns: number[]): string {
  if (returns.length < 5) return "UNKNOWN";
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
  const vol = Math.sqrt(variance);
  if (vol > 0.02) return mean >= 0 ? "VOLATILE_UP" : "VOLATILE_DOWN";
  if (mean > 0.001) return "TRENDING_UP";
  if (mean < -0.001) return "TRENDING_DOWN";
  return "RANGE";
}

class DatasetBuilder {
  async build(
    symbol: string,
    timeframe: Timeframe,
    opts: { horizon?: number; threshold?: number; limit?: number } = {},
  ): Promise<BuiltDataset> {
    const horizon = opts.horizon ?? 5;
    const threshold = opts.threshold ?? 0.0;

    // Reuse the existing feature pipeline — single source of feature math.
    const dataset = await featureEngineering.build(symbol, timeframe, {
      normalization: "zscore",
      limit: opts.limit ?? 1000,
    });

    // Raw candles for label generation (forward returns) — reuse repository.
    const candles = await repository.getCandles(symbol, timeframe, {
      limit: opts.limit ?? 1000,
    });
    const closeByTs = new Map<number, number>();
    for (const c of candles) closeByTs.set(c.ts.getTime(), c.close);
    const orderedTs = [...closeByTs.keys()].sort((a, b) => a - b);

    const trainingId = `ds_${symbol}_${timeframe}_${randomUUID().slice(0, 8)}`;
    const rows: LabeledRow[] = [];
    const trailingReturns: number[] = [];

    for (let i = 0; i < dataset.rows.length - horizon; i += 1) {
      const row = dataset.rows[i];
      const tsIndex = orderedTs.indexOf(row.ts);
      if (tsIndex < 0 || tsIndex + horizon >= orderedTs.length) continue;
      const nowClose = closeByTs.get(orderedTs[tsIndex]);
      const futureClose = closeByTs.get(orderedTs[tsIndex + horizon]);
      if (!nowClose || !futureClose || nowClose <= 0) continue;

      const forwardReturn = (futureClose - nowClose) / nowClose;
      trailingReturns.push(forwardReturn);
      if (trailingReturns.length > 20) trailingReturns.shift();

      const features: Record<string, number> = {};
      for (const name of dataset.features) {
        if (name === "ts") continue;
        const v = row[name];
        features[name] = Number.isFinite(v) ? v : 0;
      }

      rows.push({
        trainingId,
        ts: row.ts,
        features,
        label: forwardReturn > threshold ? 1 : 0,
        forwardReturn,
        regime: classifyRegime(trailingReturns),
      });
    }

    const featureNames = dataset.features.filter((f) => f !== "ts");
    const regime = rows.length ? rows[rows.length - 1].regime : "UNKNOWN";
    return {
      trainingId,
      symbol,
      timeframe,
      featureVersion: FEATURE_VERSION,
      featureNames,
      regime,
      rows,
    };
  }
}

export const datasetBuilder = new DatasetBuilder();
