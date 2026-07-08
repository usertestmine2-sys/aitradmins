# Project Statistics

This document lists precise source code, database schema, and documentation metrics for the **AITradeMinds Operating System** workspace, recorded at the `RECOVERY_BASELINE_v1` tag.

---

## 1. High-Level Summary

| Metric | Count | Details / Notes |
| :--- | :--- | :--- |
| **Total Files in `/src`** | **281** | Production & test source files |
| **Total Source Lines of Code** | **26,586** | TS, TSX, and CSS inside `/src` |
| **Production Files** | **264** | Core system directories (excluding `tests`) |
| **Production Lines of Code** | **25,920** | Total production logic lines |
| **Test Files** | **17** | Complete integration test suite inside `src/tests` |
| **Test Lines of Code** | **666** | Test specifications and assertions |
| **API Endpoints** | **68** | Direct HTTP v1 API routes under `src/app/api/v1/*` |
| **Database Migrations** | **1 file (107 lines)** | PostgreSQL database definition schema |
| **Documentation Files** | **21 files (2,377 lines)** | System specifications, ADRs, architectures (pre-analysis) |

---

## 2. Source Code Composition (by Language)

| Language / Extension | File Count | Line Count | Percentage of Source Lines |
| :--- | :--- | :--- | :--- |
| **TypeScript (`.ts`)** | 265 | 23,889 | 89.85% |
| **React TSX (`.tsx`)** | 15 | 2,678 | 10.07% |
| **Global Style (`.css`)** | 1 | 19 | 0.08% |
| **Total** | **281** | **26,586** | **100.00%** |

---

## 3. Directory Breakdown (inside `/src`)

| Subdirectory | Files | Lines of Code | Description of Scope |
| :--- | :--- | :--- | :--- |
| `src/app` | 108 | 4,788 | Next.js Page components, Auth contextual flows, Client routing, and 68 RESTful API endpoint handlers under `/api/v1/*`. |
| `src/components` | 7 | 1,324 | Reusable React UI frames, charts dashboards, real-time ops terminals, and system alerts overlays. |
| `src/db` | 2 | 1,523 | Relational Drizzle ORM mappings, Postgres connection client configurations, and central table schemas. |
| `src/kernel` | 7 | 336 | Essential boilerplate including Error structures, DI system registers, central logging, and system-wide configurations. |
| `src/lib` | 32 | 7,297 | State management helper architectures including trade execution workflows, event broadcasting, and AI coordination systems. |
| `src/modules` | 107 | 10,638 | Enterprise business logic tier. Contains 13 specialized service domains. |
| `src/tests` | 17 | 666 | Vitest regression test suite covering authentication, risk models, execution, and brain routines. |
| `src/instrumentation.ts` | 1 | 14 | Next.js application instrumentation entry point for performance profiling and observability. |
| **Total** | **281** | **26,586** | **Unified Core** |

---

## 4. Documentation & Schema Metrics

* **`docs/` Folder**:
  * **File Count**: 11 files
  * **Line Count**: 1,340 lines of markdown
  * **Topics Covered**: ADRs, Architecture, Constitution, Database, Implementation Roadmap, Release Management, Technical Debt, SDLC, Release Notes.
* **Root Markdown Documents**:
  * **File Count**: 10 files (pre-analysis baseline)
  * **Line Count**: 1,037 lines of markdown
  * **Includes**: README, CHANGELOG, ADR, DEPLOYMENT_CHECKLIST, MASTER_AUDIT, DUPLICATE_REPORT, RECOVERY_PLAN, etc.
* **Supabase SQL Schema**:
  * **File Count**: 1 migration script (`000001_initial_schema.sql`)
  * **Line Count**: 107 lines of pure PostgreSQL schema definitions.
