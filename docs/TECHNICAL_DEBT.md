# Technical Debt Register

Per the Constitution (§18), every shortcut is tracked. Nothing is hidden.

| ID | Description | Reason | Priority | Risk | Est. Effort | Owner | Resolves In |
|----|-------------|--------|----------|------|-------------|-------|-------------|
| TD-001 | Admin realtime endpoints used an interim `ADMIN_TOKEN` bearer guard instead of full Auth/Authz. | Auth module not yet built. | High | Medium. | S | Platform | **✅ RESOLVED (Phase 5):** `assertAdmin` now enforces RBAC (`admin` role via session/API-key) first; `ADMIN_TOKEN` retained only as ops/bootstrap fallback. Verified: admin→200, non-admin→403. |
| TD-002 | Distributed Event Bus transport (Redis Streams) and L2 Cache tier (Redis) are interface-only; in-process mode is active. | Redis not yet provisioned; in-proc is the frozen graceful-degradation default. | Medium | Low — single-process only; horizontal scaling blocked until resolved. | M | Platform | Phase 4 completion (Redis rollout) |
| TD-003 | Market data providers emit deterministic synthetic quotes/candles; real broker/exchange transports not connected. | External broker credentials/API access pending. | Medium | Low (functional) — not production market data. | XL | Data | Phase 12 (Broker Integration) |
| TD-004 | Schema applied via `drizzle-kit push`; no versioned migration history yet. | Rapid early iteration. | Medium | Medium — drift/rollback risk. | S | DB | Phase 6 (Hardening) |
| TD-005 | Test coverage below the >90% Constitution target (kernel + cache tier covered; engines not yet). | Foundation-first build order. | Medium | Medium — regression risk in engines. | L | QA | Continuous from Phase 6 |
| TD-007 | Analytics export limited to JSON/CSV; visualization dashboards now built (v0.9.1). | Frontend follow-up. | Low | Low — PDF/Excel export still pending. | S | Analytics | **PARTIALLY RESOLVED (v0.9.1):** 11 dashboards + SVG viz shipped; PDF/Excel export remains. |
| TD-006 | Legacy `md_*` tables do not yet carry the Universal Table Standard (`created_by`, `version`, `deleted_at`, `tenant_id`) nor `idx_/uq_/fk_` naming. | Predate the data-governance standard (defined this turn). | Medium | Low — additive columns; no data loss. | M | DB | Phase 6 / Phase 9 |

## Policy
- New shortcuts MUST be added here in the same change that introduces them.
- No item is deleted — resolved items are marked and dated in the Changelog.
