import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { appendEvent } from "@/lib/events/audit-store";
import { ensureExecutionEngineStarted } from "@/lib/execution/engine";
import { isOrderSide } from "@/lib/execution/types";
import { ensureMonitorStarted } from "@/lib/ops/monitor";

export const dynamic = "force-dynamic";

const SYMBOL_PATTERN = /^[A-Z0-9.&-]{1,20}$/;

/**
 * Approved-decision ingestion point.
 *
 * Publishes a standard `decision.approved` platform event on the Event
 * Backbone; the Execution Engine is its only consumer. This route performs
 * schema validation only — ALL execution logic lives in the engine.
 *
 * If OPS_INGEST_TOKEN is configured, callers must send it as `x-ops-token`.
 */
export async function POST(request: NextRequest) {
  ensureMonitorStarted();
  ensureExecutionEngineStarted();

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

  const payload = body as {
    decisionId?: unknown;
    symbol?: unknown;
    side?: unknown;
    quantity?: unknown;
    price?: unknown;
    source?: unknown;
  };

  const decisionId =
    typeof payload.decisionId === "string" && payload.decisionId.length > 0 && payload.decisionId.length <= 64
      ? payload.decisionId
      : randomUUID();
  const symbol = typeof payload.symbol === "string" ? payload.symbol.toUpperCase() : "";
  if (!SYMBOL_PATTERN.test(symbol)) {
    return Response.json({ error: "symbol must match [A-Z0-9.&-]{1,20}" }, { status: 400 });
  }
  if (!isOrderSide(payload.side)) {
    return Response.json({ error: "side must be BUY, SELL, SHORT or COVER" }, { status: 400 });
  }
  const quantity = payload.quantity;
  if (typeof quantity !== "number" || !Number.isFinite(quantity) || quantity <= 0 || quantity > 1_000_000) {
    return Response.json({ error: "quantity must be a positive number ≤ 1,000,000" }, { status: 400 });
  }
  const price = payload.price;
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0 || price > 10_000_000) {
    return Response.json({ error: "price must be a positive number" }, { status: 400 });
  }
  const source = payload.source === "strategy" ? "strategy" : "ai";

  try {
    await appendEvent("decision.approved", source === "ai" ? "ai-engine" : "strategy-engine", {
      decisionId,
      symbol,
      side: payload.side,
      quantity,
      price,
      source,
    });
    return Response.json({ ok: true, decisionId, accepted: true });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "decision publication failed" },
      { status: 500 },
    );
  }
}
