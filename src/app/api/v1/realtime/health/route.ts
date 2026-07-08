import { sql } from "drizzle-orm";
import { db } from "@/db";
import { okResponse, toResponse, logger } from "@/kernel";
import { eventBus } from "@/modules/market_data/core/event-bus";
import { cache } from "@/modules/market_data/core/cache";
import { bootstrapRealtime, scheduler } from "@/modules/infra";
import { brainHealth } from "@/modules/brain";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Idempotently ensure realtime jobs are registered.
    const boot = bootstrapRealtime();

    let dbOk = true;
    try {
      await db.execute(sql`select 1`);
    } catch (e) {
      dbOk = false;
      logger.error("health.db.failed", { error: e instanceof Error ? e.message : "unknown" });
    }

    let brain: Awaited<ReturnType<typeof brainHealth.score>> | { grade: string; error: string };
    try {
      brain = await brainHealth.score();
    } catch (e) {
      brain = { grade: "UNKNOWN", error: e instanceof Error ? e.message : "brain health failed" };
    }

    const healthy = dbOk;
    return okResponse(
      {
        status: healthy ? "healthy" : "degraded",
        checks: {
          database: dbOk ? "up" : "down",
          eventBus: { transport: eventBus.transportName() ?? "in-proc", metrics: eventBus.metrics() },
          cache: cache.stats(),
          scheduler: { ...scheduler.status(), registered: boot.registered },
          brain,
        },
        ts: Date.now(),
      },
      { status: healthy ? 200 : 503 },
    );
  } catch (err) {
    return toResponse(err);
  }
}
