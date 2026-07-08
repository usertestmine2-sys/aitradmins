import type { NextRequest } from "next/server";
import { getRecentEvents } from "@/lib/events/audit-store";
import { ensureMonitorStarted } from "@/lib/ops/monitor";

export const dynamic = "force-dynamic";

/** Read from the Event Audit Store. `all=1` includes heartbeat/sweep noise. */
export async function GET(request: NextRequest) {
  ensureMonitorStarted();
  const raw = Number(request.nextUrl.searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(raw) ? Math.min(Math.max(Math.trunc(raw), 1), 200) : 50;
  const includeNoisy = request.nextUrl.searchParams.get("all") === "1";
  try {
    const events = await getRecentEvents(limit, includeNoisy);
    return Response.json({ events });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "events unavailable" },
      { status: 500 },
    );
  }
}
