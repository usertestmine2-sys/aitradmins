# AITradeMinds — Master Registries

> Continuously-updated source of truth for every platform asset. Update the
> relevant section in the SAME change that alters an asset. Companion to
> [PROJECT_BRAIN.md](./PROJECT_BRAIN.md).

---

## §Module Registry
| Module | Phase | Status | Completion | Path |
|---|---|---|---|---|
| Kernel | 4 | ✅ | 100% | `src/kernel/*` |
| Infra / Realtime | 4 | 🔶 Beta | 70% | `src/modules/infra/*` |
| Market Data | 3.1 | ✅ | 100% feat / 82% PR | `src/modules/market_data/*` |
| Dashboard | 3.1 | ✅ | 70% | `src/app/dashboard.tsx` |
| Identity, Portfolio, RMS, OMS, Broker, Strategy, Backtest, Paper, AI Brain, Live, Notifications, Reporting, Compliance, DevOps | 5–16 | ⏳ | 0% | (roadmap) |

## §Architecture / Singleton Registry (one each — never duplicate)
| Singleton | Symbol | Location | Extension seam |
|---|---|---|---|
| Event Bus | `eventBus` | `market_data/core/event-bus.ts` | `attachTransport(BusTransport)` |
| Cache | `cache` | `market_data/core/cache.ts` | `attachL2(CacheTier)` |
| Market Repository | `repository` | `market_data/core/repository.ts` | add methods |
| Infra Repository | `infraRepository` | `infra/repository.ts` | add methods |
| Provider Manager | `providerManager` | `market_data/providers/provider-manager.ts` | add adapters |
| Feed Pipeline | `feedPipeline` | `market_data/feed/feed-pipeline.ts` | add ingest sources |
| Scheduler | `scheduler` | `infra/scheduler.ts` | `register(JobDefinition)` |
| DB context | `db` | `db/index.ts` | shared only |
| Kernel | `getConfig/logger/errors/context/singleton` | `kernel/*` | extend |

## §Dependency Registry (who depends on whom)
- Kernel → (nothing). Everything → Kernel.
- Infra → Kernel + reuses `db`, `providerManager`, `cache`.
- Market Data engines → core singletons + indicators + constants.
- API routes → module barrels only.
- **Break rule:** modifying a singleton's public method signature is a breaking
  change → requires ADR + backward-compat shim.

## §Database Registry
| Table | Domain | Key columns | Audit | Tenant | Indexes |
|---|---|---|---|---|---|
| md_symbols | market | symbol,exchange,instrument_type | ✓ | – | uq + symbol/sector/type |
| md_candles | market | symbol,tf,ts | (ts) | – | uq + lookup |
| md_corporate_actions | market | symbol,action_type,ex_date | created | – | uq + symbol |
| md_watchlists / md_watchlist_items | market | id / watchlist_id,symbol | created | – | uq |
| md_news | market | source,published_at | created | – | published/symbol |
| md_option_snapshots | market | underlying,expiry,ts | (ts) | – | lookup |
| rt_jobs | realtime | name,status | ✓ | tenant_id | name/started |
| rt_stream_offsets | realtime | stream,consumer_group | ✓ | tenant_id | uq |
| rt_dead_letter | realtime | topic,resolved | ✓ | tenant_id | topic/resolved |
- Migrations: `drizzle-kit push` (TD-004: versioned migrations pending).

## §API Registry (`/api/v1`)
- Market (18): bootstrap, providers, symbols, history, scanner, option-chain,
  corporate-actions, breadth, sectors, news, watchlists, replay, features, session,
  indicators, overview, (+ health at `/api/health`).
- Realtime (3): `realtime/health` (open), `realtime/metrics` (admin), `realtime/jobs` (admin).
- Envelope: `{ ok, data | error, code? }`. Versioning: path `/v1`. Auth: pending (TD-001).

## §Event Registry (single bus)
| Topic | Producer | Consumer(s) | Idempotent | DLQ |
|---|---|---|---|---|
| md.tick | feed pipeline | candle aggregator, (future strategy/AI) | yes (upsert) | rt_dead_letter |
| md.candle | feed pipeline | strategy/AI (future), cache invalidation | yes | rt_dead_letter |
| md.quality | quality engine | monitoring | n/a | – |
| md.provider | provider manager | monitoring, failover | n/a | – |
| md.scanner | scanner | notifications (future) | n/a | – |
| md.corporateAction | corporate-action | portfolio (future) | yes | – |
Reserved (later): `sig.signal, risk.decision, ord.*, pf.*, ai.*, notif.*, sys.*`.

## §Worker / Scheduler / Queue Registry
| Job | Interval | Handler | Records |
|---|---|---|---|
| provider.heartbeat | 5s | providerManager.heartbeat | rt_jobs |
| cache.purgeExpired | 30s | cache.purgeExpired | rt_jobs |
- Runtime: in-proc `scheduler` (opt-in `SCHEDULER_ENABLED`). Queue: BullMQ (future, TD-002).

## §Cache Registry
- Single two-tier cache. L1 in-proc Map (TTL). L2 seam via `attachL2` (Redis, TD-002).
- Namespaces: quote, candles, symbol, optionChain, breadth, scanner, news, sector, provider.

## §Feature / AI / Strategy / Broker / Exchange / Plugin / Marketplace Registries
- Feature: Feature Engineering engine (ML-ready output; persisted Feature Store = future).
- AI: none yet. Strategy: none yet. Broker: 8 adapter stubs in Provider Manager (synthetic, TD-003).
- Exchange: NSE/BSE/MCX/NFO/CDS enums. Plugin/Marketplace: future (Phase v3.0).

## §Security Registry
- Roles: none yet (Phase 5). Secrets: `DATABASE_URL`, optional `REDIS_URL`,
  `ADMIN_TOKEN`, `*_API_KEY` (via `getConfig`). Vault: future.
- Audit: `rt_dead_letter` + job records; full `audit_events` table = future.

## §Test Registry
- Harness: vitest. Files: `src/tests/kernel.test.ts` (4), `src/tests/cache-tier.test.ts` (1).
- Coverage: kernel + cache seam. Target >90% (TD-005). Regression: green.

## §Documentation Registry
- README, CONSTITUTION, ARCHITECTURE, PROJECT_BRAIN, REGISTRIES, ADR, TECHNICAL_DEBT, CHANGELOG.

## §Bug Registry
- (none open)

## §Risk Registry
- R1: single-process scaling ceiling until Redis (mitigated by seams). 
- R2: synthetic market data not production-real (TD-003).
- R3: unauthenticated admin ops endpoints interim (TD-001).

## §Release Registry
- Phase 3.1 Market Data → Production (module-level). Phase 4 → Beta (in-proc).
