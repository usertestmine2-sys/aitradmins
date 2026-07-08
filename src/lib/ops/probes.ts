import { createConnection } from "node:net";
import { monitorEventLoopDelay, type IntervalHistogram } from "node:perf_hooks";
import os from "node:os";
import v8 from "node:v8";
import { sql } from "drizzle-orm";
import { db, pool } from "@/db";
import { controlPlaneState } from "@/db/schema";
import type { ControlPlaneDTO } from "@/lib/ops/types";

export interface ProbeResult {
  ok: boolean;
  latencyMs: number | null;
  error?: string;
  details?: Record<string, number>;
}

/** Active PostgreSQL probe: round-trip latency plus connection pool pressure. */
export async function probeDatabase(timeoutMs = 3000): Promise<ProbeResult> {
  const start = performance.now();
  try {
    await Promise.race([
      db.execute(sql`select 1`),
      new Promise((_, reject) => setTimeout(() => reject(new Error("probe timeout")), timeoutMs)),
    ]);
    return {
      ok: true,
      latencyMs: performance.now() - start,
      details: {
        pool_total: pool.totalCount,
        pool_idle: pool.idleCount,
        pool_waiting: pool.waitingCount,
      },
    };
  } catch (err) {
    return {
      ok: false,
      latencyMs: null,
      error: err instanceof Error ? err.message : "unknown database error",
    };
  }
}

/** Active Redis probe: raw-socket RESP PING (zero client dependencies). */
export function probeRedis(timeoutMs = 1500): Promise<ProbeResult> {
  let host = "127.0.0.1";
  let port = 6379;
  const url = process.env.REDIS_URL;
  if (url) {
    try {
      const parsed = new URL(url);
      if (parsed.hostname) host = parsed.hostname;
      if (parsed.port) port = Number(parsed.port);
    } catch {
      // keep defaults
    }
  }

  const start = performance.now();
  return new Promise((resolve) => {
    let settled = false;
    const socket = createConnection({ host, port });
    const done = (result: ProbeResult) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(timeoutMs);
    socket.on("connect", () => {
      socket.write("PING\r\n");
    });
    socket.on("data", (buf) => {
      const latencyMs = performance.now() - start;
      const text = buf.toString("utf8");
      if (text.startsWith("+PONG")) {
        done({ ok: true, latencyMs });
      } else {
        done({ ok: false, latencyMs, error: `unexpected reply: ${text.slice(0, 40).trim()}` });
      }
    });
    socket.on("timeout", () => done({ ok: false, latencyMs: null, error: "connection timeout" }));
    socket.on("error", (err) => done({ ok: false, latencyMs: null, error: err.message }));
  });
}

export interface ControlPlaneProbeResult {
  ok: boolean;
  latencyMs: number | null;
  error?: string;
  state: ControlPlaneDTO;
  missingKeys: string[];
}

const CONTROL_PLANE_REQUIRED_KEYS = [
  "global_execution_state",
  "ai_enabled",
  "strategy_enabled",
  "emergency_stop",
] as const;

/**
 * Control Plane probe — read-only observation of execution governance state.
 * Operations never mutates Control Plane state.
 */
