# Changelog

All notable changes to AITradeMinds. Format: reverse-chronological by phase.
Adheres to the Constitution's backward-compatibility rule — no breaking change
ships without a migration.

## [Phase 8B · v0.15.0-beta] — Enterprise Execution Intelligence
### Audit: OMS/RMS/Portfolio/Ledger/Brain/Paper already built — EXTENDED only.
### Added (reuses OMS/fills/order-events/Brain — no rebuild, no duplication)
- **Execution Quality Tracker** (`execution/quality-tracker.ts`): per-trade
  slippage(bps)/spread/latency/fill-ratio/market-impact → execution score (0–100),
  persisted append-only. Wired into OMS fill path.
- **Trade Replay Engine** (`execution/replay.ts`): step-by-step reconstruction
  (signal→RMS→OMS→execution→quality) from order events/fills/risk decisions.
- **Execution Journal** (`execution/journal.ts`): append-only stage events
  (SIGNAL…LEARNING), NO update/delete, batch inserts.
- **Trade Timeline** (`execution/timeline.ts`): visual state machine from order events.
- **Execution Metrics Aggregator** (`execution/metrics.ts`): latency/slippage/fill%/
  win%/hold-time/broker-efficiency/execution-score (single-pass SQL, no N+1).
- **Workers:** `execution_quality_worker`, `trade_replay_worker` (single scheduler).
- **Database:** `execution_quality`, `execution_journal`, `execution_timeline`,
  `execution_replay` (append-only).
- **APIs:** `/api/v1/execution/{history,replay,metrics,timeline,quality,journal}`.
- **Events:** execution.quality.updated, trade.replayed, learning.execution.completed.
- **Learning:** completed trade → execution quality + journal → existing `aiBrain.evolve`
  (lesson/calibration/reputation/DNA/memory). Brain never bypassed.
- **Tests:** execution scoring + timeline mapping (59 total passing).
### Verified (all gates GREEN)
- tsc 0 · ESLint 0 · vitest 59/59 · build exit 0 · migration (4 tables) ·
  build_and_start healthy · E2E: quality(93/84), metrics(execScore 88.5), journal(5),
  timeline(8 stages), replay(10 steps), Brain reputation updated (4 trades, infl 1.496).

## [Deployment Fix · v0.14.1-beta] — Scheduler/Workers running + gates GREEN
### Root cause (deployment failure analysis)
- Scheduler/Workers not running on deploy: `infra/bootstrap.ts` started the
  scheduler only when `SCHEDULER_ENABLED` env was truthy (opt-in); env unset on
  deploy → `scheduler.running=false`. Latent bug: `scheduler.register()` did not
  arm a timer for jobs registered AFTER `start()` → domain jobs never fired.
- ESLint: 2 `react-hooks/set-state-in-effect` errors in `dashboard.tsx`.
- Redis: no server/client in environment → in-proc fallback (ADR-0003/TD-002).
### Fixed (targeted, no new architecture)
- `infra/scheduler.ts` — `register()` now arms newly-registered jobs immediately
  when running (extracted `arm()`); `start()` reuses it.
- `kernel/config.ts` — `SCHEDULER_ENABLED` defaults ON at runtime (opt-out).
- `infra/bootstrap.ts` — starts scheduler at runtime, skips `next build` phase.
- `platform/bootstrap.ts` — top orchestrator starts the full worker fleet
  (realtime+brain+training+analytics) so all 9 jobs run.
- `app/dashboard.tsx` — 2 effects use inline async IIFE (lint clean).
### Verified (all gates GREEN)
- ESLint 0 · tsc 0 · vitest 53/53 · next build exit 0 · migration (46 tables) ·
  bootstrap · build_and_start healthy · scheduler.running=true (9 workers, rt_jobs
  firing) · E2E pipeline BUY→RMS→Portfolio→Paper OMS→Learning (INFY/SBIN FILLED).
### Known limitation (honest)
- Redis not connected: no Redis in this environment → in-proc transport/L2 fallback
  (by design, ADR-0003/TD-002). Health = HEALTHY in single-process mode.

