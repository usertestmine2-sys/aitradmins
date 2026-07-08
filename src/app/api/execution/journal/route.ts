import { desc, inArray } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { opsEvents } from "@/db/schema";
import { ensureExecutionEngineStarted } from "@/lib/execution/engine";
import { ensureMonitorStarted } from "@/lib/ops/monitor";

export const dynamic = "force-dynamic";

const JOURNAL_EVENT_TYPES = [
  "decision.approved",
  "execution.requested",
  "order.created",
  "order.validated",
  "order.executed",
  "order.rejected",
  "order.cancelled",
  "position.updated",
  "portfolio.updated",
  "execution.completed",
];

/**
 * Trade Journal — a filtered read of the Event Audit Store. Execution history
 * is stored ONLY as standard platform events; no separate journal storage.
 */
export async function GET(request: NextRequest) {
  ensureMonitorStarted();
  ensureExecutionEngineStarted();

  const raw = Number(request.nextUrl.searchParams.get("limit") ?? "100");
  const limit = Number.isFinite(raw) ? Math.min(Math.max(Math.trunc(raw), 1), 500) : 100;

  try {
    const rows = await db
      .select()
      .from(opsEvents)
      .where(inArray(opsEvents.type, JOURNAL_EVENT_TYPES))
      .orderBy(desc(opsEvents.id))
      .limit(limit);

    return Response.json({
      entries: rows.map((r) => ({
        id: r.id,
        type: r.type,
        componentId: r.componentId,
        payload: r.payload ?? {},
        at: r.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "journal unavailable" },
      { status: 500 },
    );
  }
}
