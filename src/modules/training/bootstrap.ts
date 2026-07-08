// AITradeMinds — Training bootstrap. Registers a nightly retrain job into the
// Operations Center (single scheduler). Idempotent. Retrains are governed:
// models are registered PENDING and require approval before activation.
import { logger, singleton } from "@/kernel";
import { scheduler } from "@/modules/infra";
import { repository } from "@/modules/market_data/core/repository";
import { trainingManager, MODEL_KEYS } from "./trainer";

interface TrainingBootState {
  done: boolean;
}

const state = singleton<TrainingBootState>("training.bootstrap.state", () => ({ done: false }));

export function bootstrapTraining(): { job: string; models: readonly string[] } {
  if (!state.done) {
    scheduler.register({
      name: "training.nightlyRetrain",
      intervalMs: 24 * 60 * 60 * 1000,
      handler: async () => {
        // Retrain the TREND model on the most liquid symbol available.
        const symbols = await repository.listSymbols({ instrumentType: "EQ", limit: 1 });
        if (symbols.length === 0) return;
        await trainingManager.train("TREND", symbols[0].symbol, "1D", { limit: 500 });
        logger.info("training.nightlyRetrain.done", { symbol: symbols[0].symbol });
      },
    });
    state.done = true;
  }
  return { job: "training.nightlyRetrain", models: MODEL_KEYS };
}
