import type { NextRequest } from "next/server";
import { appendEvent } from "@/lib/events/audit-store";
import { ensureMonitorStarted } from "@/lib/ops/monitor";
import { recordMetrics } from "@/lib/ops/store";

export const dynamic = "force-dynamic";

/**
 * Arena UI performance beacon. The browser sample is transformed into a
 * standard `system.heartbeat.received` platform event for the arena-ui
 * component — same event path as every other subsystem.
 */
export async function POST(request: NextRequest) {
  ensureMonitorStarted();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const payload = body as { renderMs?: unknown; fcpMs?: unknown; loadMs?: unknown };
  const clamp = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 && v < 120_000 ? v : null;

  const renderMs = clamp(payload.renderMs);
  const fcpMs = clamp(payload.fcpMs);
  const loadMs = clamp(payload.loadMs);

  const metrics: Record<string, number> = {};
  if (renderMs != null) metrics["ui_render_ms"] = renderMs;
  if (fcpMs != null) metrics["ui_fcp_ms"] = fcpMs;
  if (loadMs != null) metrics["ui_load_ms"] = loadMs;

  try {
    await appendEvent("system.heartbeat.received", "arena-ui", {
      status: "HEALTHY",
      message: "Client session active.",
      metrics,
    });
    if (renderMs != null) {
      await recordMetrics([{ componentId: "arena-ui", name: "ui_render_ms", value: renderMs, unit: "ms" }]);
    }
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "telemetry processing failed" },
      { status: 500 },
    );
  }
}
