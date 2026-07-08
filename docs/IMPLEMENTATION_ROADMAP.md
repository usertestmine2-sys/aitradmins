# AITradeMinds — Master Implementation Roadmap

> The permanent execution roadmap. Architecture is FROZEN — this converts it into an
> ordered, dependency-safe build plan. No module or dependency is skipped. Companion to
> [PROJECT_BRAIN.md](./PROJECT_BRAIN.md), [ARCHITECTURE.md](./ARCHITECTURE.md),
> [DATABASE_ARCHITECTURE.md](./DATABASE_ARCHITECTURE.md), [SDLC.md](./SDLC.md),
> [RELEASE_MANAGEMENT.md](./RELEASE_MANAGEMENT.md).

Legend — Priority P0 (blocker) → P3 · Complexity S/M/L/XL · ✅ done · 🔶 partial · ⏳ pending.
Time estimates are engineering-days (dev / test / docs).

---

## PART A — PER-MODULE SPECIFICATION

### A0. Foundation Kernel ✅
- **Priority:** P0 · **Layer:** 1 · **Phase:** 4 · **Depends on:** — · **Used by:** all
- **Tables:** none · **Services:** config, logger, context, errors, registry · **Workers:** —
- **Events pub/con:** — · **Cache:** — · **REST/GraphQL/SDK:** — · **Frontend:** —
- **Permissions:** — · **Testing:** unit (registry, errors, context) · **Perf:** zero-overhead
- **Complexity:** M · **Time:** done · **Future:** feature-flag SDK, plugin hooks

### A1. Realtime Infrastructure 🔶
- **Priority:** P0 · **Layer:** 2 · **Phase:** 4 · **Depends on:** Kernel · **Used by:** all runtime modules
- **Tables:** `rt_jobs, rt_stream_offsets, rt_dead_letter` · **Services:** scheduler, infraRepository, bootstrap
- **Workers:** provider.heartbeat, cache.purgeExpired · **Events:** transports existing bus topics
- **Cache:** L2 seam · **REST:** `realtime/{health,metrics,jobs}` · **GraphQL/SDK:** later
- **Realtime:** WS/SSE gateway (pending) · **Permissions:** admin (interim) · **Testing:** integration (Redis via testcontainers)
- **Perf:** 50k evt/s · **Complexity:** L · **Time:** 6/4/2 (remaining: Redis+WS) · **Future:** BullMQ, GPU queues

### A2. Market Data ✅ (extend only)
- **Priority:** P0 · **Layer:** 4 · **Phase:** 3.1 · **Depends on:** Kernel, Infra · **Used by:** Trading, Strategy, AI, Dashboard
- **Tables:** `md_*` (7) · **Services:** 13 engines + indicators/quality/session · **Workers:** heartbeat/retention/scan
- **Events:** md.tick/candle/quality/provider/scanner/corporateAction · **Cache:** quote/candles/etc namespaces
- **REST:** 18 `/api/v1/market/*` · **Frontend:** dashboard (6 tabs) · **Permissions:** public→(Phase5 guard)
- **Testing:** engine unit + API contract (TD-005) · **Perf:** tick <5ms insert · **Complexity:** M (hardening) · **Future:** real feeds, partitioning

### A3. Security Kernel ⏳
- **Priority:** P0 · **Layer:** 3 · **Phase:** 5 · **Depends on:** Kernel · **Used by:** every endpoint
- **Tables:** `sec_secrets_meta, sec_rate_limits` · **Services:** vault, rate-limiter, zod validation, encryption, CORS/CSRF
- **Events:** sys.audit · **Cache:** rate buckets · **REST:** middleware (no routes) · **Permissions:** —
- **Testing:** rate-limit, validation, injection · **Perf:** guard <10ms · **Complexity:** L · **Time:** 8/5/2

### A4. Authentication ⏳
- **Priority:** P0 · **Layer:** 3 · **Phase:** 5 · **Depends on:** User Mgmt, Security · **Used by:** all authed routes
- **Tables:** `auth_credentials, auth_sessions, auth_mfa, auth_oauth` · **Services:** JWT+refresh, MFA, OAuth/SSO, service tokens
- **Workers:** session cleanup · **Events:** auth.login/logout (sys.audit) · **Cache:** session/token
- **REST:** `auth/{login,refresh,logout,mfa,oauth}` · **SDK:** auth client · **Frontend:** login/MFA/SSO pages
- **Realtime:** WS auth handshake · **Permissions:** self · **Testing:** authn flows + negatives · **Perf:** login <150ms · **Complexity:** L · **Time:** 8/6/2

