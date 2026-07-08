import type { NextRequest } from "next/server";
import { ensureBrainStarted, runBrainCycle } from "@/lib/brain/orchestrator";
import { ensureExecutionEngineStarted } from "@/lib/execution/engine";
import { ensureMonitorStarted } from "@/lib/ops/monitor";

export const dynamic = "force-dynamic";

/** Trigger one full AI Brain pipeline cycle. Serialized: concurrent runs are refused. */
export async function POST(request: NextRequest) {
  ensureMonitorStarted();
  ensureExecutionEngineStarted();
  ensureBrainStarted();

  const requiredToken = process.env.OPS_INGEST_TOKEN;
  if (requiredToken && request.headers.get("x-ops-token") !== requiredToken) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runBrainCycle();
    return Response.json({ ok: true, summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "brain cycle failed";
    const status = message.includes("already in progress") ? 409 : 500;
    return Response.json({ error: message }, { status });
  }
}
