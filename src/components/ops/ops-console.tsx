"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AlertDTO,
  ComponentStateDTO,
  ControlPlaneDTO,
  EventDTO,
  HealthStatus,
  MetricSeriesMap,
  OverviewDTO,
} from "@/lib/ops/types";

const STATUS_STYLES: Record<HealthStatus, { dot: string; badge: string }> = {
  HEALTHY: { dot: "bg-emerald-400", badge: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/30" },
  WARNING: { dot: "bg-amber-400", badge: "bg-amber-500/10 text-amber-400 ring-amber-500/30" },
  DEGRADED: { dot: "bg-orange-400", badge: "bg-orange-500/10 text-orange-400 ring-orange-500/30" },
  OFFLINE: { dot: "bg-rose-500", badge: "bg-rose-500/10 text-rose-400 ring-rose-500/30" },
  RESTARTING: { dot: "bg-sky-400", badge: "bg-sky-500/10 text-sky-400 ring-sky-500/30" },
};

const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-rose-500/10 text-rose-400 ring-rose-500/30",
  warning: "bg-amber-500/10 text-amber-400 ring-amber-500/30",
  info: "bg-sky-500/10 text-sky-400 ring-sky-500/30",
};

function StatusBadge({ status }: { status: HealthStatus }) {
  const style = STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ring-1 ${style.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {status}
    </span>
  );
}

