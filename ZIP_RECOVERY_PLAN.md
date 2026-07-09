# ZIP RECOVERY PLAN: FORENSIC ALIGNMENT STRATEGY

## Recovery Methodology
To recover the AITradeMinds Operating System (AAOS) to v1.0.0 production standard without causing any regressions or overwriting active code, we established a strict multi-tier recovery pipeline:

1. **Information Inventory & Scan:** Recursively catalog all files across the 6 historical zip directories, compute SHA256 hashes, sizes, and line counts.
2. **Path Normalization:** Map paths of all candidates, peeling off directory wrappers (e.g., `AITradeMinds_v1.0.0/` or `AITradeMinds_v1.0.0_Final/`) to map them to the unified repository structure.
3. **Forensic Classification:** Label every file candidate based on its status:
   - `NEW`: Exists in ZIP, absent in boilerplate workspace.
   - `UPDATED`: Existing file with more advanced production logic in ZIP.
   - `MERGED`: File combined from multiple candidates (e.g., package.json dependencies and scripts).
   - `SKIPPED`: Obsolete code, mocks, examples, or broker-api secrets.
   - `DUPLICATE`: Redundant copies de-duplicated.
   - `OBSOLETE`: Historical backups or deprecated scripts.
4. **Boilerplate Cleaning:** Erase any generic next-app boilerplate files that conflict with AITradeMinds' structural layout.
5. **Conflict Resolution & Line-by-Line Merging:** For key files, sort candidates by line count, completeness of business logic, and error-handling strength to select the gold standard version.

---

## File Classification Summary
During the recovery process, files were classified as follows:

- **MERGED:**
  - `package.json`: Consolidated dependencies and devDependencies from all 8 candidate package files.
  - `package-lock.json`: Unified locking trees.
- **NEW / RECOVERED (Production-Quality):**
  - **13 Core Modules:** Reconstructed under `src/modules/*` containing OMS, RMS, Portfolio Ledger, Execution Journal, Market Data, AI Brain, Memory, Knowledge Graph, consensus models, Strategy Engine, Scheduler, and Reports.
  - **UI Shell & Pages:** Certified `Dashboard.tsx`, `AppShell.tsx`, and App Router layouts.
  - **Testing Infrastructure:** 18 distinct test suites under `src/tests/*` using Vitest.
  - **Database Config:** `src/db/index.ts` and `supabase/migrations/*`.
- **SKIPPED (Forbidden / Mock / Non-Core):**
  - Live Broker accounts or broker credential files (Rule #3, forbidden Live Exchange Integration).
  - Outdated mock sandbox scripts.
  - Cryptographic key mocks or dummy payment APIs.
- **DUPLICATE (Consolidated):**
  - Over **405 redundant files** across multiple ZIP folder wrappers de-duplicated and resolved using SHA256 matches.

---

## Post-Recovery Verification Pipeline
The final phase of the recovery requires strict validation checks to guarantee workspace health:
1. **Linter Verification:** Run `npm run lint` (ESLint) to ensure zero syntax and framework-specific issues (e.g. Next.js Link rules).
2. **Typecheck Validation:** Run `npm run typecheck` (`tsc --noEmit`) to verify strict type-safety across all 68 schema tables and 13 modules.
3. **Unit & Integration Tests:** Execute `npm run test` (`vitest run`) to confirm that all 18 test suites pass successfully.
4. **Production Build:** Execute `npm run build` (`next build`) to ensure that Next.js successfully compiles the static chunks and server-side routes on React 19.

