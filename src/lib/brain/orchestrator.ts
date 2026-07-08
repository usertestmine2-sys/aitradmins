import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { brainStrategies, execOrders, execPositions } from "@/db/schema";
import { appendEvent } from "@/lib/events/audit-store";
import { evaluateGates, readControlPlaneGates } from "@/lib/control-plane/reader";
import { getPortfolioSnapshot } from "@/lib/execution/engine";
import { registerComponent } from "@/lib/ops/registry";
import { detectPatterns } from "@/lib/brain/indicators";
import { buildMarketContext, computeIndicators, getSeries, getUniverse } from "@/lib/brain/market";
import { readLatest, readRecent, writeMemory } from "@/lib/brain/memory";
import {
  ensureStrategiesSeeded,
  evaluateStrategies,
  getActiveStrategies,
} from "@/lib/brain/reasoning";
import { buildMarketIntelligence, sectorMap, sectorStrengthFor } from "@/lib/brain/intel";
import {
  assessDecisionRisk,
  attachEntryFill,
  buildExpectation,
  emitDecisionEvents,
  evaluateDecisionOutcome,
  recordDecisionQuality,
  scoreReasoningQuality,
} from "@/lib/brain/quality";
import { validateStrategies } from "@/lib/brain/strategy-validation";
import { ensureFormulasSeeded } from "@/lib/brain/formula-lab";
import { syncKnowledgeGraph } from "@/lib/brain/knowledge-graph";
import { computeConsensus } from "@/lib/brain/society/consensus";
import { openManagedSession } from "@/lib/brain/society/ai-manager";
import {
  emitModelHeartbeats,
  ensureSocietySeeded,
  recordModelOutcomes,
} from "@/lib/brain/society/manager";
import { MODEL_IDS } from "@/lib/brain/society/models";
import {
  BRAIN_MODULES,
  type BrainCycleSummary,
  type BrainStateDTO,
  type CalibrationState,
  type ModelOpinion,
  type SymbolAssessment,
} from "@/lib/brain/types";

/**
 * AI BRAIN CORE ORCHESTRATOR — the single intelligent coordinator.
 *
 * The Brain is the ONLY component that coordinates the intelligence modules.
 * Models exchange reasoning only through the Brain's aggregation step; no
 * AI-to-AI control exists anywhere. Execution is delegated exclusively to
 * the existing Paper Trading Execution Engine via `decision.approved` on the
 * Event Backbone — the Brain owns intelligence, never fills.
 */

const BRAIN_ID = "ai-brain";
const HEARTBEAT_INTERVAL_MS = 60_000;
const CONVICTION_THRESHOLD = 0.35;
const MAX_POSITION_FRACTION = 0.1; // ≤10% of equity per position
const RISK_BUDGET_FRACTION = 0.01; // 1% of equity risked per ATR stop
const CALIBRATION_STEP = 0.03;
const CALIBRATION_MIN = 0.5;
const CALIBRATION_MAX = 1.5;

interface BrainState {
  started: boolean;
  bootstrapped: boolean;
  running: boolean;
  cyclesCompleted: number;
  decisionsGenerated: number;
  lastCycle: BrainCycleSummary | null;
  heartbeatTimer: NodeJS.Timeout | null;
}

const globalForBrain = globalThis as typeof globalThis & {
  __aitmBrainState?: BrainState;
};

function getState(): BrainState {
  return (globalForBrain.__aitmBrainState ??= {
    started: false,
    bootstrapped: false,
    running: false,
    cyclesCompleted: 0,
    decisionsGenerated: 0,
    lastCycle: null,
    heartbeatTimer: null,
  });
}

/** Idempotent Brain start: module registration + heartbeat proxying. */
export function ensureBrainStarted(): void {
  const state = getState();
  if (state.started) return;
  state.started = true;

  void bootstrap().catch((err: unknown) => {
    console.error("[brain] bootstrap failed:", err);
  });

  state.heartbeatTimer = setInterval(() => {
    void emitHeartbeats().catch(() => {
      // staleness will surface in Operations
    });
  }, HEARTBEAT_INTERVAL_MS);
  state.heartbeatTimer.unref();
}

