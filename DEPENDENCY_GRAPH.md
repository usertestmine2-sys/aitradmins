# Dependency Graph

This document details the architectural layers and dependency relationships within the **AITradeMinds Operating System** codebase as of the `RECOVERY_BASELINE_v1` tag.

---

## High-Level Layer Architecture

```
                  ┌─────────────────────────────────────────┐
                  │          Client UI & App Shell          │ (Next.js Pages, Components,
                  │     (app/dashboard, login, register)   │  AppShell, CandleChart, charts)
                  └────────────────────┬────────────────────┘
                                       │ (HTTP REST / SSE)
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │             Next.js API Routes          │
                  │              (app/api/v1/*)             │
                  └────────────────────┬────────────────────┘
                                       │ (Service Calls)
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │         Domain Modules & Services       │ (13 Modules: brain, trading,
                  │              (src/modules/*)            │  portfolio, broker, etc.)
                  └───────┬─────────────────────────┬───────┘
                          │                         │
                          ▼ (Database Access)       ▼ (Subsystem Execution)
                  ┌──────────────┐           ┌──────────────┐
                  │  Drizzle DB  │           │   Core Libs  │ (src/lib/brain, src/lib/ops,
                  │  (src/db/*)  │           │  (src/lib/*) │  src/lib/events, src/lib/exec)
                  └───────┬──────┘           └───────┬──────┘
                          │                          │
                          └────────────┬─────────────┘
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │             System Kernel               │ (Global registries, contexts,
                  │             (src/kernel/*)              │  config loaders, custom logger)
                  └─────────────────────────────────────────┘
```

---

## External Package Dependencies

Our `package.json` organizes external libraries into three specialized tiers:

1. **Framework & Engine Core**:
   * `next (16.2.6)` and `react (19.2.6)` / `react-dom (19.2.6)` power the App Router engine, layout system, SSR, and component lifecycle.
2. **Database & Schema Validation**:
   * `drizzle-orm (0.45.2)` provides type-safe SQL query building.
   * `pg (8.20.0)` and `postgres (3.4.9)` handle low-level connection pooling and query transmission to the PostgreSQL database.
   * `zod (4.4.3)` defines runtime data validations and strict typing contracts for API requests.
3. **Data Visualization & UI Shell**:
   * `recharts (3.9.2)` plots trading indicators, asset performance, and live operations charts.
   * `lucide-react (1.23.0)` delivers standardized, lightweight visual indicators.
   * `sonner (2.0.7)` handles toast notifications.
   * `clsx` and `tailwind-merge` compose dynamic Tailwind styles seamlessly.
4. **Testing Infrastructure**:
   * `vitest (4.1.9)` is the test runner verifying module stability and regression protection.

---

## Internal Dependency Pathways

### 1. The Foundation Tier: Kernel (`src/kernel`)
The `src/kernel` has **zero** upward dependencies. Every other directory in the codebase depends on the kernel for operational resources:
* **`config.ts`**: Loads environmental configurations safely.
* **`logger.ts`**: Unified system-wide logging with contextual tags.
* **`errors.ts`**: Defines standard error domains (e.g., `AppError`, `ValidationError`).
* **`registry.ts`**: Centralized Dependency Injection (DI) registry for microservices.

### 2. Database & Data Models (`src/db`)
* **`src/db/index.ts`** imports the connection parameters from `src/kernel/config`.
* **`src/db/schema.ts`** represents the source of truth for table schemas (users, portfolios, trades, training models).
* Relational repositories inside the domain modules (`src/modules/*/repository.ts`) depend directly on `src/db/schema.ts` and `src/db/index.ts` to perform database queries.

### 3. Business Modules Inter-dependencies (`src/modules/*`)
Domain boundaries are enforced, but modules coordinate through well-defined service interfaces:
* **`platform` (Command Center)**: Orchestrates status consolidation by consuming:
  * `analyticsService` (module analytics)
  * `brain` (intelligence status)
  * `broker` (active brokerage adapters)
* **`trading` (OMS/RMS)**: Coordinates trade executions by reading and modifying:
  * `portfolio` (ledger, positions, active capital)
  * `broker` (routes trades to live or paper-trading adapters)
* **`portfolio_intel`**: Calculates weights, optimization targets, and risk budgets by calling:
  * `portfolio` (to retrieve current holdings and cash reserves)
* **`training`**: Aggregates dataset profiles to feed into:
  * `brain` (reinforcement learning and twin calibrations)

### 4. Event Bus & Real-time Broadcasts (`src/lib/events`, `src/lib/ops`)
* **`src/lib/events/bus.ts`**: Decouples module coordination. Modules publish domain events (e.g., `ORDER_EXECUTED`, `MODEL_TRAINED`), and other modules (such as `analytics` and `portfolio`) subscribe to update records asynchronously.
* **`src/lib/ops/realtime.ts`**: Provides the Server-Sent Events (SSE) bridge. It listens to the event bus and streams real-time updates directly to `/api/v1/ops/stream` consumed by the active operations dashboards.
