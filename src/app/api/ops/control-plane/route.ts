import { probeControlPlane } from "@/lib/ops/probes";
import { ensureMonitorStarted } from "@/lib/ops/monitor";

export const dynamic = "force-dynamic";

/** Read-only Control Plane observation: Operations never mutates this state. */
export async function GET() {
  ensureMonitorStarted();
  try {
    const probe = await probeControlPlane();
    return Response.json({
      reachable: probe.state.reachable,
      latencyMs: probe.latencyMs,
      missingKeys: probe.missingKeys,
      state: probe.state,
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "control plane unreadable" },
      { status: 500 },
    );
  }
}