async function bootstrap(): Promise<void> {
  const state = getState();
  if (state.bootstrapped) return;

  // Register the Brain itself in the Dynamic Component Registry.
  await registerComponent({
    id: BRAIN_ID,
    name: "AI Brain",
    description:
      "Core intelligence orchestrator. Coordinates all intelligence modules; delegates execution to the paper engine via decision.approved.",
    kind: "engine",
    mode: "heartbeat",
    heartbeatTimeoutSec: 300,
    dependencies: [
      { componentId: "database", criticality: "critical" },
      { componentId: "control-plane", criticality: "critical" },
      { componentId: "event-backbone", criticality: "required" },
      { componentId: "execution-engine", criticality: "required" },
    ],
    alertRules: [],
    source: "platform",
  });

  // Register every internal Brain module in Operations, dependent on the Brain.
  for (const brainMod of BRAIN_MODULES) {
    await registerComponent({
      id: brainMod.id,
      name: brainMod.name,
      description: `AI Brain internal module — coordinated exclusively by the AI Brain orchestrator.`,
      kind: "engine",
      mode: "heartbeat",
      heartbeatTimeoutSec: 900,
      dependencies: [{ componentId: BRAIN_ID, criticality: "critical" }],
      alertRules: [],
      source: "platform",
    });
  }

  await ensureStrategiesSeeded();
  await ensureSocietySeeded();
  await ensureFormulasSeeded();
  state.bootstrapped = true;
  await emitHeartbeats();
}

async function emitHeartbeats(): Promise<void> {
  const state = getState();
  await appendEvent("system.heartbeat.received", BRAIN_ID, {
    status: "HEALTHY",
    message: `AI Brain active — ${state.cyclesCompleted} cycles, ${state.decisionsGenerated} decisions generated.`,
    metrics: {
      cycles_completed: state.cyclesCompleted,
      decisions_generated: state.decisionsGenerated,
      last_cycle_ms: state.lastCycle?.durationMs ?? 0,
      symbols_analyzed: state.lastCycle?.symbolsAnalyzed ?? 0,
    },
  });
  for (const brainMod of BRAIN_MODULES) {
    await appendEvent("system.heartbeat.received", brainMod.id, {
      status: "HEALTHY",
      message: `Coordinated by AI Brain (cycle #${state.cyclesCompleted}).`,
      metrics: {},
    });
  }
  await emitModelHeartbeats();
}

/* ------------------------------------------------------------------ */
/* Pipeline                                                            */
/* ------------------------------------------------------------------ */

export async function runBrainCycle(): Promise<BrainCycleSummary> {
  const state = getState();
  if (state.running) {
    throw new Error("brain cycle already in progress");
  }
  state.running = true;
  try {
    return await executeCycle();
  } finally {
    state.running = false;
  }
}

