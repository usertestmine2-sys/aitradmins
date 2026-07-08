import { rankMemories } from "@/lib/brain/memory-ranking";
import { ensureBrainStarted } from "@/lib/brain/orchestrator";
import { ensureMonitorStarted } from "@/lib/ops/monitor";

export const dynamic = "force-dynamic";

/** Memory ranking report: value classes over the memory store. Read-only. */
export async function GET() {
  ensureMonitorStarted();
  ensureBrainStarted();
  try {
    return Response.json(await rankMemories());
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "ranking unavailable" }, { status: 500 });
  }
}
