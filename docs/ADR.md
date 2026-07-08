# AITradeMinds — Architecture Decision Record (ADR)

> Permanent, append-only history of architectural decisions. Never delete an ADR;
> supersede it with a new one that references the old. Companion to
> [PROJECT_BRAIN.md](./PROJECT_BRAIN.md).

Template: ID · Date · Problem · Alternatives · Decision · Reason · Tradeoffs ·
Risks · Rollback · Future Impact · Related Modules · Status.

---

## ADR-0001 — Single-process singletons pinned to globalThis
- **Date:** Phase 3.1
- **Problem:** Guarantee one Event Bus / Cache / Repository / Provider Manager /
  Feed Pipeline across imports and Next.js hot reload.
- **Alternatives:** module-level const (lost on reload); external service (premature).
- **Decision:** pin each singleton to `globalThis` (later formalized by kernel `registry`).
- **Reason:** deterministic single instance; zero infra dependency.
- **Tradeoffs:** in-process only (not cross-process).
- **Risks:** horizontal scaling ceiling — accepted, addressed by ADR-0003.
- **Rollback:** n/a (foundational).
- **Future Impact:** all modules reuse these instances.
- **Related:** Market Data core. **Status:** Accepted.

## ADR-0002 — Modular monolith with ports & adapters
- **Date:** Phase 3.1
- **Problem:** Support many brokers/exchanges/data sources without coupling.
- **Alternatives:** direct vendor calls (rigid); microservices (premature).
- **Decision:** `MarketDataProvider` port + adapters behind one Provider Manager.
- **Reason:** swappable vendors; testable; service-extractable later.
- **Tradeoffs:** an abstraction layer to maintain.
- **Risks:** low. **Rollback:** n/a.
- **Future Impact:** broker order APIs and real transports drop in here (no new manager).
- **Related:** Provider Manager, Broker. **Status:** Accepted.

## ADR-0003 — Distributed backbone via injected transport/tier (extend, not replace)
- **Date:** Phase 4
- **Problem:** In-proc bus/cache cannot serve multiple processes/instances.
- **Alternatives:** rewrite bus/cache on Redis (breaks callers, violates freeze);
  second parallel bus (violates no-duplication).
- **Decision:** add `attachTransport(BusTransport)` to Event Bus and
  `attachL2(CacheTier)` to Cache. In-proc remains the default; Redis adapters
  attach without changing any engine.
- **Reason:** backward compatible; preserves the "one bus / one cache" law.
- **Tradeoffs:** Redis adapters are interface-only until provisioned (TD-002).
- **Risks:** low — graceful degradation to in-proc.
- **Rollback:** detach transport/tier → original behavior.
- **Future Impact:** unlocks scale-out, WS gateway, multi-instance workers.
- **Related:** Event Bus, Cache, Infra. **Status:** Accepted.

## ADR-0004 — Kernel foundation (config/logger/context/errors/registry)
- **Date:** Phase 4
- **Problem:** Cross-cutting concerns were ad-hoc; no validated config, no
  structured logging, no correlation, no unified errors.
- **Alternatives:** per-module utilities (duplication); heavy frameworks (overkill).
- **Decision:** a dependency-free kernel; single validated `getConfig`, structured
  redacting `logger`, `AsyncLocalStorage` context, `AppError` taxonomy, DI `registry`.
- **Reason:** enterprise consistency; zero duplication; testable.
- **Tradeoffs:** all modules must adopt kernel (enforced by Constitution).
- **Risks:** low. **Rollback:** n/a (additive).
- **Future Impact:** every future module builds on kernel primitives.
- **Related:** all. **Status:** Accepted.

## ADR-0005 — In-proc scheduler now; BullMQ later behind same API
- **Date:** Phase 4
- **Problem:** heartbeat/retention/scan were manual; need durable scheduling.
- **Alternatives:** external cron (opaque); adopt BullMQ immediately (needs Redis).
- **Decision:** in-proc `scheduler` singleton with `register(JobDefinition)`,
  opt-in start, run records to `rt_jobs`, failures to `rt_dead_letter`. A BullMQ
  implementation later exposes the same registration API.
- **Reason:** works single-process today; no new API when Redis arrives.
- **Tradeoffs:** single-leader only until distributed queue (TD-002).
- **Risks:** low. **Rollback:** stop scheduler (jobs remain registered).
- **Future Impact:** GPU/train/report workers register the same way.
- **Related:** Infra. **Status:** Accepted.

## ADR-0007 — Keyfile secret-vault seam for AUTH_SECRET
- **Date:** Phase 5
- **Problem:** The managed runtime regenerates `.env` on each build (only
  `DATABASE_URL` survives), wiping `AUTH_SECRET`; strict "required in production"
  prevented boot. Shipping a secret in source is forbidden.
- **Alternatives:** hardcode secret (forbidden); block auth (unusable); require
  manual env each deploy (fragile in managed sandbox).
- **Decision:** secrets-vault seam in `kernel/crypto.ts`: prefer `AUTH_SECRET`
  env/vault; otherwise auto-generate a 32-byte instance secret persisted to a
  gitignored `.aitm-secret` keyfile (0600), cached per process; ephemeral fallback
  if FS is read-only.
- **Reason:** no secret in source; survives `.env` resets; env/vault overrides;
  a real Vault adapter can replace the file provider without interface change.
- **Tradeoffs:** file-based single-node secret until a networked vault (Phase 15).
- **Risks:** low. **Rollback:** set `AUTH_SECRET` env to bypass keyfile.
- **Future Impact:** all token/HMAC signing depends on this provider.
- **Related:** Kernel crypto, Identity. **Status:** Accepted.

## ADR-0006 — Interim ADMIN_TOKEN guard until Auth (Phase 5)
- **Date:** Phase 4
- **Problem:** ops endpoints (metrics/jobs) need protection before Auth exists.
- **Alternatives:** leave open (unsafe); block feature until Phase 5 (slows ops).
- **Decision:** bearer `ADMIN_TOKEN` guard; open in dev when unset.
- **Reason:** minimal safe interim; clearly tracked.
- **Tradeoffs:** not real authz. **Risks:** medium — logged as TD-001.
- **Rollback:** replaced by Auth/Authz guard in Phase 5.
- **Future Impact:** removed when Identity lands.
- **Related:** Infra APIs. **Status:** Accepted (temporary).
