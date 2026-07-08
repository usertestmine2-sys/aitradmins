import type { NextRequest } from "next/server";
import { readLatest } from "@/lib/brain/memory";
import { ensureBrainStarted } from "@/lib/brain/orchestrator";
import { ensureMonitorStarted } from "@/lib/ops/monitor";

export const dynamic = "force-dynamic";

/** Explainable AI: the complete structured explanation for one decision. */
export async function GET(request: NextRequest) {
  ensureMonitorStarted();
  ensureBrainStarted();
  const decisionId = request.nextUrl.searchParams.get("decisionId") ?? "";
  if (!decisionId) {
    return Response.json({ error: "decisionId is required" }, { status: 400 });
  }
  try {
    const entry = await readLatest("decision", `explain-${decisionId}`);
    if (!entry) return Response.json({ error: "no explanation recorded for this decision" }, { status: 404 });
    return Response.json({ decisionId, explanation: entry.payload, recordedAt: entry.createdAt });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "explanation unavailable" }, { status: 500 });
  }
}
