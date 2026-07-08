import type { NextRequest } from "next/server";
import { buildMarketContext, getUniverse } from "@/lib/brain/market";
import { ensureBrainStarted } from "@/lib/brain/orchestrator";
import {
  archiveStrategy,
  backtestStrategy,
  cloneStrategy,
  generateStrategy,
  getStrategyLineage,
  mutateStrategy,
  retireStrategy,
} from "@/lib/brain/strategy-lab";
import { ensureMonitorStarted } from "@/lib/ops/monitor";

export const dynamic = "force-dynamic";

/** Strategy Laboratory. GET → full lineage. POST → { action, strategyId?, symbols? }. */
export async function GET() {
  ensureMonitorStarted();
  ensureBrainStarted();
  try {
    return Response.json({ strategies: await getStrategyLineage() });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "lab unavailable" }, { status: 500 });
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
  const payload = body as { action?: unknown; strategyId?: unknown; symbols?: unknown; seed?: unknown };
  const action = typeof payload.action === "string" ? payload.action : "";
  const strategyId = typeof payload.strategyId === "string" ? payload.strategyId : "";
  const seed = typeof payload.seed === "number" ? payload.seed : undefined;

  try {
    switch (action) {
      case "generate": {
        const universe = await getUniverse();
        const context = await buildMarketContext(universe);
        const id = await generateStrategy(context.regime, seed);
        return Response.json({ ok: true, strategyId: id });
      }
      case "clone": {
        const id = await cloneStrategy(strategyId);
        return id ? Response.json({ ok: true, strategyId: id }) : Response.json({ error: "unknown strategyId" }, { status: 404 });
      }
      case "mutate": {
        const id = await mutateStrategy(strategyId, seed);
        return id ? Response.json({ ok: true, strategyId: id }) : Response.json({ error: "unknown strategyId" }, { status: 404 });
      }
      case "retire":
        return (await retireStrategy(strategyId))
          ? Response.json({ ok: true })
          : Response.json({ error: "unknown strategyId" }, { status: 404 });
      case "archive":
        return (await archiveStrategy(strategyId))
          ? Response.json({ ok: true })
          : Response.json({ error: "unknown strategyId" }, { status: 404 });
      case "backtest": {
        const universe = await getUniverse();
        const symbols =
          Array.isArray(payload.symbols) && payload.symbols.every((s) => typeof s === "string")
            ? (payload.symbols as string[])
            : universe;
        const context = await buildMarketContext(universe);
        const result = await backtestStrategy(strategyId, symbols, context);
        return result ? Response.json({ ok: true, result }) : Response.json({ error: "unknown strategyId" }, { status: 404 });
      }
      default:
        return Response.json({ error: "action must be generate|clone|mutate|retire|archive|backtest" }, { status: 400 });
    }
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "lab action failed" }, { status: 500 });
  }
}