## [Phase 12 · v0.14.0-beta] — Autonomous AI Operating System (capstone)
### Audit note
- Enterprise RMS, OMS, AI Society, Consensus, Portfolio already existed (Phases 7/9/10/11)
  — NOT rebuilt (extend-only). This phase adds the orchestration capstone only.
### Added (orchestrates existing singletons — no duplication, nothing bypasses Brain)
- **Master Execution Pipeline** (`platform/pipeline.ts`): unified flow MarketData→
  Features→AI Society→Consensus→Brain→RMS→Portfolio→Paper OMS→Learning. Recommend-only
  unless autoExecutePaper; correlation-ID traced; append-only run history.
- **AI Command Center** (`platform/command-center.ts`): read-only Brain inspection
  across every subsystem (never modifies data).
- **Autonomous Supervisor** (`platform/supervisor.ts`): drift/execution/broker/worker/
  health anomaly detection → RECOMMENDATIONS ONLY (never auto-activates).
- **Global Health Engine + Platform Score** (`platform/health-engine.ts`): 8-subsystem
  health → overall grade; 10 quality dimensions (reliability…brainIntelligence…overallAI).
- **Database:** `plat_pipeline_runs`, `plat_supervisor_alerts`, `plat_health_snapshots`.
- **APIs:** `/api/v1/platform` (run/history), `/platform/{health,score,supervisor,
  diagnostics,audit,recovery,command-center}`.
- **Events:** platform.health.updated, supervisor.alert, brain.command.executed.
- **Ops Center:** supervisor + health jobs registered in the single scheduler.
- **Tests:** platform health scoring (53 total passing).
### Verified
- E2E: pipeline runs full chain (HOLD → no execution, recommend-only respected);
  health 81/HEALTHY; score dims; supervisor real alert; diagnostics best/weakest;
  command center read-only; append-only audit.

## [Phase 11 · v0.13.0-beta] — Enterprise Portfolio Foundation
### Added (extends Phase-7 accounting — reuses portfolioEngine/tradingRepository)
- **Portfolio Ledger** (`portfolio/ledger.ts`): append-only DOUBLE-ENTRY — cash/
  position debit+credit, fees (brokerage), taxes (STT), corporate-action legs
  (dividend/bonus/split/rights/interest). Balances by account.
- **Snapshot Engine** (`portfolio/snapshot-engine.ts`): IMMUTABLE portfolio
  snapshots on an append-only timeline; feeds AI Brain memory.
- **Performance Engine** (`portfolio/performance.ts`): absolute return, CAGR,
  volatility, Sharpe/Sortino/Calmar, max/current drawdown, win/loss/profit-factor
  from the equity timeline + closed positions.
- **Capital Manager** (`portfolio/capital.ts`): available/reserved/blocked/margin,
  buying power, utilization, leverage.
- **OMS integration:** every fill now records ledger legs + captures a snapshot.
- **Database:** `pf_ledger`, `pf_snapshots` (append-only, Universal Table Standard).
- **APIs:** `/api/v1/portfolio/{history,positions,holdings,performance,snapshot,capital}`.
- **Events:** portfolio.ledger.updated, portfolio.snapshot.
- **Tests:** double-entry + drawdown contracts (50 total passing).
### Invariants
- Reuses live portfolio state (no re-implementation). Append-only ledger + immutable
  snapshots. AITradeMinds holds no funds (PAPER virtual). Feeds Brain memory.
### Verified
- E2E: BUY/BUY/SELL → 10 balanced ledger entries (fees+STT), 3 immutable snapshots,
  capital breakdown, performance metrics, holdings with weights, positions book.

## [Phase 10 · v0.12.0-beta] — Portfolio Intelligence (Brain-owned)
### Added (Brain-owned intelligence layer above Phase-7 accounting — no duplication)
- **Portfolio Intelligence** (`portfolio_intel/`): two-level consensus (AI Society
  per-symbol → portfolio optimizer + sizing), recommend-only (never auto-executes).
- **Capital allocation / Position sizing** (`sizing.ts`): fractional-Kelly, ATR,
  volatility, fixed-risk, risk-parity — deterministic, bounded by caps.
- **Portfolio optimizer** (`optimizer.ts`): equal-weight, min-variance, max-Sharpe,
  risk-parity, mean-variance + diversification (1-HHI) scoring.
