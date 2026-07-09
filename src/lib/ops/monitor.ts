import { appendEvent, getLatestHeartbeats, type HeartbeatView } from "@/lib/events/audit-store";
import { eventBus } from "@/modules/market_data/core/event-bus";
import {
  collectProcessMetrics,
  probeControlPlane,
  probeDatabase,
  probeRedis,
  sampleEventLoopLag,
  type ControlPlaneProbeResult,
  type ProbeResult,
} from "@/lib/ops/probes";
import { getRealtimeHub } from "@/lib/ops/realtime";
import {
  ensureControlPlaneSeeded,
  ensurePlatformSelfRegistration,
  getActiveComponents,
} from "@/lib/ops/registry";
import {
  applyComponentResults,
  getOverview,
  raiseStandaloneAlert,
  reconcileAlerts,
  recordMetrics,
  runRetentionCleanup,
  type ComponentResult,
  type FiringAlert,
  type MetricSample,
} from "@/lib/ops/store";
import type {
  ControlPlaneDTO,
  DependencyCriticality,
  HealthStatus,
  MonitorInfo,
  OverviewDTO,
  RegistryComponentDTO,
} from "@/lib/ops/types";

const SWEEP_INTERVAL_MS = 15_000;
const CLEANUP_EVERY_N_SWEEPS = 240; // ~hourly at 15s cadence

interface MonitorState {
  started: boolean;
  bootstrapped: boolean;
  timer: NodeJS.Timeout | null;
  running: boolean;
  sweepCount: number;
  lastSweepAt: string | null;
  lastSweepDurationMs: number;
  consecutiveFailures: number;
  lastBusDropped: number;
  lastSseDropped: number;
  lastControlPlane: ControlPlaneDTO | null;
}

const globalForMonitor = globalThis as typeof globalThis & {
  __aitmMonitorState?: MonitorState;
};

function getState(): MonitorState {
  return (globalForMonitor.__aitmMonitorState ??= {
    started: false,
    bootstrapped: false,
    timer: null,
    running: false,
    sweepCount: 0,
    lastSweepAt: null,
    lastSweepDurationMs: 0,
    consecutiveFailures: 0,
    lastBusDropped: 0,
    lastSseDropped: 0,
    lastControlPlane: null,
  });
}

export function getMonitorInfo(): MonitorInfo {
  const s = getState();
  return {
    started: s.started,
    intervalMs: SWEEP_INTERVAL_MS,
    sweepCount: s.sweepCount,
    lastSweepAt: s.lastSweepAt,
    lastSweepDurationMs: s.lastSweepDurationMs,
    consecutiveFailures: s.consecutiveFailures,
  };
}

/** Idempotent scheduler start. Safe to call from instrumentation and routes. */
export function ensureMonitorStarted(): void {
  const state = getState();
  if (state.started) return;
  state.started = true;
  getRealtimeHub(); // realtime hub subscribes to the backbone from process start

  const tick = () => {
    if (state.running) return; // never overlap sweeps
    state.running = true;
    void runSweep()
      .then(() => {
        state.consecutiveFailures = 0;
      })
      .catch(async (err: unknown) => {
        state.consecutiveFailures += 1;
        console.error("[ops] monitoring sweep failed:", err);
        if (state.consecutiveFailures >= 3) {
          await raiseStandaloneAlert({
            key: "worker-sweep-failures",
            componentId: "background-workers",
            severity: "critical",
            title: "Monitoring worker failing",
            message: `Monitoring sweep failed ${state.consecutiveFailures} consecutive times: ${
              err instanceof Error ? err.message : "unknown error"
            }`,
          });
        }
      })
      .finally(() => {
        state.running = false;
      });
  };

  state.timer = setInterval(tick, SWEEP_INTERVAL_MS);
  state.timer.unref();
  tick();
}

export async function getControlPlaneSnapshot(): Promise<ControlPlaneDTO> {
  const state = getState();
  if (state.lastControlPlane) return state.lastControlPlane;
  const probe = await probeControlPlane();
  state.lastControlPlane = probe.state;
  return probe.state;
}

export async function getOverviewWithMonitor(): Promise<OverviewDTO> {
  ensureMonitorStarted();
  await ensureBootstrapped();
  const controlPlane = await getControlPlaneSnapshot();
  return getOverview(getMonitorInfo(), controlPlane);
}

