// AITradeMinds — Analytics bootstrap. Registers a daily-report job into the
// single Operations Center scheduler. Idempotent. Append-only reports.
import { logger, singleton } from "@/kernel";
import { scheduler } from "@/modules/infra";
import { reportGenerator } from "./report-generator";

interface AnalyticsBootState {
  done: boolean;
}

const state = singleton<AnalyticsBootState>("analytics.bootstrap.state", () => ({ done: false }));

export function bootstrapAnalytics(): { job: string } {
  if (!state.done) {
    scheduler.register({
      name: "analytics.dailyReport",
      intervalMs: 24 * 60 * 60 * 1000,
      handler: async () => {
        const report = await reportGenerator.generate("DAILY", {
          period: new Date().toISOString().slice(0, 10),
          generatedBy: "scheduler",
        });
        logger.info("analytics.dailyReport", { id: report.id });
      },
    });
    state.done = true;
  }
  return { job: "analytics.dailyReport" };
}