- **Risk budget** (`risk-budget.ts`): VaR95/CVaR95, portfolio beta/vol,
  concentration, sector risk from REAL positions + historical candles.
- **Rebalancer**: recommend-only INCREASE/REDUCE/EXIT vs current holdings.
- **Database:** `pfi_allocations`, `pfi_rebalances`, `pfi_risk_budgets` (append-only).
- **APIs:** `/api/v1/allocation` (plan+history), `/api/v1/rebalance` (recommend),
  `/api/v1/optimizer` (risk budget). Existing `/portfolio` + `/risk` reused.
- **Events:** optimizer.completed, rebalance.created, risk.updated.
- **Tests:** sizing + optimizer math (45 total passing).
### Invariants
- Reuses consensusEngine (Level-1), portfolioEngine (state), tradingRepository,
  modelReputation, calibration. Nothing bypasses the Brain. Never auto-executes.
### Verified
- E2E: mean-variance plan → 2 BUY targets (weighted) + 3 explainable rejections;
  risk budget (honest 0 for empty account); rebalance recommend-only; append-only history.

## [Phase 9 · v0.11.0-beta] — AI Society, Consensus, Self-Review, RL Research
### Added (all Brain-owned; reuse existing singletons — no duplication)
- **AI Society** (`brain/ai-society.ts`): 9 specialized independent agents
  (Trend/Momentum/MeanReversion/Breakout/Volatility/VWAP/TrendStrength/MACD/Risk),
  each a deterministic opinion function over REAL indicators. No agent modifies
  another; Risk AI counsels caution only.
- **Consensus Engine** (`brain/consensus.ts`): adaptive aggregation
  (MAJORITY/CONFIDENCE/REPUTATION/REGIME-weighted) → one Brain decision with
  agreement/disagreement + full explainability; Risk-AI HOLD dampening.
- **Self-Review** (`brain/self-review.ts`): Brain evaluates itself →
  strengths/weaknesses/proposals (recommend-only), daily scheduler job.
- **RL Research** (`brain/rl-research.ts`): replay buffer + episode recording +
  Monte-Carlo Q-value analysis. RESEARCH ONLY — never auto-activates.
- **Database:** `brain_consensus`, `brain_self_reviews`, `brain_rl_experiences`.
- **APIs:** `/api/v1/brain/consensus` (decide/history/agents),
  `/api/v1/brain/selfreview` (run/history).
- **Events:** `brain.consensus.updated`, `brain.selfreview.completed`,
  `brain.research.completed`.
- **Tests:** consensus thresholds + RL Monte-Carlo returns (40 total passing).
### Invariants
- Nothing bypasses the Brain; every consensus flows through it. No auto-activation.
  Append-only. Deterministic (no mock AI).
### Verified
- E2E: 9 agents opine on RELIANCE → reputation-weighted SELL (agreement 56%);
  self-review health 100/EXCELLENT with proposals; append-only history persisted.

## [Phase 7 · v0.10.0-beta] — Portfolio, RMS, OMS, Paper Trading Engine
### Added (ONE trading bounded context; reuses all singletons — no duplication)
- **Trading repository** (`trading/repository.ts`): accounts/orders/order-events/
  positions/fills/risk-decisions over the single db (append-only history).
- **RMS** (`trading/rms.ts`): DETERMINISTIC, explainable, un-bypassable — max
  capital/trade, buying power, concurrent trades, max daily loss, spread/liquidity,
  circuit filter, freeze quantity, quantity sanity. Every decision persisted.
- **Paper Engine** (`trading/paper-engine.ts`): deterministic execution seeded
  from REAL quotes — spread, slippage, market impact, partial fill, latency,
  LIMIT marketability, SL/SL-M trigger checks. No fake data.
- **Portfolio Engine** (`trading/portfolio.ts`): positions, realized/unrealized
  PnL, weighted avg price, exposure, sector concentration, buying power, equity.
- **OMS** (`trading/oms.ts`): full lifecycle CREATED→VALIDATED→RISK_APPROVED/
  REJECTED→SUBMITTED→ACCEPTED→PARTIAL/FILLED→EXPIRED/CANCELLED; every transition
  audited with latency; **feeds AI Brain.evolve on realized outcomes**.
