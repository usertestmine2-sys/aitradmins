import type { NextRequest } from "next/server";
import { assessMarketDna } from "@/lib/brain/market-dna";
import { ensureBrainStarted } from "@/lib/brain/orchestrator";
import { ensureMonitorStarted } from "@/lib/ops/monitor";

export const dynamic = "force-dynamic";

/** Market DNA: current fingerprint vs historical windows with similarity scoring. */
export async function GET(request: NextRequest) {
  ensureMonitorStarted();
  ensureBrainStarted();
  const index = (request.nextUrl.searchParams.get("index") ?? "NIFTY").toUpperCase();
  try {
    return Response.json(await assessMarketDna(index));
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "dna unavailable" }, { status: 500 });
  }
}
