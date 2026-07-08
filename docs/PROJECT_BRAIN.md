# AITradeMinds — Master Project Brain

> **Persistent memory of the platform.** Read this FIRST before any implementation.
> Never restart reasoning from zero. Never redesign completed modules. Never
> duplicate completed work. Every change updates this brain.
>
> Companion files: [REGISTRIES.md](./REGISTRIES.md) · [ADR.md](./ADR.md) ·
> [CONSTITUTION.md](./CONSTITUTION.md) · [ARCHITECTURE.md](./ARCHITECTURE.md) ·
> [TECHNICAL_DEBT.md](./TECHNICAL_DEBT.md) · [../CHANGELOG.md](../CHANGELOG.md)

---

## 1. PROGRESS DASHBOARD (live)

| Metric | Value |
|---|---|
| Version | **0.15.0-beta** (Internal Beta) |
| Overall completion (vs v1.0) | **~80%** |
| Current phase | Phase 8B (Enterprise Execution Intelligence) — Beta |
| Completed modules | Market Data (3.1), Kernel, Infra core, **Security, Identity (Auth/Authz/Users/Orgs)** |
| In progress | Identity expansion (Workspace/Team/Billing) |
| Pending | Portfolio, RMS, OMS, Strategy, AI Brain, … (Phases 6–16) |
| Blocked | None |
| Technical Debt score | 5 tracked (0 critical); **TD-001 resolved**, ADR-0007 added |
| Architecture stability | **High** — frozen, singletons intact |
| Security score | **Medium (~55%)** — Auth+RBAC+validation+rate-limit+audit live; MFA/OAuth/vault pending |
| Performance score | **Good** — cache-first, indexed; O(N) provider loops noted |
| Testing score | **~40%** — kernel, cache, identity, rate-limit covered; engines pending |
| Documentation score | **~85%** — brain, constitution, arch, SDLC, release mgmt, database arch, roadmap persisted |
| Production readiness | **~58%** |

---

## 2. MEMORY LAYERS (index → detail in REGISTRIES.md)

- **Architecture Memory** — frozen 10-layer model, canonical singletons. → ARCHITECTURE.md
- **Business Memory** — AI Trading OS for funds/banks/exchanges/retail/quant.
- **Technical Memory** — Next.js 16 + React 19 + TS strict + Drizzle/Postgres + zod + vitest.
- **Database Memory** — `md_*` (7 tables), `rt_*` (3 tables). → REGISTRIES §DB
- **API Memory** — 18 `/api/v1/market/*` + 3 `/api/v1/realtime/*` + `/api/health`. → REGISTRIES §API
- **Event Memory** — single bus, 6 domain topics. → REGISTRIES §Events
- **UI Memory** — 6-tab dashboard (client). → REGISTRIES §UI
- **AI Memory** — none yet (Feature Engineering is the input seam). → REGISTRIES §AI
- **Trading Memory** — none yet (Phases 7–9). → REGISTRIES §Strategy
- **Infrastructure Memory** — Redis/scheduler/worker seams. → ARCHITECTURE.md
- **Security Memory** — interim ADMIN_TOKEN (TD-001); Auth pending. → REGISTRIES §Security
- **Testing Memory** — vitest, 5 tests passing. → REGISTRIES §Tests
- **Deployment Memory** — `build_and_start` gate; Docker/CI pending.
- **Documentation Memory** — this brain + constitution + arch + debt + changelog.
- **Future Roadmap Memory** — Phases 5→16 (v1.0→v10.0). → ARCHITECTURE.md, CHANGELOG.md

---

## 3. MODULE MEMORY (authoritative status)

### ✅ Market Data (Phase 3.1) — COMPLETE (100% feature / 82% PR)
- Purpose: institutional Indian market-data platform.
- Consumers: dashboard, all future trading/AI modules.
- Producers: provider adapters, feed pipeline.
- Tables: `md_symbols, md_candles, md_corporate_actions, md_watchlists,
  md_watchlist_items, md_news, md_option_snapshots`.
- Services (13 engines): Provider Manager, Feed Pipeline, Historical, Symbol Master,
  Scanner, Option Chain, Corporate Action, Breadth, Sector Intelligence, News,
  Watchlist, Replay, Feature Engineering; + Indicators, Quality, Session.
- APIs: 18 under `/api/v1/market/*`. Workers: heartbeat/retention/scan (now via scheduler).
- Risks: synthetic providers (TD-003), O(N) quote loops. Debt: TD-003, TD-004.

### ✅ Kernel (Phase 4) — COMPLETE (Foundation)
- Purpose: shared foundation. Modules: config, logger, context, errors, registry.
- Consumers: everything. Producers: none. Tables: none. Tests: kernel.test.ts.

### 🔶 Infrastructure / Realtime (Phase 4) — BETA
- Purpose: distributed backbone + ops runtime.
- Services: `scheduler`, `infraRepository`, `bootstrapRealtime`.
- Tables: `rt_jobs, rt_stream_offsets, rt_dead_letter`.
- APIs: `/api/v1/realtime/{health,metrics,jobs}`.
- Extensions: Event Bus `attachTransport`, Cache `attachL2`.
- Debt: TD-001 (admin guard), TD-002 (Redis interface-only).

### ⏳ Pending (roadmap) — Identity, Portfolio, RMS, OMS, Broker, Strategy,
Backtesting, Paper, AI Brain, Live, Notifications, Reporting, Compliance,
Interfaces, DevOps. Status: designed & frozen, not built.

---

## 4. IMPLEMENTATION MEMORY

- **Completed:** Phase 3.1 Market Data; Phase 4 Kernel + Infra seams; docs & governance.
- **Running:** none (awaiting Phase 5 approval).
- **Blocked:** none.
- **Pending:** Phase 5 Identity & Access (retires TD-001).
- **Deferred:** Redis provisioning (TD-002); real broker transports (TD-003).
- **Cancelled:** none.

---

## 5. CHANGE IMPACT ANALYSIS — mandatory before any change
Assess: Affected Modules · APIs · Events · Database · UI · AI · Tests · Docs · Risk.
Record the analysis in the PR/build record and update REGISTRIES + this dashboard.

---

## 6. SELF-AUDIT — mandatory after every implementation
1. Architecture intact? 2. Any duplication? 3. Dependencies respected?
4. Standards followed? 5. Tests updated? 6. Docs updated? 7. New debt tracked?
Record answers in the build record; update the dashboard scores.

---

## 7. ARCHITECTURE STABILITY GUARD
Any attempt to duplicate / replace / break / redesign a singleton (Event Bus, Cache,
Repository, Provider Manager, Feed Pipeline, Scheduler, DB context, Kernel) is
**REJECTED**. The remedy is always **extension** via the documented seams.

---

## 8. UPDATE PROTOCOL (keeps the brain smarter each release)
On every implementation: (a) update the relevant REGISTRIES section, (b) add an ADR
if an architectural decision was made, (c) update TECHNICAL_DEBT, (d) update CHANGELOG,
(e) refresh the dashboard in §1, (f) run the full quality gate.