### A5. Authorization + API Keys ⏳
- **Priority:** P0 · **Layer:** 3 · **Phase:** 5 · **Depends on:** Auth · **Used by:** all routes
- **Tables:** `authz_roles, authz_permissions, authz_grants, authz_policies, apikey_keys, apikey_scopes, apikey_usage`
- **Services:** RBAC/ABAC guard, scope resolver, key issuance · **Cache:** permission/key · **REST:** `admin/roles/*`, `users/api-keys/*`
- **Frontend:** role & key manager · **Permissions:** admin · **Testing:** authz matrix, ownership · **Perf:** check <5ms · **Complexity:** M · **Time:** 6/5/2

### A6. User / Org / Workspace / Team ⏳
- **Priority:** P0/P1 · **Layer:** 3 · **Phase:** 5→9 · **Depends on:** Auth · **Used by:** Portfolio, Strategy, Billing, Social
- **Tables:** `usr_users, usr_profiles, usr_preferences, org_orgs, org_members, ws_workspaces, team_teams, team_members`
- **Services:** user, tenant resolver, workspace, team/invite · **Events:** user/org lifecycle · **Cache:** profile/tenant
- **REST:** `users/*, orgs/*, workspaces/*, teams/*` · **Frontend:** profile, org/team consoles
- **Permissions:** RBAC · **Testing:** tenancy isolation (RLS) · **Perf:** <20ms · **Complexity:** L · **Time:** 8/5/3

### A7. Subscription + Billing ⏳
- **Priority:** P1 · **Layer:** 3 · **Phase:** 5 · **Depends on:** User/Org · **Used by:** Marketplace, entitlements
- **Tables:** `sub_plans, sub_subscriptions, bill_invoices, bill_payments, bill_usage` · **Services:** plan, metering, payment adapter, dunning
- **Workers:** invoice gen, usage rollup · **Events:** bill.* · **Cache:** entitlements · **REST:** `billing/*, subscriptions/*`
- **Frontend:** plans/invoices/usage · **Permissions:** self/admin · **Testing:** metering, dunning · **Perf:** <100ms · **Complexity:** L · **Time:** 8/5/2

### A8. Observability + Compliance foundation ⏳
- **Priority:** P0/P1 · **Layer:** 10 · **Phase:** 6 · **Depends on:** Kernel, Infra, Auth · **Used by:** all
- **Tables:** `audit_events` (append-only) · **Services:** metrics registry, tracer, audit sink · **Workers:** health sweep
- **Events:** sys.metric/audit · **REST:** `realtime/metrics` (extend), `admin/audit` · **Permissions:** admin
- **Testing:** metric correctness, audit immutability · **Perf:** overhead <2% · **Complexity:** M · **Time:** 6/4/2

### A9. Market Data Hardening ⏳ (extend A2)
- **Priority:** P1 · **Layer:** 4 · **Phase:** 6 · **Depends on:** Infra, Observability · **Used by:** Trading, AI
- **Tables:** partition `md_candles`; converge to Universal Standard (TD-006) · **Services:** batched multi-symbol quotes, real feed adapters
- **Workers:** live WS ingest · **Cache:** L2 for quotes/chains · **Testing:** partition prune, batch correctness, ingest throughput
- **Perf:** batch O(1) round trips · **Complexity:** M · **Time:** 6/4/2

### A10. Feature Store ⏳ (extend Feature Engineering)
- **Priority:** P1 · **Layer:** 4/7 · **Phase:** 6 · **Depends on:** Market Data, Indicators · **Used by:** AI Brain, Strategy
- **Tables:** `fs_features, fs_feature_sets, fs_labels` · **Services:** materializer, PIT reader, label generator · **Workers:** materialization
- **Events:** consumes md.candle · **Cache:** feature cache · **REST:** `features/*` · **Permissions:** scoped
- **Testing:** point-in-time (no look-ahead), reproducibility · **Perf:** materialize/interval · **Complexity:** L · **Time:** 8/6/2

### A11. Portfolio + Position Manager ⏳
- **Priority:** P1 · **Layer:** 5 · **Phase:** 7 · **Depends on:** OMS(fills), Market Data · **Used by:** RMS, Reporting, Analytics
- **Tables:** `pf_accounts, pf_positions, pf_holdings, pf_ledger, pf_pnl` · **Services:** position keeper, P&L, CA-aware valuation
- **Workers:** EOD valuation · **Events:** consumes ord.fill → pf.position/pf.pnl · **Cache:** positions · **REST:** `portfolio/*`
- **Frontend:** portfolio/positions · **Realtime:** live P&L stream · **Permissions:** ownership · **Testing:** P&L math, ledger balance
- **Perf:** query <20ms · **Complexity:** L · **Time:** 8/6/3

