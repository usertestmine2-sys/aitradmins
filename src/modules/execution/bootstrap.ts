// AITradeMinds — Execution Intelligence bootstrap. Registers the two Phase-8B
// workers into the single Operations Center scheduler. Idempotent.
import { logger, singleton } from "@/kernel";
import { scheduler, infraRepository } from "@/modules/infra";
import { eventBus } from "@/modules/market_data/core/event-bus";

interface ExecBootState {
  done: boolean;
}

const state = singleton<ExecBootState>("execution.bootstrap.state", () => ({ done: false }));

export function bootstrapExecution(): { jobs: string[] } {
  if (!state.done) {
    // execution_quality_worker: heartbeat surfacing recent quality volume.
    scheduler.register({
      name: "execution_quality_worker",
      intervalMs: 60_000,
      handler: async () => {
        // Lightweight liveness: confirm recent execution job health is recorded.
        const jobs = await infraRepository.recentJobs(5);
        logger.debug("execution_quality_worker.tick", { recentJobs: jobs.length });
      },
    });
    // trade_replay_worker: emits a periodic marker so replay pipeline stays warm.
    scheduler.register({
      name: "trade_replay_worker",
      intervalMs: 300_000,
      handler: async () => {
        eventBus.publish("trading", {
          event: "learning.execution.completed",
          message: "replay worker cycle",
          ts: Date.now(),
        });
      },
    });
    state.done = true;
  }
  return { jobs: ["execution_quality_worker", "trade_replay_worker"] };
}
