# AITradeMinds — Release Management & Version Policy

> Authoritative version scheme, release types, and the release ledger. Version is
> tracked here (source of truth) and mirrored in [../CHANGELOG.md](../CHANGELOG.md).
> Companion to [SDLC.md](./SDLC.md).

## 1. Versioning (Semantic Versioning)
`MAJOR.MINOR.PATCH` with pre-release channels.
- **MAJOR** — breaking change to a public API / DB / event / SDK / UI contract
  (requires migration + ADR).
- **MINOR** — backward-compatible new module/feature (extend-only).
- **PATCH** — backward-compatible fix.
- **HOTFIX** — emergency patch off `main` for a production incident.
- Pre-release channels: `-alpha`, `-beta`, `-rc`.
- **LTS** — a MINOR line designated for long-term support.

## 2. Release Types
Internal · Developer Preview · Alpha · Closed Beta · Open Beta · Release Candidate
· Production · Hotfix · Emergency Patch · LTS.

## 3. Release Readiness Checklist (per release)
- [ ] All SDLC stages traversed for included features
- [ ] Quality Gates green (build/arch/tests≥90/security/perf/docs/compliance)
- [ ] No critical bugs · No critical technical debt
- [ ] Rollback plan (script + down-migration + config) prepared
- [ ] Release notes generated (features/improvements/fixes/breaking/migration/known-issues)
- [ ] Post-release monitoring plan defined

## 4. Release Ledger
| Version | Channel | Scope | ERB Verdict | Notes |
|---|---|---|---|---|
| 0.1.0-beta | Internal Beta | Phase 3.1 Market Data platform (13 engines, 7 tables, 18 APIs) | Production Candidate (module) | Synthetic providers (TD-003) |
| 0.2.0-beta | Internal Beta | Phase 4 Kernel + Realtime Infra seams (bus transport, cache L2, scheduler, 3 realtime APIs, 3 rt_* tables) | **APPROVED at Beta milestone** | In-proc mode; Redis seams (TD-002); admin guard (TD-001) |
| 0.2.x | — | Governance: Constitution, Project Brain, Registries, ADR, SDLC | n/a (docs) | No code impact |

**Current version: `0.2.0-beta` (Internal Beta).**
**Path to `1.0.0` (Production):** Phases 5–6 clear the ERB production blockers
(Security, Testing≥90%, API validation, migrations, compliance foundation).

## 5. Roadmap Snapshot
- **Completed:** v0.1.0-beta (Market Data), v0.2.0-beta (Foundation/Realtime).
- **Current sprint:** Governance ratification (this release); next = Phase 5 Identity & Access.
- **Next sprint:** Phase 5 (Auth/Authz + API validation) → retires TD-001, lifts Security/API gates.
- **Future releases:** Phases 6–16 → v1.0 … v10.0 (see ARCHITECTURE.md, CHANGELOG.md).
- **Long-term vision:** institutional AI Trading OS (funds/banks/exchanges/retail).

## 6. Post-Release Review Template
Architecture stability · Performance · Security · Reliability · Latency ·
User feedback · Crash reports · (later) AI accuracy · Trading accuracy → recorded
in Project Brain dashboard after each release.