- **Execution Quality** (`trading/execution-quality.ts`): slippage/spread/latency/
  fill-ratio/price-improvement from real fills.
- **Database:** trade_accounts/orders/order_events/positions/fills/risk_decisions.
- **APIs:** `/api/v1/orders` (place/list/cancel), `/portfolio`, `/positions`,
  `/risk`, `/execution`, `/paper`.
- **Events:** order.*, position.*, risk.rejected, execution.completed, learning.triggered.
- **Analytics:** strategy/paper/risk dashboards now light up with REAL trading data.
- **Tests:** deterministic paper-engine (37 total passing).
### Invariants
- AITradeMinds holds no funds (PAPER virtual balance). Nothing bypasses RMS or the
  Brain. Deterministic sim from real quotes — no mock trading data.
### Verified
- E2E: BUY→RMS APPROVED→fill→position; SELL→CLOSED→realized PnL→Brain learn
  (TREND reputation updated); oversized order→RMS REJECTED with explainable rules.

## [Phase 3C-UI · v0.9.1-beta] — Analytics Dashboards & Visualizations
### Added (frontend only — consumes existing analytics APIs, no backend duplication)
- **Visualization library** (`src/components/charts.tsx`): zero-dependency SVG
  LineSeries, BarSeries, Gauge, Radar, Heatmap, StatTile (accessible, dark-mode).
- **Analytics page** (`/analytics`): 11 dashboards — Brain, Learning, Models,
  Training, Market, Broker, Operations, + honest "Awaiting Phase 7/8" panels for
  Strategy/Paper Trading/Risk, + Reports (generate + token-aware CSV export).
- **AppShell:** Analytics nav link.
### Notes
- Consumes `/api/v1/dashboard|analytics|metrics|reports` (built in v0.9.0-beta).
- Resolves TD-007 (visualization dashboards); PDF/Excel export still pending.
### Verified
- `/analytics` renders 200; dashboard API auth-gated (401 unauth); real data
  (Brain EXCELLENT, 8 sector rotations); Strategy/Paper/Risk show pending status.

## [Phase 3C · v0.9.0-beta] — Analytics & Reporting Platform
### Added (read-only aggregation over existing singletons — no duplication)
- **Analytics module** (`src/modules/analytics/`): service composing Brain,
  Training, Market, Broker, Ops Center into brain/models/training/market/broker/
  system/learning + unified dashboard views; report generator (13 kinds) with
  append-only storage + CSV export; daily-report scheduler job.
- **Database:** `analytics_reports` (append-only, Universal Table Standard).
- **APIs:** `/api/v1/analytics` (10 views), `/api/v1/dashboard`, `/api/v1/metrics`,
  `/api/v1/reports` (list/get/generate + CSV export).
- **Events:** `analytics.generated`, `report.created` on the single bus.
- **Tests:** report kinds + CSV flattening (33 total passing).
### Honesty
- Strategy/Paper-Trading/Risk analytics report `{available:false, "Awaiting Phase
  7/8"}` — no fabricated equity curves or trades (no-mock rule).
### Verified
- E2E: unified dashboard (brain 100/EXCELLENT, real market rotation), metrics feed,
  BRAIN report generated + listed + CSV export; non-admin generation → 403.

## [Phase 3E · v0.8.0-beta] — Brain Evolution (Reputation, Market DNA, Health, Digital Twin)
### Added (all Brain-owned; reuse existing singletons — no duplication)
- **Model Reputation** (`brain/reputation.ts`): per-AI per-regime running metrics
  (win-rate/avg-reward/Sharpe/drawdown/recency); Brain dynamically adjusts each
  model's **influence** (0.1–2.0). Wired into `brain.evolve`.
- **Market DNA** (`brain/market-dna.ts`): fingerprints recurring behaviour
  (TRENDING/RANGE/BREAKOUT/GAP/PANIC…) + Euclidean similarity search over history.
- **Brain Health** (`brain/health.ts`): drift/backlog/quality → 0–100 score +
  grade (EXCELLENT/HEALTHY/WARNING/CRITICAL); surfaced in Operations Center health.
