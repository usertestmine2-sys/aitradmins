# AITradeMinds — Master Repository Constitution

> This document is the supreme governance standard for the AITradeMinds Operating
> System. It overrides all default coding habits. Every file, module, service,
> table, API, event, UI page, and worker MUST comply. Ratified during Phase 4.

## 0. Prime Directive
The goal is **not** speed. The goal is an enterprise platform that grows for 10+
years **without architectural redesign**. Quality First · Architecture First ·
Security First · Scalability First · Maintainability First · Production Readiness First.

## 1. Architecture Freeze (Non-Negotiable Singletons)
Exactly **one** of each of the following exists platform-wide. New modules
**consume/extend**; they never fork:

| Concern | Canonical instance | Location |
|---|---|---|
| Event Bus | `eventBus` (+ `attachTransport`) | `src/modules/market_data/core/event-bus.ts` |
| Cache | `cache` (L1 + `attachL2`) | `src/modules/market_data/core/cache.ts` |
| Market Repository | `repository` | `src/modules/market_data/core/repository.ts` |
| Infra Repository | `infraRepository` | `src/modules/infra/repository.ts` |
| Provider Manager | `providerManager` | `src/modules/market_data/providers/provider-manager.ts` |
| Feed Pipeline | `feedPipeline` | `src/modules/market_data/feed/feed-pipeline.ts` |
| Scheduler/Workers | `scheduler` | `src/modules/infra/scheduler.ts` |
| DB Context | `db` | `src/db/index.ts` |
| Config / Logger / Errors / Context / Registry | kernel | `src/kernel/*` |

Enforcement: singletons are pinned via `src/kernel/registry.ts` (`singleton(key, factory)`)
or `globalThis`. **Zero-duplicate detection** is a merge gate.

## 2. Repository Principles
Simple · Predictable · Modular · Reusable · Replaceable · Documented · Testable.
No experimental code in production folders. No duplicated logic/utilities/services/
APIs/business rules.

## 3. Module Folder Contract
A fully-formed module contains as needed: `api, components, hooks, services,
repositories, entities, dto, validators, workers, events, types, constants, utils,
tests, docs, configs, index.ts`. Never mix responsibilities.

## 4. Size & Function Limits
Component <300 · Service <500 · Repository <300 · Worker <400 · Utility <200 lines.
Functions: single responsibility, ≤~80 lines, pure where possible, no hidden side effects.

## 5. Naming
Components/Services `PascalCase` · Interfaces `IName` · Enums `NameEnum` · DB
`snake_case` · Variables `camelCase` · Constants `UPPER_CASE` · Events `domain.action`
· APIs RESTful. No non-standard abbreviations.

## 6. Database
Single source of truth (`src/db/schema.ts`). Migrations only. Every table:
primary key, indexes, FKs, `created_at`/`updated_at` audit timestamps, soft-delete
where appropriate, `tenant_id` where required.

## 7. API
Versioned under `/api/v1/`. GraphQL (future) single endpoint reuses services.
SDK consumes the same APIs. Never duplicate business logic across surfaces.

## 8. Error Handling
Never throw raw errors across boundaries. Return the standardized envelope via
`src/kernel/errors.ts`: `{ ok:false, error, code, details }` with HTTP mapping,
severity, and correlation/trace id from `src/kernel/context.ts`.

## 9. Logging (`src/kernel/logger.ts`)
Structured JSON, levelled, correlation-aware. Log start/success/failure/performance/
warnings. **Never** log secrets, tokens, or passwords (auto-redacted).

## 10. Security
Every endpoint: authentication, authorization, validation, sanitization, rate
limiting, audit, CSRF/CORS policy, encryption in transit/at rest, secrets vault.
No secret in source. (Interim `ADMIN_TOKEN` guard tracked as TD-001 until Phase 5.)

## 11. Performance
Avoid N+1, repeated calculation, blocking I/O, oversized payloads, duplicate calls.
Use caching, pagination, streaming, lazy loading, batch processing.

## 12. UI
Every page: responsive, accessible, dark-mode ready, keyboard friendly, with
loading/error/empty/success/skeleton states. Single source of truth for state;
prefer server state; normalize shared state.

## 13. Testing (target >90% coverage)
Unit, integration, API, UI, regression, performance. Harness: `vitest`
(`src/tests/**`). No module is Production without passing tests.

## 14. Documentation
Every completed module updates: README, Architecture, API Docs, Database Docs,
Developer Guide, Changelog, Examples.

## 15. Git & Dependencies
Small reviewed commits, feature branches, no direct commits to production.
Before adding a package: check existing capability, justify reason/version/security/
license. Prefer platform built-ins.

## 16. Backward Compatibility
Never break public APIs, database, events, SDK, or UI contracts without a migration.

## 17. AI-Generated Code Policy
Before writing: search the repo, reuse existing implementation, never duplicate
architecture, never replace working enterprise code — **always extend**.

## 18. Final Quality Gate (Definition of Done)
Architecture review · Security review · Performance review · Code review · Tests
passing · Docs updated · Migration verified · Rollback strategy exists.
Automated gate sequence: `vitest` → `next typegen` → `tsc --noEmit` →
`npm run build` → schema migration → `build_and_start`.
