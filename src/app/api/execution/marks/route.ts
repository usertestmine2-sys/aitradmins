import type { NextRequest } from "next/server";
import { ensureExecutionEngineStarted, updateMarks } from "@/lib/execution/engine";
import { ensureMonitorStarted } from "@/lib/ops/monitor";

export const dynamic = "force-dynamic";

const SYMBOL_PATTERN = /^[A-Z0-9.&-]{1,20}$/;

/**
 * Mark-to-market ingestion: { "marks": { "SYMBOL": price } }.
 * Updates current price on open positions and recomputes unrealized PnL.
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

  const raw = (body as { marks?: unknown }).marks;
  if (!raw || typeof raw !== "object") {
    return Response.json({ error: "marks object is required" }, { status: 400 });
  }

  const marks: Record<string, number> = {};
  for (const [symbol, price] of Object.entries(raw as Record<string, unknown>)) {
    const upper = symbol.toUpperCase();
    if (SYMBOL_PATTERN.test(upper) && typeof price === "number" && Number.isFinite(price) && price > 0) {
      marks[upper] = price;
    }
  }

  try {
    const updated = await updateMarks(marks);
    return Response.json({ ok: true, positionsUpdated: updated });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "mark update failed" },
      { status: 500 },
    );
  }
}
