# AITradeMinds — Enterprise Database Architecture & Data Governance

> The frozen data architecture for AITradeMinds v1.0 → v10.0. Every future module
> **attaches** to this design — no redesign, extend only. Companion to
> [ARCHITECTURE.md](./ARCHITECTURE.md), [CONSTITUTION.md](./CONSTITUTION.md),
> [PROJECT_BRAIN.md](./PROJECT_BRAIN.md).
>
> **Philosophy:** Single source of truth · never duplicate data · normalize by
> default, denormalize only for measured performance · everything versioned,
> auditable, recoverable.

---

## 1. STORAGE LAYERS (polyglot persistence)

| Layer | Technology | Role | Source of truth? | Status |
|---|---|---|---|---|
| L1 Operational (OLTP) | **PostgreSQL** (`src/db`, single `db` client) | transactional entities | ✅ yes | ✅ active |
| L2 Time-Series | **TimescaleDB** (hypertables on PG) | ticks, OHLC, greeks, features | ✅ yes | ⏳ Phase 6 (TD-004) |
| L3 Cache | **Redis** | L2 cache + pub/sub + locks | ❌ never | 🔶 seam wired (TD-002) |
| L4 Search | **OpenSearch / Elasticsearch** | symbol/news/doc search | ❌ projection | ⏳ v3.0 |
| L5 Vector | **pgvector** (PG extension) | embeddings, agent memory, KB | ✅ yes | ⏳ Phase 10 |
| L6 Object Storage | **S3-compatible** | reports, model artifacts, backups, cold data | ✅ (blobs) | ⏳ Phase 11/15 |
| L7 Analytics Warehouse | **ClickHouse / DuckDB / Snowflake** | OLAP, reports, AI analytics | ❌ derived | ⏳ v3.0 |

**Rule:** OLTP is never overloaded by analytics — warehouse consumes via ETL/CDC.
Redis is L2 only and never authoritative. pgvector keeps AI memory co-located with
OLTP to avoid a separate store until warehouse scale demands it.

---

## 2. UNIVERSAL TABLE STANDARD (applies to all new business tables)

Every new business table MUST include:
```
id            bigserial / serial   PRIMARY KEY
tenant_id     text (nullable)      -- multi-tenant isolation where applicable
created_at    timestamptz  NOT NULL DEFAULT now()
updated_at    timestamptz  NOT NULL DEFAULT now()
created_by    text                 -- actor id (user/service)
updated_by    text
version       integer      NOT NULL DEFAULT 1   -- optimistic concurrency
deleted_at    timestamptz          -- soft delete (NULL = live)
```
Plus: appropriate indexes, foreign keys, CHECK constraints, and unique constraints.

**Current-schema note (grounded):** existing `md_*` tables predate this standard and
carry `created_at/updated_at` + audit-style timestamps but **not** `created_by`,
`version`, `deleted_at`, or `tenant_id`. `rt_*` tables (Phase 4) added `tenant_id`.
Backfilling the full standard onto legacy tables is a **forward migration**, tracked
as **TD-006** (below) — NOT a redesign. New tables adopt the standard immediately.

---

## 3. NAMING CONVENTIONS

| Object | Rule | Example |
|---|---|---|
| Table | `snake_case`, domain-prefixed | `oms_orders` |
| Primary key | `id` | `id` |
| Foreign key column | `<entity>_id` | `order_id` |
| Index | `idx_<table>_<cols>` | `idx_oms_orders_status` |
| Unique | `uq_<table>_<cols>` | `uq_md_symbols_exchange_symbol` |
| Foreign key constraint | `fk_<table>_<ref>` | `fk_oms_fills_order` |
| Partition | `<table>_p<range>` | `md_candles_p2026_01` |

> Legacy `md_*` indexes use `md_symbols_uq` / `md_symbols_symbol_idx` style; new
> tables use the `idx_`/`uq_`/`fk_` prefixes above (convergence over time, TD-006).

---

## 4. DATA DOMAINS (prefix → owner module)

| Prefix | Domain | Layer | Status |
|---|---|---|---|
| `md_` | Market data, symbols, candles, options, news, watchlists | L1/L2 | ✅ |
| `rt_` | Realtime infra: jobs, stream offsets, dead letters | L1 | ✅ |
| `usr_` `org_` `ws_` `team_` | Users, orgs, workspaces, teams | L1 | ⏳ P5/P9 |
| `auth_` `authz_` `apikey_` | Auth, roles, permissions, keys | L1 | ⏳ P5 |
| `sub_` `bill_` | Subscription, billing, usage | L1 | ⏳ P5 |
| `fs_` | Feature store (features, sets, labels) | L2 | ⏳ P6 |
| `pf_` | Portfolio, positions, holdings, ledger, pnl | L1 | ⏳ P7 |
| `rms_` | Risk limits, decisions, kill-switch | L1 | ⏳ P7 |
| `oms_` | Orders, fills, order events | L1 (partitioned) | ⏳ P8 |
| `broker_` | Broker accounts, tokens | L1 | ⏳ P8 |
| `strat_` `bt_` `opt_` | Strategies, backtests, optimization | L1 | ⏳ P9 |
| `ai_` `agent_` `kb_` | Models, versions, predictions, agents, knowledge base | L1/L5 | ⏳ P10 |
| `notif_` `rpt_` | Notifications, reports | L1/L6 | ⏳ P11 |
| `audit_` `comp_` | Audit trail, compliance | L1 (append-only) | ⏳ P11/14 |
| `dw_` | Warehouse projections | L7 | ⏳ v3.0 |