async function ensureBootstrapped(): Promise<void> {
  const state = getState();
  if (state.bootstrapped) return;
  await ensurePlatformSelfRegistration();
  await ensureControlPlaneSeeded();
  state.bootstrapped = true;
}

/**
 * One full monitoring sweep. Entirely registry-driven: the set of monitored
 * components is loaded from the Dynamic Component Registry each cycle.
 */
export async function runSweep(): Promise<void> {
  const state = getState();
  const startedAt = performance.now();
  const now = new Date();

  const dbProbe = await probeDatabase();
  if (!dbProbe.ok) {
    // Datastore down: nothing can be persisted; broadcast the condition live.
    state.lastSweepAt = now.toISOString();
    state.lastSweepDurationMs = performance.now() - startedAt;
    eventBus.publish("system", {
      type: "system.error",
      componentId: "database",
      payload: {
        title: "Database unavailable",
        message: dbProbe.error ?? "PostgreSQL probe failed",
      },
      at: now.toISOString(),
    });
    return;
  }

  await ensureBootstrapped();

  const [redisProbe, controlPlaneProbe, heartbeats, registry] = await Promise.all([
    probeRedis(),
    probeControlPlane(),
    getLatestHeartbeats().catch(() => new Map<string, HeartbeatView>()),
    getActiveComponents(),
  ]);
  state.lastControlPlane = controlPlaneProbe.state;

  const proc = collectProcessMetrics();
  const loopLag = sampleEventLoopLag();
  const busStats = eventBus.stats();
  const sseStats = getRealtimeHub().stats();

  const busDroppedDelta = Math.max(0, busStats.dropped - state.lastBusDropped);
  const sseDroppedDelta = Math.max(0, sseStats.eventsDropped - state.lastSseDropped);
  state.lastBusDropped = busStats.dropped;
  state.lastSseDropped = sseStats.eventsDropped;

  const results = new Map<string, ComponentResult>();
  const metricSamples: MetricSample[] = [];
  const firing: FiringAlert[] = [];

  for (const entry of registry) {
    let result: ComponentResult;

    switch (entry.mode) {
      case "probe": {
        if (entry.probe === "postgres") {
          result = probeToResult(entry.id, dbProbe, 500, "db_latency_ms");
          if ((dbProbe.latencyMs ?? 0) > 500) {
            firing.push({
              key: "database-slow",
              componentId: entry.id,
              severity: "warning",
              title: "Database latency high",
              message: `PostgreSQL round-trip ${Math.round(dbProbe.latencyMs ?? 0)}ms exceeds 500ms threshold.`,
            });
          }
          if (dbProbe.latencyMs != null) {
            metricSamples.push({ componentId: entry.id, name: "db_latency_ms", value: dbProbe.latencyMs, unit: "ms" });
          }
        } else if (entry.probe === "redis") {
          result = probeToResult(entry.id, redisProbe, 250, "redis_latency_ms");
          if (!redisProbe.ok) {
            firing.push({
              key: "redis-unavailable",
              componentId: entry.id,
              severity: "warning",
              title: "Redis cache unavailable",
              message: `Redis PING failed: ${redisProbe.error ?? "unknown error"}. Platform degrades to direct reads.`,
            });
          } else if (redisProbe.latencyMs != null) {
            metricSamples.push({
              componentId: entry.id,
              name: "redis_latency_ms",
              value: redisProbe.latencyMs,
              unit: "ms",
            });
          }
        } else if (entry.probe === "control-plane") {
          result = evaluateControlPlane(entry.id, controlPlaneProbe, firing);
        } else {
          result = {
            componentId: entry.id,
            status: "WARNING",
            message: `No probe implementation available for '${entry.probe ?? "none"}'.`,
            latencyMs: null,
            metrics: {},
          };
        }
        break;
      }

      case "internal": {
        result = evaluateInternal(entry, {
          busStats,
          sseStats,
          busDroppedDelta,
          sseDroppedDelta,
          sweepCount: state.sweepCount,
          lastSweepDurationMs: state.lastSweepDurationMs,
          consecutiveFailures: state.consecutiveFailures,
          firing,
        });
        if (entry.id === "realtime-layer") {
          metricSamples.push({ componentId: entry.id, name: "sse_connections", value: sseStats.connections, unit: "count" });
        }
        break;
      }

      case "heartbeat":
      case "telemetry": {
        result = evaluateHeartbeat(entry, heartbeats.get(entry.id), now);
        if (result.status === "OFFLINE" && entry.mode === "heartbeat") {
          firing.push({
            key: `${entry.id}-offline`,
            componentId: entry.id,
            severity: "critical",
            title: `${entry.name} not responding`,
            message: result.message,
          });
        }
        if (result.status !== "OFFLINE") {
          for (const [name, value] of Object.entries(result.metrics)) {
            metricSamples.push({ componentId: entry.id, name, value, unit: "" });
          }
          // Declarative per-component alert rules supplied at registration time.
          for (const rule of entry.alertRules) {
            const value = result.metrics[rule.metric];
            if (typeof value !== "number") continue;
            const breached = rule.op === "gt" ? value > rule.threshold : value < rule.threshold;
            if (breached) {
              firing.push({
                key: `${entry.id}-rule-${rule.metric}`,
                componentId: entry.id,
                severity: rule.severity,
                title: rule.title,
                message: `${rule.metric} = ${Math.round(value * 100) / 100} breached threshold (${rule.op} ${rule.threshold}).`,
              });
            }
          }
        }
        break;
      }
    }

    results.set(entry.id, result);
  }

  // Dependency cascade: upstream failures automatically degrade dependents.
  applyDependencyCascade(registry, results);

  // App runtime metrics + platform-level rules.
  metricSamples.push(
    { componentId: null, name: "cpu_pct", value: proc.cpuPct, unit: "%" },
    { componentId: null, name: "mem_rss_mb", value: proc.rssMb, unit: "MB" },
    { componentId: null, name: "heap_used_pct", value: proc.heapUsedPct, unit: "%" },
    { componentId: null, name: "event_loop_lag_ms", value: loopLag.maxMs, unit: "ms" },
    { componentId: null, name: "uptime_s", value: proc.uptimeS, unit: "s" },
  );
  if (loopLag.maxMs > 250) {
    firing.push({
      key: "high-event-loop-lag",
      componentId: null,
      severity: "warning",
      title: "High latency: event loop lag",
      message: `Max event-loop lag ${Math.round(loopLag.maxMs)}ms over the last interval (threshold 250ms).`,
    });
  }
  if (proc.heapUsedPct > 90) {
    firing.push({
      key: "memory-pressure",
      componentId: null,
      severity: "warning",
      title: "Memory pressure",
      message: `Heap usage at ${proc.heapUsedPct.toFixed(1)}% of limit (${proc.heapUsedMb.toFixed(0)}MB / ${proc.heapLimitMb.toFixed(0)}MB).`,
    });
  }

  await applyComponentResults([...results.values()]);
  await recordMetrics(metricSamples);
  await reconcileAlerts(firing);

  state.sweepCount += 1;
  if (state.sweepCount % CLEANUP_EVERY_N_SWEEPS === 0) {
    await runRetentionCleanup();
  }
  state.lastSweepAt = now.toISOString();
  state.lastSweepDurationMs = performance.now() - startedAt;

  await appendEvent("ops.sweep.completed", null, {
    sweepCount: state.sweepCount,
    durationMs: Math.round(state.lastSweepDurationMs),
    componentsMonitored: registry.length,
    databaseOk: true,
    redisOk: redisProbe.ok,
    controlPlaneOk: controlPlaneProbe.ok,
  });
}

