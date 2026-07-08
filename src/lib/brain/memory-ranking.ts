import { desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { brainMemory, knowledgeEdges } from "@/db/schema";
import { appendEvent } from "@/lib/events/audit-store";

/**
 * MEMORY RANKING (Phase-3) — extends the memory system with value
 * classification. Read-only: ranks are computed, reported and emitted;
 * NOTHING is ever deleted or modified.
 *
 * Classes: high-value · frequently-reused · expired · weak · conflicting · archived
 */

export interface RankedMemory {
  id: number;
  domain: string;
  key: string;
  ageDays: number;
  classes: string[];
  score: number; // 0..100
}

export interface MemoryRankingReport {
  rankedAt: string;
  totalEntries: number;
  classCounts: Record<string, number>;
  topMemories: RankedMemory[];
}

export async function rankMemories(limit = 300): Promise<MemoryRankingReport> {
  const rows = await db.select().from(brainMemory).orderBy(desc(brainMemory.id)).limit(limit);

  // Reuse frequency: appends per (domain, key) — keys written often are live working memory.
  const freq = await db
    .select({ domain: brainMemory.domain, key: brainMemory.key, n: sql<number>`count(*)::int` })
    .from(brainMemory)
    .groupBy(brainMemory.domain, brainMemory.key);
  const freqMap = new Map(freq.map((f) => [`${f.domain}:${f.key}`, f.n]));

  // Graph references: lessons linked into the knowledge graph are high-value.
  const referencedLessons = new Set(
    (
      await db
        .select({ fromId: knowledgeEdges.fromId })
        .from(knowledgeEdges)
        .where(sql`${knowledgeEdges.fromType} = 'lesson'`)
    ).map((r) => r.fromId),
  );

  // Latest id per key: older appends of a multi-version key are archived history.
  const latestPerKey = new Map<string, number>();
  for (const row of rows) {
    const domain = row.domain ?? "";
    const key = row.key ?? "";
    const k = `${domain}:${key}`;
    if (!latestPerKey.has(k)) latestPerKey.set(k, row.id); // rows are newest-first
  }

  const now = Date.now();
  const ranked: RankedMemory[] = [];
  const classCounts: Record<string, number> = {};
  const bump = (c: string) => (classCounts[c] = (classCounts[c] ?? 0) + 1);

  for (const row of rows) {
    const domain = row.domain ?? "";
    const key = row.key ?? "";
    const k = `${domain}:${key}`;
    const ageDays = (now - row.createdAt.getTime()) / 86_400_000;
    const reuse = freqMap.get(k) ?? 1;
    const isLatest = latestPerKey.get(k) === row.id;
    const classes: string[] = [];
    let score = 50;

    if (!isLatest) {
      classes.push("archived");
      score -= 25;
    }
    if (reuse >= 3) {
      classes.push("frequently-reused");
      score += 15;
    }
    if (key.startsWith("lesson-")) {
      score += 15;
      if (referencedLessons.has(key)) {
        classes.push("high-value");
        score += 15;
      }
    }
    if (key === "calibration" && isLatest) {
      classes.push("high-value");
      score += 20;
    }
    if (domain === "market" && ageDays > 7 && isLatest) {
      classes.push("expired");
      score -= 20;
    }
    if (key.startsWith("outcome-") && (freqMap.get(k) ?? 1) > 1) {
      classes.push("conflicting");
      score -= 15;
    }
    const evidence = row.payload?.["evidence"];
    if (key.startsWith("lesson-") && Array.isArray(evidence) && evidence.length === 0) {
      classes.push("weak");
      score -= 10;
    }
    if (classes.length === 0) classes.push(ageDays > 30 ? "weak" : "high-value");

    for (const c of classes) bump(c);
    ranked.push({
      id: row.id,
      domain,
      key,
      ageDays: Math.round(ageDays * 10) / 10,
      classes,
      score: Math.max(0, Math.min(100, score)),
    });
  }

  ranked.sort((a, b) => b.score - a.score);
  const report: MemoryRankingReport = {
    rankedAt: new Date().toISOString(),
    totalEntries: rows.length,
    classCounts,
    topMemories: ranked.slice(0, 30),
  };

  await appendEvent("memory.ranked", "brain-knowledge-manager", {
    totalEntries: rows.length,
    classCounts,
  });
  return report;
}
