/**
 * Operations Console shared types. Client-safe: no Node.js imports.
 */

export const HEALTH_STATUSES = [
  "HEALTHY",
  "WARNING",
  "DEGRADED",
  "OFFLINE",
  "RESTARTING",
] as const;

export type HealthStatus = (typeof HEALTH_STATUSES)[number];

export function isHealthStatus(value: unknown): value is HealthStatus {
  return typeof value === "string" && (HEALTH_STATUSES as readonly string[]).includes(value);
}

export type AlertSeverity = "info" | "warning" | "critical";

export type SystemEventType =
  | "system.health.updated"
  | "system.warning"
  | "system.error"
  | "system.recovered"
  | "system.heartbeat.received"
  | "ops.component.registered"
  | "ops.component.unregistered"
  | "ops.sweep.completed"
  // Execution domain events (paper trading foundation)
  | "decision.approved"
  | "execution.requested"
  | "order.created"
  | "order.validated"
  | "order.executed"
  | "order.rejected"
  | "order.cancelled"
  | "position.updated"
  | "portfolio.updated"
  | "execution.completed"
  // AI Brain events
  | "brain.cycle.started"
  | "brain.stage.completed"
  | "brain.cycle.blocked"
  | "brain.decision.generated"
  | "brain.learning.updated"
  | "brain.cycle.completed"
  // AI Society events
  | "model.started"
  | "model.ready"
  | "model.reasoning"
  | "model.confidence.updated"
  | "model.disagreement"
  | "model.consensus"
  | "model.learning"
  | "model.memory.updated"
  | "model.suspended"
  | "model.resumed"
  | "model.stopped"
  // Evolution Phase-1: Decision Quality Layer events
  | "decision.created"
  | "decision.reasoning"
  | "decision.confidence"
  | "decision.risk_score"
  | "decision.expected_outcome"
  | "decision.final_action"
  | "brain.memory.validated"
  // Phase-2: strategy validation + learning loop events
  | "decision.validated"
  | "strategy.selected"
  | "strategy.scored"
  | "learning.completed"
  | "confidence.updated"
  | "market.context.updated"
  // Phase-3: AI Manager, advanced society, labs, graph, DNA, explainability
  | "ai.task.allocated"
  | "ai.challenge.raised"
  | "ai.debate.recorded"
  | "ai.dissent.recorded"
  | "strategy.generated"
  | "strategy.mutated"
  | "strategy.cloned"
  | "strategy.retired"
  | "strategy.archived"
  | "formula.created"
  | "knowledge.linked"
  | "dna.assessed"
  | "memory.ranked"
  | "decision.explained";

export interface SystemEvent {
  type: SystemEventType;
  componentId?: string | null;
  payload?: Record<string, unknown>;
  at: string;
}

export type MonitoringMode = "probe" | "heartbeat" | "internal" | "telemetry";

export type ComponentKind = "ui" | "engine" | "infrastructure" | "platform" | "control";

export type ProbeKind = "postgres" | "redis" | "control-plane";

export type DependencyCriticality = "critical" | "required" | "optional";

export interface DependencyDeclaration {
  componentId: string;
  criticality: DependencyCriticality;
}

export function isDependencyCriticality(value: unknown): value is DependencyCriticality {
  return value === "critical" || value === "required" || value === "optional";
}

/** Declarative metric threshold rule, supplied by a component at registration time. */
export interface MetricAlertRule {
  metric: string;
  op: "gt" | "lt";
  threshold: number;
  severity: AlertSeverity;
  title: string;
}

/** A dynamic registry entry (self-registered component). */
export interface RegistryComponentDTO {
  id: string;
  name: string;
  description: string;
  kind: ComponentKind;
  mode: MonitoringMode;
  probe: ProbeKind | null;
  heartbeatTimeoutSec: number;
  dependencies: DependencyDeclaration[];
  alertRules: MetricAlertRule[];
  active: boolean;
  source: "platform" | "self-registered";
  registeredAt: string;
}

export interface ComponentStateDTO {
  id: string;
  name: string;
  description: string;
  kind: ComponentKind;
  mode: MonitoringMode;
  source: string;
  dependencies: DependencyDeclaration[];
  status: HealthStatus;
  message: string;
  latencyMs: number | null;
  metrics: Record<string, number>;
  lastCheckedAt: string | null;
  lastStatusChangeAt: string | null;
}

export interface AlertDTO {
  id: number;
  dedupeKey: string;
  componentId: string | null;
  severity: AlertSeverity;
  title: string;
  message: string;
  status: "active" | "resolved";
  triggeredAt: string;
  resolvedAt: string | null;
}

export interface EventDTO {
  id: number;
  type: string;
  componentId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface MonitorInfo {
  started: boolean;
  intervalMs: number;
  sweepCount: number;
  lastSweepAt: string | null;
  lastSweepDurationMs: number;
  consecutiveFailures: number;
}

/** Read-only view of Control Plane state, as observed by Operations. */
export interface ControlPlaneDTO {
  reachable: boolean;
  globalExecutionState: string | null;
  aiEnabled: boolean | null;
  strategyEnabled: boolean | null;
  emergencyStop: boolean | null;
  updatedAt: string | null;
}

export interface OverviewDTO {
  generatedAt: string;
  globalStatus: HealthStatus;
  monitor: MonitorInfo;
  runtime: Record<string, number | null>;
  controlPlane: ControlPlaneDTO;
  components: ComponentStateDTO[];
  activeAlerts: AlertDTO[];
  recentEvents: EventDTO[];
}

/** Runtime metric names (app process + infrastructure). */
export const RUNTIME_METRIC_NAMES = [
  "cpu_pct",
  "mem_rss_mb",
  "heap_used_pct",
  "event_loop_lag_ms",
  "db_latency_ms",
  "redis_latency_ms",
  "sse_connections",
  "uptime_s",
] as const;

export interface MetricPoint {
  t: string;
  v: number;
}

export type MetricSeriesMap = Record<string, MetricPoint[]>;