### A12. RMS (Risk) ⏳
- **Priority:** P1 · **Layer:** 5 · **Phase:** 7 · **Depends on:** Portfolio, Market Data · **Used by:** OMS (gate), Strategy, Live
- **Tables:** `rms_limits, rms_decisions, rms_kill_switch` · **Services:** pre/post-trade checks, kill-switch, monitor · **Workers:** exposure monitor
- **Events:** consumes sig.signal/ord.new → risk.decision · **Cache:** limits · **REST:** `risk/*` · **Frontend:** risk console
- **Permissions:** admin/dual-control · **Testing:** reject/approve matrix, kill-switch · **Perf:** check <15ms · **Complexity:** L · **Time:** 8/6/2

### A13. OMS ⏳
- **Priority:** P1 · **Layer:** 5 · **Phase:** 8 · **Depends on:** RMS, Portfolio, Broker · **Used by:** Paper, Live, Strategy, Copy
- **Tables:** `oms_orders, oms_fills, oms_order_events` (partitioned) · **Services:** state machine, idempotency, routing, fill handler
- **Workers:** reconciliation, stale sweep · **Events:** ord.new/update/fill/cancel · **Cache:** open orders · **REST:** `orders/*`
- **Frontend:** order ticket/book · **Realtime:** order updates stream · **Permissions:** ownership+idempotency · **Testing:** lifecycle, partial fills, idempotency
- **Perf:** order insert <10ms · **Complexity:** XL · **Time:** 12/8/3

### A14. Broker Integration ⏳ (extend Provider Manager)
- **Priority:** P1 · **Layer:** 4 · **Phase:** 8 · **Depends on:** OMS, Auth vault · **Used by:** Live, Paper
- **Tables:** `broker_accounts, broker_tokens` · **Services:** broker port (quote+order), adapters, OAuth refresh, rate governor, reconciliation
- **Workers:** token refresh, reconciliation · **Events:** ord.fill (callbacks) · **Cache:** token · **REST:** `admin/brokers/*`
- **Frontend:** broker linking · **Permissions:** vaulted creds · **Testing:** adapter contract, reconciliation · **Perf:** broker-bound · **Complexity:** XL · **Time:** 12/8/3

### A15. Paper Trading ⏳
- **Priority:** P1 · **Layer:** 5 · **Phase:** 8/10 · **Depends on:** OMS, RMS · **Used by:** Strategy, Backtesting
- **Tables:** `paper_accounts` (reuse pf_* shape) · **Services:** virtual broker adapter (broker port), simulated fills
- **Events:** ord.* (paper) · **REST:** `paper/*` · **Frontend:** trade-mode toggle · **Permissions:** ownership
- **Testing:** fill sim, live-parity code path · **Perf:** live-feed bound · **Complexity:** M · **Time:** 6/4/2

### A16. Trade Journal + Analytics + Reports ⏳
- **Priority:** P2 · **Layer:** 5 · **Phase:** 8/11 · **Depends on:** OMS, Portfolio · **Used by:** UI, Compliance
- **Tables:** `journal_entries, perf_metrics, rpt_reports` · **Services:** journal, analytics (Sharpe/Sortino/DD), report gen+export
- **Workers:** report generation · **Events:** consumes ord/pf · **REST:** `journal/*, analytics/*, reports/*`
- **Frontend:** journal/analytics/reports · **Permissions:** ownership · **Testing:** metric correctness · **Perf:** dashboard <100ms · **Complexity:** M · **Time:** 6/4/2

### A17. Strategy Engine (Builder+Versioning+Validation) ⏳
- **Priority:** P1 · **Layer:** 6 · **Phase:** 9 · **Depends on:** Indicators, Feature Store, OMS · **Used by:** Backtesting, AI, Marketplace, Copy
- **Tables:** `strat_definitions, strat_versions, strat_instances, strat_state, strat_params` · **Services:** builder, lifecycle, signal loop, validator, versioning
- **Workers:** strategy runner pool · **Events:** consumes md.* → sig.signal · **Cache:** strategy state · **REST:** `strategies/*`
- **Frontend:** strategy IDE, version diff · **Realtime:** signal stream · **Permissions:** ownership+quotas · **Testing:** deterministic signals, lifecycle
- **Perf:** loop keeps up with feed · **Complexity:** XL · **Time:** 14/9/4

### A18. Backtesting + Optimization ⏳
- **Priority:** P1 · **Layer:** 6 · **Phase:** 9 · **Depends on:** Strategy, Replay, Portfolio sim · **Used by:** AI, Marketplace
- **Tables:** `bt_runs, bt_results, bt_trades, opt_studies` · **Services:** harness (reuse Replay), slippage/commission, metrics, optimizer
- **Workers:** backtest/opt runners (parallel) · **Events:** replay candle stream · **REST:** `backtest/*, optimize/*`
- **Frontend:** backtest report, opt surface · **Permissions:** quotas · **Testing:** determinism, no look-ahead · **Perf:** 1yr/1m within target · **Complexity:** XL · **Time:** 12/8/3

