# AITradeMinds — Enterprise SDLC & Delivery Governance

> The mandatory software development lifecycle for AITradeMinds. Nothing reaches
> production without traversing every stage. Companion to
> [CONSTITUTION.md](./CONSTITUTION.md), [PROJECT_BRAIN.md](./PROJECT_BRAIN.md),
> [RELEASE_MANAGEMENT.md](./RELEASE_MANAGEMENT.md).

## 1. The 18-Stage Lifecycle (no stage skipped)
| # | Stage | Gate / Evidence |
|---|-------|-----------------|
| 1 | Idea | Feature ID created in Feature Ledger |
| 2 | Business Analysis | Business goal, users, value recorded |
| 3 | Architecture Review | ERB architecture pass; ADR if decision made |
| 4 | Technical Design | Module Execution Template (Constitution §MET) |
| 5 | Dependency Validation | All deps exist & complete; else build dep first |
| 6 | Implementation | Extend-only; singletons reused |
| 7 | Unit Testing | `vitest` unit tests added |
| 8 | Integration Testing | cross-module tests (Redis/PG via testcontainers) |
| 9 | Performance Testing | latency/throughput targets met |
| 10 | Security Review | authz, validation, secrets, audit verified |
| 11 | QA Approval | ERB Quality Gate ≥85 for the milestone |
| 12 | Documentation | README/ARCH/API/DB/Changelog updated |
| 13 | Release Candidate | tagged RC; release notes drafted |
| 14 | Staging Deployment | `build_and_start` staging smoke |
| 15 | Production Deployment | promote artifact; rollback ready |
| 16 | Post-Release Monitoring | metrics/health/audit watched |
| 17 | Maintenance | bug/debt triage |
| 18 | Continuous Improvement | feed learnings back to Project Brain |

## 2. Quality Gates (all must pass before release)
Build ✓ · Architecture ✓ · Testing ≥90% · Security ✓ · Performance ✓ ·
Documentation updated ✓ · Compliance ✓. Automated sequence:
`vitest → next typegen → tsc --noEmit → npm run build → drizzle-kit push → build_and_start`.

## 3. Change Management (required for every change)
Reason · Risk · Impact · Affected Modules · Migration Plan · Rollback Plan · Approval.
Recorded in the build record and reflected in REGISTRIES + Project Brain dashboard.

## 4. Deployment Pipeline (target)
Developer Build → CI Validation → Static Analysis → Unit → Integration → Security
Scan → Performance → Artifact Build → Staging → Smoke → Production → Monitoring →
Rollback-Ready. Current state: `build_and_start` covers build+staging+smoke; full
CI/CD is roadmap Phase 12/15 (tracked, TD-DevOps).

## 5. Rollback Policy (every release ships with)
Rollback script · Database rollback (down-migration) · API rollback (versioned) ·
Configuration rollback · Deployment rollback (blue-green/canary — Phase 15).

## 6. Bug Management
Every bug records: Severity · Priority · Root Cause · Affected Modules ·
Regression Test · Resolution · Release Version. Logged in REGISTRIES §Bug.

## 7. Post-Release Review
Evaluate: architecture stability, performance, security, reliability, latency,
(later) AI accuracy, trading accuracy. Outcomes update the Project Brain dashboard.

## 8. Branch Strategy
`main` (protected) · `develop` · `release/*` · `feature/*` · `hotfix/*` ·
`experiment/*`. No direct commits to `main`. Every merge: reviewed, tested, documented.
