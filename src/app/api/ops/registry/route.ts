import type { NextRequest } from "next/server";
import { ensureMonitorStarted } from "@/lib/ops/monitor";
import {
  getAllComponents,
  registerComponent,
  unregisterComponent,
  validateRegistration,
} from "@/lib/ops/registry";

export const dynamic = "force-dynamic";

function authorized(request: NextRequest): boolean {
  const requiredToken = process.env.OPS_INGEST_TOKEN;
  return !requiredToken || request.headers.get("x-ops-token") === requiredToken;
}

/** Dynamic Component Registry — list all entries (active and inactive). */
export async function GET() {
  ensureMonitorStarted();
  try {
    const components = await getAllComponents();
    return Response.json({ components });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "registry unavailable" },
      { status: 500 },
    );
  }
}

/** Self-registration: a component declares itself, its dependencies, and alert rules. */
export async function POST(request: NextRequest) {
  ensureMonitorStarted();
  if (!authorized(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const validated = validateRegistration(body);
  if (typeof validated === "string") {
    return Response.json({ error: validated }, { status: 400 });
  }

  try {
    const component = await registerComponent(validated);
    return Response.json({ ok: true, component });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "registration failed" },
      { status: 500 },
    );
  }
}

/** Self-unregistration (soft): DELETE /api/ops/registry?componentId=... */
export async function DELETE(request: NextRequest) {
  ensureMonitorStarted();
  if (!authorized(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const componentId = request.nextUrl.searchParams.get("componentId") ?? "";
  if (!componentId) {
    return Response.json({ error: "componentId is required" }, { status: 400 });
  }
  try {
    const removed = await unregisterComponent(componentId);
    if (!removed) {
      return Response.json(
        { error: "component not found, already inactive, or platform-intrinsic" },
        { status: 400 },
      );
    }
    return Response.json({ ok: true, componentId });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "unregistration failed" },
      { status: 500 },
    );
  }
}
