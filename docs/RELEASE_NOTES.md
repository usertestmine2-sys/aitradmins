# AITradeMinds — Release Notes

## v0.2.0-beta — Foundation Kernel + Realtime Infrastructure (Internal Beta)
**ERB verdict:** Approved at Beta milestone (Production Candidate at milestone scope).

### New Features
- **Kernel foundation** — validated config, structured redacting logger, correlation
  context, unified error taxonomy, DI singleton registry.
- **Realtime infrastructure** — in-proc scheduler/worker runtime with job history
  and dead-letter capture; infra repository (reuses single `db`).
- **Distributed seams** — Event Bus `attachTransport()` and Cache `attachL2()`
  (Redis-ready, backward compatible).
- **Ops APIs** — `/api/v1/realtime/{health,metrics,jobs}` (deep health, Prometheus
  metrics, scheduler control).

### Improvements
- Two market data engines (`provider.heartbeat`, `cache.purgeExpired`) now run as
  scheduled jobs with persistence and metrics.

### Fixes
- None (new capability release).

### Breaking Changes
- None. Event Bus and Cache changes are strictly additive.

### Migration Guide
- Apply schema: `npx drizzle-kit push` (adds `rt_jobs`, `rt_stream_offsets`,
  `rt_dead_letter`). No existing table altered. Down-path: drop the three `rt_*` tables.

### Known Issues / Technical Debt
- TD-001 interim `ADMIN_TOKEN` guard (resolved in Phase 5).
- TD-002 Redis transport/L2 interface-only; in-proc active.
- TD-003 synthetic market data providers.
- TD-004 push-based schema (versioned migrations pending).
- TD-005 test coverage below 90% target.

### Future Work
- Phase 5 Identity & Access (Auth/Authz + API input validation).

---

## v0.1.0-beta — Market Data Platform (Internal Beta)
### New Features
- Complete market-data platform: 13 engines, single Event Bus / Cache / Repository,
  Provider Manager (8 adapters), Feed Pipeline, Indicators, Quality, Session.
- Database: 7 `md_*` tables. APIs: 18 routes under `/api/v1/market/*`. 6-tab dashboard.
### Known Issues
- Synthetic provider data (TD-003); no auth (pre-Phase-5).
