import { validateMemory } from "@/lib/brain/memory-validation";
import { ensureBrainStarted } from "@/lib/brain/orchestrator";
import { ensureMonitorStarted } from "@/lib/ops/monitor";

export const dynamic = "force-dynamic";

/** AI Memory Validation Layer: correctness, conflicts, redundancy, recall. */
export async function GET() {
  ensureMonitorStarted();
  ensureBrainStarted();
  try {
    const report = await validateMemory();
    return Response.json(report);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "memory validation failed" },
      { status: 500 },
    );
  }
}
