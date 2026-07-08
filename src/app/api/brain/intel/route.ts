import type { NextRequest } from "next/server";
import { db } from "@/db";
import { marketIntel } from "@/db/schema";
import { buildMarketIntelligence } from "@/lib/brain/intel";
import { getUniverse } from "@/lib/brain/market";
import { ensureBrainStarted } from "@/lib/brain/orchestrator";
import { ensureMonitorStarted } from "@/lib/ops/monitor";

export const dynamic = "force-dynamic";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const KINDS = ["news", "fii_dii", "sector_map", "rbi_event", "budget_event", "corporate_action"] as const;
const IMPACTS = ["high", "medium", "low"] as const;
const HORIZONS = ["short_term", "long_term"] as const;

/**
 * Indian market intelligence.
 * GET  → current intelligence snapshot (regimes, sector rotation, FII/DII, news risk).
 * POST → ingest intel items: { items: [{ kind, symbol?, sector?, impact?, horizon?, title?, value?, date }] }
 */
export async function GET() {
  ensureMonitorStarted();
  ensureBrainStarted();
  try {
    const universe = await getUniverse();
    const intelligence = await buildMarketIntelligence(universe);
    return Response.json(intelligence);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "intelligence unavailable" },
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

  const rawItems = (body as { items?: unknown }).items;
  if (!Array.isArray(rawItems) || rawItems.length === 0 || rawItems.length > 500) {
    return Response.json({ error: "items must be a non-empty array (max 500)" }, { status: 400 });
  }

  const values: (typeof marketIntel.$inferInsert)[] = [];
  for (const raw of rawItems) {
    const item = raw as Record<string, unknown>;
    const kind = item.kind as (typeof KINDS)[number];
    const date = typeof item.date === "string" ? item.date : "";
    if (!KINDS.includes(kind) || !DATE_PATTERN.test(date)) {
      return Response.json({ error: `invalid item: kind/date required (kinds: ${KINDS.join(", ")})` }, { status: 400 });
    }
    values.push({
      kind,
      symbol: typeof item.symbol === "string" ? item.symbol.toUpperCase().slice(0, 20) : null,
      sector: typeof item.sector === "string" ? item.sector.slice(0, 60) : null,
      impact: IMPACTS.includes(item.impact as (typeof IMPACTS)[number]) ? (item.impact as string) : null,
      horizon: HORIZONS.includes(item.horizon as (typeof HORIZONS)[number]) ? (item.horizon as string) : null,
      title: typeof item.title === "string" ? item.title.slice(0, 300) : "",
      value: typeof item.value === "number" && Number.isFinite(item.value) ? item.value : null,
      effectiveDate: date,
    });
  }

  try {
    await db.insert(marketIntel).values(values);
    return Response.json({ ok: true, itemsIngested: values.length });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "intel ingestion failed" },
      { status: 500 },
    );
  }
}
