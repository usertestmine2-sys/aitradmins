import { ensureBrainStarted, getBrainState } from "@/lib/brain/orchestrator";
import { ensureExecutionEngineStarted } from "@/lib/execution/engine";
import { ensureMonitorStarted } from "@/lib/ops/monitor";

export const dynamic = "force-dynamic";

/** AI Brain state: registered modules, last cycle, calibration, universe. */
export async function GET() {
  ensureMonitorStarted();
  ensureExecutionEngineStarted();
  ensureBrainStarted();
  try {
    const state = await getBrainState();
    return Response.json(state);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "brain state unavailable" },
      { status: 500 },
    );
  }
}
