import { eq } from "drizzle-orm";
import { db } from "@/db";
import { controlPlaneState, opsRegistry } from "@/db/schema";
import { appendEvent } from "@/lib/events/audit-store";
import {
  isDependencyCriticality,
  isHealthStatus,
  type ComponentKind,
  type DependencyDeclaration,
  type MetricAlertRule,
  type MonitoringMode,
  type ProbeKind,
  type RegistryComponentDTO,
} from "@/lib/ops/types";

/**
 * Dynamic Component Registry.
 *
 * There is NO hardcoded monitored-component list. Components self-register
 * (explicitly via the registry API, or implicitly on first heartbeat) and
 * self-unregister. The monitoring sweep and the Operations Console are built
 * entirely from this registry at runtime.
 *
 * Platform-intrinsic subsystems (the process's own database pool, cache,
 * event backbone, realtime hub, workers, control plane, and Arena UI shell)
 * register THEMSELVES at boot through the same registration path — they are
 * self-registrations by the platform process, not a fixed monitoring list.
 */

const COMPONENT_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,63}$/;

export interface RegistrationInput {
  id: string;
  name: string;
  description?: string;
  kind?: ComponentKind;
  mode?: MonitoringMode;
  probe?: ProbeKind | null;
  heartbeatTimeoutSec?: number;
  dependencies?: DependencyDeclaration[];
  alertRules?: MetricAlertRule[];
  source?: "platform" | "self-registered";
}

const VALID_KINDS: ComponentKind[] = ["ui", "engine", "infrastructure", "platform", "control"];
const VALID_MODES: MonitoringMode[] = ["probe", "heartbeat", "internal", "telemetry"];
const VALID_PROBES: ProbeKind[] = ["postgres", "redis", "control-plane"];

export function validateRegistration(input: unknown): RegistrationInput | string {
  const raw = input as Record<string, unknown>;
  if (!raw || typeof raw !== "object") return "body must be an object";
  const id = typeof raw.id === "string" ? raw.id : "";
  if (!COMPONENT_ID_PATTERN.test(id)) return "id must match [a-z0-9][a-z0-9-]{1,63}";
  const name = typeof raw.name === "string" && raw.name.trim() ? raw.name.trim().slice(0, 120) : "";
  if (!name) return "name is required";

  const kind = VALID_KINDS.includes(raw.kind as ComponentKind) ? (raw.kind as ComponentKind) : "engine";
  const mode = VALID_MODES.includes(raw.mode as MonitoringMode) ? (raw.mode as MonitoringMode) : "heartbeat";
  const probe = VALID_PROBES.includes(raw.probe as ProbeKind) ? (raw.probe as ProbeKind) : null;
  if (mode === "probe" && !probe) return "probe-mode components must declare a supported probe";

  const dependencies: DependencyDeclaration[] = [];
  if (Array.isArray(raw.dependencies)) {
    for (const dep of raw.dependencies.slice(0, 20)) {
      const d = dep as Record<string, unknown>;
      if (typeof d?.componentId === "string" && COMPONENT_ID_PATTERN.test(d.componentId) && isDependencyCriticality(d.criticality)) {
        dependencies.push({ componentId: d.componentId, criticality: d.criticality });
      }
    }
  }

  const alertRules: MetricAlertRule[] = [];
  if (Array.isArray(raw.alertRules)) {
    for (const rule of raw.alertRules.slice(0, 20)) {
      const r = rule as Record<string, unknown>;
      if (
        typeof r?.metric === "string" &&
        r.metric.length <= 64 &&
        (r.op === "gt" || r.op === "lt") &&
        typeof r.threshold === "number" &&
        Number.isFinite(r.threshold) &&
        (r.severity === "info" || r.severity === "warning" || r.severity === "critical") &&
        typeof r.title === "string" &&
        r.title.length > 0
      ) {
        alertRules.push({
          metric: r.metric,
          op: r.op,
          threshold: r.threshold,
          severity: r.severity,
          title: r.title.slice(0, 160),
        });
      }
    }
  }

  const timeoutRaw = typeof raw.heartbeatTimeoutSec === "number" ? raw.heartbeatTimeoutSec : 120;
  return {
    id,
    name,
    description: typeof raw.description === "string" ? raw.description.slice(0, 300) : "",
    kind,
    mode,
    probe,
    heartbeatTimeoutSec: Math.min(Math.max(Math.trunc(timeoutRaw), 15), 86_400),
    dependencies,
    alertRules,
  };
}

