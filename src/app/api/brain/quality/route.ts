import type { NextRequest } from "next/server";
import { ensureBrainStarted } from "@/lib/brain/orchestrator";
import { getQualityReport } from "@/lib/brain/quality";
import { ensureMonitorStarted } from "@/lib/ops/monitor";

export const dynamic = "force-dynamic";

/** Decision Quality Layer report: confidence, reasoning quality, risk, prediction error. */
export async function GET(request: NextRequest) {
  ensureMonitorStarted();
  ensureBrainStarted();
  const raw = Number(request.nextUrl.searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(raw) ? Math.min(Math.max(Math.trunc(raw), 1), 200) : 50;
  try {
    const report = await getQualityReport(limit);
    return Response.json(report);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "quality report unavailable" },
      { status: 500 },
    );
  }
}