### A19. AI Brain ⏳
- **Priority:** P2 · **Layer:** 7 · **Phase:** 10 · **Depends on:** Feature Store, Backtesting, Strategy, Workers · **Used by:** Strategy, Agents, Chat
- **Tables:** `ai_models, ai_versions, ai_predictions, ai_drift` · **Services:** registry, training, inference, drift/parity, explainability
- **Workers:** training (GPU), batch inference · **Events:** consumes features/md.* → sig.signal · **Cache:** model/inference · **REST:** `ai/*`
- **Frontend:** model dashboard · **Permissions:** model ACL · **Testing:** train/infer parity, drift · **Perf:** inference target · **Complexity:** XL · **Time:** 16/10/4

### A20. AI Agents + Memory + Knowledge Base + Chat ⏳
- **Priority:** P2 · **Layer:** 7 · **Phase:** 10 · **Depends on:** AI Brain, Feature Store, all data · **Used by:** UI, research
- **Tables:** `agent_agents, agent_runs, agent_memory(vector), kb_documents, kb_embeddings(pgvector), chat_threads, chat_messages`
- **Services:** orchestrator, tool-calling, memory store, RAG retriever, embeddings, chat · **Workers:** agent executor, embedding
- **Events:** agent.*/chat.* · **Cache:** embedding/context · **REST:** `agents/*, kb/*, chat/*` (SSE) · **Frontend:** agent/chat console
- **Permissions:** tool scoping, injection defense · **Testing:** RAG accuracy, tool permission · **Perf:** stream latency · **Complexity:** XL · **Time:** 16/10/4

### A21. Live Trading ⏳
- **Priority:** P2 · **Layer:** 5 · **Phase:** 11 · **Depends on:** OMS, Broker, RMS, Compliance · **Used by:** users, Copy
- **Tables:** `live_sessions, live_reconciliation` · **Services:** live routing, reconciliation, safe-mode, audit · **Workers:** reconciliation, session monitor
- **Events:** live ord.fill · **Cache:** session · **REST:** `live/*` · **Frontend:** live toggle · **Realtime:** fills stream
- **Permissions:** dual-control, kill-switch, signing · **Testing:** reconciliation, kill-switch under load · **Perf:** broker-bound · **Complexity:** XL · **Time:** 14/10/4

### A22. Notifications + Alert Engine ⏳
- **Priority:** P2 · **Layer:** 8 · **Phase:** 11 · **Depends on:** Observability, events · **Used by:** UI, users
- **Tables:** `notif_rules, notif_deliveries` · **Services:** alert engine (reuse scanner/rms/ord), channels (email/SMS/push/webhook/in-app)
- **Workers:** dispatch · **Events:** notif.alert · **Cache:** template · **REST:** `notifications/*` · **Frontend:** alert center
- **Realtime:** in-app push · **Permissions:** self · **Testing:** delivery tracking · **Perf:** deliver <5s · **Complexity:** M · **Time:** 6/4/2

### A23. Compliance ⏳
- **Priority:** P2 (P0 before real live) · **Layer:** 10 · **Phase:** 11/14 · **Depends on:** Audit, Users, OMS · **Used by:** Reporting, Live
- **Tables:** `comp_consents, comp_retention, comp_reports` · **Services:** consent, retention/erasure (GDPR), trade retention (SEBI/FINRA), best-exec (MiFID)
- **Workers:** retention jobs · **Events:** sys.audit · **REST:** `admin/compliance/*` · **Permissions:** admin/officer
- **Testing:** retention, erasure, audit completeness · **Complexity:** XL · **Time:** 12/8/4

### A24. Interfaces (Dashboard extend, Admin, Mobile BFF, Desktop, Offline) ⏳
- **Priority:** P2 · **Layer:** 8/10 · **Phase:** 12 · **Depends on:** WS gateway, Auth, domain APIs · **Used by:** end users, ops
- **Tables:** admin views · **Services:** charts, live views, admin console, mobile BFF · **REST:** `admin/*`, mobile BFF over `/api/v1`
- **Frontend:** trading/portfolio/strategy/AI screens, admin app, RN mobile, Electron/Tauri desktop · **Realtime:** SSE/WS everywhere
- **Permissions:** auth-gated, admin RBAC · **Testing:** e2e UI, a11y · **Perf:** smooth streaming · **Complexity:** L (progressive) · **Time:** 14/8/4

