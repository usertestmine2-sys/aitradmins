import type { NextRequest } from "next/server";
import { ensureMonitorStarted } from "@/lib/ops/monitor";
import { getMetricSeries } from "@/lib/ops/store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  ensureMonitorStarted();
  const raw = Number(request.nextUrl.searchParams.get("minutes") ?? "60");
  const minutes = Number.isFinite(raw) ? Math.min(Math.max(Math.trunc(raw), 5), 24 * 60) : 60;
  try {
    const series = await getMetricSeries(minutes);
    return Response.json({ minutes, series });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "metrics unavailable" },
      { status: 500 },
    );
  }
}