- **Digital Twin** (`brain/digital-twin.ts`): replays alternative entries/exits/
  holding → missed-opportunity & avoided-loss; **Research memory only**.
- **Database:** `brain_model_reputation`, `brain_market_dna` (Universal Table Standard).
- **API:** `/api/v1/research` (replay/extractDna/digitalTwin + similar);
  `/api/v1/brain?view=reputation|health`.
- **Events:** `brain.reputation.updated`, `brain.dna.generated`.
- **Tests:** DNA classification + health grade (31 total passing).
### Verified
- E2E: reputation influence (win→2.0, loss→0.92); DNA extract(12)+similarity;
  digital twin missed-opp 2.02%; Brain Health 100/EXCELLENT in Ops Center.

## [Phase 3D · v0.7.0-beta] — Meta-Learning (the Brain learns HOW it learns)
### Added
- **Meta-Learning engine** (`src/modules/brain/meta-learning.ts`): analyzes each
  model's learning history (reuses training + brain repositories — no duplication):
  F1 trend (IMPROVING/DEGRADING/FLAT/UNSTABLE), volatility, adaptation speed,
  best feature version + replay size, weakest regime. Generates **recommendations
  ONLY** — RETRAIN / CALIBRATE / EXPAND_DATASET / FEATURE_CHANGE / STABLE — with
  severity + rationale + evidence. **Never auto-activates.**
- **Database:** `brain_meta_recommendations` (append-only, Universal Table Standard).
- **API:** `/api/v1/brain` — `POST {action:"meta"}` (analyze), `GET ?view=meta` (list recs).
- **Operations Center:** `brain.metaLearning` job (6h) analyzing all MODEL_KEYS.
- **Events:** `brain.meta.analyzed` on the single bus. Meta-observations stored in
  RESEARCH memory (does not touch live learning).
- **Tests:** meta trend/volatility classification (27 total passing).
### Verified
- E2E: 5 model versions analyzed → trend/adaptation/best-replay/weakest-regime
  computed; 3 recommendations persisted as OPEN; models remain PENDING (no
  auto-activation); human-approved model stays the only active one.

## [Phase 3C · v0.6.0-beta] — AI Brain (highest authority)
### Added
- **Brain module** (`src/modules/brain/`): THE single AI Brain coordinator that
  ORCHESTRATES existing training/learning singletons (no duplication):
  - **Self-evolution** `evolve()`: paper outcome → append-only lesson +
    confidence calibration + feature importance + knowledge-graph edges + tiered
    memory. Nothing deleted.
  - **Knowledge Graph**: confidence-weighted relationships (stock↔regime,
    strategy↔stock) learned over time.
  - **Confidence Calibration**: reliability-bucketed, Laplace-smoothed,
    regime-aware calibration of raw model confidence.
  - **Feature Importance**: helpful/harmful tracking per model/regime.
  - **Tiered Memory** (SHORT/WORKING/LONG/ARCHIVED/RESEARCH), append-only,
    hourly consolidation job in the Operations Center scheduler.
  - **Explainable AI**: why/why-not/rejected/risk/confidence-reason/evidence/similarity.
  - **Research Mode**: replay windows (1M–5Y) → recommendation only, RESEARCH tier,
    never touches live learning.
  - **Model Safety**: Brain + human approval gate; no self-activation; F1 sanity gate.
- **Database:** `brain_knowledge_edges`, `brain_feature_importance`,
  `brain_calibration`, `brain_memory` (Universal Table Standard, append-only where mandated).
- **API:** `/api/v1/brain` (status/knowledge/explain; evolve/approve/research).
- **Events:** `brain.evolved`, `brain.knowledge.updated` on the single bus.
- **Tests:** calibration bucketing (23 total passing).
### Invariants
- Single AI Brain, single Memory, single Event Backbone, single Operations Center,
  single Broker Foundation. No duplicate training/feature/dataset/memory logic.
### Verified
- E2E: evolve(win/loss)→lessons+edges+memory; knowledge graph; calibration;
  explainability; research replay (recommendation only); human-gated activation
  (403 without approval, activated with).