### A25. Marketplaces + Plugin System + SDK + GraphQL ⏳
- **Priority:** P3 · **Layer:** 9 · **Phase:** 13 · **Depends on:** Strategy/AI versioning, Billing, Auth · **Used by:** ecosystem
- **Tables:** `mkt_listings, mkt_purchases, mkt_reviews, mkt_revenue, plugin_registry, plugin_installs`
- **Services:** listing/licensing/revenue-share, plugin loader (sandboxed), SDK, GraphQL resolvers · **Events:** mkt.*/plugin.*
- **REST:** `marketplace/*, plugins/*` · **GraphQL:** `/graphql` · **Frontend:** marketplaces · **Permissions:** sandbox, signing
- **Testing:** sandbox isolation, revenue calc · **Complexity:** XL · **Time:** 16/10/4

### A26. Community + Leaderboards + Copy/Social ⏳
- **Priority:** P3 · **Layer:** 8 · **Phase:** 13 · **Depends on:** Users, Portfolio, Strategy Marketplace · **Used by:** end users
- **Tables:** `social_follows, social_posts, leaderboard_rankings, copy_relationships, copy_executions` · **Services:** feed, ranker, copy engine (mirror via OMS)
- **Workers:** leaderboard compute, copy mirror · **Events:** social.*/copy.* · **REST:** `social/*, copy/*, leaderboard/*`
- **Frontend:** feed/leaderboard/copy dashboard · **Permissions:** consent, risk caps, disclosure · **Testing:** copy accuracy, risk scaling · **Complexity:** XL · **Time:** 14/9/4

### A27. Data Warehouse + MLOps ⏳
- **Priority:** P3 · **Layer:** 9 · **Phase:** 13 · **Depends on:** Feature Store, AI Brain · **Used by:** analytics, AI
- **Tables:** `dw_*, mlp_pipelines, mlp_runs, exp_experiments, eval_results` · **Services:** ETL/CDC, pipeline orchestrator, registry, experiment tracker, eval
- **Workers:** ETL, train, eval, GPU pool · **REST:** `ml/*, experiments/*` · **Frontend:** MLOps console
- **Permissions:** data governance · **Testing:** lineage, drift, parity · **Complexity:** XL · **Time:** 16/10/4

### A28. DevOps + Deployment + DR ⏳
- **Priority:** P2 · **Layer:** 10 · **Phase:** 12/15 · **Depends on:** all · **Used by:** platform ops
- **Services:** Docker/compose, K8s, CI/CD, IaC, migration automation, blue-green/canary, backup/DR · **Testing:** load/soak/chaos/DR drill
- **Complexity:** L · **Time:** 12/8/4

---

## PART B — FULL DEPENDENCY GRAPH (no violations)
```
Foundation (Kernel) ✅
        ↓
Infrastructure (Bus/Cache/Scheduler/WS/Redis) 🔶
        ↓
Security (vault, validation, rate-limit) ⏳ P5
        ↓
Identity (Auth → Authz/API Keys → Users/Org/Workspace/Team → Billing) ⏳ P5
        ↓
Observability + Market Data Hardening + Feature Store ⏳ P6
        ↓
Trading (Portfolio → RMS → OMS → Broker → Paper → Journal/Analytics) ⏳ P7–8
        ↓
Strategy (Builder/Versioning → Backtesting/Optimization) ⏳ P9
        ↓
AI (Feature Store → AI Brain → Agents/Memory/KB/Chat) ⏳ P10
        ↓
Live + Notifications + Compliance ⏳ P11
        ↓
Interfaces + DevOps ⏳ P12
        ↓
Marketplace/Plugins/SDK/GraphQL + Community/Copy + Warehouse/MLOps ⏳ P13
        ↓
Enterprise (White-label, License, Multi-region) ⏳ P15
        ↓
Operations (Full DR, Geo-replication, Compliance certification) ⏳ P15+
```
**Invariant:** a module may only depend on layers above it. Cross-layer coupling is
via the single Event Bus + Repository, never direct duplication.

---

## PART C — IMPLEMENTATION PHASES

> Each phase: Objectives · Modules · Milestones · Deliverables · Risks · Testing ·
> Rollback · Success Criteria. (Phases 3.1 & 4 complete.)

### Phase 5 — Identity & Access (v0.3.0)
- **Objectives:** secure the platform; introduce tenancy primitives.
- **Modules:** Security, Auth, Authz+API Keys, Users/Org/Workspace/Team, Billing.
- **Milestones:** M1 middleware chain; M2 auth flows; M3 RBAC + retrofit market routes; M4 tenancy/RLS; M5 billing.
- **Deliverables:** `usr_/auth_/authz_/apikey_/org_/sub_/bill_` tables; auth+admin APIs; login/MFA UI; zod validation layer.
- **Risks:** retrofit regression on market routes → mitigate with contract tests + feature flag.
- **Testing:** authn/authz e2e, tenancy isolation, rate-limit, injection.
- **Rollback:** feature-flag guards off; down-migrations for new tables.
- **Success:** every route authenticated+authorized; TD-001 retired; Security board ≥80.

