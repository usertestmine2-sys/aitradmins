import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { brainMemory, decisionQuality, modelMemory } from "@/db/schema";
import { appendEvent } from "@/lib/events/audit-store";
import { readLatest } from "@/lib/brain/memory";

/**
 * AI Memory Validation Layer (Evolution Phase-1).
 * Audits memory correctness, detects conflicts and redundancy, and checks
 * recall consistency. Read-only over memory (append-only invariant intact);
 * emits brain.memory.validated with the findings.
 */

export interface MemoryValidationReport {
  validatedAt: string;
  checks: {
    name: string;
    status: "pass" | "warn" | "fail";
    detail: string;
    findings: number;
  }[];
  overall: "pass" | "warn" | "fail";
}

export async function validateMemory(): Promise<MemoryValidationReport> {
  const checks: MemoryValidationReport["checks"] = [];

  // 1. Calibration correctness: weights within [0.5, 1.5], structure valid.
  {
    const entry = await readLatest("learning", "calibration");
    let bad = 0;
    let detail = "no calibration written yet — defaults in effect";
    if (entry) {
      const weights = (entry.payload["weights"] ?? {}) as Record<string, unknown>;
      for (const [model, weight] of Object.entries(weights)) {
        if (typeof weight !== "number" || weight < 0.5 || weight > 1.5) {
          bad += 1;
          detail = `invalid weight for ${model}: ${String(weight)}`;
        }
      }
      if (bad === 0) detail = `${Object.keys(weights).length} model weights within bounds [0.5, 1.5]`;
    }
    checks.push({
      name: "calibration-correctness",
      status: bad > 0 ? "fail" : "pass",
      detail,
      findings: bad,
    });
  }

  // 2. Orphan decisions: decision memory without paper-trading validation memory.
  {
    const decisions = await db
      .select()
      .from(brainMemory)
      .where(eq(brainMemory.domain, "decision"))
      .orderBy(desc(brainMemory.id))
      .limit(200);
    const validations = await db
      .select()
      .from(brainMemory)
      .where(eq(brainMemory.domain, "paper_trading"))
      .orderBy(desc(brainMemory.id))
      .limit(400);
    const validatedIds = new Set(validations.map((v) => v.key).filter((k): k is string => typeof k === "string"));
    const orphans = decisions.filter((d) => {
      const id = d.payload?.["decisionId"];
      return typeof id === "string" && d.key && !d.key.startsWith("consensus-") && !validatedIds.has(id);
    });
    checks.push({
      name: "decision-validation-linkage",
      status: orphans.length > 0 ? "warn" : "pass",
      detail:
        orphans.length > 0
          ? `${orphans.length} decision(s) lack paper-trading validation records`
          : "every decision has a paper validation record",
      findings: orphans.length,
    });
  }

  // 3. Redundant learning: duplicate outcome keys (same lesson written twice).
  {
    const dupes = await db
      .select({ key: brainMemory.key, n: sql<number>`count(*)::int` })
      .from(brainMemory)
      .where(eq(brainMemory.domain, "learning"))
      .groupBy(brainMemory.key)
      .having(sql`count(*) > 1`);
    const redundant = dupes.filter((d) => d.key && d.key.startsWith("outcome-"));
    checks.push({
      name: "learning-redundancy",
      status: redundant.length > 0 ? "warn" : "pass",
      detail:
        redundant.length > 0
          ? `${redundant.length} outcome key(s) written more than once`
          : "no duplicate learning outcomes",
      findings: redundant.length,
    });
  }

  // 4. Model opinion conflicts: same model, same cycle:symbol, multiple opinions.
  {
    const dupes = await db
      .select({ modelId: modelMemory.modelId, key: modelMemory.key, n: sql<number>`count(*)::int` })
      .from(modelMemory)
      .where(eq(modelMemory.kind, "opinion"))
      .groupBy(modelMemory.modelId, modelMemory.key)
      .having(sql`count(*) > 1`);
    checks.push({
      name: "model-opinion-conflicts",
      status: dupes.length > 0 ? "warn" : "pass",
      detail:
        dupes.length > 0
          ? `${dupes.length} (model, cycle:symbol) pair(s) with conflicting duplicate opinions`
          : "one opinion per model per symbol per cycle",
      findings: dupes.length,
    });
  }

  // 5. Recall accuracy: pending expectations must reference live decision memory.
  {
    const pending = await db
      .select()
      .from(decisionQuality)
      .where(eq(decisionQuality.status, "pending"))
      .limit(100);
    let unrecallable = 0;
    for (const p of pending) {
      const recalled = await db
        .select({ id: brainMemory.id })
        .from(brainMemory)
        .where(eq(brainMemory.key, p.symbol))
        .orderBy(desc(brainMemory.id))
        .limit(1);
      if (recalled.length === 0) unrecallable += 1;
    }
    checks.push({
      name: "recall-accuracy",
      status: unrecallable > 0 ? "warn" : "pass",
      detail:
        unrecallable > 0
          ? `${unrecallable} pending expectation(s) whose decision memory could not be recalled`
          : `${pending.length} pending expectation(s), all recallable`,
      findings: unrecallable,
    });
  }

  // 6. Expired memory: market-context snapshots older than 7 days still latest.
  {
    const latestContext = await readLatest("market", "context");
    let expired = 0;
    let detail = "no market context written yet";
    if (latestContext) {
      const ageDays = (Date.now() - new Date(latestContext.createdAt).getTime()) / 86_400_000;
      if (ageDays > 7) {
        expired = 1;
        detail = `latest market context is ${ageDays.toFixed(1)} days old — stale for decision use`;
      } else {
        detail = `market context fresh (${(ageDays * 24).toFixed(1)}h old)`;
      }
    }
    checks.push({
      name: "expired-memory",
      status: expired > 0 ? "warn" : "pass",
      detail,
      findings: expired,
    });
  }

  const overall = checks.some((c) => c.status === "fail")
    ? "fail"
    : checks.some((c) => c.status === "warn")
      ? "warn"
      : "pass";

  const report: MemoryValidationReport = {
    validatedAt: new Date().toISOString(),
    checks,
    overall,
  };

  await appendEvent("brain.memory.validated", "ai-brain", {
    overall,
    findings: checks.reduce((a, c) => a + c.findings, 0),
    checks: checks.map((c) => ({ name: c.name, status: c.status, findings: c.findings })),
  });

  return report;
}