export async function probeControlPlane(timeoutMs = 3000): Promise<ControlPlaneProbeResult> {
  const unreachable = (error: string): ControlPlaneProbeResult => ({
    ok: false,
    latencyMs: null,
    error,
    missingKeys: [...CONTROL_PLANE_REQUIRED_KEYS],
    state: {
      reachable: false,
      globalExecutionState: null,
      aiEnabled: null,
      strategyEnabled: null,
      emergencyStop: null,
      updatedAt: null,
    },
  });

  const start = performance.now();
  try {
    const rows = (await Promise.race([
      db.select().from(controlPlaneState),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("control plane read timeout")), timeoutMs)),
    ])) as (typeof controlPlaneState.$inferSelect)[];

    const latencyMs = performance.now() - start;
    const byKey = new Map(rows.map((r) => [r.key, r]));
    const missingKeys = CONTROL_PLANE_REQUIRED_KEYS.filter((k) => !byKey.has(k));
    const parseBool = (key: string): boolean | null => {
      const row = byKey.get(key);
      return row ? row.value === "true" : null;
    };
    const latestUpdate = rows.reduce<Date | null>(
      (acc, r) => (acc === null || r.updatedAt > acc ? r.updatedAt : acc),
      null,
    );

    return {
      ok: missingKeys.length === 0,
      latencyMs,
      error: missingKeys.length > 0 ? `missing state keys: ${missingKeys.join(", ")}` : undefined,
      missingKeys: [...missingKeys],
      state: {
        reachable: true,
        globalExecutionState: byKey.get("global_execution_state")?.value ?? null,
        aiEnabled: parseBool("ai_enabled"),
        strategyEnabled: parseBool("strategy_enabled"),
        emergencyStop: parseBool("emergency_stop"),
        updatedAt: latestUpdate?.toISOString() ?? null,
      },
    };
  } catch (err) {
    return unreachable(err instanceof Error ? err.message : "control plane unreachable");
  }
}

export interface ProcessMetrics {
  cpuPct: number;
  rssMb: number;
  heapUsedMb: number;
  heapLimitMb: number;
  heapUsedPct: number;
  uptimeS: number;
  loadAvg1m: number;
  cpuCores: number;
}

interface CpuSamplerState {
  lastUsage: NodeJS.CpuUsage;
  lastAt: bigint;
}

const globalForProbes = globalThis as typeof globalThis & {
  __aitmCpuSampler?: CpuSamplerState;
  __aitmLoopHistogram?: IntervalHistogram;
};

/** Process-level runtime metrics. CPU% is delta-based between samples (single-core basis). */
export function collectProcessMetrics(): ProcessMetrics {
  const state =
    globalForProbes.__aitmCpuSampler ??
    (globalForProbes.__aitmCpuSampler = {
      lastUsage: process.cpuUsage(),
      lastAt: process.hrtime.bigint(),
    });

  const usage = process.cpuUsage();
  const now = process.hrtime.bigint();
  const elapsedUs = Number(now - state.lastAt) / 1000;
  const usedUs = usage.user - state.lastUsage.user + (usage.system - state.lastUsage.system);
  state.lastUsage = usage;
  state.lastAt = now;

  const cpuPct = elapsedUs > 0 ? Math.min(100, Math.max(0, (usedUs / elapsedUs) * 100)) : 0;
  const mem = process.memoryUsage();
  const heapLimit = v8.getHeapStatistics().heap_size_limit;

  return {
    cpuPct,
    rssMb: mem.rss / (1024 * 1024),
    heapUsedMb: mem.heapUsed / (1024 * 1024),
    heapLimitMb: heapLimit / (1024 * 1024),
    heapUsedPct: heapLimit > 0 ? (mem.heapUsed / heapLimit) * 100 : 0,
    uptimeS: process.uptime(),
    loadAvg1m: os.loadavg()[0] ?? 0,
    cpuCores: os.cpus().length || 1,
  };
}

export interface EventLoopLag {
  meanMs: number;
  maxMs: number;
}

/** Event-loop delay via perf_hooks histogram; reset after every sample. */
export function sampleEventLoopLag(): EventLoopLag {
  let histogram = globalForProbes.__aitmLoopHistogram;
  if (!histogram) {
    histogram = monitorEventLoopDelay({ resolution: 20 });
    histogram.enable();
    globalForProbes.__aitmLoopHistogram = histogram;
    return { meanMs: 0, maxMs: 0 };
  }
  const meanMs = histogram.mean / 1e6;
  const maxMs = histogram.max / 1e6;
  histogram.reset();
  return {
    meanMs: Number.isFinite(meanMs) ? meanMs : 0,
    maxMs: Number.isFinite(maxMs) ? maxMs : 0,
  };
}
