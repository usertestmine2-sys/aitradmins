import { 
  pgTable, 
  uuid, 
  varchar, 
  integer, 
  timestamp, 
  text, 
  jsonb, 
  boolean, 
  numeric, 
  real, 
  bigint, 
  doublePrecision, 
  index, 
  primaryKey, 
  bigserial,
  uniqueIndex,
  serial,
  date
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export type RtJob = typeof rtJobs.$inferSelect;
export type RtJobInsert = typeof rtJobs.$inferInsert;
export type RtStreamOffset = typeof rtStreamOffsets.$inferSelect;
export type RtDeadLetter = typeof rtDeadLetter.$inferSelect;
export type AiDataset = typeof aiDatasets.$inferSelect;
export type AiModel = typeof aiModels.$inferSelect;
export type AiLesson = typeof aiLessons.$inferSelect;
export type BrainKnowledgeEdge = typeof brainKnowledgeEdges.$inferSelect;
export type BrainFeatureImportance = typeof brainFeatureImportance.$inferSelect;
export type BrainCalibration = typeof brainCalibration.$inferSelect;
export type BrainMetaRecommendation = typeof brainMetaRecommendations.$inferSelect;
export type BrainModelReputation = typeof brainModelReputation.$inferSelect;
export type BrainMarketDna = typeof brainMarketDna.$inferSelect;
export type AnalyticsReport = typeof analyticsReports.$inferSelect;
export type TradeAccount = typeof tradeAccounts.$inferSelect;
export type TradeOrder = typeof tradeOrders.$inferSelect;
export type TradePosition = typeof tradePositions.$inferSelect;
export type TradeFill = typeof tradeFills.$inferSelect;
export type TradeRiskDecision = typeof tradeRiskDecisions.$inferSelect;
export type BrainConsensus = typeof brainConsensus.$inferSelect;
export type BrainSelfReview = typeof brainSelfReviews.$inferSelect;
export type BrainRlExperience = typeof brainRlExperiences.$inferSelect;
export type PfiAllocation = typeof pfiAllocations.$inferSelect;
export type PfiRebalance = typeof pfiRebalances.$inferSelect;
export type PfiRiskBudget = typeof pfiRiskBudgets.$inferSelect;
export type PfLedgerEntry = typeof pfLedger.$inferSelect;
export type PfSnapshot = typeof pfSnapshots.$inferSelect;
export type PlatPipelineRun = typeof platPipelineRuns.$inferSelect;
export type PlatSupervisorAlert = typeof platSupervisorAlerts.$inferSelect;
export type PlatHealthSnapshot = typeof platHealthSnapshots.$inferSelect;
export type ExecutionQualityRow = typeof executionQuality.$inferSelect;
export type ExecutionJournalRow = typeof executionJournal.$inferSelect;
export type ExecutionTimelineRow = typeof executionTimeline.$inferSelect;
export type ExecutionReplayRow = typeof executionReplay.$inferSelect;
export type UsrUser = typeof usrUsers.$inferSelect;
export type UsrUserInsert = typeof usrUsers.$inferInsert;
export type OrgOrg = typeof orgOrgs.$inferSelect;
export type OrgMember = typeof orgMembers.$inferSelect;
export type AuthSession = typeof authSessions.$inferSelect;
export type AuthzRole = typeof authzRoles.$inferSelect;
export type ApikeyKey = typeof apikeyKeys.$inferSelect;
export type AuditEvent = typeof auditEvents.$inferSelect;
export type MdSymbol = typeof mdSymbols.$inferSelect;
export type MdSymbolInsert = typeof mdSymbols.$inferInsert;
export type MdCandle = typeof mdCandles.$inferSelect;
export type MdCandleInsert = typeof mdCandles.$inferInsert;
export type MdCorporateAction = typeof mdCorporateActions.$inferSelect;
export type MdWatchlist = typeof mdWatchlists.$inferSelect;
export type MdWatchlistItem = typeof mdWatchlistItems.$inferSelect;
export type MdNews = typeof mdNews.$inferSelect;
export type MdOptionSnapshot = typeof mdOptionSnapshots.$inferSelect;

export const brainMemory = pgTable(
  "brain_memory",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    // Brief schema columns (nullable to support market insertions)
    domain: text("domain"),
    module: text("module"),
    key: text("key"),
    payload: jsonb("payload").$type<Record<string, unknown>>().default({}),
    
    // Market schema columns (nullable to support brief insertions)
    tier: text("tier"), // SHORT|WORKING|LONG|ARCHIVED|RESEARCH
    kind: text("kind"), // LESSON|OBSERVATION|DECISION|RESEARCH
    subject: text("subject"),
    content: jsonb("content").$type<Record<string, unknown>>(),
    importance: doublePrecision("importance").default(0.5),
    tenantId: text("tenant_id"),
    
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_brain_memory_domain_key").on(t.domain, t.key, t.id),
    index("idx_brain_memory_tier").on(t.tier, t.createdAt)
  ],
);

export type BrainMemory = typeof brainMemory.$inferSelect;
export type NewBrainMemory = typeof brainMemory.$inferInsert;

