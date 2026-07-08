import type { NextRequest } from "next/server";
import { ensureBrainStarted } from "@/lib/brain/orchestrator";
import {
  ensureSocietySeeded,
  listModels,
  setModelLifecycle,
  type LifecycleAction,
} from "@/lib/brain/society/manager";
import { readModelMemory } from "@/lib/brain/society/memory";
import { ensureMonitorStarted } from "@/lib/ops/monitor";

export const dynamic = "force-dynamic";

const ACTIONS: LifecycleAction[] = ["start", "stop", "suspend", "resume"];

/**
 * AI Society Model Manager API.
 * GET  → model states (lifecycle, performance stats); ?memory=<modelId> also
 *        returns that single model's own memory (per-model scoped, never bulk).
 * POST → lifecycle action: { modelId, action: start|stop|suspend|resume }.
 */
export async function GET(request: NextRequest) {
  ensureMonitorStarted();
  ensureBrainStarted();
  try {
    await ensureSocietySeeded();
    const models = await listModels();
    const memoryFor = request.nextUrl.searchParams.get("memory");
    if (memoryFor && models.some((m) => m.id === memoryFor)) {
      const kindParam = request.nextUrl.searchParams.get("kind");
      const kind =
        kindParam === "opinion" || kindParam === "discussion" || kindParam === "learning" || kindParam === "context"
          ? kindParam
          : null;
      const memory = await readModelMemory(memoryFor, kind, 50);
      return Response.json({ models, memory: { modelId: memoryFor, entries: memory } });
    }
    return Response.json({ models });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "model manager unavailable" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  ensureMonitorStarted();
  ensureBrainStarted();

  const requiredToken = process.env.OPS_INGEST_TOKEN;
  if (requiredToken && request.headers.get("x-ops-token") !== requiredToken) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const payload = body as { modelId?: unknown; action?: unknown };
  const modelId = typeof payload.modelId === "string" ? payload.modelId : "";
  const action = payload.action as LifecycleAction;
  if (!modelId || !ACTIONS.includes(action)) {
    return Response.json({ error: "modelId and action (start|stop|suspend|resume) required" }, { status: 400 });
  }

  try {
    await ensureSocietySeeded();
    const model = await setModelLifecycle(modelId, action);
    if (!model) return Response.json({ error: "unknown modelId" }, { status: 404 });
    return Response.json({ ok: true, model });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "lifecycle action failed" },
      { status: 500 },
    );
  }
}
