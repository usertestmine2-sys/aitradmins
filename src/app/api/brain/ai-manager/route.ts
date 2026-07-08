import { ensureBrainStarted } from "@/lib/brain/orchestrator";
import { getAiManagerState } from "@/lib/brain/society/ai-manager";
import { ensureMonitorStarted } from "@/lib/ops/monitor";

export const dynamic = "force-dynamic";

/** AI Manager state: models, permissions, load balancing, isolation attestation. */
export async function GET() {
  ensureMonitorStarted();
  ensureBrainStarted();
  try {
    return Response.json(await getAiManagerState());
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "ai manager unavailable" }, { status: 500 });
  }
}
