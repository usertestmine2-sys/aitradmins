import { ensureBrainStarted } from "@/lib/brain/orchestrator";
import { validateStrategies } from "@/lib/brain/strategy-validation";
import { ensureMonitorStarted } from "@/lib/ops/monitor";

export const dynamic = "force-dynamic";

/**
 * Strategy Validation report: full metric set + classification per strategy
 * (Strong / Stable / Weak / Experimental / Retired). Strategies are never
 * deleted; classification is computed live from evaluated outcomes.
 */
export async function GET() {
  ensureMonitorStarted();
  ensureBrainStarted();
  try {
    const strategies = await validateStrategies();
    return Response.json({ strategies });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "strategy validation unavailable" },
      { status: 500 },
    );
  }
}
