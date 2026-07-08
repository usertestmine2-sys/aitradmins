import type { NextRequest } from "next/server";
import { ensureBrainStarted } from "@/lib/brain/orchestrator";
import { readRecent } from "@/lib/brain/memory";
import { MEMORY_DOMAINS, type MemoryDomain } from "@/lib/brain/types";
import { ensureMonitorStarted } from "@/lib/ops/monitor";

export const dynamic = "force-dynamic";

/**
 * Read a Brain memory domain (append-only history, newest first).
 * Audit memory lives in the Event Audit Store (/api/ops/events).
 */
export async function GET(request: NextRequest) {
  ensureMonitorStarted();
  ensureBrainStarted();

  const domainParam = request.nextUrl.searchParams.get("domain") ?? "";
  if (!(MEMORY_DOMAINS as readonly string[]).includes(domainParam)) {
    return Response.json(
      { error: `domain must be one of: ${MEMORY_DOMAINS.join(", ")} (audit → /api/ops/events)` },
      { status: 400 },
    );
  }
  const raw = Number(request.nextUrl.searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(raw) ? Math.min(Math.max(Math.trunc(raw), 1), 500) : 50;

  try {
    const entries = await readRecent(domainParam as MemoryDomain, limit);
    return Response.json({ domain: domainParam, entries });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "memory unavailable" },
      { status: 500 },
    );
  }
}
