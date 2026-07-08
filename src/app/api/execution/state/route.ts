import { ensureExecutionEngineStarted, getExecutionState } from "@/lib/execution/engine";
import { ensureMonitorStarted } from "@/lib/ops/monitor";

export const dynamic = "force-dynamic";

/** Virtual portfolio, open positions, and recent order lifecycle states. */
export async function GET() {
  ensureMonitorStarted();
  ensureExecutionEngineStarted();
  try {
    const state = await getExecutionState();
    return Response.json(state);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "execution state unavailable" },
      { status: 500 },
    );
  }
}