---

## 5. PARTITIONING POLICY

Partition high-volume tables by time (monthly range; daily for ticks):
`md_candles`, tick tables, `oms_orders`, `oms_fills`, `ai_predictions`,
`notif_deliveries`, `audit_events`, `rt_jobs` (retention-partitioned).
- Strategy: PostgreSQL declarative range partitioning; TimescaleDB hypertables for
  tick/OHLC/greeks/features (auto chunking + compression + continuous aggregates).
- Pruning verified before promotion (ERB Performance gate).

---

## 6. INDEX POLICY
Every query path is indexed; every index justified against read gain vs write/storage
cost. Composite indexes ordered by selectivity. Partial indexes for `deleted_at IS NULL`
and hot statuses (e.g., open orders). BRIN indexes for append-only time-series.
Reviewed each release for slow-query regressions.

---

## 7. AUDIT POLICY
Every business table is auditable: **who, what, when, why, previous value, new value,
source**. Mechanism: append-only `audit_events` (immutable) + row `version`/`updated_by`.
Interim: `rt_dead_letter` + `rt_jobs` provide partial operational audit today.

---

## 8. CACHE POLICY (Redis = L2 only)
TTL per namespace, pub/sub invalidation across instances, distributed locks for
single-leader jobs. Never a source of truth. Implemented via the single `cache`
(`attachL2`) and single `eventBus` — no parallel cache.

---

## 9. TIME-SERIES POLICY
Tick, OHLC, volume, order book, greeks, and feature store use time-series-optimized
storage (TimescaleDB hypertables): compression on cold chunks, continuous aggregates
for multi-timeframe rollups (reuses the existing resample logic as the query contract).

## 10. VECTOR POLICY
AI memory, knowledge base, embeddings, semantic search, agent memory use **pgvector**
(`kb_embeddings`, `agent_memory`) with IVFFlat/HNSW indexes. Point-in-time correctness
enforced for any feature/label used in training.

## 11. WAREHOUSE POLICY
Analytics never touch OLTP hot path. ETL/CDC → warehouse for aggregation, historical
reports, dashboards, AI analytics. Nightly + streaming CDC as scale requires.

---

## 12. DATA RETENTION (hot → warm → cold → archive)
| Tier | Location | Example | Window |
|---|---|---|---|
| Hot | PG/Timescale recent chunks | 1m candles, open orders | 30–90d |
| Warm | PG compressed / replica | intraday history | 6–18m |
| Cold | S3 (Parquet) | tick archive, old audit | 1–7y |
| Archive/Delete | S3 Glacier / purge | per compliance | policy-driven |
Retention jobs run via the single `scheduler` (extends existing retention engine).

## 13. BACKUP & DR
Full + incremental backups; **PITR** (WAL); geo-backup; scheduled restore testing.
DR: RPO ≈ minutes, RTO ≈ low-tens-of-minutes; streaming replication + failover;
event streams replayable from `rt_stream_offsets` to rebuild derived state.

## 14. SECURITY
Encryption at rest + in transit (TLS); secrets vault; **Row-Level Security** for
tenant isolation; column encryption for PII/credentials (`broker_tokens`); PII
governed under GDPR (erasure/export). No secret in source (via kernel `getConfig`).

## 15. MULTI-TENANCY
Model: shared database + shared schema + `tenant_id` + RLS (v1–v5). Sharding path
reserved for v5.0+ (tenant-keyed). New tables carry `tenant_id`; RLS policies added
with the Auth module (Phase 5).

## 16. AI DATA GOVERNANCE
Model registry (`ai_models`/`ai_versions`), training/inference/evaluation datasets,
experiment history, and **versioned features** (feature store) with lineage and
point-in-time reads to prevent look-ahead.

---

## 17. PERFORMANCE TARGETS (ERB-gated)
| Operation | Target |
|---|---|
| Market tick insert | < 5ms |
| Order insert | < 10ms |
| Portfolio query | < 20ms |
| Dashboard query | < 100ms |
| Historical query | optimized (partition prune + aggregates) |

## 18. OBSERVABILITY
Monitor slow queries, locks/deadlocks, replication lag, connections, cache hit ratio,
storage growth — exposed via `/api/v1/realtime/metrics` and extended per module.

## 19. DATA QUALITY
Validate consistency, completeness, accuracy, uniqueness, integrity. Reuses the
existing Data Quality engine at ingest (tick/candle validation, gap detection).

## 20. MIGRATION POLICY
No manual production schema edits. Every migration has **Up / Down / Validation /
Rollback**. Move from `drizzle-kit push` to versioned migration files (Phase 6, TD-004).

---

## GOVERNANCE NOTES / NEW DEBT
- **TD-006** (new): converge legacy `md_*` tables to the Universal Table Standard
  (`created_by`, `version`, `deleted_at`, `tenant_id`) and `idx_/uq_/fk_` naming via
  forward migration. Priority Medium; target Phase 6/9; risk Low (additive columns).
- Reaffirmed: **one** PostgreSQL context (`db`), **one** cache, **one** event bus.
  All L2–L7 stores are additive projections/tiers — never a second source of truth.
