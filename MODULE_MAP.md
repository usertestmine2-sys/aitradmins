# Module Map

This document catalogs the 13 domain modules inside the **AITradeMinds Operating System** `src/modules` directory, detailing their core responsibilities, primary files, and integration boundaries.

---

## The 13 Domain Modules

### 1. `identity` (Identity & Tenant Management)
* **Primary Files**: `auth-service.ts`, `org-service.ts`, `guard.ts`, `repository.ts`, `bootstrap.ts`
* **Role**: L3 layer boundary. Controls user authentication, token verification, tenant/organization segregation, and session guards.
* **Responsibilities**:
  * Managing tenant structures, memberships, and permissions.
  * Securing HTTP routes against unauthenticated tokens.

### 2. `security` (System Safety & Verification)
* **Primary Files**: `rate-limit.ts`, `validation.ts`, `index.ts`
* **Role**: Platform guardian. Prevents abuse, sanitizes request formats, and protects backend engines.
* **Responsibilities**:
  * Executing IP and client rate-limiting algorithms.
  * Performing strict Zod schema validation on dynamic request payloads.

### 3. `infra` (Infrastructure Runtimes)
* **Primary Files**: `scheduler.ts`, `http-guard.ts`, `repository.ts`, `bootstrap.ts`
* **Role**: Background execution loop. Connects internal schedulers to storage.
* **Responsibilities**:
  * Coordinating background cron routines and task triggers.
  * Handling system probe logs, dead-letter job queues, and recovery flags.

### 4. `market_data` (Financial Feed Pipeline)
* **Primary Files**: `providers/provider-manager.ts`, `feed/feed-pipeline.ts`, `session/session.ts`, `indicators/indicators.ts`, `core/cache.ts`, `services/*` (news, scanner, historical, etc.)
* **Role**: L4 Market Intelligence core. Ingests raw ticking data, validates it, and generates technical indicators.
* **Responsibilities**:
  * Orchestrating multiple feed provider failovers.
  * Performing high-throughput technical analysis computations (moving averages, bands).
  * Buffering active sessions, corporate events, option chains, and symbol masters.

### 5. `broker` (Exchange Interface)
* **Primary Files**: `adapters.ts`, `health-monitor.ts`, `manager.ts`, `registry.ts`, `state-machine.ts`
* **Role**: Connection gateway. Standardizes protocols to various exchanges and external broker accounts.
* **Responsibilities**:
  * Translating unified orders into broker-specific protocols.
  * Managing a strict broker status state-machine (Connected, Disconnected, Reconnecting).
  * Actively monitoring connection latency and broker API status.

### 6. `trading` (Order & Risk Management)
* **Primary Files**: `oms.ts`, `rms.ts`, `paper-engine.ts`, `execution-quality.ts`, `portfolio.ts`
* **Role**: L5 Trading Intelligence core. Manages execution rules and risk checks.
* **Responsibilities**:
  * **Order Management System (OMS)**: Coordinates order lifecycles (Submit, Fill, Cancel).
  * **Risk Management System (RMS)**: Validates limits before trade dispatch (drawdown, max size).
  * **Paper Trading Engine**: Simulates execution fills using active order-book ticks.

### 7. `portfolio` (Asset Ledger & Bookkeeping)
* **Primary Files**: `capital.ts`, `ledger.ts`, `performance.ts`, `snapshot-engine.ts`
* **Role**: System bookkeeper. Records the absolute cash and position state of all accounts.
* **Responsibilities**:
  * Tracking current cash balances, allocated leverage, and asset holdings.
  * Keeping audit-compliant bookkeeping journals (double-entry ledger logs).
  * Aggregating historical returns and performance metrics.

### 8. `portfolio_intel` (Sizing & Optimization)
* **Primary Files**: `optimizer.ts`, `risk-budget.ts`, `sizing.ts`, `portfolio-intelligence.ts`
* **Role**: L6 Strategy Engine. Optimizes structural distributions of capital.
* **Responsibilities**:
  * Allocating risk-budget weights across diverse target symbols.
  * Dynamically adjusting trade sizing based on volatility (Kelly Criterion, VaR).
  * Computing optimal rebalancing actions for live positions.

### 9. `execution` (Trade Audit & Fulfilment)
* **Primary Files**: `journal.ts`, `metrics.ts`, `quality-tracker.ts`, `replay.ts`, `timeline.ts`
* **Role**: Post-trade auditing. Evaluates execution execution quality and metrics.
* **Responsibilities**:
  * Cataloging detailed order execution timelines (slippage, execution delay).
  * Generating performance reviews comparing fill price with order arrival price.
  * Archiving order-replaying data sets for forensic simulations.

### 10. `brain` (Decision Cognitive Loop)
* **Primary Files**: `brain.ts`, `ai-society.ts`, `consensus.ts`, `digital-twin.ts`, `health.ts`, `reputation.ts`, `self-review.ts`
* **Role**: L7 AI Intelligence brain. Controls multi-agent consensus and cognitive evaluations.
* **Responsibilities**:
  * Modeling the Multi-Agent "AI Society" where agents debate market conditions.
  * Consolidating opinions via consensus protocols to yield trade signals.
  * Running digital twin back-simulations of target broker strategies.
  * Awarding reputation points to high-performing sub-agents.

### 11. `training` (MLOps & Model Upkeeps)
* **Primary Files**: `dataset-builder.ts`, `trainer.ts`, `learning-engine.ts`, `model.ts`
* **Role**: Reinforcement Learning back-end. Keeps system decision algorithms updated.
* **Responsibilities**:
  * Compiling market DNA structures into clean ML datasets.
  * Managing model iteration pipelines and active weights.
  * Validating agent intelligence progress under the Trainer subsystem.

### 12. `analytics` (Insight Aggregation)
* **Primary Files**: `service.ts`, `report-generator.ts`, `repository.ts`, `bootstrap.ts`
* **Role**: Operational reporter. Converts raw execution histories into insights.
* **Responsibilities**:
  * Assembling unified dashboard states (brain health score, session charts, market trends).
  * Exporting formal executive reports and training logs.

### 13. `platform` (System Supervisor)
* **Primary Files**: `command-center.ts`, `health-engine.ts`, `supervisor.ts`, `pipeline.ts`
* **Role**: System nervous system. Interlinks all modules and aggregates diagnostics.
* **Responsibilities**:
  * Supplying consolidated metrics directly to the Command Center.
  * Monitoring active module supervisor loops and service health gates.
  * Triggering platform self-healing policies during database or network failures.
