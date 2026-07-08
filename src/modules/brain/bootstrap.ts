// AITradeMinds — Brain bootstrap. Registers a memory-consolidation job into the
// single Operations Center scheduler. Idempotent. Append-only guarantees preserved.
import { logger, singleton } from "@/kernel";
import { scheduler } from "@/modules/infra";
import { MODEL_KEYS } from "@/modules/training";
import { brainRepository } from "./repository";
import { metaLearning } from "./meta-learning";
import { selfReview } from "./self-review";

interface BrainBootState {
  done: boolean;
}

const state = singleton<BrainBootState>("brain.bootstrap.state", () => ({ done: false }));

export function bootstrapBrain(): { jobs: string[] } {
  if (!state.done) {
    // Consolidation surfaces high-importance short-term memories into long-term.
    scheduler.register({
      name: "brain.memoryConsolidation",
      intervalMs: 60 * 60 * 1000,
      handler: async () => {
        const shortTerm = await brainRepository.recall("SHORT", 200);
        let promoted = 0;
        for (const m of shortTerm) {
          if (m.importance !== null && m.importance >= 0.8) {
            await brainRepository.remember({
              tier: "LONG",
              kind: "OBSERVATION",
              subject: m.subject,
              content: m.content ?? {},
              importance: m.importance,
            });
            promoted += 1;
          }
        }
        if (promoted > 0) logger.info("brain.memoryConsolidation", { promoted });
      },
    });
    // Meta-learning: periodically analyze HOW each model learns (recommend-only).
    scheduler.register({
      name: "brain.metaLearning",
      intervalMs: 6 * 60 * 60 * 1000,
      handler: async () => {
        for (const key of MODEL_KEYS) {
          await metaLearning.analyze(key);
        }
        logger.info("brain.metaLearning.done", { models: MODEL_KEYS.length });
      },
    });
    // Daily self-review: Brain evaluates itself (recommend-only).
    scheduler.register({
      name: "brain.selfReview",
      intervalMs: 24 * 60 * 60 * 1000,
      handler: async () => {
        const review = await selfReview.run("DAILY");
        logger.info("brain.selfReview.done", { id: review.id });
      },
    });
    state.done = true;
  }
  return { jobs: ["brain.memoryConsolidation", "brain.metaLearning", "brain.selfReview"] };
}