/* ------------------------------------------------------------------ */
/* Evaluators                                                          */
/* ------------------------------------------------------------------ */

function probeToResult(
  componentId: string,
  probe: ProbeResult,
  warnThresholdMs: number,
  latencyMetricName: string,
): ComponentResult {
  if (!probe.ok) {
    return {
      componentId,
      status: "OFFLINE",
      message: probe.error ?? "Probe failed.",
      latencyMs: null,
      metrics: probe.details ?? {},
    };
  }
  const latency = probe.latencyMs ?? 0;
  const slow = latency > warnThresholdMs;
  return {
    componentId,
    status: slow ? "WARNING" : "HEALTHY",
    message: slow
      ? `Responding slowly: ${Math.round(latency)}ms (threshold ${warnThresholdMs}ms).`
      : `Responding in ${latency.toFixed(1)}ms.`,
    latencyMs: latency,
    metrics: { [latencyMetricName]: latency, ...(probe.details ?? {}) },
  };
}

function evaluateControlPlane(
  componentId: string,
  probe: ControlPlaneProbeResult,
  firing: FiringAlert[],
): ComponentResult {
  if (!probe.state.reachable) {
    firing.push({
      key: "control-plane-unreachable",
      componentId,
      severity: "critical",
      title: "Control Plane unreachable",
      message: `Control Plane state could not be read: ${probe.error ?? "unknown error"}`,
    });
    return {
      componentId,
      status: "OFFLINE",
      message: probe.error ?? "Control Plane state unreadable.",
      latencyMs: null,
      metrics: {},
    };
  }

  if (probe.missingKeys.length > 0) {
    firing.push({
      key: "control-plane-incomplete",
      componentId,
      severity: "critical",
      title: "Control Plane state incomplete",
      message: `Missing required state keys: ${probe.missingKeys.join(", ")}.`,
    });
    return {
      componentId,
      status: "DEGRADED",
      message: `State incomplete — missing: ${probe.missingKeys.join(", ")}.`,
      latencyMs: probe.latencyMs,
      metrics: {},
    };
  }

  const s = probe.state;
  if (s.emergencyStop === true) {
    firing.push({
      key: "emergency-stop-active",
      componentId,
      severity: "critical",
      title: "Emergency stop engaged",
      message: "Global emergency stop is ACTIVE. All execution is halted platform-wide.",
    });
  }

  const summary = `Execution: ${s.globalExecutionState} · AI: ${s.aiEnabled ? "ENABLED" : "DISABLED"} · Strategies: ${
    s.strategyEnabled ? "ENABLED" : "DISABLED"
  } · E-Stop: ${s.emergencyStop ? "ACTIVE" : "clear"}`;

  return {
    componentId,
    status: s.emergencyStop ? "WARNING" : "HEALTHY",
    message: summary,
    latencyMs: probe.latencyMs,
    metrics: {},
  };
}

