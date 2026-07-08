import type { NextRequest } from "next/server";
import { appendEvent } from "@/lib/events/audit-store";
import { ensureMonitorStarted } from "@/lib/ops/monitor";
import { getComponent, registerComponent } from "@/lib/ops/registry";
import { isHealthStatus, type HealthStatus } from "@/lib/ops/types";

export const dynamic = "force-dynamic";

const COMPONENT_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,63}$/;

/**
 * Heartbeat ingestion contract.
 *
 * Heartbeats are transformed into standard platform events
 * (`system.heartbeat.received`) on the Event Backbone and persisted in the
 * Event Audit Store — there is no separate heartbeat storage.
 *
 * Unknown components are self-registered on first heartbeat (Dynamic
 * Component Registry); metadata can be enriched via POST /api/ops/registry.
 *
 * If OPS_INGEST_TOKEN is configured, callers must send it as `x-ops-token`.
 */
export async function POST(request: NextRequest) {
  ensureMonitorStarted();

  const requiredToken = process.env.OPS_INGEST_TOKEN;
  if (requiredToken && request.headers.get("x-ops-token") !== requiredToken) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const payload = body as { componentId?: unknown; status?: unknown; message?: unknown; metrics?: unknown };
  const componentId = typeof payload.componentId === "string" ? payload.componentId : "";
  if (!COMPONENT_ID_PATTERN.test(componentId)) {
    return Response.json({ error: "componentId must match [a-z0-9][a-z0-9-]{1,63}" }, { status: 400 });
  }

  const status: HealthStatus = isHealthStatus(payload.status) ? payload.status : "HEALTHY";
  const message = typeof payload.message === "string" ? payload.message.slice(0, 500) : "";
  const metrics: Record<string, number> = {};
  if (payload.metrics && typeof payload.metrics === "object") {
    for (const [key, value] of Object.entries(payload.metrics as Record<string, unknown>)) {
      if (typeof value === "number" && Number.isFinite(value) && key.length <= 64) {
        metrics[key] = value;
      }
    }
  }

  try {
    // Self-registration on first contact.
    const existing = await getComponent(componentId);
    if (!existing || !existing.active) {
      await registerComponent({
        id: componentId,
        name: existing?.name ?? componentId,
        description: existing?.description ?? "Self-registered via heartbeat.",
        kind: existing?.kind ?? "engine",
        mode: "heartbeat",
        heartbeatTimeoutSec: existing?.heartbeatTimeoutSec ?? 120,
        dependencies: existing?.dependencies ?? [],
        alertRules: existing?.alertRules ?? [],
      });
    } else if (existing.mode !== "heartbeat" && existing.mode !== "telemetry") {
      return Response.json({ error: "component is not heartbeat-monitored" }, { status: 400 });
    }

    // Transform into a standard platform event (backbone + audit store).
    await appendEvent("system.heartbeat.received", componentId, { status, message, metrics });
    return Response.json({ ok: true, componentId, status });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "heartbeat processing failed" },
      { status: 500 },
    );
  }
}
