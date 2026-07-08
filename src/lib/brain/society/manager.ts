import { eq } from "drizzle-orm";
import { db } from "@/db";
import { brainModels } from "@/db/schema";
import { appendEvent } from "@/lib/events/audit-store";
import { registerComponent } from "@/lib/ops/registry";
import { appendModelMemory, type ModelMemoryRow } from "@/lib/brain/society/memory";
import {
  analyzeAs,
  MODEL_DEFINITIONS,
  type AnalysisInput,
  type ModelDefinition,
} from "@/lib/brain/society/models";
import type {
  MarketContext,
  ModelLifecycleStatus,
  ModelOpinion,
  ModelStateDTO,
} from "@/lib/brain/types";

/**
 * MODEL MANAGER — the single lifecycle authority for the AI Society,
 * living inside the AI Brain. Registers models, drives their lifecycle
 * (start/stop/suspend/resume), emits heartbeats, tracks performance, and
 * mediates ALL inter-model communication. Models never talk to each other:
 * the discussion round passes only anonymized aggregates through the Brain.
 */

const MEDIATION_MAX_REVISION = 0.15; // a model may revise its own confidence by ≤ this
const DISAGREEMENT_EVENT_THRESHOLD = 0.6;
const DISAGREEMENT_EVENTS_PER_CYCLE = 5;

/* ------------------------------------------------------------------ */
/* Registration + lifecycle                                            */
/* ------------------------------------------------------------------ */

export async function ensureSocietySeeded(): Promise<void> {
  for (const def of MODEL_DEFINITIONS) {
    const existing = await db.select().from(brainModels).where(eq(brainModels.id, def.id)).limit(1);
    if (existing.length === 0) {
      await db.insert(brainModels).values({
        id: def.id,
        name: def.name,
        role: def.role,
        status: "ACTIVE",
        stats: { opinions_published: 0, outcomes: 0, correct_calls: 0, wrong_calls: 0, accuracy_pct: 0 },
      });
      await appendEvent("model.started", def.id, { name: def.name, role: def.role });
      await appendEvent("model.ready", def.id, { name: def.name });
    }
    // Operations + Dynamic Registry + dependency graph (idempotent).
    await registerComponent({
      id: def.id,
      name: def.name,
      description: `AI Society model — ${def.role}. Equal authority; mediated by the AI Brain.`,
      kind: "engine",
      mode: "heartbeat",
      heartbeatTimeoutSec: 900,
      dependencies: [
        { componentId: "ai-brain", criticality: "critical" },
        { componentId: "control-plane", criticality: "required" },
      ],
      alertRules: [],
      source: "platform",
    });
  }
}