### Phase 6 — Hardening & Observability (v0.4.0)
- **Objectives:** reliability, real data, test coverage.
- **Modules:** Observability+Compliance-foundation, Market Data Hardening, Feature Store; versioned migrations.
- **Milestones:** metrics/tracing/audit; candle partitioning; batched quotes; feature PIT; CI gates.
- **Deliverables:** `audit_events, fs_*`; partitioned `md_candles`; migration history; coverage ≥90% on core.
- **Risks:** partition migration on live data → tested down-migration; TD-004/TD-006 resolution.
- **Testing:** partition prune, batch correctness, PIT no-look-ahead, coverage gate.
- **Rollback:** revert partition via down-migration; disable batched path flag.
- **Success:** Testing board ≥90; observability live; TD-004 resolved.

### Phase 7 — Portfolio & Risk (v0.5.0)
- **Objectives:** accounting + risk gates.
- **Modules:** Portfolio/Position Manager, RMS.
- **Deliverables:** `pf_*, rms_*`; `portfolio/*, risk/*`; portfolio + risk UI.
- **Risks:** P&L correctness → golden-file tests; CA adjustment reuse.
- **Testing:** P&L math, ledger balance, risk matrix, kill-switch.
- **Rollback:** down-migrations; risk defaults conservative.
- **Success:** accurate P&L; RMS gate enforced; portfolio query <20ms.

### Phase 8 — Execution Core (v0.6.0)
- **Objectives:** orders through risk to (paper) broker.
- **Modules:** OMS, Broker Integration, Paper Trading, Journal/Analytics.
- **Deliverables:** `oms_*, broker_*, paper_*`; `orders/*, admin/brokers/*, paper/*`; order ticket/book UI.
- **Risks:** duplicate orders/recon drift → idempotency keys + reconciliation + DLQ.
- **Testing:** lifecycle, partial fills, idempotency, adapter contract, reconciliation.
- **Rollback:** live disabled by flag; paper adapter default; down-migrations.
- **Success:** full paper order lifecycle; order insert <10ms; no duplicates.

### Phase 9 — Strategy & Validation (v0.7.0)
- **Objectives:** systematic signals, validated.
- **Modules:** Strategy Engine, Backtesting, Optimization.
- **Deliverables:** `strat_*, bt_*, opt_*`; `strategies/*, backtest/*, optimize/*`; strategy IDE + backtest UI.
- **Risks:** look-ahead / non-determinism → PIT features + determinism tests.
- **Testing:** deterministic signals, reproducible backtests, parity paper↔live path.
- **Rollback:** strategies sandboxed; disable runner pool.
- **Success:** strategy start/stop; reproducible backtests; optimization runs.

### Phase 10 — AI Intelligence (v0.8.0)
- **Objectives:** ML signals + agents.
- **Modules:** AI Brain, Agents/Memory/KB/Chat, GPU workers.
- **Deliverables:** `ai_*, agent_*, kb_*, chat_*` (pgvector); `ai/*, agents/*, kb/*, chat/*`; model + chat UI.
- **Risks:** drift/hallucination → drift monitor, RAG grounding, tool scoping, backtest parity gate.
- **Testing:** train/infer parity, drift, RAG accuracy, tool-permission.
- **Rollback:** model registry rollback; AI flag-gated.
- **Success:** AI signals feed strategy; parity verified; chat grounded.

### Phase 11 — Live Trading & Compliance (v0.9.0)
- **Objectives:** real capital, compliant, notified.
- **Modules:** Live Trading, Notifications, Compliance, Reporting.
- **Deliverables:** `live_*, notif_*, rpt_*, comp_*, audit_*`; `live/*, notifications/*, reports/*, admin/compliance/*`.
- **Risks:** capital risk → dual-control, kill-switch, staged enablement, compliance sign-off.
- **Testing:** reconciliation accuracy, audit retention, delivery tracking, kill-switch under load.
- **Rollback:** live safe-mode → paper; kill-switch; down-migrations.
- **Success:** guarded live trading; full audit; compliance foundation.

### Phase 12 — Interfaces & Delivery (v1.0.0 — PRODUCTION)
- **Objectives:** full UX + production ops.
- **Modules:** Interfaces (dashboard/admin/mobile/desktop/offline), DevOps/Deployment/DR.
- **Deliverables:** admin panel, mobile BFF, charts, streaming UI; Docker/K8s/CI-CD/IaC; backup/DR.
- **Risks:** deploy/rollout → blue-green/canary; DR drill.
- **Testing:** e2e, load, chaos, DR restore.
- **Rollback:** blue-green revert; offset replay.
- **Success:** all ERB boards ≥85; **v1.0 GA**.