## [Phase 3B · v0.5.0-beta] — AI Model Training System
### Added
- **Training module** (`src/modules/training/`): dataset builder (reuses Feature
  Engineering — no duplicate feature math) with forward-return labels + regime
  classification; **real logistic-regression trainer** (batch gradient descent,
  L2, deterministic) — not a mock; evaluation (accuracy/precision/recall/F1 +
  profit factor/Sharpe/Sortino/max-DD/expectancy/win-rate/calibration);
  walk-forward split; model registry with versioning/hash/parent/rollback and
  governed approval; **append-only Learning Engine** (trade outcome → lesson).
- **Database:** `ai_datasets`, `ai_models`, `ai_lessons` (Universal Table Standard).
- **APIs:** `/api/v1/training` (admin), `/api/v1/models` (list + approve),
  `/api/v1/datasets`, `/api/v1/learning` (ingest outcomes + lessons/stats).
- **Events:** `training` topic on the single bus (training.started/completed/failed,
  model.updated, dataset.created, features.generated, learning.completed,
  confidence.updated).
- **Operations Center:** `training.nightlyRetrain` job registered in the single
  scheduler; runs recorded to `rt_jobs`, failures to `rt_dead_letter`.
- **AI Society readiness:** MODEL_KEYS TREND/MOMENTUM/MEAN_REVERSION/RISK train
  independently; no model edits another.
- **Tests:** trainer learns separable pattern (>90% acc), deterministic hashing,
  bounded predictions, empty-set safety (21 total passing).
### Honest scope
- Trains on historical market data + existing feature pipeline. Paper-trade and
  AI-Society-disagreement inputs wire in when those modules exist (Phases 8/10) —
  the Learning API already accepts outcomes. Metrics reflect synthetic data (TD-003).
### Verified
- E2E: train→version(PENDING)→approve→activate; dataset persisted; learning loop
  appends lessons; 8 training events on bus; non-admin→403.

## [Phase 3A · v0.4.0-beta] — Broker Foundation (connectivity only, NO execution)
### Added
- **Broker bounded context** (`src/modules/broker/`): single `IBroker` interface;
  adapters for Zerodha, Angel One, Dhan, Upstox, Fyers, ICICI Direct + PAPER
  (connectivity + capability discovery only — no order execution).
- **Connection State Machine** (9 states, legal-transition enforcement).
- **Broker Registry** (dynamic component registry via kernel singleton).
- **Broker Health Monitor** (probes → `broker.health.changed`).
- **Broker Manager** (single coordinator: connect/auth/disconnect/reconnect/disable).
- **Secure credential abstraction** (`BrokerCredentialRef` — vault handle, no raw
  secrets at rest).
- **Operations Center integration**: `broker.healthMonitor` job registered in the
  single scheduler; brokers registered into the dependency graph.
- **API:** `GET/POST /api/v1/brokers` (admin-only control plane).
- **Events:** `broker` topic on the single Event Bus (connected/disconnected/
  health.changed/authentication.*/token.expired/reconnecting/disabled).
- **Tests:** broker state-machine unit tests (17 total passing).
### Design invariants
- AITradeMinds is NOT a broker; user funds ALWAYS remain inside the broker.
- No broker-specific logic outside `modules/broker`. No parallel systems.
- Live order execution intentionally deferred to the next phase.
### Verified
- 7 brokers registered w/ priority+capabilities; PAPER→READY; unconfigured→DISABLED;
  health probes; disconnect; non-admin→403.

## [Phase 5 · v0.3.2-beta] — Frontend Foundation (Auth UI, Charts, Market Watch)
### Added
- **API client + Auth context** (`app/lib/api-client.ts`, `app/lib/auth-context.tsx`):
  typed fetch, token storage, session provider consuming `/api/v1/auth/*`.
- **Shared UI library** (`components/ui.tsx`): Card, Button, Input, Spinner,
  EmptyState, ErrorState, Skeleton, Badge — accessible, dark-mode-native.
