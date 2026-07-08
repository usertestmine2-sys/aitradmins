# File Tree

This document provides a complete, structured directory tree of the **AITradeMinds Operating System** workspace as of the `RECOVERY_BASELINE_v1` tag.

## Directory Structure Overview

```
.
├── ADR.md
├── CHANGELOG.md
├── DEPLOYMENT_CHECKLIST.md
├── DUPLICATE_REPORT.md
├── MASTER_AUDIT.md
├── PROJECT_COMPLETENESS.md
├── README.md
├── RECOVERY_PLAN.md
├── assets/
├── dist/
├── docs/
│   ├── ADR.md
│   ├── ARCHITECTURE.md
│   ├── CONSTITUTION.md
│   ├── DATABASE_ARCHITECTURE.md
│   ├── IMPLEMENTATION_ROADMAP.md
│   ├── PROJECT_BRAIN.md
│   ├── REGISTRIES.md
│   ├── RELEASE_MANAGEMENT.md
│   ├── RELEASE_NOTES.md
│   ├── SDLC.md
│   └── TECHNICAL_DEBT.md
├── duplicates_data.json
├── forensic_reconstruct.py
├── generate_reports.py
├── package.json
├── package-lock.json
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── analytics/
│   │   │       ├── auth/
│   │   │       ├── brain/
│   │   │       ├── broker/
│   │   │       ├── execution/
│   │   │       ├── identity/
│   │   │       ├── market/
│   │   │       ├── metrics/
│   │   │       ├── models/
│   │   │       ├── optimizer/
│   │   │       ├── orders/
│   │   │       ├── orgs/
│   │   │       ├── paper/
│   │   │       ├── platform/
│   │   │       ├── portfolio/
│   │   │       ├── positions/
│   │   │       ├── realtime/
│   │   │       ├── rebalance/
│   │   │       ├── reports/
│   │   │       ├── research/
│   │   │       ├── risk/
│   │   │       ├── training/
│   │   │       └── users/
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── lib/
│   │   │   ├── api-client.ts
│   │   │   └── auth-context.tsx
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── market/
│   │   │   └── page.tsx
│   │   ├── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── components/
│   │   ├── AppShell.tsx
│   │   ├── CandleChart.tsx
│   │   ├── Dashboard.tsx
│   │   ├── charts.tsx
│   │   ├── ops/
│   │   │   ├── ops-console.tsx
│   │   │   └── ui-telemetry.tsx
│   │   └── ui.tsx
│   ├── db/
│   │   ├── index.ts
│   │   └── schema.ts
│   ├── instrumentation.ts
│   ├── kernel/
│   │   ├── config.ts
│   │   ├── context.ts
│   │   ├── crypto.ts
│   │   ├── errors.ts
│   │   ├── index.ts
│   │   ├── logger.ts
│   │   └── registry.ts
│   ├── lib/
│   │   ├── brain/
│   │   │   ├── society/
│   │   │   └── ...
│   │   ├── control-plane/
│   │   ├── events/
│   │   ├── execution/
│   │   ├── ops/
│   │   └── utils.ts
│   ├── modules/
│   │   ├── analytics/
│   │   ├── brain/
│   │   ├── broker/
│   │   ├── execution/
│   │   ├── identity/
│   │   ├── infra/
│   │   ├── market_data/
│   │   ├── platform/
│   │   ├── portfolio/
│   │   ├── portfolio_intel/
│   │   ├── security/
│   │   ├── trading/
│   │   └── training/
│   └── tests/
│       └── ... (17 unit & integration tests)
└── supabase/
    └── migrations/
        └── 000001_initial_schema.sql
```

## Folder Descriptions

### 1. Root Configurations & Assets
* **Root Folder (`/`)**: Contains project metadata, dependency declarations (`package.json`, `package-lock.json`), build and test configurations (`tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `vitest.config.ts`), and forensic reporting/reconstruction scripts (`forensic_reconstruct.py`, `generate_reports.py`).
* **`docs/`**: Holds high-level conceptual, architectural, and lifecycle documentation files covering Database Architecture, Release Management, Technical Debt, and more.
* **`supabase/`**: Contains database migration SQL scripts defining the PostgreSQL relational schema (`supabase/migrations/000001_initial_schema.sql`).

### 2. Application Core (`src/`)
* **`src/kernel/`**: Represents the platform's foundation layer. It provides system-wide configuration loaders, custom context management, error categorization, cryptographic utilities, logging bridges, and the global dependency registry.
* **`src/db/`**: Handles relational database access. `schema.ts` lists all PostgreSQL/Drizzle table schemas, and `index.ts` instantiates the Drizzle query client using `postgres` and environment connections.
* **`src/app/`**: Next.js App Router root.
  * **`src/app/api/`**: The complete backend server. Organizes RESTful route endpoints by domain under `/api/v1/*`.
  * **`src/app/dashboard/`**, **`src/app/market/`**, **`src/app/login/`**, **`src/app/register/`**: Client-side app views.
  * **`src/app/lib/`**: Contains shared Next.js client-side configurations including API clients and the global `auth-context` provider.
* **`src/components/`**: Houses reusable React UI elements.
  * **`src/components/ops/`**: Includes real-time operations console panels and telemetry dashboards.
  * **`src/components/ui.tsx`**, **`src/components/charts.tsx`**: Underlying generic layout wrappers, button styles, and recharts plotting sheets.
* **`src/lib/`**: Subsystem state managers, utility libraries, and background process architectures.
  * **`src/lib/brain/`**: Logic engines for intelligence formulas, knowledge graphs, decision reasoning, and neural rankers. Includes `society/` which models agent coordination consensus.
  * **`src/lib/control-plane/`**: Low-level environment and configuration readers.
  * **`src/lib/events/`**: Implements the global audit store and memory event bus.
  * **`src/lib/execution/`**: Trade order processing pipelines.
  * **`src/lib/ops/`**: Realtime monitoring hubs, probes, and SSE streams.
* **`src/modules/`**: Modular architecture containing the business logic layer. Each domain module encapsulates its bootstrap script, domain service, database repository, types, and supporting utilities.
* **`src/tests/`**: Comprehensive Vitest suite validating the correctness of each subsystem and business module under realistic scenarios.
