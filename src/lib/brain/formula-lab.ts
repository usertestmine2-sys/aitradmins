import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { brainFormulas, brainStrategies } from "@/db/schema";
import { appendEvent } from "@/lib/events/audit-store";

/**
 * FORMULA LABORATORY (Phase-3) — extends the single Formula Manager.
 * Formulas become first-class versioned entities: indicators, entry rules,
 * exit rules, position sizing, risk formulas, market filters. New versions
 * are new rows (parentId lineage). Nothing is ever overwritten.
 */

export const FORMULA_KINDS = [
  "indicator",
  "entry_rule",
  "exit_rule",
  "position_sizing",
  "risk",
  "market_filter",
] as const;
export type FormulaKind = (typeof FORMULA_KINDS)[number];

export interface FormulaInput {
  kind: FormulaKind;
  name: string;
  definition: Record<string, unknown>;
  creator: string;
  dependencies?: string[];
}

export async function createFormula(input: FormulaInput, parentId?: string): Promise<string> {
  let version = 1;
  if (parentId) {
    const parent = await db.select().from(brainFormulas).where(eq(brainFormulas.id, parentId)).limit(1);
    if (parent.length > 0) version = parent[0].version + 1;
  }
  const id = `fml-${randomUUID().slice(0, 8)}`;
  await db.insert(brainFormulas).values({
    id,
    kind: input.kind,
    name: input.name,
    definition: input.definition,
    creator: input.creator,
    version,
    parentId: parentId ?? null,
    dependencies: input.dependencies ?? [],
    stats: { evaluations: 0, successes: 0 },
    confidence: 0.5,
    status: "active",
  });
  await appendEvent("formula.created", "brain-formula-manager", {
    formulaId: id,
    kind: input.kind,
    name: input.name,
    creator: input.creator,
    version,
    parentId: parentId ?? null,
  });
  return id;
}

/** Success feedback: confidence moves as a bounded running success rate blend. */
export async function recordFormulaOutcome(formulaId: string, success: boolean): Promise<void> {
  const rows = await db.select().from(brainFormulas).where(eq(brainFormulas.id, formulaId)).limit(1);
  if (rows.length === 0) return;
  const stats = { ...rows[0].stats };
  stats["evaluations"] = (stats["evaluations"] ?? 0) + 1;
  if (success) stats["successes"] = (stats["successes"] ?? 0) + 1;
  const rate = (stats["successes"] ?? 0) / stats["evaluations"];
  const confidence = Math.round((0.3 + 0.7 * rate) * 1000) / 1000;
  await db.update(brainFormulas).set({ stats, confidence }).where(eq(brainFormulas.id, formulaId));
}

export async function listFormulas() {
  const rows = await db.select().from(brainFormulas).orderBy(desc(brainFormulas.createdAt));
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    name: r.name,
    definition: r.definition,
    creator: r.creator,
    version: r.version,
    parentId: r.parentId,
    dependencies: r.dependencies,
    stats: r.stats,
    confidence: r.confidence,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
  }));
}

/**
 * Seed the laboratory from the formulas ALREADY IN USE across the platform —
 * the lab starts as a faithful catalogue of live logic, not fiction.
 */
export async function ensureFormulasSeeded(): Promise<void> {
  const existing = await db.select({ id: brainFormulas.id }).from(brainFormulas).limit(1);
  if (existing.length > 0) return;

  const seeds: FormulaInput[] = [
    { kind: "indicator", name: "EMA-20/50 Trend Structure", creator: "system", definition: { type: "ema_pair", fast: 20, slow: 50, usage: "trend alignment + regime detection" } },
    { kind: "indicator", name: "RSI-14", creator: "system", definition: { type: "rsi", period: 14, oversold: 30, overbought: 70 } },
    { kind: "indicator", name: "ATR-14", creator: "system", definition: { type: "atr", period: 14, usage: "risk sizing + stops + expectations" } },
    { kind: "indicator", name: "ROC-10 Momentum", creator: "system", definition: { type: "roc", period: 10 } },
    { kind: "entry_rule", name: "20d Breakout + Volume Confirmation", creator: "system", definition: { pattern: "breakout-20d-high", volumeMultiple: 1.2 }, dependencies: [] },
    { kind: "exit_rule", name: "2×ATR Hard Stop", creator: "system", definition: { stop: "entry - direction*2*ATR14", authority: "overrides consensus" } },
    { kind: "exit_rule", name: "Consensus Flip Exit", creator: "system", definition: { threshold: -0.3, description: "close when committee consensus crosses against position" } },
    { kind: "position_sizing", name: "1% Risk / 2×ATR Sizing", creator: "system", definition: { riskFraction: 0.01, stopDistance: "2*ATR14", equityCap: 0.1 } },
    { kind: "risk", name: "Dynamic Risk Score", creator: "system", definition: { components: ["volatility", "regime", "disagreement", "liquidity", "news"], exposureTaper: "full ≤40, taper to 25% at 95" } },
    { kind: "market_filter", name: "Dual-Index Regime Filter", creator: "system", definition: { indices: ["NIFTY", "BANKNIFTY"], rule: "strategy regimeFilter must include detected regime" } },
    { kind: "market_filter", name: "GSM/Liquidity Participation Cap", creator: "system", definition: { partialFillAbove: "10% ADV", rejectAbove: "25% ADV" } },
  ];

  const idByName = new Map<string, string>();
  for (const seed of seeds) {
    const id = await createFormula(seed);
    idByName.set(seed.name, id);
  }

  // Register strategy formula weights as entry-rule formulas with dependencies.
  const strategies = await db.select().from(brainStrategies);
  for (const s of strategies) {
    const cfg = s.config as Record<string, unknown>;
    if (cfg["formula"]) {
      await createFormula({
        kind: "entry_rule",
        name: `${s.name} — weighted signal formula`,
        creator: "system",
        definition: { weights: cfg["formula"], minScore: cfg["minScore"], strategyId: s.id },
        dependencies: [
          idByName.get("EMA-20/50 Trend Structure") ?? "",
          idByName.get("RSI-14") ?? "",
          idByName.get("ROC-10 Momentum") ?? "",
        ].filter(Boolean),
      });
    }
  }
}