export const opsRegistry = pgTable("ops_registry", {
  componentId: text("component_id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  kind: text("kind").notNull().default("engine"),
  mode: text("mode").notNull().default("heartbeat"),
  /** Probe implementation for probe-mode components: postgres | redis | control-plane. */
  probe: text("probe"),
  heartbeatTimeoutSec: integer("heartbeat_timeout_sec").notNull().default(120),
  dependencies: jsonb("dependencies")
    .$type<{ componentId: string; criticality: string }[]>()
    .notNull()
    .default([]),
  alertRules: jsonb("alert_rules")
    .$type<{ metric: string; op: string; threshold: number; severity: string; title: string }[]>()
    .notNull()
    .default([]),
  active: boolean("active").notNull().default(true),
  source: text("source").notNull().default("self-registered"),
  registeredAt: timestamp("registered_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type OpsRegistry = typeof opsRegistry.$inferSelect;
export type NewOpsRegistry = typeof opsRegistry.$inferInsert;

export const opsEvents = pgTable(
  "ops_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    type: text("type").notNull(),
    componentId: text("component_id"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_ops_events_time").on(t.createdAt),
    index("idx_ops_events_component_type").on(t.componentId, t.type, t.id),
  ],
);

export type OpsEvents = typeof opsEvents.$inferSelect;
export type NewOpsEvents = typeof opsEvents.$inferInsert;

export const opsComponentState = pgTable("ops_component_state", {
  componentId: text("component_id").primaryKey(),
  status: text("status").notNull(),
  message: text("message").notNull().default(""),
  latencyMs: doublePrecision("latency_ms"),
  metrics: jsonb("metrics").$type<Record<string, number>>().notNull().default({}),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }).notNull(),
  lastStatusChangeAt: timestamp("last_status_change_at", { withTimezone: true }).notNull(),
});

export type OpsComponentState = typeof opsComponentState.$inferSelect;
export type NewOpsComponentState = typeof opsComponentState.$inferInsert;

export const opsHealthSnapshots = pgTable(
  "ops_health_snapshots",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    componentId: text("component_id").notNull(),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    message: text("message").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_ops_snapshots_component_time").on(t.componentId, t.createdAt)],
);

export type OpsHealthSnapshots = typeof opsHealthSnapshots.$inferSelect;
export type NewOpsHealthSnapshots = typeof opsHealthSnapshots.$inferInsert;

export const opsMetrics = pgTable(
  "ops_metrics",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    componentId: text("component_id"),
    name: text("name").notNull(),
    value: doublePrecision("value").notNull(),
    unit: text("unit").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_ops_metrics_name_time").on(t.name, t.createdAt)],
);

export type OpsMetrics = typeof opsMetrics.$inferSelect;
export type NewOpsMetrics = typeof opsMetrics.$inferInsert;

export const opsAlerts = pgTable(
  "ops_alerts",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    dedupeKey: text("dedupe_key").notNull(),
    componentId: text("component_id"),
    severity: text("severity").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull().default(""),
    status: text("status").notNull().default("active"),
    triggeredAt: timestamp("triggered_at", { withTimezone: true }).notNull().defaultNow(),
    lastEvaluatedAt: timestamp("last_evaluated_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (t) => [index("idx_ops_alerts_dedupe_status").on(t.dedupeKey, t.status)],
);

export type OpsAlerts = typeof opsAlerts.$inferSelect;
export type NewOpsAlerts = typeof opsAlerts.$inferInsert;

export const controlPlaneState = pgTable("control_plane_state", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ControlPlaneState = typeof controlPlaneState.$inferSelect;
export type NewControlPlaneState = typeof controlPlaneState.$inferInsert;

export const execPortfolios = pgTable("exec_portfolios", {
  id: text("id").primaryKey(),
  cash: doublePrecision("cash").notNull(),
  usedMargin: doublePrecision("used_margin").notNull().default(0),
  realizedPnl: doublePrecision("realized_pnl").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ExecPortfolios = typeof execPortfolios.$inferSelect;
export type NewExecPortfolios = typeof execPortfolios.$inferInsert;

export const execOrders = pgTable(
  "exec_orders",
  {
    id: text("id").primaryKey(),
    decisionId: text("decision_id").notNull().unique(),
    symbol: text("symbol").notNull(),
    side: text("side").notNull(),
    quantity: doublePrecision("quantity").notNull(),
    requestPrice: doublePrecision("request_price").notNull(),
    fillPrice: doublePrecision("fill_price"),
    status: text("status").notNull().default("CREATED"),
    reason: text("reason").notNull().default(""),
    source: text("source").notNull().default("ai"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_exec_orders_created").on(t.createdAt)],
);

export type ExecOrders = typeof execOrders.$inferSelect;
export type NewExecOrders = typeof execOrders.$inferInsert;

export const marketBars = pgTable(
  "market_bars",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    symbol: text("symbol").notNull(),
    exchange: text("exchange").notNull().default("NSE"),
    barDate: text("bar_date").notNull(),
    open: doublePrecision("open").notNull(),
    high: doublePrecision("high").notNull(),
    low: doublePrecision("low").notNull(),
    close: doublePrecision("close").notNull(),
    volume: doublePrecision("volume").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("uq_market_bars_symbol_date").on(t.symbol, t.barDate)],
);

export type MarketBars = typeof marketBars.$inferSelect;
export type NewMarketBars = typeof marketBars.$inferInsert;

export const brainModels = pgTable("brain_models", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  status: text("status").notNull().default("ACTIVE"),
  stats: jsonb("stats").$type<Record<string, number>>().notNull().default({}),
  activatedAt: timestamp("activated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type BrainModels = typeof brainModels.$inferSelect;
export type NewBrainModels = typeof brainModels.$inferInsert;

export const modelMemory = pgTable(
  "model_memory",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    modelId: text("model_id").notNull(),
    kind: text("kind").notNull(),
    key: text("key").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_model_memory_model_kind").on(t.modelId, t.kind, t.id)],
);

export type ModelMemory = typeof modelMemory.$inferSelect;
export type NewModelMemory = typeof modelMemory.$inferInsert;

export const brainStrategies = pgTable("brain_strategies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
  stats: jsonb("stats").$type<Record<string, number>>().notNull().default({}),
  active: boolean("active").notNull().default(true),
  // Strategy Laboratory lineage (Phase-3): versions are new rows, never edits.
  version: integer("version").notNull().default(1),
  parentId: text("parent_id"),
  status: text("status").notNull().default("active"), // active|experimental|retired|archived
  createdBy: text("created_by").notNull().default("seed"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type BrainStrategies = typeof brainStrategies.$inferSelect;
export type NewBrainStrategies = typeof brainStrategies.$inferInsert;

export const brainFormulas = pgTable("brain_formulas", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(), // indicator|entry_rule|exit_rule|position_sizing|risk|market_filter
  name: text("name").notNull(),
  definition: jsonb("definition").$type<Record<string, unknown>>().notNull().default({}),
  creator: text("creator").notNull().default("system"),
  version: integer("version").notNull().default(1),
  parentId: text("parent_id"),
  dependencies: jsonb("dependencies").$type<string[]>().notNull().default([]),
  stats: jsonb("stats").$type<Record<string, number>>().notNull().default({}),
  confidence: doublePrecision("confidence").notNull().default(0.5),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type BrainFormulas = typeof brainFormulas.$inferSelect;
export type NewBrainFormulas = typeof brainFormulas.$inferInsert;

export const knowledgeEdges = pgTable(
  "knowledge_edges",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    fromType: text("from_type").notNull(),
    fromId: text("from_id").notNull(),
    relation: text("relation").notNull(),
    toType: text("to_type").notNull(),
    toId: text("to_id").notNull(),
    weight: doublePrecision("weight").notNull().default(1),
    evidence: jsonb("evidence").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_knowledge_from").on(t.fromType, t.fromId),
    index("idx_knowledge_to").on(t.toType, t.toId),
    uniqueIndex("uq_knowledge_edge").on(t.fromType, t.fromId, t.relation, t.toType, t.toId),
  ],
);

export type KnowledgeEdges = typeof knowledgeEdges.$inferSelect;
export type NewKnowledgeEdges = typeof knowledgeEdges.$inferInsert;

export const decisionQuality = pgTable(
  "decision_quality",
  {
    decisionId: text("decision_id").primaryKey(),
    cycleId: text("cycle_id").notNull(),
    symbol: text("symbol").notNull(),
    action: text("action").notNull(),
    strategyId: text("strategy_id"),
    confidence: integer("confidence").notNull(),
    reasoningQuality: integer("reasoning_quality").notNull(),
    riskScore: integer("risk_score").notNull(),
    expectedMovePct: doublePrecision("expected_move_pct").notNull(),
    targetPrice: doublePrecision("target_price").notNull(),
    stopPrice: doublePrecision("stop_price").notNull(),
    horizonBars: integer("horizon_bars").notNull().default(10),
    expectedReward: doublePrecision("expected_reward").notNull().default(0),
    expectedRisk: doublePrecision("expected_risk").notNull().default(0),
    marketRegime: text("market_regime").notNull().default("UNKNOWN"),
    modelsParticipated: jsonb("models_participated").$type<string[]>().notNull().default([]),
    holdingTimeSec: integer("holding_time_sec"),
    entryPrice: doublePrecision("entry_price"),
    status: text("status").notNull().default("pending"),
    actualMovePct: doublePrecision("actual_move_pct"),
    predictionError: doublePrecision("prediction_error"),
    outcome: text("outcome"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    evaluatedAt: timestamp("evaluated_at", { withTimezone: true }),
  },
  (t) => [index("idx_decision_quality_status").on(t.status, t.symbol)],
);

export type DecisionQuality = typeof decisionQuality.$inferSelect;
export type NewDecisionQuality = typeof decisionQuality.$inferInsert;

export const marketIntel = pgTable(
  "market_intel",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    kind: text("kind").notNull(), // news | fii_dii | sector_map
    symbol: text("symbol"),
    sector: text("sector"),
    impact: text("impact"), // high | medium | low
    horizon: text("horizon"), // short_term | long_term
    title: text("title").notNull().default(""),
    value: doublePrecision("value"), // net flow (₹ crore) for fii_dii
    effectiveDate: text("effective_date").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_market_intel_kind_date").on(t.kind, t.effectiveDate)],
);

export type MarketIntel = typeof marketIntel.$inferSelect;
export type NewMarketIntel = typeof marketIntel.$inferInsert;

export const execPositions = pgTable(
  "exec_positions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    symbol: text("symbol").notNull(),
    direction: text("direction").notNull(),
    quantity: doublePrecision("quantity").notNull(),
    avgEntryPrice: doublePrecision("avg_entry_price").notNull(),
    markPrice: doublePrecision("mark_price").notNull(),
    realizedPnl: doublePrecision("realized_pnl").notNull().default(0),
    status: text("status").notNull().default("open"),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
  },
  (t) => [index("idx_exec_positions_symbol_status").on(t.symbol, t.status)],
);

export type ExecPositions = typeof execPositions.$inferSelect;
export type NewExecPositions = typeof execPositions.$inferInsert;

export const mdSymbols = pgTable(
  "md_symbols",
  {
    id: serial("id").primaryKey(),
    symbol: text("symbol").notNull(),
    exchange: text("exchange").notNull(),
    token: text("token"),
    name: text("name"),
    instrumentType: text("instrument_type").notNull(),
    segment: text("segment"),
    sector: text("sector"),
    industry: text("industry"),
    isin: text("isin"),
    lotSize: integer("lot_size").default(1).notNull(),
    tickSize: doublePrecision("tick_size").default(0.05).notNull(),
    freezeQty: integer("freeze_qty").default(0).notNull(),
    faceValue: doublePrecision("face_value").default(10).notNull(),
    expiry: date("expiry"),
    strike: doublePrecision("strike"),
    optionType: text("option_type"),
    status: text("status").default("ACTIVE").notNull(),
    listingDate: date("listing_date"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("md_symbols_uq").on(
      t.exchange,
      t.symbol,
      t.instrumentType,
      t.expiry,
      t.strike,
      t.optionType,
    ),
    index("md_symbols_symbol_idx").on(t.symbol),
    index("md_symbols_sector_idx").on(t.sector),
    index("md_symbols_type_idx").on(t.instrumentType),
  ],
);

export type MdSymbols = typeof mdSymbols.$inferSelect;
export type NewMdSymbols = typeof mdSymbols.$inferInsert;

export const mdCandles = pgTable(
  "md_candles",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    symbol: text("symbol").notNull(),
    exchange: text("exchange").notNull(),
    timeframe: text("timeframe").notNull(),
    ts: timestamp("ts", { withTimezone: true }).notNull(),
    open: doublePrecision("open").notNull(),
    high: doublePrecision("high").notNull(),
    low: doublePrecision("low").notNull(),
    close: doublePrecision("close").notNull(),
    volume: bigint("volume", { mode: "number" }).default(0).notNull(),
    oi: bigint("oi", { mode: "number" }).default(0).notNull(),
    adjusted: boolean("adjusted").default(false).notNull(),
  },
  (t) => [
    uniqueIndex("md_candles_uq").on(t.symbol, t.exchange, t.timeframe, t.ts),
    index("md_candles_lookup_idx").on(t.symbol, t.timeframe, t.ts),
  ],
);

export type MdCandles = typeof mdCandles.$inferSelect;
export type NewMdCandles = typeof mdCandles.$inferInsert;

export const mdCorporateActions = pgTable(
  "md_corporate_actions",
  {
    id: serial("id").primaryKey(),
    symbol: text("symbol").notNull(),
    exchange: text("exchange").notNull(),
    actionType: text("action_type").notNull(),
    exDate: date("ex_date").notNull(),
    recordDate: date("record_date"),
    ratioFrom: doublePrecision("ratio_from"),
    ratioTo: doublePrecision("ratio_to"),
    value: doublePrecision("value"),
    details: text("details"),
    applied: boolean("applied").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("md_ca_symbol_idx").on(t.symbol, t.exDate),
    uniqueIndex("md_ca_uq").on(t.symbol, t.exchange, t.actionType, t.exDate),
  ],
);

export type MdCorporateActions = typeof mdCorporateActions.$inferSelect;
export type NewMdCorporateActions = typeof mdCorporateActions.$inferInsert;

export const mdWatchlists = pgTable("md_watchlists", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").default("USER").notNull(),
  pinned: boolean("pinned").default(false).notNull(),
  meta: jsonb("meta").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type MdWatchlists = typeof mdWatchlists.$inferSelect;
export type NewMdWatchlists = typeof mdWatchlists.$inferInsert;

export const mdWatchlistItems = pgTable(
  "md_watchlist_items",
  {
    id: serial("id").primaryKey(),
    watchlistId: integer("watchlist_id").notNull(),
    symbol: text("symbol").notNull(),
    exchange: text("exchange").default("NSE").notNull(),
    addedAt: timestamp("added_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("md_wl_items_uq").on(t.watchlistId, t.symbol, t.exchange),
    index("md_wl_items_wl_idx").on(t.watchlistId),
  ],
);

export type MdWatchlistItems = typeof mdWatchlistItems.$inferSelect;
export type NewMdWatchlistItems = typeof mdWatchlistItems.$inferInsert;

export const mdNews = pgTable(
  "md_news",
  {
    id: serial("id").primaryKey(),
    source: text("source").notNull(),
    category: text("category").notNull(),
    symbol: text("symbol"),
    headline: text("headline").notNull(),
    body: text("body"),
    url: text("url"),
    impact: text("impact").default("LOW").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("md_news_published_idx").on(t.publishedAt),
    index("md_news_symbol_idx").on(t.symbol),
  ],
);

export type NewMdNews = typeof mdNews.$inferInsert;

export const mdOptionSnapshots = pgTable(
  "md_option_snapshots",
  {
    id: serial("id").primaryKey(),
    underlying: text("underlying").notNull(),
    expiry: date("expiry").notNull(),
    ts: timestamp("ts", { withTimezone: true }).defaultNow().notNull(),
    spot: doublePrecision("spot").notNull(),
    pcr: doublePrecision("pcr").notNull(),
    maxPain: doublePrecision("max_pain").notNull(),
    totalCallOi: bigint("total_call_oi", { mode: "number" }).default(0).notNull(),
    totalPutOi: bigint("total_put_oi", { mode: "number" }).default(0).notNull(),
    chain: jsonb("chain").$type<unknown>().notNull(),
  },
  (t) => [index("md_opt_snap_idx").on(t.underlying, t.expiry, t.ts)],
);

export type MdOptionSnapshots = typeof mdOptionSnapshots.$inferSelect;
export type NewMdOptionSnapshots = typeof mdOptionSnapshots.$inferInsert;

export const rtJobs = pgTable(
  "rt_jobs",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    status: text("status").notNull(), // RUNNING | SUCCESS | FAILED
    durationMs: integer("duration_ms").default(0).notNull(),
    error: text("error"),
    tenantId: text("tenant_id"),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("rt_jobs_name_idx").on(t.name, t.startedAt)],
);

export type RtJobs = typeof rtJobs.$inferSelect;
export type NewRtJobs = typeof rtJobs.$inferInsert;

export const rtStreamOffsets = pgTable(
  "rt_stream_offsets",
  {
    id: serial("id").primaryKey(),
    stream: text("stream").notNull(),
    consumerGroup: text("consumer_group").notNull(),
    lastOffset: text("last_offset").notNull(),
    tenantId: text("tenant_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("rt_offsets_uq").on(t.stream, t.consumerGroup)],
);

export type RtStreamOffsets = typeof rtStreamOffsets.$inferSelect;
export type NewRtStreamOffsets = typeof rtStreamOffsets.$inferInsert;

export const rtDeadLetter = pgTable(
  "rt_dead_letter",
  {
    id: serial("id").primaryKey(),
    topic: text("topic").notNull(),
    payload: jsonb("payload").$type<unknown>().notNull(),
    error: text("error").notNull(),
    retries: integer("retries").default(0).notNull(),
    resolved: boolean("resolved").default(false).notNull(),
    tenantId: text("tenant_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("rt_dlq_topic_idx").on(t.topic, t.resolved)],
);

export type NewRtDeadLetter = typeof rtDeadLetter.$inferInsert;

export const usrUsers = pgTable(
  "usr_users",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name"),
    status: text("status").default("ACTIVE").notNull(), // ACTIVE | SUSPENDED
    tenantId: text("tenant_id"),
    version: integer("version").default(1).notNull(),
    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("uq_usr_users_email").on(t.email)],
);

export type UsrUsers = typeof usrUsers.$inferSelect;
export type NewUsrUsers = typeof usrUsers.$inferInsert;

export const orgOrgs = pgTable(
  "org_orgs",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    ownerId: integer("owner_id").notNull(),
    tenantId: text("tenant_id"),
    version: integer("version").default(1).notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("uq_org_orgs_slug").on(t.slug)],
);

export type OrgOrgs = typeof orgOrgs.$inferSelect;
export type NewOrgOrgs = typeof orgOrgs.$inferInsert;

export const orgMembers = pgTable(
  "org_members",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull().references(() => orgOrgs.id),
    userId: integer("user_id").notNull().references(() => usrUsers.id),
    role: text("role").default("MEMBER").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("uq_org_members").on(t.orgId, t.userId)],
);

export type OrgMembers = typeof orgMembers.$inferSelect;
export type NewOrgMembers = typeof orgMembers.$inferInsert;

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => usrUsers.id),
    tokenHash: text("token_hash").notNull(),
    ip: text("ip"),
    userAgent: text("user_agent"),
    revoked: boolean("revoked").default(false).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("uq_auth_sessions_token").on(t.tokenHash),
    index("idx_auth_sessions_user").on(t.userId),
  ],
);

export type AuthSessions = typeof authSessions.$inferSelect;
export type NewAuthSessions = typeof authSessions.$inferInsert;

export const authzRoles = pgTable(
  "authz_roles",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("uq_authz_roles_name").on(t.name)],
);

export type AuthzRoles = typeof authzRoles.$inferSelect;
export type NewAuthzRoles = typeof authzRoles.$inferInsert;

export const authzUserRoles = pgTable(
  "authz_user_roles",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => usrUsers.id),
    roleId: integer("role_id").notNull().references(() => authzRoles.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("uq_authz_user_roles").on(t.userId, t.roleId)],
);

export type AuthzUserRoles = typeof authzUserRoles.$inferSelect;
export type NewAuthzUserRoles = typeof authzUserRoles.$inferInsert;

export const apikeyKeys = pgTable(
  "apikey_keys",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => usrUsers.id),
    name: text("name").notNull(),
    keyHash: text("key_hash").notNull(),
    scopes: jsonb("scopes").$type<string[]>().default([]).notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revoked: boolean("revoked").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("uq_apikey_keys_hash").on(t.keyHash),
    index("idx_apikey_keys_user").on(t.userId),
  ],
);

export type ApikeyKeys = typeof apikeyKeys.$inferSelect;
export type NewApikeyKeys = typeof apikeyKeys.$inferInsert;

export const auditEvents = pgTable(
  "audit_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    action: text("action").notNull(),
    actorId: text("actor_id"),
    target: text("target"),
    details: jsonb("details").$type<Record<string, unknown>>().default({}).notNull(),
    ip: text("ip"),
    tenantId: text("tenant_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("idx_audit_events_action").on(t.action, t.createdAt)],
);

export type AuditEvents = typeof auditEvents.$inferSelect;
export type NewAuditEvents = typeof auditEvents.$inferInsert;

export const aiDatasets = pgTable(
  "ai_datasets",
  {
    id: serial("id").primaryKey(),
    trainingId: text("training_id").notNull(),
    symbol: text("symbol").notNull(),
    timeframe: text("timeframe").notNull(),
    featureVersion: text("feature_version").notNull(),
    featureNames: jsonb("feature_names").$type<string[]>().default([]).notNull(),
    rowCount: integer("row_count").default(0).notNull(),
    regime: text("regime"),
    rows: jsonb("rows").$type<unknown>().notNull(),
    tenantId: text("tenant_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("uq_ai_datasets_training").on(t.trainingId),
    index("idx_ai_datasets_symbol").on(t.symbol, t.timeframe),
  ],
);

export type AiDatasets = typeof aiDatasets.$inferSelect;
export type NewAiDatasets = typeof aiDatasets.$inferInsert;

export const aiModels = pgTable(
  "ai_models",
  {
    id: serial("id").primaryKey(),
    modelKey: text("model_key").notNull(), // e.g. TREND | MOMENTUM | MEAN_REVERSION | RISK
    version: integer("version").notNull(),
    hash: text("hash").notNull(),
    parentVersion: integer("parent_version"),
    datasetTrainingId: text("dataset_training_id").notNull(),
    weights: jsonb("weights").$type<number[]>().notNull(),
    featureNames: jsonb("feature_names").$type<string[]>().default([]).notNull(),
    metrics: jsonb("metrics").$type<Record<string, number>>().default({}).notNull(),
    active: boolean("active").default(false).notNull(),
    approvalStatus: text("approval_status").default("PENDING").notNull(),
    tenantId: text("tenant_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("uq_ai_models_key_version").on(t.modelKey, t.version),
    index("idx_ai_models_active").on(t.modelKey, t.active),
  ],
);

export type AiModels = typeof aiModels.$inferSelect;
export type NewAiModels = typeof aiModels.$inferInsert;

export const aiLessons = pgTable(
  "ai_lessons",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    modelKey: text("model_key").notNull(),
    symbol: text("symbol").notNull(),
    strategy: text("strategy"),
    regime: text("regime"),
    expectedReward: doublePrecision("expected_reward"),
    actualReward: doublePrecision("actual_reward"),
    confidence: doublePrecision("confidence"),
    holdingTime: integer("holding_time"),
    drawdown: doublePrecision("drawdown"),
    slippage: doublePrecision("slippage"),
    result: text("result"), // WIN | LOSS | FLAT
    lesson: text("lesson").notNull(),
    source: text("source").default("PAPER").notNull(),
    tenantId: text("tenant_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("idx_ai_lessons_model").on(t.modelKey, t.createdAt)],
);

export type AiLessons = typeof aiLessons.$inferSelect;
export type NewAiLessons = typeof aiLessons.$inferInsert;

export const brainKnowledgeEdges = pgTable(
  "brain_knowledge_edges",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    sourceType: text("source_type").notNull(), // STOCK|SECTOR|STRATEGY|INDICATOR|NEWS|MACRO...
    sourceId: text("source_id").notNull(),
    relation: text("relation").notNull(), // CORRELATES|LEADS|IMPACTS|BELONGS_TO...
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    confidence: doublePrecision("confidence").default(0.5).notNull(),
    observations: integer("observations").default(1).notNull(),
    tenantId: text("tenant_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("uq_brain_edge").on(
      t.sourceType,
      t.sourceId,
      t.relation,
      t.targetType,
      t.targetId,
    ),
    index("idx_brain_edge_source").on(t.sourceType, t.sourceId),
  ],
);

export type BrainKnowledgeEdges = typeof brainKnowledgeEdges.$inferSelect;
export type NewBrainKnowledgeEdges = typeof brainKnowledgeEdges.$inferInsert;

export const brainFeatureImportance = pgTable(
  "brain_feature_importance",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    modelKey: text("model_key").notNull(),
    feature: text("feature").notNull(),
    contribution: doublePrecision("contribution").default(0).notNull(),
    helpfulCount: integer("helpful_count").default(0).notNull(),
    harmfulCount: integer("harmful_count").default(0).notNull(),
    regime: text("regime"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("uq_brain_feature").on(t.modelKey, t.feature, t.regime)],
);

export type NewBrainFeatureImportance = typeof brainFeatureImportance.$inferInsert;

export const brainCalibration = pgTable(
  "brain_calibration",
  {
    id: serial("id").primaryKey(),
    modelKey: text("model_key").notNull(),
    regime: text("regime").notNull(),
    bucket: integer("bucket").notNull(), // confidence decile 0..9
    predicted: integer("predicted").default(0).notNull(),
    correct: integer("correct").default(0).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("uq_brain_calibration").on(t.modelKey, t.regime, t.bucket)],
);

export type NewBrainCalibration = typeof brainCalibration.$inferInsert;

export const brainMetaRecommendations = pgTable(
  "brain_meta_recommendations",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    modelKey: text("model_key").notNull(),
    kind: text("kind").notNull(), // RETRAIN|CALIBRATE|EXPAND_DATASET|FEATURE_CHANGE|STABLE
    severity: text("severity").default("INFO").notNull(), // INFO|WARN|CRITICAL
    rationale: text("rationale").notNull(),
    evidence: jsonb("evidence").$type<Record<string, unknown>>().default({}).notNull(),
    status: text("status").default("OPEN").notNull(), // OPEN|ACKNOWLEDGED|APPLIED|DISMISSED
    tenantId: text("tenant_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("idx_brain_meta_model").on(t.modelKey, t.createdAt)],
);

export type BrainMetaRecommendations = typeof brainMetaRecommendations.$inferSelect;
export type NewBrainMetaRecommendations = typeof brainMetaRecommendations.$inferInsert;

export const brainModelReputation = pgTable(
  "brain_model_reputation",
  {
    id: serial("id").primaryKey(),
    modelKey: text("model_key").notNull(),
    regime: text("regime").default("ALL").notNull(),
    trades: integer("trades").default(0).notNull(),
    wins: integer("wins").default(0).notNull(),
    cumReward: doublePrecision("cum_reward").default(0).notNull(),
    cumReturnSq: doublePrecision("cum_return_sq").default(0).notNull(),
    maxDrawdown: doublePrecision("max_drawdown").default(0).notNull(),
    recentScore: doublePrecision("recent_score").default(0.5).notNull(),
    influence: doublePrecision("influence").default(1).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("uq_brain_reputation").on(t.modelKey, t.regime)],
);

export type NewBrainModelReputation = typeof brainModelReputation.$inferInsert;

export const brainMarketDna = pgTable(
  "brain_market_dna",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    symbol: text("symbol").notNull(),
    timeframe: text("timeframe").notNull(),
    ts: timestamp("ts", { withTimezone: true }).notNull(),
    pattern: text("pattern").notNull(), // TRENDING|RANGE|BREAKOUT|GAP_UP|PANIC_SELLING...
    regime: text("regime").notNull(),
    fingerprint: jsonb("fingerprint").$type<number[]>().notNull(),
    forwardReturn: doublePrecision("forward_return"),
    tenantId: text("tenant_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("idx_brain_dna_symbol").on(t.symbol, t.pattern)],
);

export type NewBrainMarketDna = typeof brainMarketDna.$inferInsert;

export const analyticsReports = pgTable(
  "analytics_reports",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    kind: text("kind").notNull(), // DAILY|WEEKLY|BRAIN|STRATEGY|TRAINING|RISK|PAPER|BROKER|MARKET
    period: text("period"),
    title: text("title").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    generatedBy: text("generated_by"),
    tenantId: text("tenant_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("idx_analytics_reports_kind").on(t.kind, t.createdAt)],
);

export type AnalyticsReports = typeof analyticsReports.$inferSelect;
export type NewAnalyticsReports = typeof analyticsReports.$inferInsert;

export const tradeAccounts = pgTable(
  "trade_accounts",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    kind: text("kind").default("PAPER").notNull(), // PAPER | LIVE (live later)
    currency: text("currency").default("INR").notNull(),
    startingBalance: doublePrecision("starting_balance").default(1000000).notNull(),
    cash: doublePrecision("cash").default(1000000).notNull(),
    realizedPnl: doublePrecision("realized_pnl").default(0).notNull(),
    tenantId: text("tenant_id"),
    version: integer("version").default(1).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("uq_trade_accounts_user_kind").on(t.userId, t.kind)],
);

export type TradeAccounts = typeof tradeAccounts.$inferSelect;
export type NewTradeAccounts = typeof tradeAccounts.$inferInsert;

export const tradeOrders = pgTable(
  "trade_orders",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accountId: integer("account_id").notNull(),
    symbol: text("symbol").notNull(),
    exchange: text("exchange").default("NSE").notNull(),
    side: text("side").notNull(), // BUY | SELL
    orderType: text("order_type").notNull(), // MARKET|LIMIT|SL|SL_M
    product: text("product").default("INTRADAY").notNull(), // INTRADAY|DELIVERY|FUT|OPT
    quantity: integer("quantity").notNull(),
    filledQuantity: integer("filled_quantity").default(0).notNull(),
    limitPrice: doublePrecision("limit_price"),
    triggerPrice: doublePrecision("trigger_price"),
    avgFillPrice: doublePrecision("avg_fill_price"),
    status: text("status").notNull(), // CREATED|VALIDATED|RISK_APPROVED|REJECTED|SUBMITTED|ACCEPTED|PARTIAL|FILLED|CANCELLED|EXPIRED
    rejectReason: text("reject_reason"),
    strategy: text("strategy"),
    confidence: doublePrecision("confidence"),
    tenantId: text("tenant_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("idx_trade_orders_acct").on(t.accountId, t.createdAt)],
);

export type TradeOrders = typeof tradeOrders.$inferSelect;
export type NewTradeOrders = typeof tradeOrders.$inferInsert;

export const tradeOrderEvents = pgTable(
  "trade_order_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    orderId: bigint("order_id", { mode: "number" }).notNull(),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    latencyMs: integer("latency_ms").default(0).notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("idx_trade_order_events_order").on(t.orderId, t.createdAt)],
);

export type TradeOrderEvents = typeof tradeOrderEvents.$inferSelect;
export type NewTradeOrderEvents = typeof tradeOrderEvents.$inferInsert;

export const tradePositions = pgTable(
  "trade_positions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accountId: integer("account_id").notNull(),
    symbol: text("symbol").notNull(),
    exchange: text("exchange").default("NSE").notNull(),
    product: text("product").default("INTRADAY").notNull(),
    quantity: integer("quantity").default(0).notNull(),
    avgPrice: doublePrecision("avg_price").default(0).notNull(),
    realizedPnl: doublePrecision("realized_pnl").default(0).notNull(),
    status: text("status").default("OPEN").notNull(), // OPEN | CLOSED
    openedAt: timestamp("opened_at", { withTimezone: true }).defaultNow().notNull(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    tenantId: text("tenant_id"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("idx_trade_positions_acct").on(t.accountId, t.status)],
);

export type TradePositions = typeof tradePositions.$inferSelect;
export type NewTradePositions = typeof tradePositions.$inferInsert;

export const tradeFills = pgTable(
  "trade_fills",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    orderId: bigint("order_id", { mode: "number" }).notNull(),
    accountId: integer("account_id").notNull(),
    symbol: text("symbol").notNull(),
    side: text("side").notNull(),
    quantity: integer("quantity").notNull(),
    price: doublePrecision("price").notNull(),
    expectedPrice: doublePrecision("expected_price").notNull(),
    slippage: doublePrecision("slippage").default(0).notNull(),
    spread: doublePrecision("spread").default(0).notNull(),
    latencyMs: integer("latency_ms").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("idx_trade_fills_acct").on(t.accountId, t.createdAt)],
);

export type TradeFills = typeof tradeFills.$inferSelect;
export type NewTradeFills = typeof tradeFills.$inferInsert;

export const tradeRiskDecisions = pgTable(
  "trade_risk_decisions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accountId: integer("account_id").notNull(),
    symbol: text("symbol").notNull(),
    decision: text("decision").notNull(), // APPROVED | REJECTED
    rulesPassed: jsonb("rules_passed").$type<string[]>().default([]).notNull(),
    rulesFailed: jsonb("rules_failed").$type<string[]>().default([]).notNull(),
    detail: text("detail"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("idx_trade_risk_acct").on(t.accountId, t.createdAt)],
);

export type TradeRiskDecisions = typeof tradeRiskDecisions.$inferSelect;
export type NewTradeRiskDecisions = typeof tradeRiskDecisions.$inferInsert;

export const brainConsensus = pgTable(
  "brain_consensus",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    symbol: text("symbol").notNull(),
    exchange: text("exchange").default("NSE").notNull(),
    regime: text("regime").notNull(),
    method: text("method").notNull(), // MAJORITY|CONFIDENCE|REPUTATION|REGIME
    decision: text("decision").notNull(), // BUY|SELL|HOLD
    score: doublePrecision("score").notNull(),
    agreement: doublePrecision("agreement").notNull(),
    disagreement: doublePrecision("disagreement").notNull(),
    opinions: jsonb("opinions").$type<unknown>().notNull(),
    tenantId: text("tenant_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("idx_brain_consensus_symbol").on(t.symbol, t.createdAt)],
);

export type NewBrainConsensus = typeof brainConsensus.$inferInsert;

export const brainSelfReviews = pgTable(
  "brain_self_reviews",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    scope: text("scope").notNull(), // DAILY|WEEKLY|MONTHLY|REGIME
    healthScore: integer("health_score").default(0).notNull(),
    strengths: jsonb("strengths").$type<string[]>().default([]).notNull(),
    weaknesses: jsonb("weaknesses").$type<string[]>().default([]).notNull(),
    proposals: jsonb("proposals").$type<string[]>().default([]).notNull(),
    tenantId: text("tenant_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("idx_brain_selfreview_scope").on(t.scope, t.createdAt)],
);

export type BrainSelfReviews = typeof brainSelfReviews.$inferSelect;
export type NewBrainSelfReviews = typeof brainSelfReviews.$inferInsert;

export const brainRlExperiences = pgTable(
  "brain_rl_experiences",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    episode: text("episode").notNull(),
    agent: text("agent").notNull(),
    state: jsonb("state").$type<Record<string, number>>().notNull(),
    action: text("action").notNull(),
    reward: doublePrecision("reward").default(0).notNull(),
    nextState: jsonb("next_state").$type<Record<string, number>>(),
    terminal: boolean("terminal").default(false).notNull(),
    tenantId: text("tenant_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("idx_brain_rl_episode").on(t.episode, t.createdAt)],
);

export type BrainRlExperiences = typeof brainRlExperiences.$inferSelect;
export type NewBrainRlExperiences = typeof brainRlExperiences.$inferInsert;

export const pfiAllocations = pgTable(
  "pfi_allocations",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accountId: integer("account_id").notNull(),
    optimizer: text("optimizer").notNull(), // MEAN_VARIANCE|RISK_PARITY|MAX_SHARPE|MIN_VARIANCE|EQUAL_WEIGHT
    regime: text("regime").notNull(),
    targets: jsonb("targets").$type<unknown>().notNull(),
    expectedReturn: doublePrecision("expected_return").default(0).notNull(),
    expectedRisk: doublePrecision("expected_risk").default(0).notNull(),
    diversificationScore: doublePrecision("diversification_score").default(0).notNull(),
    rationale: text("rationale"),
    tenantId: text("tenant_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("idx_pfi_alloc_acct").on(t.accountId, t.createdAt)],
);

export type PfiAllocations = typeof pfiAllocations.$inferSelect;
export type NewPfiAllocations = typeof pfiAllocations.$inferInsert;

export const pfiRebalances = pgTable(
  "pfi_rebalances",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accountId: integer("account_id").notNull(),
    reason: text("reason").notNull(),
    actions: jsonb("actions").$type<unknown>().notNull(),
    status: text("status").default("RECOMMENDED").notNull(), // RECOMMENDED (never auto-exec)
    tenantId: text("tenant_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("idx_pfi_rebal_acct").on(t.accountId, t.createdAt)],
);

export type PfiRebalances = typeof pfiRebalances.$inferSelect;
export type NewPfiRebalances = typeof pfiRebalances.$inferInsert;

export const pfiRiskBudgets = pgTable(
  "pfi_risk_budgets",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accountId: integer("account_id").notNull(),
    var95: doublePrecision("var_95").default(0).notNull(),
    cvar95: doublePrecision("cvar_95").default(0).notNull(),
    portfolioBeta: doublePrecision("portfolio_beta").default(0).notNull(),
    portfolioVol: doublePrecision("portfolio_vol").default(0).notNull(),
    concentration: doublePrecision("concentration").default(0).notNull(),
    sectorRisk: jsonb("sector_risk").$type<Record<string, number>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("idx_pfi_risk_acct").on(t.accountId, t.createdAt)],
);

export type PfiRiskBudgets = typeof pfiRiskBudgets.$inferSelect;
export type NewPfiRiskBudgets = typeof pfiRiskBudgets.$inferInsert;

export const pfLedger = pgTable(
  "pf_ledger",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accountId: integer("account_id").notNull(),
    entryType: text("entry_type").notNull(), // TRADE|FEE|TAX|CHARGE|DIVIDEND|BONUS|SPLIT|RIGHTS|INTEREST|MARGIN|SETTLEMENT|DEPOSIT
    account: text("account").notNull(), // CASH|POSITION|PNL|FEES|TAX
    direction: text("direction").notNull(), // DEBIT|CREDIT
    amount: doublePrecision("amount").notNull(),
    symbol: text("symbol"),
    refType: text("ref_type"), // ORDER|FILL|CORP_ACTION|MANUAL
    refId: text("ref_id"),
    balanceAfter: doublePrecision("balance_after"),
    note: text("note"),
    tenantId: text("tenant_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("idx_pf_ledger_acct").on(t.accountId, t.createdAt)],
);

export type PfLedger = typeof pfLedger.$inferSelect;
export type NewPfLedger = typeof pfLedger.$inferInsert;

export const pfSnapshots = pgTable(
  "pf_snapshots",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accountId: integer("account_id").notNull(),
    equity: doublePrecision("equity").notNull(),
    cash: doublePrecision("cash").notNull(),
    investedValue: doublePrecision("invested_value").notNull(),
    unrealizedPnl: doublePrecision("unrealized_pnl").notNull(),
    realizedPnl: doublePrecision("realized_pnl").notNull(),
    exposurePct: doublePrecision("exposure_pct").notNull(),
    openPositions: integer("open_positions").default(0).notNull(),
    concentration: doublePrecision("concentration").default(0).notNull(),
    sectorExposure: jsonb("sector_exposure").$type<Record<string, number>>().default({}).notNull(),
    dailyReturn: doublePrecision("daily_return").default(0).notNull(),
    tenantId: text("tenant_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("idx_pf_snapshots_acct").on(t.accountId, t.createdAt)],
);

export type PfSnapshots = typeof pfSnapshots.$inferSelect;
export type NewPfSnapshots = typeof pfSnapshots.$inferInsert;

export const platPipelineRuns = pgTable(
  "plat_pipeline_runs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    correlationId: text("correlation_id").notNull(),
    symbol: text("symbol").notNull(),
    regime: text("regime").notNull(),
    consensusDecision: text("consensus_decision").notNull(),
    consensusScore: doublePrecision("consensus_score").notNull(),
    riskDecision: text("risk_decision").notNull(),
    executed: boolean("executed").default(false).notNull(),
    orderStatus: text("order_status"),
    stages: jsonb("stages").$type<unknown>().notNull(),
    latencyMs: integer("latency_ms").default(0).notNull(),
    actorId: text("actor_id"),
    tenantId: text("tenant_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("idx_plat_pipeline_symbol").on(t.symbol, t.createdAt)],
);

export type PlatPipelineRuns = typeof platPipelineRuns.$inferSelect;
export type NewPlatPipelineRuns = typeof platPipelineRuns.$inferInsert;

export const platSupervisorAlerts = pgTable(
  "plat_supervisor_alerts",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    category: text("category").notNull(), // DRIFT|EXECUTION|MEMORY|BROKER|QUEUE|WORKER|LATENCY|HEALTH
    severity: text("severity").notNull(), // INFO|WARN|CRITICAL
    subject: text("subject").notNull(),
    detail: text("detail").notNull(),
    recommendation: text("recommendation"),
    status: text("status").default("OPEN").notNull(),
    tenantId: text("tenant_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("idx_plat_alerts_cat").on(t.category, t.createdAt)],
);

export type PlatSupervisorAlerts = typeof platSupervisorAlerts.$inferSelect;
export type NewPlatSupervisorAlerts = typeof platSupervisorAlerts.$inferInsert;

export const platHealthSnapshots = pgTable(
  "plat_health_snapshots",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    overallScore: integer("overall_score").notNull(),
    grade: text("grade").notNull(),
    subsystems: jsonb("subsystems").$type<Record<string, number>>().notNull(),
    platformScore: jsonb("platform_score").$type<Record<string, number>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("idx_plat_health_created").on(t.createdAt)],
);

export type PlatHealthSnapshots = typeof platHealthSnapshots.$inferSelect;
export type NewPlatHealthSnapshots = typeof platHealthSnapshots.$inferInsert;

export const executionQuality = pgTable(
  "execution_quality",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accountId: integer("account_id").notNull(),
    orderId: bigint("order_id", { mode: "number" }).notNull(),
    fillId: bigint("fill_id", { mode: "number" }).notNull(),
    symbol: text("symbol").notNull(),
    side: text("side").notNull(),
    expectedPrice: doublePrecision("expected_price").notNull(),
    fillPrice: doublePrecision("fill_price").notNull(),
    slippage: doublePrecision("slippage").notNull(),
    slippageBps: doublePrecision("slippage_bps").notNull(),
    spread: doublePrecision("spread").notNull(),
    latencyMs: integer("latency_ms").notNull(),
    requestedQty: integer("requested_qty").notNull(),
    filledQty: integer("filled_qty").notNull(),
    fillRatio: doublePrecision("fill_ratio").notNull(),
    marketImpactBps: doublePrecision("market_impact_bps").default(0).notNull(),
    executionScore: doublePrecision("execution_score").notNull(),
    tenantId: text("tenant_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("idx_exec_quality_acct").on(t.accountId, t.createdAt), index("idx_exec_quality_order").on(t.orderId)],
);

export type ExecutionQuality = typeof executionQuality.$inferSelect;
export type NewExecutionQuality = typeof executionQuality.$inferInsert;

export const executionJournal = pgTable(
  "execution_journal",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accountId: integer("account_id").notNull(),
    orderId: bigint("order_id", { mode: "number" }),
    symbol: text("symbol"),
    stage: text("stage").notNull(), // SIGNAL|CONSENSUS|RMS|OMS|PENDING|FILLED|POSITION|EXIT|LEARNING
    event: text("event").notNull(),
    detail: jsonb("detail").$type<Record<string, unknown>>().default({}).notNull(),
    correlationId: text("correlation_id"),
    tenantId: text("tenant_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("idx_exec_journal_acct").on(t.accountId, t.createdAt), index("idx_exec_journal_order").on(t.orderId)],
);

export type ExecutionJournal = typeof executionJournal.$inferSelect;
export type NewExecutionJournal = typeof executionJournal.$inferInsert;

export const executionTimeline = pgTable(
  "execution_timeline",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    orderId: bigint("order_id", { mode: "number" }).notNull(),
    accountId: integer("account_id").notNull(),
    symbol: text("symbol").notNull(),
    stages: jsonb("stages").$type<unknown>().notNull(),
    finalStatus: text("final_status").notNull(),
    totalLatencyMs: integer("total_latency_ms").default(0).notNull(),
    tenantId: text("tenant_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("uq_exec_timeline_order").on(t.orderId)],
);

export type ExecutionTimeline = typeof executionTimeline.$inferSelect;
export type NewExecutionTimeline = typeof executionTimeline.$inferInsert;

export const executionReplay = pgTable(
  "execution_replay",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    orderId: bigint("order_id", { mode: "number" }).notNull(),
    accountId: integer("account_id").notNull(),
    symbol: text("symbol").notNull(),
    steps: jsonb("steps").$type<unknown>().notNull(),
    outcome: jsonb("outcome").$type<Record<string, unknown>>().default({}).notNull(),
    tenantId: text("tenant_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("idx_exec_replay_order").on(t.orderId)],
);

export type ExecutionReplay = typeof executionReplay.$inferSelect;
export type NewExecutionReplay = typeof executionReplay.$inferInsert;

