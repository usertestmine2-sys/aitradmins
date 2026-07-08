// AITradeMinds — AI Command Center. READ-ONLY unified inspection surface for the
// Brain across every subsystem. Never modifies data — composes existing services.
import { singleton } from "@/kernel";
import { analyticsService } from "@/modules/analytics";
import { aiBrain, brainHealth, consensusEngine, selfReview } from "@/modules/brain";
import { healthEngine } from "./health-engine";
import { supervisor } from "./supervisor";
import { masterPipeline } from "./pipeline";

class CommandCenter {
  /** Full situational snapshot the Brain can inspect (read-only). */
  async overview() {
    const [brainStatus, health, platformHealth, recentRuns, alerts, dashboard, reviews] =
      await Promise.all([
        aiBrain.status(),
        brainHealth.score(),
        healthEngine.compute(),
        masterPipeline.history(10),
        supervisor.recent(),
        analyticsService.dashboard(),
        selfReview.history(),
      ]);
    return {
      brain: brainStatus,
      brainHealth: health,
      platformHealth,
      recentPipelineRuns: recentRuns,
      openAlerts: alerts.filter((a) => a.status === "OPEN").length,
      recentAlerts: alerts.slice(0, 10),
      lastSelfReview: reviews[0] ?? null,
      analytics: {
        brainGrade: dashboard.brain.health.grade,
        marketSession: dashboard.market.session.state,
        models: dashboard.training.totalModels,
      },
      ts: Date.now(),
    };
  }

  /** Consensus probe for a symbol (read-only, routes through the Brain). */
  async inspectConsensus(symbol: string, regime = "RANGE") {
    return consensusEngine.decide(symbol, regime, "REPUTATION", "NSE");
  }
}

export const commandCenter = singleton("platform.commandCenter", () => new CommandCenter());
