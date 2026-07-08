// AITradeMinds — Autonomous Supervisor. Detects drift/anomalies/failures across
// subsystems and emits RECOMMENDATIONS ONLY (never auto-activates). Reuses
// existing services + job/dead-letter history. Append-only alerts.
import { logger, singleton } from "@/kernel";
import { eventBus } from "@/modules/market_data/core/event-bus";
import { providerManager } from "@/modules/market_data/providers/provider-manager";
import { scheduler, infraRepository } from "@/modules/infra";
import { brainHealth, metaLearning, modelReputation } from "@/modules/brain";
import { MODEL_KEYS } from "@/modules/training";
import { platformRepository } from "./repository";
import type { PlatSupervisorAlert } from "@/db/schema";

class Supervisor {
  async scan(): Promise<{ alerts: PlatSupervisorAlert[] }> {
    const alerts: PlatSupervisorAlert[] = [];
    const emit = async (
      category: string,
      severity: "INFO" | "WARN" | "CRITICAL",
      subject: string,
      detail: string,
      recommendation?: string,
    ) => {
      const alert = await platformRepository.saveAlert({ category, severity, subject, detail, recommendation });
      alerts.push(alert);
      eventBus.publish("training", { event: "supervisor.alert", message: `${category}:${subject}`, ts: Date.now() });
    };

    // 1) Brain health degradation.
    const health = await brainHealth.score();
    if (health.grade === "WARNING" || health.grade === "CRITICAL") {
      await emit("HEALTH", health.grade === "CRITICAL" ? "CRITICAL" : "WARN", "brain",
        `Brain health ${health.grade} (${health.score})`, "Review health signals: " + health.notes.join("; "));
    }

    // 2) Model drift / degradation via meta-learning.
    for (const key of MODEL_KEYS) {
      const recs = await metaLearning.recommendations(key);
      const critical = recs.filter((r) => r.status === "OPEN" && r.severity === "CRITICAL");
      if (critical.length > 0) {
        await emit("DRIFT", "WARN", key, `${critical.length} critical meta recommendation(s)`,
          "Consider retrain/calibrate (Brain approval required)");
      }
    }

    // 3) Confidence collapse via reputation.
    const reps = await modelReputation.leaderboard();
    for (const r of reps) {
      if (r.trades >= 5 && r.winRate < 0.35) {
        await emit("DRIFT", "WARN", `${r.modelKey}/${r.regime}`,
          `Win-rate ${(r.winRate * 100).toFixed(0)}% over ${r.trades} trades`,
          "Reduce influence or retrain (recommend-only)");
      }
    }

    // 4) Provider/broker feed failures.
    const down = providerManager.status().filter((p) => p.configured && p.health === "DOWN");
    if (down.length > 0) {
      await emit("BROKER", "WARN", "providers", `${down.length} configured provider(s) DOWN`,
        "Check provider connectivity / credentials");
    }

    // 5) Worker/queue failures via job + dead-letter history.
    const jobs = await infraRepository.recentJobs(50);
    const failed = jobs.filter((j) => j.status === "FAILED");
    if (failed.length > 0) {
      await emit("WORKER", failed.length > 3 ? "CRITICAL" : "WARN", "scheduler",
        `${failed.length} failed job run(s)`, "Inspect dead-letter queue + job handlers");
    }
    if (!scheduler.isRunning() && scheduler.status().jobs.length > 0) {
      await emit("QUEUE", "INFO", "scheduler", "Scheduler registered but not started (opt-in)",
        "Enable SCHEDULER_ENABLED for autonomous jobs");
    }

    if (alerts.length === 0) {
      await emit("HEALTH", "INFO", "platform", "All supervised subsystems nominal");
    }
    logger.info("supervisor.scan", { alerts: alerts.length });
    return { alerts };
  }

  async recent() {
    return platformRepository.alerts(100);
  }
}

export const supervisor = singleton("platform.supervisor", () => new Supervisor());
