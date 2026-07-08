/**
 * AI Brain domain types. Client-safe: no Node.js imports.
 */

/** Memory domains. Audit memory is the Event Audit Store (ops_events), not brain_memory. */
export const MEMORY_DOMAINS = [
  "market",
  "knowledge",
  "strategy",
  "decision",
  "learning",
  "paper_trading",
] as const;
export type MemoryDomain = (typeof MEMORY_DOMAINS)[number];

/** Single-owner map: no module may write another module's memory domain. */
export const MEMORY_DOMAIN_OWNERS: Record<MemoryDomain, string> = {
  market: "brain-market-context",
  knowledge: "brain-knowledge-manager",
  strategy: "brain-strategy-manager",
  decision: "brain-decision-engine",
  learning: "brain-learning-manager",
  paper_trading: "brain-paper-validation",
};

/** Internal Brain modules — all coordinated ONLY by the AI Brain orchestrator. */
export const BRAIN_MODULES = [
  { id: "brain-market-data", name: "Market Data Module" },
  { id: "brain-market-context", name: "Market Context Module" },
  { id: "brain-indicator-engine", name: "Indicator Engine" },
  { id: "brain-pattern-engine", name: "Pattern Detection Engine" },
  { id: "brain-strategy-manager", name: "Strategy Manager" },
  { id: "brain-formula-manager", name: "Formula Manager" },
  { id: "brain-reasoning-council", name: "Multi-AI Reasoning Council" },
  { id: "brain-risk-intelligence", name: "Risk Intelligence" },
  { id: "brain-decision-engine", name: "Decision Engine" },
  { id: "brain-paper-validation", name: "Paper Trading Validation" },
  { id: "brain-knowledge-manager", name: "Knowledge Manager" },
  { id: "brain-learning-manager", name: "Learning Manager" },
] as const;

export type MarketRegime = "BULLISH" | "BEARISH" | "SIDEWAYS" | "UNKNOWN";

export interface IndicatorSnapshot {
  close: number;
  ema20: number | null;
  ema50: number | null;
  rsi14: number | null;
  atr14: number | null;
  roc10: number | null;
  volatilityPct: number | null;
  avgVolume20: number | null;
  lastVolume: number;
  high20: number | null;
  low20: number | null;
}

export interface PatternResult {
  name: string;
  direction: 1 | -1;
  strength: number; // 0..1
  evidence: string;
}

export interface MarketContext {
  regime: MarketRegime;
  regimeSource: string;
  breadthPct: number | null;
  advancers: number;
  decliners: number;
  universeSize: number;
  asOfDate: string | null;
}

/** One equal-authority analytical model's opinion. Models never see each other. */
export interface ModelOpinion {
  model: string;
  stance: number; // -1 (bearish) .. +1 (bullish)
  confidence: number; // 0..1
  reasoning: string;
  evidence?: string[];
  evidenceStrength?: number; // 0..1
  initialConfidence?: number; // pre-discussion confidence, if revised
}

export type ModelLifecycleStatus = "ACTIVE" | "SUSPENDED" | "STOPPED";

export interface ModelStateDTO {
  id: string;
  name: string;
  role: string;
  status: ModelLifecycleStatus;
  stats: Record<string, number>;
  activatedAt: string;
  updatedAt: string;
}

/** Consensus Engine output for one symbol. */
export interface ConsensusResult {
  symbol: string;
  score: number; // -1..1 unified recommendation strength
  agreementPct: number; // 0..100 share of non-neutral opinions on majority side
  disagreement: number; // 0..1 stance stddev
  avgConfidence: number; // 0..1
  evidenceStrength: number; // 0..1 confidence-weighted
  contextAlignment: number; // 0..1 majority-vs-regime alignment
  opinionCount: number;
}

export interface StrategySignal {
  strategyId: string;
  matched: boolean;
  direction: 1 | -1 | 0;
  score: number; // formula score 0..1
  detail: string;
}

export interface SymbolAssessment {
  symbol: string;
  indicators: IndicatorSnapshot;
  patterns: PatternResult[];
  strategySignals: StrategySignal[];
  opinions: ModelOpinion[];
  consensus: number; // -1..1 calibrated aggregate
  disagreement: number; // 0..1 stddev of stances
  conviction: number; // 0..1 final
  action: "BUY" | "SELL" | "SHORT" | "COVER" | "HOLD";
  riskNotes: string[];
  decisionId: string | null;
}

export interface BrainCycleSummary {
  cycleId: string;
  startedAt: string;
  durationMs: number;
  symbolsAnalyzed: number;
  context: MarketContext;
  decisionsGenerated: number;
  decisionsValidated: number;
  blocked: string | null;
  assessments: SymbolAssessment[];
}

export interface CalibrationState {
  weights: Record<string, number>; // model id -> 0.5..1.5
  samples: number;
  lastOrderCursor: number;
  updatedAt: string;
}

export interface BrainStateDTO {
  registeredModules: { id: string; name: string }[];
  cyclesCompleted: number;
  decisionsGenerated: number;
  lastCycle: BrainCycleSummary | null;
  calibration: CalibrationState;
  universe: string[];
}
