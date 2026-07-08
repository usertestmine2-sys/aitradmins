import { and, desc, eq, gte, inArray, lt } from "drizzle-orm";
import { db } from "@/db";
import {
  opsAlerts,
  opsComponentState,
  opsHealthSnapshots,
  opsMetrics,
} from "@/db/schema";
import { appendEvent, getRecentEvents, runEventRetention } from "@/lib/events/audit-store";
import { getActiveComponents } from "@/lib/ops/registry";
import {
  RUNTIME_METRIC_NAMES,
  isHealthStatus,
  type AlertDTO,
  type AlertSeverity,
  type ComponentStateDTO,
  type ControlPlaneDTO,
  type HealthStatus,
  type MetricSeriesMap,
  type MonitorInfo,
  type OverviewDTO,
} from "@/lib/ops/types";

/**
 * Operations projections layer. Everything here is a derived read model:
 * the Event Audit Store (src/lib/events/audit-store.ts) is the write model.
 */

export interface ComponentResult {
  componentId: string;
  status: HealthStatus;
  message: string;
  latencyMs: number | null;
  metrics: Record<string, number>;
}

/**
 * Apply sweep results: update the state projection, record transitions
 * append-only, and append system.health.updated to the Event Audit Store
 * for every status change.
 */
export async function applyComponentResults(results: ComponentResult[]): Promise<void> {
  const now = new Date();
  const previousRows = await db.select().from(opsComponentState);
  const previous = new Map(previousRows.map((r) => [r.componentId, r]));

  for (const result of results) {
    const prev = previous.get(result.componentId);
    const changed = !prev || prev.status !== result.status;
    const lastStatusChangeAt = changed ? now : prev.lastStatusChangeAt;

    await db
      .insert(opsComponentState)
      .values({
        componentId: result.componentId,
        status: result.status,
        message: result.message,
        latencyMs: result.latencyMs,
        metrics: result.metrics,
        lastCheckedAt: now,
        lastStatusChangeAt,
      })
      .onConflictDoUpdate({
        target: opsComponentState.componentId,
        set: {
          status: result.status,
          message: result.message,
          latencyMs: result.latencyMs,
          metrics: result.metrics,
          lastCheckedAt: now,
          lastStatusChangeAt,
        },
      });

    if (changed) {
      await db.insert(opsHealthSnapshots).values({
        componentId: result.componentId,
        fromStatus: prev?.status ?? null,
        toStatus: result.status,
        message: result.message,
      });
      await appendEvent("system.health.updated", result.componentId, {
        from: prev?.status ?? null,
        to: result.status,
        message: result.message,
      });
    }
  }
}

export interface MetricSample {
  componentId: string | null;
  name: string;
  value: number;
  unit: string;
}

export async function recordMetrics(samples: MetricSample[]): Promise<void> {
  const valid = samples.filter((s) => Number.isFinite(s.value));
  if (valid.length === 0) return;
  await db.insert(opsMetrics).values(valid);
}

export interface FiringAlert {
  key: string;
  componentId: string | null;
  severity: AlertSeverity;
  title: string;
  message: string;
}

/**
 * Alert engine reconciliation: raise new alerts (deduped by key), refresh
 * existing ones, and auto-resolve alerts whose condition has cleared.
 * Raise ⇒ system.warning / system.error; resolve ⇒ system.recovered.
 */
export async function reconcileAlerts(firing: FiringAlert[]): Promise<void> {
  const now = new Date();
  const active = await db.select().from(opsAlerts).where(eq(opsAlerts.status, "active"));
  const activeByKey = new Map(active.map((a) => [a.dedupeKey, a]));
  const firingKeys = new Set(firing.map((f) => f.key));

  for (const alert of firing) {
    const existing = activeByKey.get(alert.key);
    if (existing) {
      await db
        .update(opsAlerts)
        .set({ lastEvaluatedAt: now, message: alert.message, severity: alert.severity })
        .where(eq(opsAlerts.id, existing.id));
    } else {
      await db.insert(opsAlerts).values({
        dedupeKey: alert.key,
        componentId: alert.componentId,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        status: "active",
        triggeredAt: now,
        lastEvaluatedAt: now,
      });
      await appendEvent(alert.severity === "critical" ? "system.error" : "system.warning", alert.componentId, {
        alertKey: alert.key,
        title: alert.title,
        message: alert.message,
        severity: alert.severity,
      });
    }
  }

  for (const existing of active) {
    if (!firingKeys.has(existing.dedupeKey)) {
      await db
        .update(opsAlerts)
        .set({ status: "resolved", resolvedAt: now, lastEvaluatedAt: now })
        .where(eq(opsAlerts.id, existing.id));
      await appendEvent("system.recovered", existing.componentId, {
        alertKey: existing.dedupeKey,
        title: existing.title,
        recoveredAfterMs: now.getTime() - existing.triggeredAt.getTime(),
      });
    }
  }
}

/** Best-effort standalone alert raise (used when the sweep itself fails). */
export async function raiseStandaloneAlert(alert: FiringAlert): Promise<void> {
  try {
    const existing = await db
      .select()
      .from(opsAlerts)
      .where(and(eq(opsAlerts.dedupeKey, alert.key), eq(opsAlerts.status, "active")))
      .limit(1);
    if (existing.length > 0) return;
    await db.insert(opsAlerts).values({
      dedupeKey: alert.key,
      componentId: alert.componentId,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      status: "active",
    });
    await appendEvent(alert.severity === "critical" ? "system.error" : "system.warning", alert.componentId, {
      alertKey: alert.key,
      title: alert.title,
      message: alert.message,
    });
  } catch {
    // Persistence unavailable — nothing more we can do here.
  }
}

