// AITradeMinds — Training Manager. Orchestrates dataset build -> walk-forward
// train/eval -> versioned model registration. Emits training events on the single
// Event Bus and records runs via the Operations Center (infra) job history.
import { logger, singleton } from "@/kernel";
import { eventBus } from "@/modules/market_data/core/event-bus";
import { infraRepository } from "@/modules/infra";
import type { Timeframe } from "@/modules/market_data/constants";
import { datasetBuilder, FEATURE_VERSION, type LabeledRow } from "./dataset-builder";
import { evaluate, trainLogistic, type EvalMetrics } from "./model";
import { trainingRepository } from "./repository";

export const MODEL_KEYS = ["TREND", "MOMENTUM", "MEAN_REVERSION", "RISK"] as const;
export type ModelKey = (typeof MODEL_KEYS)[number];

export interface TrainingResult {
  modelKey: ModelKey;
  version: number;
  hash: string;
  trainingId: string;
  metrics: EvalMetrics;
  regime: string;
  samples: number;
}

class TrainingManager {
  /** Walk-forward split: train on first 70%, evaluate on last 30% (no look-ahead). */
  private split(rows: LabeledRow[]): { train: LabeledRow[]; test: LabeledRow[] } {
    const cut = Math.floor(rows.length * 0.7);
    return { train: rows.slice(0, cut), test: rows.slice(cut) };
  }

  async train(
    modelKey: ModelKey,
    symbol: string,
    timeframe: Timeframe,
    opts: { horizon?: number; limit?: number; activate?: boolean } = {},
  ): Promise<TrainingResult> {
    const jobId = await infraRepository.startJob(`training:${modelKey}:${symbol}`);
    const started = Date.now();
    eventBus.publish("training", {
      event: "training.started",
      modelKey,
      message: `${symbol} ${timeframe}`,
      ts: Date.now(),
    });

    try {
      // 1) Build labeled dataset (reuses Feature Engineering).
      const dataset = await datasetBuilder.build(symbol, timeframe, {
        horizon: opts.horizon,
        limit: opts.limit,
      });
      await trainingRepository.saveDataset({
        trainingId: dataset.trainingId,
        symbol,
        timeframe,
        featureVersion: dataset.featureVersion,
        featureNames: dataset.featureNames,
        rowCount: dataset.rows.length,
        regime: dataset.regime,
        rows: dataset.rows,
      });
      eventBus.publish("training", {
        event: "dataset.created",
        modelKey,
        trainingId: dataset.trainingId,
        ts: Date.now(),
      });
      eventBus.publish("training", {
        event: "features.generated",
        modelKey,
        trainingId: dataset.trainingId,
        message: `${dataset.featureNames.length} features (${FEATURE_VERSION})`,
        ts: Date.now(),
      });

      if (dataset.rows.length < 30) {
        throw new Error(`Insufficient samples (${dataset.rows.length}) to train ${modelKey}`);
      }

      // 2) Walk-forward train/eval.
      const { train, test } = this.split(dataset.rows);
      const trained = trainLogistic(train, dataset.featureNames, { epochs: 300 });
      const metrics = evaluate(trained, test);

      // 3) Version + register in the model registry.
      const version = await trainingRepository.nextVersion(modelKey);
      const parent = await trainingRepository.activeModel(modelKey);
      const model = await trainingRepository.saveModel({
        modelKey,
        version,
        hash: trained.hash,
        parentVersion: parent?.version ?? null,
        datasetTrainingId: dataset.trainingId,
        weights: trained.weights,
        featureNames: trained.featureNames,
        metrics: metrics as unknown as Record<string, number>,
        active: false,
        approvalStatus: "PENDING",
      });

      // 4) Optional auto-activation (governed; default requires approval).
      if (opts.activate) {
        await trainingRepository.activateModel(modelKey, version);
      }

      const durationMs = Date.now() - started;
      await infraRepository.finishJob(jobId, "SUCCESS", durationMs);
      eventBus.publish("training", {
        event: "training.completed",
        modelKey,
        trainingId: dataset.trainingId,
        version,
        ts: Date.now(),
      });
      eventBus.publish("training", {
        event: "model.updated",
        modelKey,
        version,
        message: `f1=${metrics.f1} sharpe=${metrics.sharpe}`,
        ts: Date.now(),
      });
      logger.info("training.completed", { modelKey, version, f1: metrics.f1 });

      return {
        modelKey,
        version: model.version,
        hash: model.hash,
        trainingId: dataset.trainingId,
        metrics,
        regime: dataset.regime,
        samples: dataset.rows.length,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "training failed";
      await infraRepository.finishJob(jobId, "FAILED", Date.now() - started, message);
      await infraRepository.deadLetter(`training:${modelKey}`, { modelKey, symbol }, message);
      eventBus.publish("training", {
        event: "training.failed",
        modelKey,
        message,
        ts: Date.now(),
      });
      logger.error("training.failed", { modelKey, error: message });
      throw err;
    }
  }

  async approve(modelKey: ModelKey, version: number): Promise<void> {
    await trainingRepository.activateModel(modelKey, version);
    eventBus.publish("training", {
      event: "model.updated",
      modelKey,
      version,
      message: "activated",
      ts: Date.now(),
    });
  }
}

export const trainingManager = singleton("training.manager", () => new TrainingManager());
