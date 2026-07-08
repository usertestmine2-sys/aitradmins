import type { NextRequest } from "next/server";
import { getGraphStats, getNeighbors, syncKnowledgeGraph } from "@/lib/brain/knowledge-graph";
import { ensureBrainStarted } from "@/lib/brain/orchestrator";
import { ensureMonitorStarted } from "@/lib/ops/monitor";

export const dynamic = "force-dynamic";

/** Knowledge Graph. GET → stats or ?type=&id= neighbors. POST → sync. */
export async function GET(request: NextRequest) {
  ensureMonitorStarted();
  ensureBrainStarted();
  const type = request.nextUrl.searchParams.get("type");
  const id = request.nextUrl.searchParams.get("id");
  try {
    if (type && id) {
      return Response.json({ entity: { type, id }, edges: await getNeighbors(type, id) });
    }
    return Response.json(await getGraphStats());
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "graph unavailable" }, { status: 500 });
  }
}

export async function POST() {
  ensureMonitorStarted();
  ensureBrainStarted();
  try {
    return Response.json({ ok: true, ...(await syncKnowledgeGraph()) });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "graph sync failed" }, { status: 500 });
  }
}