export async function listModels(): Promise<ModelStateDTO[]> {
  const rows = await db.select().from(brainModels);
  return rows
    .map((r) => ({
      id: r.id,
      name: r.name,
      role: r.role,
      status: (["ACTIVE", "SUSPENDED", "STOPPED"].includes(r.status)
        ? r.status
        : "STOPPED") as ModelLifecycleStatus,
      stats: r.stats ?? {},
      activatedAt: r.activatedAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export type LifecycleAction = "start" | "stop" | "suspend" | "resume";

const ACTION_TO_STATUS: Record<LifecycleAction, ModelLifecycleStatus> = {
  start: "ACTIVE",
  resume: "ACTIVE",
  suspend: "SUSPENDED",
  stop: "STOPPED",
};

const ACTION_TO_EVENT = {
  start: "model.started",
  resume: "model.resumed",
  suspend: "model.suspended",
  stop: "model.stopped",
} as const;

export async function setModelLifecycle(
  modelId: string,
  action: LifecycleAction,
): Promise<ModelStateDTO | null> {
  const rows = await db.select().from(brainModels).where(eq(brainModels.id, modelId)).limit(1);
  if (rows.length === 0) return null;
  const status = ACTION_TO_STATUS[action];
  await db
    .update(brainModels)
    .set({ status, updatedAt: new Date(), ...(status === "ACTIVE" ? { activatedAt: new Date() } : {}) })
    .where(eq(brainModels.id, modelId));
  await appendEvent(ACTION_TO_EVENT[action], modelId, { action, status });
  if (status === "ACTIVE") {
    await appendEvent("model.ready", modelId, { after: action });
  }
  const models = await listModels();
  return models.find((m) => m.id === modelId) ?? null;
}

/** Heartbeats reflecting lifecycle state (SUSPENDED/STOPPED surface as WARNING). */
export async function emitModelHeartbeats(): Promise<void> {
  const models = await listModels();
  for (const model of models) {
    await appendEvent("system.heartbeat.received", model.id, {
      status: model.status === "ACTIVE" ? "HEALTHY" : "WARNING",
      message:
        model.status === "ACTIVE"
          ? `${model.name} active — accuracy ${model.stats["accuracy_pct"] ?? 0}% over ${model.stats["outcomes"] ?? 0} outcomes.`
          : `${model.name} is ${model.status}.`,
      metrics: {
        opinions_published: model.stats["opinions_published"] ?? 0,
        outcomes: model.stats["outcomes"] ?? 0,
        accuracy_pct: model.stats["accuracy_pct"] ?? 0,
      },
    });
  }
}

/* ------------------------------------------------------------------ */
/* Society session (one Brain cycle)                                   */
/* ------------------------------------------------------------------ */

export interface SocietySession {
  cycleId: string;
  activeModels: ModelDefinition[];
  analyzeSymbol: (symbol: string, input: AnalysisInput) => { opinions: ModelOpinion[] };
  finalize: (summary: { decisionsGenerated: number }) => Promise<void>;
}

interface SessionAccumulator {
  symbolsAnalyzed: number;
  opinionsBySymbol: Map<string, ModelOpinion[]>;
  confidenceSum: Map<string, number>;
  revisions: Map<string, number>;
  disagreements: { symbol: string; disagreement: number }[];
  memoryRows: ModelMemoryRow[];
  challenges: { symbol: string; challenger: string; upheld: boolean }[];
  dissents: { symbol: string; model: string; stance: number; reasoning: string }[];
}

const CHALLENGE_DISAGREEMENT_THRESHOLD = 0.5;

export async function openSocietySession(
  cycleId: string,
  context: MarketContext,
): Promise<SocietySession> {
  await ensureSocietySeeded();
  const states = await listModels();
  const activeIds = new Set(states.filter((s) => s.status === "ACTIVE").map((s) => s.id));
  const activeModels = MODEL_DEFINITIONS.filter((d) => activeIds.has(d.id));

  const acc: SessionAccumulator = {
    symbolsAnalyzed: 0,
    opinionsBySymbol: new Map(),
    confidenceSum: new Map(),
    revisions: new Map(),
    disagreements: [],
    memoryRows: [],
    challenges: [],
    dissents: [],
  };

  // Lifecycle: Receive Market Context (private working context per model).
  for (const model of activeModels) {
    acc.memoryRows.push({
      modelId: model.id,
      kind: "context",
      key: cycleId,
      payload: {
        regime: context.regime,
        breadthPct: context.breadthPct,
        asOfDate: context.asOfDate,
      },
    });
  }

  const analyzeSymbol = (symbol: string, input: AnalysisInput): { opinions: ModelOpinion[] } => {
    acc.symbolsAnalyzed += 1;

    // ROUND 1 — independent private reasoning (Analyze → Reason → Evaluate → Confidence).
    const round1 = activeModels.map((model) => {
      const raw = analyzeAs(model, input);
      return {
        model: model.id,
        stance: round3(raw.stance),
        confidence: round3(raw.confidence),
        reasoning: raw.reasoning,
        evidence: raw.evidence,
        evidenceStrength: round3(raw.evidenceStrength),
      } as ModelOpinion;
    });

    // ROUND 2 — mediated discussion. The Brain shares only an anonymized
    // aggregate (peer stance mean, committed counts). Models may revise ONLY
    // their own confidence, bounded. No commands, no overrides.
    const opinions = round1.map((opinion) => {
      const peers = round1.filter((o) => o.model !== opinion.model);
      const committedPeers = peers.filter((p) => Math.abs(p.stance) >= 0.05);
      if (Math.abs(opinion.stance) < 0.05 || committedPeers.length === 0) return opinion;

      const peerMean =
        committedPeers.reduce((a, p) => a + p.stance * p.confidence, 0) / committedPeers.length;
      const agreesWithPeers = Math.sign(peerMean) === Math.sign(opinion.stance);
      const peerStrength = Math.min(1, Math.abs(peerMean));
      const delta = agreesWithPeers
        ? Math.min(MEDIATION_MAX_REVISION, 0.1 * peerStrength)
        : -Math.min(MEDIATION_MAX_REVISION, 0.15 * peerStrength);
      const revised = Math.max(0.1, Math.min(1, opinion.confidence + delta));

      if (Math.abs(revised - opinion.confidence) < 0.01) return opinion;

      acc.revisions.set(opinion.model, (acc.revisions.get(opinion.model) ?? 0) + 1);
      acc.memoryRows.push({
        modelId: opinion.model,
        kind: "discussion",
        key: `${cycleId}:${symbol}`,
        payload: {
          symbol,
          peerAggregate: round3(peerMean),
          agreedWithPeers: agreesWithPeers,
          confidenceBefore: opinion.confidence,
          confidenceAfter: round3(revised),
        },
      });
      return { ...opinion, initialConfidence: opinion.confidence, confidence: round3(revised) };
    });

    // Publish Opinion — each model's opinion appended to its OWN memory only.
    for (const opinion of opinions) {
      acc.confidenceSum.set(opinion.model, (acc.confidenceSum.get(opinion.model) ?? 0) + opinion.confidence);
      acc.memoryRows.push({
        modelId: opinion.model,
        kind: "opinion",
        key: `${cycleId}:${symbol}`,
        payload: {
          symbol,
          stance: opinion.stance,
          confidence: opinion.confidence,
          evidenceStrength: opinion.evidenceStrength ?? 0.5,
          reasoning: opinion.reasoning,
        },
      });
    }

    // Disagreement measurement (recorded, never suppressed).
    const stances = opinions.map((o) => o.stance);
    let disagreement = 0;
    if (stances.length > 1) {
      const mean = stances.reduce((a, b) => a + b, 0) / stances.length;
      disagreement = Math.sqrt(stances.reduce((a, s) => a + (s - mean) ** 2, 0) / stances.length);
      if (disagreement >= DISAGREEMENT_EVENT_THRESHOLD) {
        acc.disagreements.push({ symbol, disagreement: round3(disagreement) });
      }
    }

    // ROUND 3 — CHALLENGE / DEBATE (Phase-3 advanced society). When models
    // materially disagree, the strongest dissenter formally challenges the
    // majority with its evidence. Evidence is exchanged through the Brain
    // only; the challenge is UPHELD when the dissenter's evidence is stronger
    // than the majority's average (majority tempers confidence), otherwise
    // it is OVERRULED and the dissent is recorded permanently. No commands,
    // no overrides — only bounded self-revision of confidence.
    if (disagreement >= CHALLENGE_DISAGREEMENT_THRESHOLD) {
      const committed = opinions.filter((o) => Math.abs(o.stance) >= 0.05);
      const bulls = committed.filter((o) => o.stance > 0);
      const bears = committed.filter((o) => o.stance < 0);
      const majority = bulls.length >= bears.length ? bulls : bears;
      const minority = bulls.length >= bears.length ? bears : bulls;
      if (minority.length > 0 && majority.length > minority.length) {
        const challenger = minority.reduce((a, b) =>
          (a.evidenceStrength ?? 0) * a.confidence >= (b.evidenceStrength ?? 0) * b.confidence ? a : b,
        );
        const majorityEvidence =
          majority.reduce((a, o) => a + (o.evidenceStrength ?? 0.5), 0) / majority.length;
        const upheld = (challenger.evidenceStrength ?? 0) > majorityEvidence;

        for (const member of majority) {
          const idx = opinions.findIndex((o) => o.model === member.model);
          if (idx < 0) continue;
          if (upheld) {
            const revised = Math.max(0.1, round3(member.confidence - 0.1));
            opinions[idx] = {
              ...member,
              initialConfidence: member.initialConfidence ?? member.confidence,
              confidence: revised,
            };
          }
          acc.memoryRows.push({
            modelId: member.model,
            kind: "discussion",
            key: `${cycleId}:${symbol}:debate`,
            payload: {
              symbol,
              role: "challenged",
              challenger: challenger.model,
              challengerEvidence: (challenger.evidence ?? []).slice(0, 3),
              challengeUpheld: upheld,
            },
          });
        }
        acc.memoryRows.push({
          modelId: challenger.model,
          kind: "discussion",
          key: `${cycleId}:${symbol}:debate`,
          payload: {
            symbol,
            role: "challenger",
            evidencePresented: (challenger.evidence ?? []).slice(0, 3),
            majorityEvidenceStrength: round3(majorityEvidence),
            upheld,
          },
        });
        acc.challenges.push({ symbol, challenger: challenger.model, upheld });
        if (!upheld) {
          acc.dissents.push({
            symbol,
            model: challenger.model,
            stance: challenger.stance,
            reasoning: challenger.reasoning.slice(0, 200),
          });
        }
      }
    }

    acc.opinionsBySymbol.set(symbol, opinions);
    return { opinions };
  };

  const finalize = async (summary: { decisionsGenerated: number }): Promise<void> => {
    // Persist all private memories in one batch (append-only).
    await appendModelMemory(acc.memoryRows);

    // Per-model cycle events + stats.
    for (const model of activeModels) {
      const published = acc.symbolsAnalyzed;
      const avgConfidence = published > 0 ? (acc.confidenceSum.get(model.id) ?? 0) / published : 0;

      await appendEvent("model.reasoning", model.id, {
        cycleId,
        symbolsAnalyzed: published,
        confidenceRevisions: acc.revisions.get(model.id) ?? 0,
      });
      await appendEvent("model.confidence.updated", model.id, {
        cycleId,
        avgConfidence: round3(avgConfidence),
      });
      await appendEvent("model.memory.updated", model.id, {
        cycleId,
        entriesAppended: acc.memoryRows.filter((r) => r.modelId === model.id).length,
      });

      const rows = await db.select().from(brainModels).where(eq(brainModels.id, model.id)).limit(1);
      if (rows.length > 0) {
        const stats = { ...rows[0].stats };
        stats["opinions_published"] = (stats["opinions_published"] ?? 0) + published;
        await db
          .update(brainModels)
          .set({ stats, updatedAt: new Date() })
          .where(eq(brainModels.id, model.id));
      }
    }

    // Bounded disagreement events (strongest first).
    const strongest = acc.disagreements
      .sort((a, b) => b.disagreement - a.disagreement)
      .slice(0, DISAGREEMENT_EVENTS_PER_CYCLE);
    for (const d of strongest) {
      await appendEvent("model.disagreement", "ai-brain", { cycleId, ...d });
    }

    // Phase-3: challenge/debate/dissent events (bounded).
    for (const c of acc.challenges.slice(0, DISAGREEMENT_EVENTS_PER_CYCLE)) {
      await appendEvent("ai.challenge.raised", c.challenger, { cycleId, symbol: c.symbol, upheld: c.upheld });
      await appendEvent("ai.debate.recorded", "ai-brain", {
        cycleId,
        symbol: c.symbol,
        challenger: c.challenger,
        outcome: c.upheld ? "challenge-upheld" : "challenge-overruled",
      });
    }
    for (const d of acc.dissents.slice(0, DISAGREEMENT_EVENTS_PER_CYCLE)) {
      await appendEvent("ai.dissent.recorded", d.model, {
        cycleId,
        symbol: d.symbol,
        stance: d.stance,
        reasoning: d.reasoning,
      });
    }

    // Cycle-level consensus event (Receive Consensus lifecycle step → Sleep).
    await appendEvent("model.consensus", "ai-brain", {
      cycleId,
      symbolsAnalyzed: acc.symbolsAnalyzed,
      decisionsGenerated: summary.decisionsGenerated,
      participatingModels: activeModels.map((m) => m.id),
    });
  };

  return { cycleId, activeModels, analyzeSymbol, finalize };
}

/* ------------------------------------------------------------------ */
/* Learning integration                                                */
/* ------------------------------------------------------------------ */

/** Update per-model performance stats from a closed paper outcome. */
export async function recordModelOutcomes(
  reinforced: string[],
  penalized: string[],
  outcomeRef: string,
): Promise<void> {
  const touched = [...new Set([...reinforced, ...penalized])];
  for (const modelId of touched) {
    const rows = await db.select().from(brainModels).where(eq(brainModels.id, modelId)).limit(1);
    if (rows.length === 0) continue;
    const stats = { ...rows[0].stats };
    stats["outcomes"] = (stats["outcomes"] ?? 0) + 1;
    if (reinforced.includes(modelId)) stats["correct_calls"] = (stats["correct_calls"] ?? 0) + 1;
    else stats["wrong_calls"] = (stats["wrong_calls"] ?? 0) + 1;
    const total = (stats["correct_calls"] ?? 0) + (stats["wrong_calls"] ?? 0);
    stats["accuracy_pct"] = total > 0 ? Math.round(((stats["correct_calls"] ?? 0) / total) * 1000) / 10 : 0;
    await db.update(brainModels).set({ stats, updatedAt: new Date() }).where(eq(brainModels.id, modelId));

    await appendEvent("model.learning", modelId, {
      outcomeRef,
      correct: reinforced.includes(modelId),
      accuracyPct: stats["accuracy_pct"],
      outcomes: stats["outcomes"],
    });
    await appendModelMemory([
      {
        modelId,
        kind: "learning",
        key: outcomeRef,
        payload: { correct: reinforced.includes(modelId), accuracyPct: stats["accuracy_pct"] },
      },
    ]);
  }
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}