interface InternalContext {
  busStats: { published: number; delivered: number; dropped: number; subscribers: number };
  sseStats: { connections: number; eventsSent: number; eventsDropped: number; totalConnectionsServed: number };
  busDroppedDelta: number;
  sseDroppedDelta: number;
  sweepCount: number;
  lastSweepDurationMs: number;
  consecutiveFailures: number;
  firing: FiringAlert[];
}

function evaluateInternal(entry: RegistryComponentDTO, ctx: InternalContext): ComponentResult {
  switch (entry.id) {
    case "event-backbone": {
      const status: HealthStatus = ctx.busDroppedDelta > 0 ? "WARNING" : "HEALTHY";
      if (ctx.busDroppedDelta > 0) {
        ctx.firing.push({
          key: "backbone-dropped-events",
          componentId: entry.id,
          severity: "warning",
          title: "Event backbone dropping deliveries",
          message: `${ctx.busDroppedDelta} listener deliveries failed in the last sweep interval.`,
        });
      }
      return {
        componentId: entry.id,
        status,
        message:
          ctx.busDroppedDelta > 0
            ? `${ctx.busDroppedDelta} event deliveries dropped in the last interval.`
            : `Operational — ${ctx.busStats.published} events published, ${ctx.busStats.subscribers} subscribers.`,
        latencyMs: null,
        metrics: {
          events_published: ctx.busStats.published,
          events_delivered: ctx.busStats.delivered,
          events_dropped: ctx.busStats.dropped,
          subscribers: ctx.busStats.subscribers,
        },
      };
    }
    case "realtime-layer": {
      const status: HealthStatus = ctx.sseDroppedDelta > 0 ? "WARNING" : "HEALTHY";
      if (ctx.sseDroppedDelta > 0) {
        ctx.firing.push({
          key: "realtime-dropped-events",
          componentId: entry.id,
          severity: "warning",
          title: "Dropped realtime events",
          message: `${ctx.sseDroppedDelta} stream deliveries failed in the last sweep interval.`,
        });
      }
      return {
        componentId: entry.id,
        status,
        message:
          ctx.sseDroppedDelta > 0
            ? `${ctx.sseDroppedDelta} realtime events dropped in the last interval.`
            : `Streaming — ${ctx.sseStats.connections} live connection(s), ${ctx.sseStats.eventsSent} events delivered.`,
        latencyMs: null,
        metrics: {
          sse_connections: ctx.sseStats.connections,
          events_sent: ctx.sseStats.eventsSent,
          events_dropped: ctx.sseStats.eventsDropped,
          total_connections_served: ctx.sseStats.totalConnectionsServed,
        },
      };
    }
    case "background-workers": {
      const failures = ctx.consecutiveFailures;
      const status: HealthStatus = failures >= 3 ? "DEGRADED" : failures > 0 ? "WARNING" : "HEALTHY";
      return {
        componentId: entry.id,
        status,
        message:
          failures > 0
            ? `${failures} consecutive sweep failure(s) recorded.`
            : `Sweep #${ctx.sweepCount + 1} running on a ${SWEEP_INTERVAL_MS / 1000}s cadence.`,
        latencyMs: ctx.lastSweepDurationMs || null,
        metrics: {
          sweep_count: ctx.sweepCount,
          last_sweep_ms: ctx.lastSweepDurationMs,
          consecutive_failures: failures,
        },
      };
    }
    default:
      return {
        componentId: entry.id,
        status: "WARNING",
        message: "Internal component has no registered collector in this process.",
        latencyMs: null,
        metrics: {},
      };
  }
}