### Phase 13 — Ecosystem (v2.0/v3.0)
- Marketplaces, Plugins, SDK, GraphQL, Community, Copy/Social, Warehouse/MLOps.

### Phase 15 — Enterprise (v5.0)
- White-label, License server, Multi-region/geo-replication, SOC2/ISO27001/FINRA/MiFID certification.

### Phase 16+ — Autonomous AI (v10.0)
- Multi-agent portfolios, AutoML strategies, RL execution, regime detection, explainable AI.

---

## PART D — SPRINT PLAN (2-week sprints; Phase 5 detailed, rest summarized)

### Sprint 1 — Security middleware + validation (Phase 5)
- **Stories:** S1 zod DTO layer; S2 rate limiter; S3 secrets vault seam; S4 CORS/CSRF policy.
- **Tasks/Hours:** validation lib (16) · rate-limit via cache (12) · vault interface (10) · policy middleware (8) · tests (16).
- **Deps:** Kernel. **Acceptance:** every new route validated; rate-limit enforced; injection tests pass.

### Sprint 2 — Authentication
- **Stories:** JWT+refresh, MFA (TOTP), OAuth/SSO, service tokens, WS auth.
- **Hours:** auth service (20) · MFA (12) · OAuth (14) · WS handshake (8) · tests (18).
- **Deps:** Sprint 1, Users tables. **Acceptance:** login/refresh/logout/MFA e2e; token rotation; negatives.

### Sprint 3 — Authorization + API keys + route retrofit
- **Stories:** RBAC/ABAC guard, scopes, API keys, retrofit `/api/v1/market/*`.
- **Hours:** guard (16) · keys (12) · retrofit+contract tests (20) · admin roles UI (12).
- **Deps:** Sprint 2. **Acceptance:** authz matrix passes; market routes guarded with zero functional regression; **TD-001 retired**.

### Sprint 4 — Users/Org/Workspace/Team + Tenancy (RLS)
- **Stories:** user/profile, org/tenant resolver, workspace, team/invites, RLS policies.
- **Hours:** entities+repos (18) · tenant middleware (12) · RLS (10) · UI (14) · tests (16).
- **Deps:** Sprint 3. **Acceptance:** tenant isolation verified; RLS enforced.

### Sprint 5 — Subscription + Billing → release v0.3.0
- **Stories:** plans, metering, payment adapter, invoices, entitlements.
- **Hours:** plan/metering (18) · payment adapter (14) · invoicing worker (10) · UI (12) · tests (14).
- **Deps:** Sprint 4. **Acceptance:** entitlement gating works; release notes; ERB Phase-5 gate ≥85.

### Sprints 6+ (summarized)
- **6–7:** Phase 6 hardening/observability/feature store → v0.4.0.
- **8–9:** Phase 7 Portfolio+RMS → v0.5.0.
- **10–12:** Phase 8 OMS+Broker+Paper → v0.6.0.
- **13–15:** Phase 9 Strategy+Backtest → v0.7.0.
- **16–19:** Phase 10 AI Brain+Agents → v0.8.0.
- **20–22:** Phase 11 Live+Compliance → v0.9.0.
- **23–25:** Phase 12 Interfaces+DevOps → **v1.0.0 GA**.
- **26+:** Phases 13/15/16 ecosystem, enterprise, autonomous AI.

---

## PART E — REPOSITORY EVOLUTION
```
CURRENT (monolith, single app)
  src/{kernel, modules/{market_data, infra}, db, app/api, app/dashboard} · docs/

NEXT (v0.3–v0.6: modular domains within one app)
  src/modules/{identity, security, portfolio, oms, rms, broker, feature_store, ...}
  src/app/api/v1/{auth,users,orgs,portfolio,orders,risk,...} · shared kernel unchanged

FUTURE (v0.7–v1.0: workers & gateways split)
  apps/{web, admin, worker, ws-gateway}  (same repo, separate runtimes)
  packages/{kernel, sdk, contracts(event+api schemas)}
  src/modules/* remain the domain libraries consumed by apps

ENTERPRISE (v2.0+: extractable services)
  apps/{web, mobile-bff, admin, worker-*, ws-gateway, graphql-gateway}
  packages/{kernel, sdk-ts, sdk-python, contracts, plugin-api}
  services/ (optionally extracted: ai-inference, ml-training, marketplace)
  infra/ (IaC), gateways/ (api/graphql/ws) — all still one event bus + one repository contract
```
**Rule:** extraction changes *runtime topology*, never module boundaries or contracts.

---