function Sparkline({ points, stroke }: { points: number[]; stroke: string }) {
  if (points.length < 2) {
    return <div className="h-9 w-full rounded bg-slate-800/40" />;
  }
  const width = 120;
  const height = 36;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const path = points
    .map((v, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = height - 3 - ((v - min) / range) * (height - 6);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-9 w-full" preserveAspectRatio="none">
      <polyline points={path} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function fmt(value: number | null | undefined, digits = 1, suffix = ""): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(digits)}${suffix}`;
}

function ago(iso: string | null): string {
  if (!iso) return "—";
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${Math.round(seconds)}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  return `${(seconds / 3600).toFixed(1)}h ago`;
}

function uptime(seconds: number | null): string {
  if (seconds == null) return "—";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

const GLOBAL_BANNER: Record<HealthStatus, { label: string; cls: string }> = {
  HEALTHY: { label: "ALL SYSTEMS OPERATIONAL", cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" },
  WARNING: { label: "OPERATING WITH WARNINGS", cls: "border-amber-500/40 bg-amber-500/10 text-amber-300" },
  DEGRADED: { label: "SYSTEM DEGRADED — SUBSYSTEMS IMPAIRED", cls: "border-orange-500/40 bg-orange-500/10 text-orange-300" },
  OFFLINE: { label: "PLATFORM OFFLINE — DATASTORE UNREACHABLE", cls: "border-rose-500/40 bg-rose-500/10 text-rose-300" },
  RESTARTING: { label: "SYSTEM STARTING UP", cls: "border-sky-500/40 bg-sky-500/10 text-sky-300" },
};

export default function OpsConsole({ initial }: { initial: OverviewDTO }) {
  const [overview, setOverview] = useState<OverviewDTO>(initial);
  const [series, setSeries] = useState<MetricSeriesMap>({});
  const [live, setLive] = useState(false);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/ops/overview", { cache: "no-store" });
      if (res.ok) setOverview((await res.json()) as OverviewDTO);
    } catch {
      // transient — next poll retries
    }
  }, []);

  const refreshSeries = useCallback(async () => {
    try {
      const res = await fetch("/api/ops/metrics?minutes=60", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { series: MetricSeriesMap };
        setSeries(data.series);
      }
    } catch {
      // transient
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await refreshSeries();
    };
    void init();
    const overviewPoll = setInterval(() => void refresh(), 15_000);
    const seriesPoll = setInterval(() => void refreshSeries(), 30_000);
    return () => {
      clearInterval(overviewPoll);
      clearInterval(seriesPoll);
    };
  }, [refresh, refreshSeries]);

  // Live channel: consumes platform events from the Event Backbone stream.
  useEffect(() => {
    const source = new EventSource("/api/ops/stream");
    const scheduleRefresh = () => {
      if (refreshTimer.current) return;
      refreshTimer.current = setTimeout(() => {
        refreshTimer.current = null;
        void refresh();
      }, 750);
    };
    source.onopen = () => setLive(true);
    source.onerror = () => setLive(false);
    for (const type of [
      "ops.sweep.completed",
      "system.health.updated",
      "system.warning",
      "system.error",
      "system.recovered",
      "system.heartbeat.received",
      "ops.component.registered",
      "ops.component.unregistered",
    ]) {
      source.addEventListener(type, scheduleRefresh);
    }
    return () => {
      source.close();
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [refresh]);

  const banner = GLOBAL_BANNER[overview.globalStatus];
  const seriesValues = (name: string) => (series[name] ?? []).map((p) => p.v);

  const runtimeCards: { label: string; name: string; value: string; stroke: string }[] = [
    { label: "CPU Usage", name: "cpu_pct", value: fmt(overview.runtime["cpu_pct"], 1, "%"), stroke: "#34d399" },
    { label: "Memory (RSS)", name: "mem_rss_mb", value: fmt(overview.runtime["mem_rss_mb"], 0, " MB"), stroke: "#60a5fa" },
    { label: "Event Loop Lag", name: "event_loop_lag_ms", value: fmt(overview.runtime["event_loop_lag_ms"], 1, " ms"), stroke: "#fbbf24" },
    { label: "DB Response", name: "db_latency_ms", value: fmt(overview.runtime["db_latency_ms"], 1, " ms"), stroke: "#a78bfa" },
    { label: "Redis Latency", name: "redis_latency_ms", value: fmt(overview.runtime["redis_latency_ms"], 1, " ms"), stroke: "#f472b6" },
    { label: "Live Connections", name: "sse_connections", value: fmt(overview.runtime["sse_connections"], 0), stroke: "#22d3ee" },
  ];

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-16 pt-6 sm:px-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold tracking-[0.18em] text-slate-100">AITRADEMINDS</span>
            <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold tracking-[0.14em] text-slate-400">
              OPERATIONS CONSOLE
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Platform health observability · {overview.components.length} registered components · sweep every{" "}
            {Math.round(overview.monitor.intervalMs / 1000)}s
          </p>
        </div>
        <div className="flex items-center gap-5 text-xs text-slate-400">
          <span className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${live ? "animate-pulse bg-emerald-400" : "bg-slate-600"}`} />
            {live ? "LIVE STREAM" : "POLLING"}
          </span>
          <span>Uptime {uptime(overview.runtime["uptime_s"])}</span>
          <span>Last sweep {ago(overview.monitor.lastSweepAt)}</span>
          <span>Sweeps {overview.monitor.sweepCount}</span>
        </div>
      </header>

      {/* Global status banner */}
      <div className={`mt-5 flex items-center justify-between rounded-xl border px-5 py-3.5 ${banner.cls}`}>
        <div className="flex items-center gap-3">
          <StatusBadge status={overview.globalStatus} />
          <span className="text-sm font-semibold tracking-wide">{banner.label}</span>
        </div>
        <span className="text-xs opacity-80">
          {overview.activeAlerts.length} active alert{overview.activeAlerts.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Runtime metrics */}
      <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {runtimeCards.map((card) => (
          <div key={card.name} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{card.label}</p>
            <p className="mt-1 text-xl font-semibold text-slate-100">{card.value}</p>
            <div className="mt-2">
              <Sparkline points={seriesValues(card.name)} stroke={card.stroke} />
            </div>
          </div>
        ))}
      </section>

      {/* Control Plane observation panel */}
      <ControlPlanePanel state={overview.controlPlane} />

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Component health grid — built dynamically from the registry */}
        <section className="xl:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Component Health <span className="ml-1 font-normal normal-case text-slate-600">(dynamic registry)</span>
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {overview.components.map((component) => (
              <ComponentCard key={component.id} component={component} />
            ))}
          </div>
        </section>

        {/* Alerts + audit events */}
        <section className="space-y-6">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Active Alerts</h2>
            <div className="mt-3 space-y-2">
              {overview.activeAlerts.length === 0 && (
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-5 text-center text-sm text-slate-500">
                  No active alerts — all monitored conditions nominal.
                </div>
              )}
              {overview.activeAlerts.map((alert) => (
                <AlertRow key={alert.id} alert={alert} />
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Event Audit Feed</h2>
            <div className="mt-3 max-h-[420px] space-y-1.5 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/60 p-3">
              {overview.recentEvents.length === 0 && (
                <p className="px-2 py-4 text-center text-sm text-slate-500">No events recorded yet.</p>
              )}
              {overview.recentEvents.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function ControlPlanePanel({ state }: { state: ControlPlaneDTO }) {
  const chip = (label: string, value: string, tone: "ok" | "warn" | "danger" | "neutral") => {
    const tones = {
      ok: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30",
      warn: "bg-amber-500/10 text-amber-300 ring-amber-500/30",
      danger: "bg-rose-500/10 text-rose-300 ring-rose-500/30",
      neutral: "bg-slate-700/30 text-slate-300 ring-slate-600/40",
    } as const;
    return (
      <div className="flex flex-col gap-1">
        <span className="text-[11px] uppercase tracking-wider text-slate-500">{label}</span>
        <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ring-1 ${tones[tone]}`}>{value}</span>
      </div>
    );
  };

  return (
    <section className="mt-4 rounded-xl border border-slate-800 bg-slate-900/60 px-5 py-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
          Control Plane <span className="normal-case text-slate-600">(observed read-only)</span>
        </p>
        <span className={`text-[11px] font-semibold ${state.reachable ? "text-emerald-400" : "text-rose-400"}`}>
          {state.reachable ? "REACHABLE" : "UNREACHABLE"}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {chip(
          "Global Execution",
          state.globalExecutionState ?? "UNKNOWN",
          state.globalExecutionState === "RUNNING" ? "ok" : state.globalExecutionState ? "neutral" : "danger",
        )}
        {chip(
          "AI State",
          state.aiEnabled == null ? "UNKNOWN" : state.aiEnabled ? "ENABLED" : "DISABLED",
          state.aiEnabled == null ? "danger" : state.aiEnabled ? "ok" : "neutral",
        )}
        {chip(
          "Strategy State",
          state.strategyEnabled == null ? "UNKNOWN" : state.strategyEnabled ? "ENABLED" : "DISABLED",
          state.strategyEnabled == null ? "danger" : state.strategyEnabled ? "ok" : "neutral",
        )}
        {chip(
          "Emergency Stop",
          state.emergencyStop == null ? "UNKNOWN" : state.emergencyStop ? "ACTIVE" : "CLEAR",
          state.emergencyStop == null ? "danger" : state.emergencyStop ? "danger" : "ok",
        )}
      </div>
    </section>
  );
}

function ComponentCard({ component }: { component: ComponentStateDTO }) {
  const keyMetrics = Object.entries(component.metrics).slice(0, 3);
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-100">{component.name}</p>
          <p className="text-[11px] uppercase tracking-wider text-slate-600">
            {component.kind} · {component.mode} · {component.source}
          </p>
        </div>
        <StatusBadge status={component.status} />
      </div>
      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-400">{component.message}</p>
      {component.dependencies.length > 0 && (
        <p className="mt-2 text-[11px] text-slate-600">
          depends on:{" "}
          {component.dependencies.map((d, i) => (
            <span key={d.componentId}>
              {i > 0 && ", "}
              <span className="text-slate-500">{d.componentId}</span>
              <span className="text-slate-700"> ({d.criticality})</span>
            </span>
          ))}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
        {component.latencyMs != null && <span>latency {component.latencyMs.toFixed(1)}ms</span>}
        {keyMetrics.map(([name, value]) => (
          <span key={name}>
            {name.replaceAll("_", " ")}: {Number.isInteger(value) ? value : value.toFixed(1)}
          </span>
        ))}
        <span className="ml-auto">checked {ago(component.lastCheckedAt)}</span>
      </div>
    </div>
  );
}

function AlertRow({ alert }: { alert: AlertDTO }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.info}`}>
          {alert.severity}
        </span>
        <span className="text-[11px] text-slate-500">{ago(alert.triggeredAt)}</span>
      </div>
      <p className="mt-1.5 text-sm font-semibold text-slate-200">{alert.title}</p>
      <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{alert.message}</p>
    </div>
  );
}

const EVENT_COLORS: Record<string, string> = {
  "system.error": "text-rose-400",
  "system.warning": "text-amber-400",
  "system.recovered": "text-emerald-400",
  "system.health.updated": "text-sky-400",
  "ops.component.registered": "text-violet-400",
  "ops.component.unregistered": "text-violet-400",
};

function EventRow({ event }: { event: EventDTO }) {
  const color = EVENT_COLORS[event.type] ?? "text-slate-400";
  const detail =
    typeof event.payload["title"] === "string"
      ? (event.payload["title"] as string)
      : typeof event.payload["message"] === "string"
        ? (event.payload["message"] as string)
        : event.type === "system.health.updated"
          ? `${String(event.payload["from"] ?? "∅")} → ${String(event.payload["to"] ?? "?")}`
          : typeof event.payload["name"] === "string"
            ? (event.payload["name"] as string)
            : "";
  return (
    <div className="flex items-baseline gap-2 rounded-lg px-2 py-1.5 font-mono text-[11px] hover:bg-slate-800/40">
      <span className="shrink-0 text-slate-600">{new Date(event.createdAt).toLocaleTimeString()}</span>
      <span className={`shrink-0 font-semibold ${color}`}>{event.type}</span>
      {event.componentId && <span className="shrink-0 text-slate-500">[{event.componentId}]</span>}
      <span className="truncate text-slate-400">{detail}</span>
    </div>
  );
}