async function executeCycle(): Promise<BrainCycleSummary> {
  const state = getState();
  await bootstrap();

  const cycleId = `cycle-${randomUUID().slice(0, 8)}`;
  const startedAt = new Date();
  const t0 = performance.now();

  await appendEvent("brain.cycle.started", BRAIN_ID, { cycleId });

  const stage = async (name: string, detail: Record<string, unknown> = {}) => {
    await appendEvent("brain.stage.completed", BRAIN_ID, { cycleId, stage: name, ...detail });
  };

  // Governance first: the Brain generates no intelligence while AI is disabled.
  const gates = await readControlPlaneGates();
  const gateBlock = evaluateGates(gates, "ai");
  if (gateBlock) {
    const summary: BrainCycleSummary = {
      cycleId,
      startedAt: startedAt.toISOString(),
      durationMs: Math.round(performance.now() - t0),
      symbolsAnalyzed: 0,
      context: {
        regime: "UNKNOWN",
        regimeSource: "cycle blocked",
        breadthPct: null,
        advancers: 0,
        decliners: 0,
        universeSize: 0,
        asOfDate: null,
      },
      decisionsGenerated: 0,
      decisionsValidated: 0,
      blocked: gateBlock,
      assessments: [],
    };
    state.lastCycle = summary;
    await appendEvent("brain.cycle.blocked", BRAIN_ID, { cycleId, reason: gateBlock });
    return summary;
  }

  // STAGE 1: Market Data
  const universe = await getUniverse();
  await stage("market-data", { universeSize: universe.length });

  // STAGE 2: Market Context (Indian market regime + breadth) + Intelligence boost.
  const context = await buildMarketContext(universe);
  const intel = await buildMarketIntelligence(universe);
  const symbolSectors = await sectorMap();
  await writeMemory("market", "brain-market-context", "context", {
    cycleId,
    ...context,
    intel: {
      indexRegimes: intel.indexRegimes,
      regimeAgreement: intel.regimeAgreement,
      sectorRotation: intel.sectorRotation,
      fiiDiiIndex: intel.fiiDiiIndex,
      newsRiskMultiplier: intel.newsRiskMultiplier,
    },
  } as unknown as Record<string, unknown>);
  await stage("market-context", {
    regime: context.regime,
    breadthPct: context.breadthPct,
    regimeAgreement: intel.regimeAgreement,
    fiiDiiIndex: intel.fiiDiiIndex,
    newsRiskMultiplier: intel.newsRiskMultiplier,
  });
  await appendEvent("market.context.updated", "brain-market-context", {
    cycleId,
    regime: context.regime,
    breadthPct: context.breadthPct,
    regimeAgreement: intel.regimeAgreement,
    vixElevated: intel.vixElevated,
    globalFactors: intel.globalFactors.map((f) => ({
      factor: f.factor,
      roc20Pct: f.roc20Pct,
      niftyCorrelation: f.niftyCorrelation,
    })),
  });

  const strategies = await getActiveStrategies();
  const calibration = await getCalibration();
  const portfolio = await getPortfolioSnapshot();
  const openPositions = await db.select().from(execPositions).where(eq(execPositions.status, "open"));

  // AI SOCIETY session via the AI Manager: task allocation, load tracking,
  // then delegation to the Model Manager. Suspended models receive no tasks.
  const society = await openManagedSession(cycleId, context, universe.length);
  await stage("society-activation", {
    activeModels: society.activeModels.map((m) => m.id),
  });

  const assessments: SymbolAssessment[] = [];
  let decisionsGenerated = 0;
  let decisionsValidated = 0;

  for (const symbol of universe) {
    const series = await getSeries(symbol);
    if (series.length < 30) continue;

    // STAGE 3: Indicators
    const indicators = computeIndicators(series);
    // STAGE 4: Pattern Detection
    const patterns = detectPatterns(series, indicators);
    // STAGE 5+6: Strategy Evaluation + Formula Evaluation
    const strategySignals = evaluateStrategies(strategies, indicators, patterns, context);
    // STAGE 7: AI Society — independent reasoning + mediated discussion round.
    const { opinions } = society.analyzeSymbol(symbol, {
      indicators,
      patterns,
      context,
      strategySignals,
    });
    // Consensus Engine: one unified recommendation from all opinions.
    const consensusResult = computeConsensus(symbol, opinions, context, calibration.weights);
    const consensus = consensusResult.score;
    const disagreement = consensusResult.disagreement;

    // Strategy alignment gates conviction: intelligence needs a matched playbook.
    // Conviction blends model agreement (60%) with playbook formula score (40%);
    // without an aligned strategy match, conviction is zero by definition.
    const matched = strategySignals.filter((s) => s.matched);
    const alignedMatch = matched.find((s) => s.direction === Math.sign(consensus));
    const conviction = alignedMatch ? Math.abs(consensus) * 0.6 + alignedMatch.score * 0.4 : 0;

    // STAGE 8: Risk Intelligence + STAGE 9: Decision Intelligence
    const riskNotes: string[] = [];
    let action: SymbolAssessment["action"] = "HOLD";
    let decisionId: string | null = null;
    let quantity = 0;
    let pendingRisk: ReturnType<typeof assessDecisionRisk> | null = null;

    const openLong = openPositions.find((p) => p.symbol === symbol && p.direction === "LONG");
    const openShort = openPositions.find((p) => p.symbol === symbol && p.direction === "SHORT");

    // Risk discipline first: hard 2×ATR stop overrides committee consensus.
    // "Hold while thesis is alive" — a stopped-out thesis is dead by definition.
    const atrStop = indicators.atr14 != null ? indicators.atr14 * 2 : null;
    if (openLong && atrStop != null && indicators.close < openLong.avgEntryPrice - atrStop) {
      action = "SELL";
      quantity = openLong.quantity;
      riskNotes.push(
        `stop-loss: close ${indicators.close.toFixed(2)} below entry ${openLong.avgEntryPrice.toFixed(2)} − 2×ATR ${atrStop.toFixed(2)}`,
      );
    } else if (openShort && atrStop != null && indicators.close > openShort.avgEntryPrice + atrStop) {
      action = "COVER";
      quantity = openShort.quantity;
      riskNotes.push(
        `stop-loss: close ${indicators.close.toFixed(2)} above entry ${openShort.avgEntryPrice.toFixed(2)} + 2×ATR ${atrStop.toFixed(2)}`,
      );
    }
    // Exit intelligence: strong opposing consensus closes existing exposure.
    else if (openLong && consensus < -0.3) {
      action = "SELL";
      quantity = openLong.quantity;
      riskNotes.push(`exit long: consensus flipped to ${consensus.toFixed(2)}`);
    } else if (openShort && consensus > 0.3) {
      action = "COVER";
      quantity = openShort.quantity;
      riskNotes.push(`exit short: consensus flipped to ${consensus.toFixed(2)}`);
    } else if (conviction >= CONVICTION_THRESHOLD && alignedMatch) {
      const direction = alignedMatch.direction;
      if ((direction === 1 && openLong) || (direction === -1 && openShort)) {
        riskNotes.push("position already open in this direction — no pyramiding");
      } else {
        const sized = sizePosition(indicators.close, indicators.atr14, portfolio.equity, portfolio.availableMargin);
        if (sized.quantity <= 0) {
          riskNotes.push(`risk veto: ${sized.reason}`);
        } else {
          // Dynamic risk scoring + volatility/news-based exposure reduction.
          const risk = assessDecisionRisk(
            direction === 1 ? 1 : -1,
            indicators,
            context,
            consensusResult,
            intel,
            sized.quantity * indicators.close,
          );
          const sectorStrength = sectorStrengthFor(symbol, symbolSectors, intel.sectorRotation);
          // Weak-sector longs / strong-sector shorts get an additional 20% trim.
          const sectorFactor =
            (direction === 1 && sectorStrength < 0.34) || (direction === -1 && sectorStrength > 0.66) ? 0.8 : 1;
          const adjusted = Math.floor(sized.quantity * risk.exposureFactor * sectorFactor);
          if (adjusted <= 0) {
            riskNotes.push(`risk veto: exposure reduced to zero (risk score ${risk.score})`);
          } else {
            action = direction === 1 ? "BUY" : "SHORT";
            quantity = adjusted;
            riskNotes.push(sized.reason);
            riskNotes.push(`risk score ${risk.score}/100, exposure ×${risk.exposureFactor}`);
            riskNotes.push(...risk.notes);
            pendingRisk = risk;
          }
        }
      }
    } else if (matched.length > 0 && !alignedMatch) {
      riskNotes.push("strategy match not aligned with model consensus — no action");
    }

    // STAGE 10: dispatch to Paper Trading Validation via decision.approved.
    if (action !== "HOLD" && quantity > 0) {
      decisionId = `brain-${randomUUID().slice(0, 12)}`;
      decisionsGenerated += 1;

      await writeMemory("decision", "brain-decision-engine", symbol, {
        cycleId,
        decisionId,
        symbol,
        action,
        quantity,
        price: indicators.close,
        consensus,
        conviction,
        strategyId: alignedMatch?.strategyId ?? null,
        opinions: opinions.map((o) => ({ model: o.model, stance: o.stance, confidence: o.confidence })),
        regime: context.regime,
      });

      await appendEvent("brain.decision.generated", BRAIN_ID, {
        cycleId,
        decisionId,
        symbol,
        action,
        quantity,
        conviction: round3(conviction),
      });

      // Publish on the Event Backbone: the execution engine is the sole consumer.
      await appendEvent("decision.approved", BRAIN_ID, {
        decisionId,
        symbol,
        side: action,
        quantity,
        price: indicators.close,
        source: "ai",
      });

      const validated = await awaitOrderOutcome(decisionId);
      if (validated) decisionsValidated += 1;
      await writeMemory("paper_trading", "brain-paper-validation", decisionId, {
        cycleId,
        symbol,
        action,
        quantity,
        validated: validated?.status ?? "pending",
        fillPrice: validated?.fillPrice ?? null,
        reason: validated?.reason ?? "",
      });

      // Decision Quality Layer: expectation + structured reasoning + events.
      if ((action === "BUY" || action === "SHORT") && pendingRisk && indicators.atr14 != null) {
        const direction = action === "BUY" ? 1 : -1;
        const expectation = buildExpectation(direction, indicators.close, indicators.atr14);
        const reasoningQuality = scoreReasoningQuality(opinions, consensusResult, alignedMatch != null);
        const assessmentForEvents: SymbolAssessment = {
          symbol,
          indicators,
          patterns,
          strategySignals,
          opinions,
          consensus: round3(consensus),
          disagreement: round3(disagreement),
          conviction: round3(conviction),
          action,
          riskNotes,
          decisionId,
        };
        await recordDecisionQuality({
          decisionId,
          cycleId,
          assessment: assessmentForEvents,
          strategyId: alignedMatch?.strategyId ?? null,
          riskScore: pendingRisk.score,
          reasoningQuality,
          expectation,
          entryPrice: validated?.fillPrice ?? null,
          marketRegime: context.regime,
          quantity,
        });
        if (validated?.fillPrice != null) await attachEntryFill(decisionId, validated.fillPrice);
        await emitDecisionEvents(decisionId, assessmentForEvents, pendingRisk, reasoningQuality, expectation, quantity);
        // Phase-2: strategy.selected + decision.validated traceability events.
        if (alignedMatch) {
          await appendEvent("strategy.selected", "brain-strategy-manager", {
            decisionId,
            strategyId: alignedMatch.strategyId,
            symbol,
            formulaScore: alignedMatch.score,
          });
        }
        await appendEvent("decision.validated", BRAIN_ID, {
          decisionId,
          symbol,
          paperStatus: validated?.status ?? "pending",
          fillPrice: validated?.fillPrice ?? null,
        });

        // EXPLAINABLE AI (Phase-3): one complete, structured explanation
        // artifact per decision — first-class, stored in decision memory.
        const sectorStrengthValue = sectorStrengthFor(symbol, symbolSectors, intel.sectorRotation);
        const politicalFactors = intel.activeNews.filter((n) =>
          ["election", "policy", "government", "political", "budget", "rbi"].some((k) =>
            n.title.toLowerCase().includes(k),
          ),
        );
        const explanation = {
          decisionId,
          symbol,
          action,
          quantity,
          trend: {
            ema20: indicators.ema20,
            ema50: indicators.ema50,
            aligned: indicators.ema20 != null && indicators.ema50 != null && indicators.ema20 > indicators.ema50,
            priceVsEma20: indicators.ema20 != null ? (indicators.close > indicators.ema20 ? "above" : "below") : "unknown",
          },
          momentum: { roc10Pct: indicators.roc10, rsi14: indicators.rsi14 },
          patterns: patterns.map((p) => ({ name: p.name, direction: p.direction, strength: p.strength, evidence: p.evidence })),
          formula: alignedMatch ? { strategyId: alignedMatch.strategyId, score: alignedMatch.score, detail: alignedMatch.detail } : null,
          strategy: alignedMatch?.strategyId ?? null,
          news: intel.activeNews.slice(0, 5),
          politicalFactors: politicalFactors.slice(0, 3),
          macro: {
            regime: context.regime,
            regimeAgreement: intel.regimeAgreement,
            breadthPct: context.breadthPct,
            fiiDiiIndex: intel.fiiDiiIndex,
            vixElevated: intel.vixElevated,
            globalFactors: intel.globalFactors.map((f) => ({ factor: f.factor, roc20Pct: f.roc20Pct, niftyCorrelation: f.niftyCorrelation })),
          },
          risk: { score: pendingRisk.score, components: pendingRisk.components, exposureFactor: pendingRisk.exposureFactor, notes: pendingRisk.notes },
          liquidity: { avgVolume20: indicators.avgVolume20, sectorStrength: sectorStrengthValue },
          aiVotes: opinions.map((o) => ({
            model: o.model,
            stance: o.stance,
            confidence: o.confidence,
            revisedInDiscussion: o.initialConfidence != null,
            reasoning: o.reasoning,
          })),
          confidence: Math.round(conviction * 100),
          consensus: { score: consensusResult.score, agreementPct: consensusResult.agreementPct, disagreement: consensusResult.disagreement },
          expectedReward: Math.round(Math.abs(expectation.targetPrice - indicators.close) * quantity * 100) / 100,
          expectedLoss: Math.round(Math.abs(indicators.close - expectation.stopPrice) * quantity * 100) / 100,
          holdingHorizon: `${expectation.horizonBars} bars`,
        };
        await writeMemory("decision", "brain-decision-engine", `explain-${decisionId}`, explanation);
        await appendEvent("decision.explained", BRAIN_ID, {
          decisionId,
          symbol,
          action,
          confidence: explanation.confidence,
          riskScore: pendingRisk.score,
        });
      }
    }

    // Store the final consensus for every analyzed symbol (Consensus Engine record).
    await writeMemory("decision", "brain-decision-engine", `consensus-${symbol}`, {
      cycleId,
      symbol,
      score: consensusResult.score,
      agreementPct: consensusResult.agreementPct,
      disagreement: consensusResult.disagreement,
      avgConfidence: consensusResult.avgConfidence,
      evidenceStrength: consensusResult.evidenceStrength,
      contextAlignment: consensusResult.contextAlignment,
      opinionCount: consensusResult.opinionCount,
      action,
    });

    assessments.push({
      symbol,
      indicators,
      patterns,
      strategySignals,
      opinions,
      consensus: round3(consensus),
      disagreement: round3(disagreement),
      conviction: round3(conviction),
      action,
      riskNotes,
      decisionId,
    });
  }

  // Society lifecycle completion: publish memories, per-model events, stats, sleep.
  await society.finalize({ decisionsGenerated });
  await stage("analysis", { symbols: assessments.length, decisions: decisionsGenerated });

  // STAGE 11: Knowledge Update
  await writeMemory("knowledge", "brain-knowledge-manager", "cycle-digest", {
    cycleId,
    regime: context.regime,
    breadthPct: context.breadthPct,
    symbolsAnalyzed: assessments.length,
    decisions: assessments
      .filter((a) => a.decisionId)
      .map((a) => ({ symbol: a.symbol, action: a.action, conviction: a.conviction })),
    topConvictions: assessments
      .slice()
      .sort((a, b) => b.conviction - a.conviction)
      .slice(0, 5)
      .map((a) => ({ symbol: a.symbol, conviction: a.conviction, action: a.action })),
  });
  await stage("knowledge-update");

  // STAGE 12+13: Learning Engine + Confidence Calibration (from paper outcomes)
  const learning = await runLearningPass(calibration);
  await stage("learning", { outcomesProcessed: learning.outcomesProcessed });

  // Phase-3: knowledge graph sync — relate this cycle's new facts by reference.
  await syncKnowledgeGraph().catch(() => {
    // graph sync must never break the cycle; next cycle retries idempotently
  });

  // STAGE 14: Memory Update — strategy memory records per-strategy activity.
  await writeMemory("strategy", "brain-strategy-manager", "cycle-activity", {
    cycleId,
    perStrategy: strategies.map((s) => ({
      strategyId: s.id,
      matches: assessments.filter((a) => a.strategySignals.some((x) => x.strategyId === s.id && x.matched)).length,
    })),
  });

  const summary: BrainCycleSummary = {
    cycleId,
    startedAt: startedAt.toISOString(),
    durationMs: Math.round(performance.now() - t0),
    symbolsAnalyzed: assessments.length,
    context,
    decisionsGenerated,
    decisionsValidated,
    blocked: null,
    assessments,
  };

  const state2 = getState();
  state2.cyclesCompleted += 1;
  state2.decisionsGenerated += decisionsGenerated;
  state2.lastCycle = summary;

  await appendEvent("brain.cycle.completed", BRAIN_ID, {
    cycleId,
    durationMs: summary.durationMs,
    symbolsAnalyzed: summary.symbolsAnalyzed,
    decisionsGenerated,
    decisionsValidated,
    regime: context.regime,
  });
  await emitHeartbeats();

  return summary;
}