- **AppShell** (`components/AppShell.tsx`): auth-aware top nav, sign-in/out.
- **SVG CandleChart** (`components/CandleChart.tsx`): zero-dependency candlesticks.
- **Auth pages**: `/login`, `/register` (validation, error states).
- **Market Watch** (`/market`): symbol universe + live candlestick chart +
  indicator snapshot across 5m/15m/1D (consumes history + indicators + symbols APIs).
### Changed
- `app/layout.tsx` — wraps app in AuthProvider + AppShell; AITradeMinds branding.
- `app/dashboard.tsx` — nested under shell (div wrapper, no duplicate landmark).
### Verified
- `/login`, `/register`, `/market`, `/` all render 200; chart data flows from
  `/api/v1/market/history`; auth flow via context.
### Note
- Portfolio/Orders/Positions/Terminal/AI/Strategy UIs deferred — their backend
  (Phases 7–10) does not exist yet; building them now would require mocks (forbidden).

## [Phase 5 · v0.3.1-beta] — Organizations + TD-001 resolution
### Added
- **Organizations** (`identity/org-service.ts`): create org (auto-slug), membership
  with org-roles (OWNER/ADMIN/MEMBER/VIEWER), member listing — multi-tenant primitive.
- **APIs:** `GET/POST /api/v1/orgs`, `GET/POST /api/v1/orgs/[id]/members` (RBAC-gated).
- **Secrets-vault seam** (`kernel/crypto.ts`): AUTH_SECRET from env/vault or
  auto-generated gitignored `.aitm-secret` keyfile (survives managed `.env` resets).
- **Tests:** org slug rules.
### Changed
- `infra/http-guard.ts` — `assertAdmin` now RBAC-first (admin role via session/API-key),
  `ADMIN_TOKEN` only as ops/bootstrap fallback → **TD-001 resolved**.
- Identity repository extended with org methods; `.gitignore` adds `.aitm-secret`.
### Verified
- E2E: org create/add-member/list/visibility; admin→200 & non-admin→403 on ops
  endpoints; audit rows for org.create/org.member.add.

## [Phase 5 · v0.3.0-beta] — Security + Identity (Auth, Authz/RBAC, Users)
### Added
- **Kernel crypto** (`src/kernel/crypto.ts`): scrypt password hashing, HMAC token
  hashing, secure random tokens (no external dependency).
- **Security module** (`src/modules/security/`): zod validation gateway
  (`parseBody`/`parseQuery`), fixed-window rate limiter over the single cache.
- **Identity module** (`src/modules/identity/`): repository, auth service
  (register/login/logout/verify session, first-user→admin), RBAC guard
  (`requireAuth`/`requireRole`/`requireAdmin`), API-key auth, role seeding.
- **APIs:** `/api/v1/auth/{register,login,logout,me}`, `/api/v1/users` (admin-only).
- **Database:** `usr_users, org_orgs, org_members, auth_sessions, authz_roles,
  authz_user_roles, apikey_keys, audit_events` (Universal Table Standard).
- **Events:** `audit` topic added to the single bus (additive).
- **Tests:** identity (crypto, RBAC) + rate-limit unit tests; vitest env configured.
- **Config:** `AUTH_SECRET` (required in production; provisioned via `.env`).
### Changed (extend-only)
- `event-bus.ts` — added `audit` event to the typed map.
- `kernel/index.ts`, `kernel/config.ts` — export crypto, add AUTH_SECRET.
### Security
- Every new route: validation + rate limit + auth/authz + audit + structured logging.
- TD-001 partially resolved (RBAC `requireAdmin` available).
### Verified
- E2E: register→admin, login, session revoke on logout, admin-gated users,
  403 for non-admin, 401 unauthenticated, 422 validation, 409 duplicate, 429 rate limit.

## [Planning] — Master Implementation Roadmap established
### Added
- `docs/IMPLEMENTATION_ROADMAP.md` — per-module specs (A0–A28), full dependency
  graph, implementation phases (5→16), sprint plan, and repository/database/API/
  deployment/monitoring/testing/documentation evolution + 100% master execution order.
### Changed
- `README.md` — links the Implementation Roadmap as canonical execution plan.
### Impact
- Docs-only. No code/schema/API/event change. Architecture unchanged.