function evaluateHeartbeat(
  entry: RegistryComponentDTO,
  heartbeat: HeartbeatView | undefined,
  now: Date,
): ComponentResult {
  const isTelemetry = entry.mode === "telemetry";
  if (!heartbeat) {
    return {
      componentId: entry.id,
      status: isTelemetry ? "WARNING" : "OFFLINE",
      message: isTelemetry
        ? "Awaiting first telemetry — no client sessions observed yet."
        : "No heartbeat received — component is not connected to the operations bus.",
      latencyMs: null,
      metrics: {},
    };
  }
  const ageSec = (now.getTime() - heartbeat.lastSeenAt.getTime()) / 1000;
  if (ageSec > entry.heartbeatTimeoutSec) {
    return {
      componentId: entry.id,
      status: isTelemetry ? "WARNING" : "OFFLINE",
      message: isTelemetry
        ? `No telemetry for ${Math.round(ageSec / 60)}m — no active sessions.`
        : `Heartbeat stale: last seen ${Math.round(ageSec)}s ago (timeout ${entry.heartbeatTimeoutSec}s).`,
      latencyMs: null,
      metrics: heartbeat.metrics,
    };
  }
  return {
    componentId: entry.id,
    status: heartbeat.status,
    message: heartbeat.message || `Reporting via heartbeat (${Math.round(ageSec)}s ago).`,
    latencyMs: null,
    metrics: heartbeat.metrics,
  };
}

/* ------------------------------------------------------------------ */
/* Dependency cascade                                                  */
/* ------------------------------------------------------------------ */

const STATUS_RANK: Record<HealthStatus, number> = {
  HEALTHY: 0,
  RESTARTING: 1,
  WARNING: 2,
  DEGRADED: 3,
  OFFLINE: 4,
};

function impactFor(depStatus: HealthStatus, criticality: DependencyCriticality): HealthStatus | null {
  const depDown = depStatus === "OFFLINE" || depStatus === "DEGRADED";
  if (!depDown) return null;
  if (criticality === "critical") return "DEGRADED";
  if (criticality === "required") return "WARNING";
  return null; // optional dependencies never cascade
}

/**
 * Automatic dependency-aware degradation. Runs multiple passes so failures
 * propagate through chains without any manual configuration.
 */
function applyDependencyCascade(registry: RegistryComponentDTO[], results: Map<string, ComponentResult>): void {
  const byId = new Map(registry.map((r) => [r.id, r]));
  for (let pass = 0; pass < 3; pass++) {
    let changed = false;
    for (const entry of registry) {
      const result = results.get(entry.id);
      if (!result || entry.dependencies.length === 0) continue;
      for (const dep of entry.dependencies) {
        if (!byId.has(dep.componentId)) continue;
        const depResult = results.get(dep.componentId);
        if (!depResult) continue;
        const impact = impactFor(depResult.status, dep.criticality);
        if (impact && STATUS_RANK[impact] > STATUS_RANK[result.status]) {
          result.status = impact;
          result.message = `${result.message} [dependency: ${dep.componentId} is ${depResult.status}]`;
          changed = true;
        }
      }
    }
    if (!changed) break;
  }
}
