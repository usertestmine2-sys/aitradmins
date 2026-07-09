import { and, desc, eq, lt, notInArray } from "drizzle-orm";
import { db } from "@/db";
import { opsEvents } from "@/db/schema";
import { eventBus } from "@/modules/market_data/core/event-bus";
import { isHealthStatus, type EventDTO, type HealthStatus, type SystemEventType } from "@/lib/ops/types";

/**
 * Event Audit Store — the single persistence model for ALL operational events.
 *
 * Every health transition, warning, error, recovery, heartbeat, and registry
 * change is (1) published on the Event Backbone and (2) appended here as a
 * standard platform event. There is no parallel event storage anywhere else;
 * projections (component state, alerts) are derived views.
 */

/** Append a standard platform event: publish on the backbone, persist in the audit store. */
export async function appendEvent(
  type: SystemEventType,
  componentId: string | null,
  payload: Record<string, unknown>,
): Promise<void> {
  const at = new Date().toISOString();
  eventBus.publish("platform", { type, componentId, payload, at });
  await db.insert(opsEvents).values({ type, componentId, payload });
}

const NOISY_EVENT_TYPES = ["system.heartbeat.received", "ops.sweep.completed"];

export async function getRecentEvents(limit = 40, includeNoisy = false): Promise<EventDTO[]> {
  const base = db.select().from(opsEvents);
  const rows = includeNoisy
    ? await base.orderBy(desc(opsEvents.id)).limit(limit)
    : await base.where(notInArray(opsEvents.type, NOISY_EVENT_TYPES)).orderBy(desc(opsEvents.id)).limit(limit);
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    componentId: r.componentId,
    payload: r.payload ?? {},
    createdAt: r.createdAt.toISOString(),
  }));
}

export interface HeartbeatView {
  componentId: string;
  status: HealthStatus;
  message: string;
  metrics: Record<string, number>;
  lastSeenAt: Date;
}

/**
 * Latest heartbeat per component, derived from the Event Audit Store.
 * Heartbeats are standard `system.heartbeat.received` events — no dedicated table.
 */
export async function getLatestHeartbeats(): Promise<Map<string, HeartbeatView>> {
  const rows = await db
    .selectDistinctOn([opsEvents.componentId])
    .from(opsEvents)
    .where(eq(opsEvents.type, "system.heartbeat.received"))
    .orderBy(opsEvents.componentId, desc(opsEvents.id));

  const result = new Map<string, HeartbeatView>();
  for (const row of rows) {
    if (!row.componentId) continue;
    const payload = row.payload ?? {};
    const metrics: Record<string, number> = {};
    const rawMetrics = payload["metrics"];
    if (rawMetrics && typeof rawMetrics === "object") {
      for (const [key, value] of Object.entries(rawMetrics as Record<string, unknown>)) {
        if (typeof value === "number" && Number.isFinite(value)) metrics[key] = value;
      }
    }
    result.set(row.componentId, {
      componentId: row.componentId,
      status: isHealthStatus(payload["status"]) ? payload["status"] : "HEALTHY",
      message: typeof payload["message"] === "string" ? payload["message"] : "",
      metrics,
      lastSeenAt: row.createdAt,
    });
  }
  return result;
}

/** Retention: general events 7d; high-frequency heartbeat events 24h. */
export async function runEventRetention(): Promise<void> {
  const now = Date.now();
  await db.delete(opsEvents).where(lt(opsEvents.createdAt, new Date(now - 7 * 24 * 3600_000)));
  await db
    .delete(opsEvents)
    .where(
      and(
        eq(opsEvents.type, "system.heartbeat.received"),
        lt(opsEvents.createdAt, new Date(now - 24 * 3600_000)),
      ),
    );
}