async function getLatestMetricValues(names: readonly string[]): Promise<Record<string, number | null>> {
  const result: Record<string, number | null> = {};
  for (const name of names) result[name] = null;
  const rows = await db
    .selectDistinctOn([opsMetrics.name], { name: opsMetrics.name, value: opsMetrics.value })
    .from(opsMetrics)
    .where(inArray(opsMetrics.name, [...names]))
    .orderBy(opsMetrics.name, desc(opsMetrics.createdAt));
  for (const row of rows) {
    result[row.name] = typeof row.value === "number" ? row.value : Number(row.value);
  }
  return result;
}

function deriveGlobalStatus(components: ComponentStateDTO[], activeAlerts: AlertDTO[]): HealthStatus {
  const database = components.find((c) => c.id === "database");
  if (database && database.status === "OFFLINE") return "OFFLINE";
  const hasCritical =
    activeAlerts.some((a) => a.severity === "critical") ||
    components.some((c) => c.status === "OFFLINE" || c.status === "DEGRADED");
  if (hasCritical) return "DEGRADED";
  const hasWarning =
    activeAlerts.length > 0 || components.some((c) => c.status === "WARNING" || c.status === "RESTARTING");
  if (hasWarning) return "WARNING";
  return "HEALTHY";
}

export async function getActiveAlerts(): Promise<AlertDTO[]> {
  const rows = await db
    .select()
    .from(opsAlerts)
    .where(eq(opsAlerts.status, "active"))
    .orderBy(desc(opsAlerts.triggeredAt));
  return rows.map(toAlertDTO);
}

export async function getAlerts(status: "active" | "resolved" | "all", limit = 100): Promise<AlertDTO[]> {
  const base = db.select().from(opsAlerts);
  const rows =
    status === "all"
      ? await base.orderBy(desc(opsAlerts.triggeredAt)).limit(limit)
      : await base.where(eq(opsAlerts.status, status)).orderBy(desc(opsAlerts.triggeredAt)).limit(limit);
  return rows.map(toAlertDTO);
}

export async function getMetricSeries(minutes: number): Promise<MetricSeriesMap> {
  const since = new Date(Date.now() - minutes * 60_000);
  const rows = await db
    .select()
    .from(opsMetrics)
    .where(gte(opsMetrics.createdAt, since))
    .orderBy(opsMetrics.createdAt);
  const series: MetricSeriesMap = {};
  for (const row of rows) {
    (series[row.name] ??= []).push({ t: row.createdAt.toISOString(), v: row.value });
  }
  return series;
}

/** Compose the console overview entirely from the dynamic registry + projections. */
export async function getOverview(monitor: MonitorInfo, controlPlane: ControlPlaneDTO): Promise<OverviewDTO> {
  const [registry, stateRows, activeAlerts, recentEvents, runtime] = await Promise.all([
    getActiveComponents(),
    db.select().from(opsComponentState),
    getActiveAlerts(),
    getRecentEvents(40),
    getLatestMetricValues(RUNTIME_METRIC_NAMES),
  ]);

  const stateById = new Map(stateRows.map((r) => [r.componentId, r]));
  const components: ComponentStateDTO[] = registry.map((entry) => {
    const row = stateById.get(entry.id);
    return {
      id: entry.id,
      name: entry.name,
      description: entry.description,
      kind: entry.kind,
      mode: entry.mode,
      source: entry.source,
      dependencies: entry.dependencies,
      status: row && isHealthStatus(row.status) ? row.status : "RESTARTING",
      message: row?.message ?? "Awaiting first monitoring sweep.",
      latencyMs: row?.latencyMs ?? null,
      metrics: row?.metrics ?? {},
      lastCheckedAt: row?.lastCheckedAt.toISOString() ?? null,
      lastStatusChangeAt: row?.lastStatusChangeAt.toISOString() ?? null,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    globalStatus: deriveGlobalStatus(components, activeAlerts),
    monitor,
    runtime,
    controlPlane,
    components,
    activeAlerts,
    recentEvents,
  };
}

/** Retention: metrics 48h, resolved alerts 7d, snapshots 30d, plus audit-store retention. */
export async function runRetentionCleanup(): Promise<void> {
  const now = Date.now();
  await db.delete(opsMetrics).where(lt(opsMetrics.createdAt, new Date(now - 48 * 3600_000)));
  await db
    .delete(opsAlerts)
    .where(and(eq(opsAlerts.status, "resolved"), lt(opsAlerts.triggeredAt, new Date(now - 7 * 24 * 3600_000))));
  await db.delete(opsHealthSnapshots).where(lt(opsHealthSnapshots.createdAt, new Date(now - 30 * 24 * 3600_000)));
  await runEventRetention();
}

function toAlertDTO(r: typeof opsAlerts.$inferSelect): AlertDTO {
  return {
    id: r.id,
    dedupeKey: r.dedupeKey,
    componentId: r.componentId,
    severity: (r.severity as AlertSeverity) ?? "warning",
    title: r.title,
    message: r.message,
    status: r.status === "resolved" ? "resolved" : "active",
    triggeredAt: r.triggeredAt.toISOString(),
    resolvedAt: r.resolvedAt?.toISOString() ?? null,
  };
}