/** Register (or re-activate/update) a component. Emits ops.component.registered on change. */
export async function registerComponent(input: RegistrationInput): Promise<RegistryComponentDTO> {
  const existing = await db.select().from(opsRegistry).where(eq(opsRegistry.componentId, input.id)).limit(1);
  const wasActive = existing.length > 0 && existing[0].active;
  const now = new Date();

  await db
    .insert(opsRegistry)
    .values({
      componentId: input.id,
      name: input.name,
      description: input.description ?? "",
      kind: input.kind ?? "engine",
      mode: input.mode ?? "heartbeat",
      probe: input.probe ?? null,
      heartbeatTimeoutSec: input.heartbeatTimeoutSec ?? 120,
      dependencies: input.dependencies ?? [],
      alertRules: input.alertRules ?? [],
      active: true,
      source: input.source ?? "self-registered",
      registeredAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: opsRegistry.componentId,
      set: {
        name: input.name,
        description: input.description ?? "",
        kind: input.kind ?? "engine",
        mode: input.mode ?? "heartbeat",
        probe: input.probe ?? null,
        heartbeatTimeoutSec: input.heartbeatTimeoutSec ?? 120,
        dependencies: input.dependencies ?? [],
        alertRules: input.alertRules ?? [],
        active: true,
        updatedAt: now,
      },
    });

  if (!wasActive) {
    await appendEvent("ops.component.registered", input.id, {
      name: input.name,
      mode: input.mode ?? "heartbeat",
      source: input.source ?? "self-registered",
    });
  }

  const rows = await db.select().from(opsRegistry).where(eq(opsRegistry.componentId, input.id)).limit(1);
  return toDTO(rows[0]);
}

/** Soft-unregister: deactivates monitoring while preserving full audit history. */
export async function unregisterComponent(componentId: string): Promise<boolean> {
  const rows = await db.select().from(opsRegistry).where(eq(opsRegistry.componentId, componentId)).limit(1);
  if (rows.length === 0 || !rows[0].active) return false;
  if (rows[0].source === "platform") return false; // platform-intrinsic components cannot be removed externally
  await db
    .update(opsRegistry)
    .set({ active: false, updatedAt: new Date() })
    .where(eq(opsRegistry.componentId, componentId));
  await appendEvent("ops.component.unregistered", componentId, { name: rows[0].name });
  return true;
}

