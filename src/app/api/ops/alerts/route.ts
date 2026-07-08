import type { NextRequest } from "next/server";
import { ensureMonitorStarted } from "@/lib/ops/monitor";
import { getAlerts } from "@/lib/ops/store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  ensureMonitorStarted();
  const statusParam = request.nextUrl.searchParams.get("status");
  const status = statusParam === "resolved" || statusParam === "all" ? statusParam : "active";
  try {
    const alerts = await getAlerts(status);
    return Response.json({ status, alerts });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "alerts unavailable" },
      { status: 500 },
    );
  }
}