## PART F — DATABASE EVOLUTION
- **V1 (now):** `md_*` (7), `rt_*` (3). Push-based schema.
- **V2 (P5):** `usr_/auth_/authz_/apikey_/org_/sub_/bill_` + RLS + Universal Table Standard; versioned migrations begin.
- **V3 (P6):** `audit_*, fs_*`; `md_candles` partitioned; Timescale hypertables; TD-004/TD-006 resolved.
- **V4 (P7–8):** `pf_*, rms_*, oms_* (partitioned), broker_*, paper_*`.
- **V5 (P9–10):** `strat_*, bt_*, opt_*, ai_*, agent_*, kb_*(pgvector), chat_*`.
- **V6 (P11+):** `live_*, notif_*, rpt_*, comp_*`; warehouse `dw_*` (CDC).
- **Migration strategy:** every change Up/Down/Validate/Rollback. **Indexes:** per query path, partial for `deleted_at IS NULL`. **Partitioning:** time-range monthly / tick daily. **Archival:** S3 Parquet cold tier. **Retention:** hot 30–90d → warm → cold 1–7y → purge per compliance.

---

## PART G — API EVOLUTION
- **REST:** `/api/v1` remains stable; new domains add route groups (never duplicate logic). Deprecations documented; `/api/v2` only on breaking change (+ migration).
- **GraphQL:** single `/graphql` (P13) reusing services — read/aggregate first, mutations gated by same authz.
- **WebSocket/SSE:** `/api/v1/realtime/stream` (P4/P12) — filtered by symbol/watchlist/portfolio.
- **SDK:** TS then Python (P13) generated from OpenAPI; consumes REST — no separate logic.
- **Plugin API:** sandboxed capability interface (P13).
- **Versioning:** SemVer at platform level; API path version only on breaking contract change.

---

## PART H — DEPLOYMENT EVOLUTION
Local (`next dev`) → `build_and_start` (now) → **Docker** image (P6) → **Docker Compose**
(app+PG+Redis, P6) → **Kubernetes** (HPA per deployment, P12) → **Multi-node**
(stateless api/ws/worker + Redis cluster + PG replicas, P12/15) → **Multi-region**
(active-passive → active-active, geo-replication, P15) → **Enterprise** (white-label,
per-tenant isolation, license server, P15+).

---

## PART I — MONITORING EVOLUTION
Logging (structured JSON ✅) → Metrics (Prometheus ✅ `/realtime/metrics`) → Tracing
(OpenTelemetry, correlation IDs ✅ context) → Audit (`audit_events` immutable, P6) →
Alerting (rules on metrics, P6) → Profiling (query/CPU/memory, continuous, P12).

---

## PART J — TESTING EVOLUTION
Unit (vitest ✅) → Integration (testcontainers PG/Redis, P5/6) → Component (UI, P12) →
E2E (auth+trading flows, P8+) → Load (ingest/WS, P12) → Stress (order burst, P12) →
Chaos (Redis/broker failover, P12/15) → Security (authz/injection/SSRF, P5+) →
Regression (every release, continuous). **Target coverage ≥90% from P6.**

---

## PART K — DOCUMENTATION EVOLUTION
Developer Docs (README ✅) · Architecture (✅ + DATABASE_ARCHITECTURE ✅) · API Docs
(OpenAPI, P5) · Database Docs (schema reference, P6) · User Docs (P12) · Admin Docs
(P12) · Runbooks (DR/incident, P12/15) · ADRs (✅ append-only). Every module updates
its docs at Definition-of-Done.

---

## PART L — MASTER EXECUTION ORDER (100%, nothing skipped)
```
1  Kernel ✅              10 Broker Integration
2  Realtime Infra 🔶      11 Paper Trading
3  Market Data ✅         12 Trade Journal/Analytics/Reports
4  Security               13 Strategy Engine
5  Authentication         14 Backtesting/Optimization
6  Authorization+Keys     15 Feature Store (online serving)
7  Users/Org/WS/Team      16 AI Brain
8  Subscription/Billing   17 AI Agents/Memory/KB/Chat
9  Observability/Compliance-fdn  18 GPU/Distributed Training/Model Deploy
   Market Data Hardening  19 Live Trading
   Feature Store          20 Notifications/Alert Engine
   Portfolio/Position     21 Compliance (SEBI/FINRA/MiFID/GDPR)
   RMS                    22 Dashboard extend/Settings/Charts
   OMS                    23 Document Center/Research Terminal
                          24 Community/Leaderboards/Social/Copy
                          25 Marketplaces/Plugins/SDK/GraphQL
                          26 Data Warehouse/MLOps
                          27 Mobile/Desktop/Offline
                          28 Admin Panel (full)
                          29 White-label/License/Multi-region
                          30 Backup/DR/Geo-replication/Chaos
                          31 CI/CD/DevOps/Deployment automation
                          32 Compliance certification + Docs portal → 100%
```
**Ordering guarantee:** each item's dependencies precede it (Part B). No module or
dependency omitted. This is the permanent execution roadmap; updates go through ADR + Changelog.