export async function getActiveComponents(): Promise<RegistryComponentDTO[]> {
  const rows = await db.select().from(opsRegistry).where(eq(opsRegistry.active, true));
  return rows.map(toDTO).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getAllComponents(): Promise<RegistryComponentDTO[]> {
  const rows = await db.select().from(opsRegistry);
  return rows.map(toDTO).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getComponent(componentId: string): Promise<RegistryComponentDTO | null> {
  const rows = await db.select().from(opsRegistry).where(eq(opsRegistry.componentId, componentId)).limit(1);
  return rows.length > 0 ? toDTO(rows[0]) : null;
}

/**
 * Boot-time self-registration of the platform process's own subsystems,
 * including their dependency declarations. Idempotent.
 */
export async function ensurePlatformSelfRegistration(): Promise<void> {
  const platformComponents: RegistrationInput[] = [
    {
      id: "database",
      name: "PostgreSQL Database",
      description: "Primary datastore and Event Audit Store backing storage. Actively probed.",
      kind: "infrastructure",
      mode: "probe",
      probe: "postgres",
      dependencies: [],
    },
    {
      id: "redis-cache",
      name: "Redis Cache",
      description: "Cache tier. Actively probed via RESP PING.",
      kind: "infrastructure",
      mode: "probe",
      probe: "redis",
      dependencies: [],
    },
    {
      id: "control-plane",
      name: "Control Plane",
      description: "Global execution state, AI/strategy enablement, emergency stop. Observed read-only.",
      kind: "control",
      mode: "probe",
      probe: "control-plane",
      dependencies: [{ componentId: "database", criticality: "critical" }],
    },
    {
      id: "event-backbone",
      name: "Event Backbone",
      description: "Platform event bus carrying all system.* events.",
      kind: "platform",
      mode: "internal",
      dependencies: [],
    },
    {
      id: "realtime-layer",
      name: "Realtime Layer (WS/SSE)",
      description: "Streams platform events to connected consoles.",
      kind: "platform",
      mode: "internal",
      dependencies: [{ componentId: "event-backbone", criticality: "required" }],
    },
    {
      id: "background-workers",
      name: "Background Workers",
      description: "Monitoring sweep scheduler and retention jobs (self-monitoring).",
      kind: "platform",
      mode: "internal",
      dependencies: [{ componentId: "database", criticality: "critical" }],
    },
    {
      id: "arena-ui",
      name: "Arena UI",
      description: "Client console shell. Observed via browser performance telemetry.",
      kind: "ui",
      mode: "telemetry",
      heartbeatTimeoutSec: 1800,
      dependencies: [{ componentId: "realtime-layer", criticality: "optional" }],
    },
  ];

  for (const component of platformComponents) {
    await registerComponent({ ...component, source: "platform" });
  }
}

/** Seed Control Plane state keys if absent (safe defaults: everything disabled/standby). */
export async function ensureControlPlaneSeeded(): Promise<void> {
  const defaults: Record<string, string> = {
    global_execution_state: "STANDBY",
    ai_enabled: "false",
    strategy_enabled: "false",
    emergency_stop: "false",
  };
  for (const [key, value] of Object.entries(defaults)) {
    await db.insert(controlPlaneState).values({ key, value }).onConflictDoNothing();
  }
}

function toDTO(row: typeof opsRegistry.$inferSelect): RegistryComponentDTO {
  const dependencies: DependencyDeclaration[] = [];
  for (const dep of row.dependencies ?? []) {
    if (isDependencyCriticality(dep.criticality)) {
      dependencies.push({ componentId: dep.componentId, criticality: dep.criticality });
    }
  }
  const alertRules: MetricAlertRule[] = [];
  for (const rule of row.alertRules ?? []) {
    if ((rule.op === "gt" || rule.op === "lt") && (rule.severity === "info" || rule.severity === "warning" || rule.severity === "critical")) {
      alertRules.push({
        metric: rule.metric,
        op: rule.op,
        threshold: rule.threshold,
        severity: rule.severity,
        title: rule.title,
      });
    }
  }
  return {
    id: row.componentId,
    name: row.name,
    description: row.description,
    kind: (VALID_KINDS.includes(row.kind as ComponentKind) ? row.kind : "engine") as ComponentKind,
    mode: (VALID_MODES.includes(row.mode as MonitoringMode) ? row.mode : "heartbeat") as MonitoringMode,
    probe: VALID_PROBES.includes(row.probe as ProbeKind) ? (row.probe as ProbeKind) : null,
    heartbeatTimeoutSec: row.heartbeatTimeoutSec,
    dependencies,
    alertRules,
    active: row.active,
    source: row.source === "platform" ? "platform" : "self-registered",
    registeredAt: row.registeredAt.toISOString(),
  };
}

// Re-export for callers that validate heartbeat statuses alongside registration.
export { isHealthStatus };
