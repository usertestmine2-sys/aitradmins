// AITradeMinds — Realtime composition root.
// Wires domain jobs into the generic scheduler. This is the ONLY place allowed
// to depend both upward (market_data singletons) and downward (infra), keeping
// the infra core itself dependency-free. Idempotent.
import { getConfig, logger, singleton } from "@/kernel";
import { cache } from "@/modules/market_data/core/cache";
import { providerManager } from "@/modules/market_data/providers/provider-manager";
import { healthEngine } from "@/modules/platform/health-engine";
import { scheduler } from "./scheduler";

interface BootState {
  done: boolean;
}

const state = singleton<BootState>("infra.bootstrap.state", () => ({ done: false }));

export function bootstrapRealtime(): { registered: string[]; schedulerRunning: boolean } {
  if (!state.done) {
    // 1. Provider health heartbeat (reuses the single Provider Manager).
    scheduler.register({
      name: "provider.heartbeat",
      intervalMs: 5_000,
      handler: () => providerManager.heartbeat(),
    });

    // 2. Cache maintenance (reuses the single Cache).
    scheduler.register({
      name: "cache.purgeExpired",
      intervalMs: 30_000,
      handler: () => {
        const removed = cache.purgeExpired();
        if (removed > 0) logger.debug("cache.purged", { removed });
      },
    });

    // 3. Platform Health Engine (periodic score computation).
    scheduler.register({
      name: "platform.health.compute",
      intervalMs: 60_000,
      handler: async () => {
        await healthEngine.compute();
      },
    });

    // 4. Monitoring Sweep (delegates to the ops monitor).
    // Note: ensureMonitorStarted() still exists for backwards compatibility,
    // but the actual heavy lifting is now tracked by the scheduler.
    scheduler.register({
      name: "ops.monitor.sweep",
      intervalMs: 15_000,
      handler: async () => {
        const { runSweep } = await import("@/lib/ops/monitor");
        await runSweep();
      },
    });

    state.done = true;

    // Start the scheduler/workers at runtime (skip only during `next build` to
    // keep the build side-effect free). Opt out with SCHEDULER_ENABLED=false.
    const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
    if (getConfig().SCHEDULER_ENABLED && !isBuildPhase) {
      scheduler.start();
    }
  }
  return {
    registered: scheduler.status().jobs.map((j) => j.name),
    schedulerRunning: scheduler.isRunning(),
  };
}
