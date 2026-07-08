# AITradeMinds Operating System

An institutional-grade **AI Trading Operating System** — the fusion of a market-data
terminal, quant/backtest engine, execution stack (OMS/RMS), AI signal brain, and a
multi-tenant SaaS platform. Built on Next.js (App Router) + PostgreSQL (Drizzle ORM),
governed by the [Master Repository Constitution](./docs/CONSTITUTION.md).

> **Architecture is FROZEN.** All work extends the existing singletons — never
> duplicates them. See [ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## Status

| Layer | Module | State |
|---|---|---|
| Foundation | Kernel (config, logger, context, errors, registry) | ✅ Phase 4 |
| Infrastructure | Event Bus (transport hook), Cache (L2 hook), Scheduler/Workers, Infra Repository | ✅ Phase 4 |
| Market Intelligence | Market Data platform (13 engines, 7 tables, 18 routes) | ✅ Phase 3.1 |
| Realtime | `/api/v1/realtime/{health,metrics,jobs}`, Redis transport/L2 seams | 🔶 Beta (in-proc) |
| Identity, Trading, AI, Enterprise | Auth, Portfolio, OMS/RMS, Strategy, AI Brain, … | ⏳ Roadmap |

Overall platform completion vs v1.0: **~26%**. See [CHANGELOG.md](./CHANGELOG.md).

## Tech Stack
- **Framework:** Next.js 16 (App Router, Turbopack), React 19, TypeScript (strict)
- **Database:** PostgreSQL via Drizzle ORM (single `db` client, `src/db`)
- **Realtime:** in-process Event Bus + two-tier Cache (Redis-ready seams)
- **Validation:** zod · **Tests:** vitest · **Styling:** Tailwind CSS

## Getting Started
```bash
npm install
# .env must define DATABASE_URL (see .env)
npx drizzle-kit push          # apply schema
npm run build && npm run start # production
npx vitest run                # tests
```

## Key Endpoints
- `GET /api/health` — liveness
- `GET /api/v1/realtime/health` — deep health (db, bus, cache, scheduler)
- `GET /api/v1/realtime/metrics` — Prometheus metrics (admin)
- `POST /api/v1/realtime/jobs` — scheduler control (admin)
- `GET /api/v1/market/overview` — market intelligence snapshot
- Full market surface under `/api/v1/market/*`

## Documentation
- [**Project Brain**](./docs/PROJECT_BRAIN.md) — persistent memory, dashboard, module status (READ FIRST)
- [Registries](./docs/REGISTRIES.md) — module/DB/API/event/worker/security registries
- [ADR](./docs/ADR.md) — architecture decision record (append-only)
- [Implementation Roadmap](./docs/IMPLEMENTATION_ROADMAP.md) — permanent execution plan (modules, phases, sprints, evolution)
- [Constitution](./docs/CONSTITUTION.md) — governance & standards
- [SDLC](./docs/SDLC.md) — 18-stage delivery lifecycle & quality gates
- [Release Management](./docs/RELEASE_MANAGEMENT.md) — version policy & release ledger
- [Release Notes](./docs/RELEASE_NOTES.md)
- [Architecture](./docs/ARCHITECTURE.md) — layers, singletons, data/event flow
- [Database Architecture](./docs/DATABASE_ARCHITECTURE.md) — storage layers, table standards, partitioning, retention, DR
- [Technical Debt Register](./docs/TECHNICAL_DEBT.md)
- [Changelog](./CHANGELOG.md)

**Current version:** `0.2.0-beta` (Internal Beta) — path to `1.0.0` via Phases 5–6.

## License
Proprietary — AITradeMinds. All rights reserved.
