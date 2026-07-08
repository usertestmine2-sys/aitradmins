import type { NextRequest } from "next/server";
import { ensureBrainStarted } from "@/lib/brain/orchestrator";
import { ingestBars, NSE_SYMBOL_PATTERN, type IngestBar } from "@/lib/brain/market";
import { ensureExecutionEngineStarted } from "@/lib/execution/engine";
import { ensureMonitorStarted } from "@/lib/ops/monitor";

export const dynamic = "force-dynamic";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Indian market data ingestion (EOD bars, NSE-first).
 * { "bars": [{ "symbol", "date", "open", "high", "low", "close", "volume", "exchange"? }] }
 * If OPS_INGEST_TOKEN is configured, callers must send it as `x-ops-token`.
 */
export async function POST(request: NextRequest) {
  ensureMonitorStarted();
  ensureExecutionEngineStarted();
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

  const rawBars = (body as { bars?: unknown }).bars;
  if (!Array.isArray(rawBars) || rawBars.length === 0 || rawBars.length > 5000) {
    return Response.json({ error: "bars must be a non-empty array (max 5000)" }, { status: 400 });
  }

  const bars: IngestBar[] = [];
  for (const raw of rawBars) {
    const b = raw as Record<string, unknown>;
    const symbol = typeof b.symbol === "string" ? b.symbol.toUpperCase() : "";
    const date = typeof b.date === "string" ? b.date : "";
    const exchange = b.exchange === "BSE" ? "BSE" : "NSE";
    const nums = [b.open, b.high, b.low, b.close] as unknown[];
    const volume = typeof b.volume === "number" && Number.isFinite(b.volume) && b.volume >= 0 ? b.volume : 0;
    if (
      !NSE_SYMBOL_PATTERN.test(symbol) ||
      !DATE_PATTERN.test(date) ||
      nums.some((n) => typeof n !== "number" || !Number.isFinite(n as number) || (n as number) <= 0)
    ) {
      return Response.json({ error: `invalid bar for symbol '${symbol}' date '${date}'` }, { status: 400 });
    }
    bars.push({
      symbol,
      exchange,
      barDate: date,
      open: b.open as number,
      high: b.high as number,
      low: b.low as number,
      close: b.close as number,
      volume,
    });
  }

  try {
    const written = await ingestBars(bars);
    return Response.json({ ok: true, barsWritten: written });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "ingestion failed" },
      { status: 500 },
    );
  }
}
