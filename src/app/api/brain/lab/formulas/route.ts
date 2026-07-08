import type { NextRequest } from "next/server";
import { createFormula, ensureFormulasSeeded, FORMULA_KINDS, listFormulas, type FormulaKind } from "@/lib/brain/formula-lab";
import { ensureBrainStarted } from "@/lib/brain/orchestrator";
import { ensureMonitorStarted } from "@/lib/ops/monitor";

export const dynamic = "force-dynamic";

/** Formula Laboratory. GET → catalogue. POST → create/version a formula. */
export async function GET() {
  ensureMonitorStarted();
  ensureBrainStarted();
  try {
    await ensureFormulasSeeded();
    return Response.json({ formulas: await listFormulas() });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "formula lab unavailable" }, { status: 500 });
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
  const p = body as { kind?: unknown; name?: unknown; definition?: unknown; creator?: unknown; dependencies?: unknown; parentId?: unknown };
  if (!FORMULA_KINDS.includes(p.kind as FormulaKind) || typeof p.name !== "string" || !p.name.trim()) {
    return Response.json({ error: `kind (${FORMULA_KINDS.join("|")}) and name required` }, { status: 400 });
  }
  try {
    const id = await createFormula(
      {
        kind: p.kind as FormulaKind,
        name: p.name.trim().slice(0, 160),
        definition: p.definition && typeof p.definition === "object" ? (p.definition as Record<string, unknown>) : {},
        creator: typeof p.creator === "string" ? p.creator.slice(0, 60) : "external",
        dependencies:
          Array.isArray(p.dependencies) && p.dependencies.every((d) => typeof d === "string")
            ? (p.dependencies as string[]).slice(0, 20)
            : [],
      },
      typeof p.parentId === "string" ? p.parentId : undefined,
    );
    return Response.json({ ok: true, formulaId: id });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "formula creation failed" }, { status: 500 });
  }
}