/* ------------------------------------------------------------------ */
/* Aggregation, sizing, validation, learning                           */
/* ------------------------------------------------------------------ */

function sizePosition(
  price: number,
  atr: number | null,
  equity: number,
  availableMargin: number,
): { quantity: number; reason: string } {
  if (atr == null || atr <= 0) return { quantity: 0, reason: "no ATR — cannot size risk" };
  const riskBudget = equity * RISK_BUDGET_FRACTION;
  const stopDistance = atr * 2;
  let quantity = Math.floor(riskBudget / stopDistance);
  const maxNotional = Math.min(equity * MAX_POSITION_FRACTION, availableMargin);
  if (quantity * price > maxNotional) quantity = Math.floor(maxNotional / price);
  if (quantity <= 0) return { quantity: 0, reason: "insufficient margin for minimum size" };
  return {
    quantity,
    reason: `sized ${quantity} @ ~₹${price.toFixed(2)} (risk ₹${riskBudget.toFixed(0)} / 2×ATR ${stopDistance.toFixed(2)}, cap ${(MAX_POSITION_FRACTION * 100).toFixed(0)}% equity)`,
  };
}

/** Poll the execution engine's order projection for this decision (paper validation). */
async function awaitOrderOutcome(
  decisionId: string,
): Promise<{ status: string; fillPrice: number | null; reason: string } | null> {
  for (let attempt = 0; attempt < 15; attempt++) {
    const rows = await db
      .select({ status: execOrders.status, fillPrice: execOrders.fillPrice, reason: execOrders.reason })
      .from(execOrders)
      .where(eq(execOrders.decisionId, decisionId))
      .limit(1);
    const order = rows[0];
    if (order && order.status !== "CREATED" && order.status !== "VALIDATED" && order.status !== "QUEUED") {
      return { status: order.status, fillPrice: order.fillPrice, reason: order.reason };
    }
    await sleep(200);
  }
  return null;
}