## [Governance] — Database Architecture & Data Governance established
### Added
- `docs/DATABASE_ARCHITECTURE.md` — 7 storage layers (PG/Timescale/Redis/OpenSearch/
  pgvector/S3/Warehouse), Universal Table Standard, naming conventions, data domains,
  partitioning, indexing, audit, cache, time-series, vector, warehouse, retention,
  backup/DR, security, multi-tenancy, AI data governance, performance targets,
  observability, data quality, migration policy.
### Changed
- `docs/TECHNICAL_DEBT.md` — added TD-006 (legacy `md_*` → Universal Table Standard).
- `README.md` — links Database Architecture.
### Impact
- Docs-only. No code/schema/API/event change. Architecture unchanged.

## [Governance] — SDLC & Release Management established
### Added
- `docs/SDLC.md` — 18-stage enterprise lifecycle, quality gates, change management,
  deployment pipeline, rollback policy, bug management, branch strategy.
- `docs/RELEASE_MANAGEMENT.md` — SemVer policy, release types, release ledger,
  readiness checklist, roadmap snapshot.
- `docs/RELEASE_NOTES.md` — formal notes for v0.1.0-beta and v0.2.0-beta.
### Changed
- `README.md` — links SDLC/Release docs; declares current version `0.2.0-beta`.
### Version
- Formalized: v0.1.0-beta (Market Data), v0.2.0-beta (Foundation/Realtime).
### Impact
- Docs-only. No code/schema/API/event change. Architecture unchanged.

## [Governance] — Project Brain established
### Added
- `docs/PROJECT_BRAIN.md` — persistent memory: live dashboard, memory layers,
  module memory, implementation memory, change-impact + self-audit protocols,
  architecture stability guard, update protocol.
- `docs/REGISTRIES.md` — module, singleton, dependency, database, API, event,
  worker/scheduler, cache, feature/AI/strategy/broker, security, test, docs, bug,
  risk, release registries.
- `docs/ADR.md` — append-only Architecture Decision Record (ADR-0001…0006).
### Changed
- `README.md` — links Project Brain / Registries / ADR as canonical entry points.
### Impact
- Docs-only. No code/schema/API/event change. Architecture unchanged.

## [Phase 4] — Foundation Kernel + Realtime Infrastructure Seams
### Added
- **Kernel** (`src/kernel/`): `config` (zod-validated, fail-fast), `logger`
  (structured JSON, redacting, correlation-aware), `context` (AsyncLocalStorage
  trace propagation), `errors` (unified taxonomy + HTTP envelope), `registry`
  (globalThis-pinned DI singletons).
- **Infrastructure** (`src/modules/infra/`): `scheduler` (in-proc worker runtime,
  records to `rt_jobs`, DLQ on failure), `repository` (reuses single `db`),
  `bootstrap` (registers `provider.heartbeat`, `cache.purgeExpired`).
- **APIs:** `/api/v1/realtime/{health,metrics,jobs}` (deep health, Prometheus
  metrics, scheduler control).
- **Database:** `rt_jobs`, `rt_stream_offsets`, `rt_dead_letter` (audit + tenant fields).
- **Tests:** vitest harness + kernel/cache-tier unit tests.
- **Docs:** Constitution, README, Architecture, Technical Debt register.
### Changed (extend-only, backward compatible)
- `event-bus.ts` — added `attachTransport()` (in-proc delivery unchanged).
- `cache.ts` — added `attachL2()` two-tier support (sync path unchanged).
### Technical Debt
- TD-001 interim `ADMIN_TOKEN` guard; TD-002 Redis transport/L2 interface-only.

## [Phase 3.1] — Complete Market Data Platform
### Added
- 13 engines: Provider Manager, Feed Pipeline, Historical, Symbol Master, Scanner,
  Option Chain, Corporate Actions, Breadth, Sector Intelligence, News, Watchlist,
  Replay, Feature Engineering, Indicators, Quality, Session.
- Core singletons: Event Bus, Cache, Repository.
- Database: `md_symbols`, `md_candles`, `md_corporate_actions`, `md_watchlists`,
  `md_watchlist_items`, `md_news`, `md_option_snapshots`.
- 18 REST routes under `/api/v1/market/*` and a 6-tab dashboard.
