# AITradeMinds — Architecture Reference

> Frozen architecture. Every future module attaches to the layers and singletons
> below. See [CONSTITUTION.md](./CONSTITUTION.md) for the governing rules.

## Product Layers
```
L1  Foundation        kernel: config, logger, context, errors, registry
L2  Infrastructure    Event Bus, Cache, Scheduler/Workers, Infra Repo, (Redis/WS seams)
L3  Security & Identity  Auth, Authz, Users, Org/Tenant, Billing            (roadmap)
L4  Market Intelligence  Market Data ✅, Feature Store, Multi-asset, Broker
L5  Trading Intelligence Portfolio, RMS, OMS, Paper, Live, Journal          (roadmap)
L6  Strategy           Builder, Backtest, Optimization, Marketplace          (roadmap)
L7  AI Intelligence    AI Brain, Agents, Memory, KB, MLOps                   (roadmap)
L8  User Platform      Dashboard ✅, Notifications, Research, Social          (partial)
L9  Enterprise         Multi-tenant, White-label, Plugins, SDK, GraphQL      (roadmap)
L10 Operations         Admin, Monitoring, Audit, Backup/DR, CI/CD, Compliance (partial)
```

## Canonical Singletons (one each — never duplicate)
- **Event Bus** `eventBus` — typed pub/sub; `attachTransport(BusTransport)` for
  cross-process (Redis Streams) delivery. In-proc default.
- **Cache** `cache` — L1 namespaced TTL Map; `attachL2(CacheTier)` for shared
  Redis tier, consulted only in async `getOrSet`.
- **Repositories** `repository` (market), `infraRepository` (realtime) — both use
  the single `db` client; no second pool.
- **Provider Manager** `providerManager` — broker/exchange port + adapters,
  health/failover/priority routing.
- **Feed Pipeline** `feedPipeline` — tick → quality → cache → bus → candle.
- **Scheduler** `scheduler` — in-proc job runtime; records to `rt_jobs`, DLQ to
  `rt_dead_letter`.
- **Kernel** `getConfig`, `logger`, `runWithContext`, `errors`, `singleton`.

## Event Topics (single bus)
`md.tick md.candle md.quality md.provider md.scanner md.corporateAction`
(reserved for later phases: `sig.signal risk.decision ord.* pf.* ai.* notif.* sys.*`)

## Data Flow
```
Ingest → Quality gate → L1(+L2) Cache → Event Bus → consumers → Repository (Postgres)
Read   → API → (authz) → cache-first getOrSet → response
Jobs   → Scheduler → worker handler → engines → Repository ; failures → rt_dead_letter
```

## Database Domains (prefixes)
`md_*` market ✅ · `rt_*` realtime infra ✅ · future: `usr_ auth_ authz_ pf_ oms_
rms_ strat_ ai_ fs_ rpt_ notif_ audit_`. Every table carries audit timestamps and
tenant support where applicable.

## Extension Points (wired, awaiting later phases)
- `RedisStreamsTransport implements BusTransport` → `eventBus.attachTransport(...)`
- `RedisCacheTier implements CacheTier` → `cache.attachL2(...)`
- `BullMqScheduler` → same registration API as `scheduler`
- Auth/Authz guard → replaces interim `ADMIN_TOKEN` (TD-001)

## Quality Gate (Definition of Done)
`vitest` → `next typegen` → `tsc --noEmit` → `npm run build` → `drizzle-kit push`
→ `build_and_start`. All must pass before a module is marked Production.