async function getCalibration(): Promise<CalibrationState> {
  const entry = await readLatest("learning", "calibration");
  if (entry) {
    const p = entry.payload as unknown as CalibrationState;
    if (p && p.weights) return p;
  }
  const weights: Record<string, number> = {};
  for (const model of MODEL_IDS) weights[model] = 1.0;
  return { weights, samples: 0, lastOrderCursor: 0, updatedAt: new Date(0).toISOString() };
}

/**
 * Learning pass: closed paper outcomes reinforce or decay each model's
 * calibration weight. Models that voted with profitable direction gain;
 * models that voted against lose. Append-only; never rewrites history.
 */
async function runLearningPass(calibration: CalibrationState): Promise<{ outcomesProcessed: number }> {
  const exits = await db
    .select()
    .from(execOrders)
    .where(and(eq(execOrders.status, "EXECUTED"), inArray(execOrders.side, ["SELL", "COVER"])))
    .orderBy(desc(execOrders.createdAt))
    .limit(50);

  const cursorTime = calibration.lastOrderCursor;
  const fresh = exits.filter(
    (o) => o.decisionId.startsWith("brain-") && o.createdAt.getTime() > cursorTime && o.fillPrice != null,
  );
  if (fresh.length === 0) return { outcomesProcessed: 0 };

  const weights = { ...calibration.weights };
  let samples = calibration.samples;
  let newCursor = cursorTime;

  for (const exit of fresh.reverse()) {
    // Find the entry decision memory for this symbol (opposite side of the exit).
    const entrySide = exit.side === "SELL" ? "BUY" : "SHORT";
    const decisions = await readRecentByKeyForSymbol(exit.symbol);
    const entry = decisions.find(
      (d) => d.payload["action"] === entrySide && typeof d.payload["price"] === "number",
    );
    if (!entry) continue;

    const entryPrice = entry.payload["price"] as number;
    const exitFill = exit.fillPrice as number;
    const pnl =
      exit.side === "SELL" ? (exitFill - entryPrice) * exit.quantity : (entryPrice - exitFill) * exit.quantity;
    const profitableDirection = exit.side === "SELL" ? (pnl > 0 ? 1 : -1) : pnl > 0 ? -1 : 1;

    const opinions = (entry.payload["opinions"] as { model: string; stance: number }[] | undefined) ?? [];
    for (const opinion of opinions) {
      if (Math.abs(opinion.stance) < 0.05) continue; // abstained — no learning signal
      const agreed = Math.sign(opinion.stance) === profitableDirection;
      const current = weights[opinion.model] ?? 1.0;
      weights[opinion.model] = clamp(
        current + (agreed ? CALIBRATION_STEP : -CALIBRATION_STEP),
        CALIBRATION_MIN,
        CALIBRATION_MAX,
      );
    }
    samples += 1;
    newCursor = Math.max(newCursor, exit.createdAt.getTime());

    const reinforced = opinions
      .filter((o) => Math.abs(o.stance) >= 0.05 && Math.sign(o.stance) === profitableDirection)
      .map((o) => o.model);
    const penalized = opinions
      .filter((o) => Math.abs(o.stance) >= 0.05 && Math.sign(o.stance) !== profitableDirection)
      .map((o) => o.model);

    // Evolution Phase-1: expected-vs-actual evaluation → prediction error.
    const holdingTimeSec = Math.max(
      0,
      (exit.createdAt.getTime() - new Date(entry.createdAt).getTime()) / 1000,
    );
    const evaluation = await evaluateDecisionOutcome(
      exit.symbol,
      entrySide as "BUY" | "SHORT",
      exitFill,
      holdingTimeSec,
    ).catch(() => null);

    await writeMemory("learning", "brain-learning-manager", `outcome-${exit.decisionId}`, {
      symbol: exit.symbol,
      exitSide: exit.side,
      entryPrice,
      exitFill,
      pnl: Math.round(pnl * 100) / 100,
      profitable: pnl > 0,
      modelsReinforced: reinforced,
      // Learning delta: how wrong was the expectation?
      predictionError: evaluation?.predictionError ?? null,
      expectedVsActual: evaluation
        ? { actualMovePct: evaluation.actualMovePct, outcome: evaluation.outcome }
        : null,
    });

    // Strategy score update (soft, cumulative — never a hard override).
    if (evaluation?.strategyId) {
      const stratRows = await db
        .select()
        .from(brainStrategies)
        .where(eq(brainStrategies.id, evaluation.strategyId))
        .limit(1);
      if (stratRows.length > 0) {
        const stats = { ...stratRows[0].stats };
        stats["trades"] = (stats["trades"] ?? 0) + 1;
        if (pnl > 0) stats["wins"] = (stats["wins"] ?? 0) + 1;
        else stats["losses"] = (stats["losses"] ?? 0) + 1;
        const prevErr = stats["avg_prediction_error"] ?? 0;
        const n = stats["trades"];
        stats["avg_prediction_error"] =
          Math.round(((prevErr * (n - 1) + (evaluation.predictionError ?? 0)) / n) * 100) / 100;
        stats["score"] = Math.round(((stats["wins"] ?? 0) / n) * 1000) / 10;
        await db
          .update(brainStrategies)
          .set({ stats })
          .where(eq(brainStrategies.id, evaluation.strategyId));
      }
    }

    // AI Society: update each model's private performance stats + learning memory.
    await recordModelOutcomes(reinforced, penalized, `outcome-${exit.decisionId}`);

    // Phase-2: distilled lesson (append-only, never overwrites history).
    const lessonText =
      pnl > 0
        ? `${exit.symbol}: ${entrySide} thesis in ${String(entry.payload["regime"] ?? "UNKNOWN")} regime paid ${Math.round(pnl)}₹; reinforced ${reinforced.join(", ") || "none"}.`
        : `${exit.symbol}: ${entrySide} thesis in ${String(entry.payload["regime"] ?? "UNKNOWN")} regime lost ${Math.round(-pnl)}₹ (prediction error ${evaluation?.predictionError ?? "?"}); dissent from ${reinforced.join(", ") || "none"} was correct.`;
    await writeMemory("learning", "brain-learning-manager", `lesson-${exit.decisionId}`, {
      lesson: lessonText,
      symbol: exit.symbol,
      regime: entry.payload["regime"] ?? "UNKNOWN",
      profitable: pnl > 0,
      holdingTimeSec: Math.round(holdingTimeSec),
      evidence: [`outcome-${exit.decisionId}`],
    });
    await appendEvent("learning.completed", "brain-learning-manager", {
      decisionRef: exit.decisionId,
      symbol: exit.symbol,
      profitable: pnl > 0,
      predictionError: evaluation?.predictionError ?? null,
      lesson: lessonText.slice(0, 200),
    });
  }

  const newCalibration: CalibrationState = {
    weights,
    samples,
    lastOrderCursor: newCursor,
    updatedAt: new Date().toISOString(),
  };
  await writeMemory("learning", "brain-learning-manager", "calibration", newCalibration as unknown as Record<string, unknown>);
  await appendEvent("brain.learning.updated", BRAIN_ID, {
    outcomesProcessed: fresh.length,
    samples,
    weights,
  });
  await appendEvent("confidence.updated", "brain-learning-manager", {
    samples,
    weights,
    trigger: "paper-outcome-calibration",
  });

  // Phase-2: re-validate + reclassify all strategies after new outcomes.
  await validateStrategies().catch(() => {
    // validation failures never break the learning pass; next cycle retries
  });

  return { outcomesProcessed: fresh.length };
}

async function readRecentByKeyForSymbol(symbol: string) {
  const { readRecentByKey } = await import("@/lib/brain/memory");
  return readRecentByKey("decision", symbol, 20);
}

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

export async function getBrainState(): Promise<BrainStateDTO> {
  await bootstrap();
  const state = getState();
  const [calibration, universe] = await Promise.all([getCalibration(), getUniverse()]);
  return {
    registeredModules: BRAIN_MODULES.map((m) => ({ id: m.id, name: m.name })),
    cyclesCompleted: state.cyclesCompleted,
    decisionsGenerated: state.decisionsGenerated,
    lastCycle: state.lastCycle,
    calibration,
    universe,
  };
}

export async function getMemorySnapshot(domain: Parameters<typeof readRecent>[0], limit: number) {
  return readRecent(domain, limit);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}
