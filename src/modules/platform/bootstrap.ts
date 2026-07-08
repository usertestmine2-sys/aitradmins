// AITradeMinds — Platform bootstrap. Registers supervisor + health jobs into the
// single Operations Center scheduler. Idempotent. Recommend-only.
import { logger, singleton } from "@/kernel";
import { scheduler, bootstrapRealtime } from "@/modules/infra";
import { bootstrapBrain } from "@/modules/brain";
import { bootstrapTraining } from "@/modules/training";
import { bootstrapAnalytics } from "@/modules/analytics";
import { supervisor } from "./supervisor";
import { healthEngine } from "./health-engine";

interface PlatBootState {
  done: boolean;
}

const state = singleton<PlatBootState>("platform.bootstrap.state", () => ({ done: false }));

export function bootstrapPlatform(): { jobs: string[] } {
  if (!state.done) {
    // Top orchestrator: start the full worker fleet across all lower layers.
    // Scheduler auto-arms newly registered jobs, so ordering is safe.
    bootstrapRealtime();
    bootstrapBrain();
    bootstrapTraining();
    bootstrapAnalytics();
    scheduler.register({
      name: "platform.supervisor",
      intervalMs: 5 * 60 * 1000,
      handler: async () => {
        const { alerts } = await supervisor.scan();
        if (alerts.length > 0) logger.info("platform.supervisor.scan", { alerts: alerts.length });
      },
    });
    scheduler.register({
      name: "platform.healthEngine",
      intervalMs: 5 * 60 * 1000,
      handler: async () => {
        const h = await healthEngine.compute();
        logger.info("platform.health", { overall: h.overallScore, grade: h.grade });
      },
    });
    state.done = true;
  }
  return { jobs: ["platform.supervisor", "platform.healthEngine"] };
}
