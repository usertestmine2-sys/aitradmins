# ZIP RECOVERY AUDIT: DE-DUPLICATION & VERIFICATION MATRIX

## Forensic De-Duplication Ledger
The following ledger documents every de-duplicated file candidate, its SHA256 signature, the chosen target, and the precise reasoning behind the choice.

---

## Major De-Duplicated Components

### Component: `.env.example`
- **Overlapping Copies Found:** 4
- **Chosen Candidate Path:** `./temp_extracted/aaos-final-enterprise-certification_option_B/.env.example`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** Unified sample environment config showing all necessary credentials for PostgreSQL, Drizzle, and AI keys.

### Component: `.gitignore`
- **Overlapping Copies Found:** 6
- **Chosen Candidate Path:** `./temp_extracted/aaos-final-enterprise-certification_option_A/.gitignore`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** Selected the largest, most syntactically complete implementation (257 bytes) among the 3 distinct versions found.

### Component: `CHANGELOG.md`
- **Overlapping Copies Found:** 6
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/CHANGELOG.md`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** Selected the largest, most syntactically complete implementation (30570 bytes) among the 3 distinct versions found.

### Component: `LICENSE`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aaos-final-enterprise-certification_option_A/LICENSE`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `PROJECT_COMPLETENESS.md`
- **Overlapping Copies Found:** 3
- **Chosen Candidate Path:** `./temp_extracted/aaos-final-enterprise-certification_option_A/PROJECT_COMPLETENESS.md`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** Selected the largest, most syntactically complete implementation (8121 bytes) among the 2 distinct versions found.

### Component: `README.md`
- **Overlapping Copies Found:** 6
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/README.md`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** Selected the largest, most syntactically complete implementation (3173 bytes) among the 3 distinct versions found.

### Component: `RECOVERY_PLAN.md`
- **Overlapping Copies Found:** 3
- **Chosen Candidate Path:** `./temp_extracted/aaos-final-enterprise-certification_option_A/RECOVERY_PLAN.md`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** Selected the largest, most syntactically complete implementation (5945 bytes) among the 2 distinct versions found.

### Component: `drizzle.config.json`
- **Overlapping Copies Found:** 8
- **Chosen Candidate Path:** `./temp_extracted/aaos-final-enterprise-certification_option_B/drizzle.config.json`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** Selected the largest, most syntactically complete implementation (181 bytes) among the 2 distinct versions found.

### Component: `eslint.config.mjs`
- **Overlapping Copies Found:** 8
- **Chosen Candidate Path:** `./temp_extracted/aaos-final-enterprise-certification_option_A/eslint.config.mjs`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 8 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `next.config.ts`
- **Overlapping Copies Found:** 8
- **Chosen Candidate Path:** `./temp_extracted/aaos-final-enterprise-certification_option_B/next.config.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** Preserved the certified Next.js configuration containing CSP security headers and server components integration.

### Component: `postcss.config.mjs`
- **Overlapping Copies Found:** 8
- **Chosen Candidate Path:** `./temp_extracted/aaos-final-enterprise-certification_option_A/postcss.config.mjs`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 8 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `render.yaml`
- **Overlapping Copies Found:** 4
- **Chosen Candidate Path:** `./temp_extracted/aaos-final-enterprise-certification_option_A/render.yaml`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** Selected the largest, most syntactically complete implementation (743 bytes) among the 2 distinct versions found.

### Component: `tsconfig.json`
- **Overlapping Copies Found:** 8
- **Chosen Candidate Path:** `./temp_extracted/aaos-final-enterprise-certification_option_A/tsconfig.json`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** Retained the rigorous type-checking configuration supporting modern ESM modules, paths mappings, and type-stripping.

### Component: `vercel.json`
- **Overlapping Copies Found:** 4
- **Chosen Candidate Path:** `./temp_extracted/aaos-final-enterprise-certification_option_B/vercel.json`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** Selected the largest, most syntactically complete implementation (336 bytes) among the 2 distinct versions found.

### Component: `package-lock.json`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aaos-final-enterprise-certification_option_B/AITradeMinds_v1.0.0_Final/package-lock.json`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** Selected the largest, most syntactically complete implementation (303531 bytes) among the 2 distinct versions found.

### Component: `src/app/globals.css`
- **Overlapping Copies Found:** 8
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/app/globals.css`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** Selected the largest, most syntactically complete implementation (296 bytes) among the 3 distinct versions found.

### Component: `src/app/layout.tsx`
- **Overlapping Copies Found:** 8
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/layout.tsx`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** Selected the largest, most syntactically complete implementation (662 bytes) among the 5 distinct versions found.

### Component: `src/app/page.tsx`
- **Overlapping Copies Found:** 8
- **Chosen Candidate Path:** `./temp_extracted/aaos-final-enterprise-certification_option_A/src/app/page.tsx`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** Loads and mounts the Enterprise Dashboard component directly. Selected the certified Version B to display the complete 60 FPS workspace.

### Component: `src/app/api/health/route.ts`
- **Overlapping Copies Found:** 8
- **Chosen Candidate Path:** `./temp_extracted/aaos-final-enterprise-certification_option_A/AITradeMinds_v1.0.0/src/app/api/health/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 8 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/db/index.ts`
- **Overlapping Copies Found:** 8
- **Chosen Candidate Path:** `./temp_extracted/aaos-final-enterprise-certification_option_A/AITradeMinds_v1.0.0/src/db/index.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** Selected the largest, most syntactically complete implementation (1562 bytes) among the 3 distinct versions found.

### Component: `src/db/schema.ts`
- **Overlapping Copies Found:** 8
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/db/schema.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** Selected the 44,676-byte comprehensive Drizzle schema file from market-data-platform-expansion. Avoided the basic 6-table mock schema (4KB) to keep the 68 fully-featured tables intact.

### Component: `supabase/.temp/gotrue-version`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aaos-final-enterprise-certification_option_A/AITradeMinds_v1.0.0/supabase/.temp/gotrue-version`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `supabase/.temp/linked-project.json`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aaos-final-enterprise-certification_option_A/AITradeMinds_v1.0.0/supabase/.temp/linked-project.json`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `supabase/.temp/pooler-url`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aaos-final-enterprise-certification_option_A/AITradeMinds_v1.0.0/supabase/.temp/pooler-url`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `supabase/.temp/postgres-version`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aaos-final-enterprise-certification_option_A/AITradeMinds_v1.0.0/supabase/.temp/postgres-version`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `supabase/.temp/project-ref`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aaos-final-enterprise-certification_option_A/AITradeMinds_v1.0.0/supabase/.temp/project-ref`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `supabase/.temp/rest-version`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aaos-final-enterprise-certification_option_A/AITradeMinds_v1.0.0/supabase/.temp/rest-version`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `supabase/.temp/storage-migration`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aaos-final-enterprise-certification_option_A/AITradeMinds_v1.0.0/supabase/.temp/storage-migration`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `supabase/.temp/storage-version`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aaos-final-enterprise-certification_option_A/AITradeMinds_v1.0.0/supabase/.temp/storage-version`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `ADR.md`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aaos-final-enterprise-certification_option_B/ADR.md`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/components/Dashboard.tsx`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aaos-final-enterprise-certification_option_B/AITradeMinds_v1.0.0_Final/src/components/Dashboard.tsx`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** Preserved the certified Recharts dashboard interface with advanced risk heatmaps and mock consensus views.

### Component: `src/lib/utils.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aaos-final-enterprise-certification_option_B/AITradeMinds_v1.0.0_Final/src/lib/utils.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `supabase/migrations/000001_initial_schema.sql`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aaos-final-enterprise-certification_option_B/AITradeMinds_v1.0.0_Final/supabase/migrations/000001_initial_schema.sql`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/instrumentation.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/instrumentation.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/brain/ai-manager/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/app/api/brain/ai-manager/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/brain/dna/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/app/api/brain/dna/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/brain/explain/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/app/api/brain/explain/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/brain/graph/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/app/api/brain/graph/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/brain/ingest/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/app/api/brain/ingest/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/brain/intel/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/app/api/brain/intel/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/brain/lab/formulas/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/app/api/brain/lab/formulas/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/brain/lab/strategies/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/app/api/brain/lab/strategies/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/brain/memory/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/app/api/brain/memory/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/brain/memory/ranking/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/app/api/brain/memory/ranking/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/brain/memory/validation/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/app/api/brain/memory/validation/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/brain/models/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/app/api/brain/models/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/brain/quality/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/app/api/brain/quality/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/brain/run/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/app/api/brain/run/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/brain/state/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/app/api/brain/state/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/brain/strategies/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/app/api/brain/strategies/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/execution/decision/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/app/api/execution/decision/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/execution/journal/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/app/api/execution/journal/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/execution/marks/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/app/api/execution/marks/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/execution/state/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/app/api/execution/state/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/ops/alerts/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/app/api/ops/alerts/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/ops/control-plane/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/app/api/ops/control-plane/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/ops/events/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/app/api/ops/events/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/ops/heartbeat/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/app/api/ops/heartbeat/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/ops/metrics/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/app/api/ops/metrics/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/ops/overview/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/app/api/ops/overview/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/ops/registry/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/app/api/ops/registry/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/ops/stream/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/app/api/ops/stream/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/ops/telemetry/ui/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/app/api/ops/telemetry/ui/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/components/ops/ops-console.tsx`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/components/ops/ops-console.tsx`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/components/ops/ui-telemetry.tsx`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/components/ops/ui-telemetry.tsx`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/lib/brain/formula-lab.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/lib/brain/formula-lab.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/lib/brain/indicators.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/lib/brain/indicators.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/lib/brain/intel.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/lib/brain/intel.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/lib/brain/knowledge-graph.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/lib/brain/knowledge-graph.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/lib/brain/market-dna.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/lib/brain/market-dna.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/lib/brain/market.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/lib/brain/market.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/lib/brain/memory-ranking.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/lib/brain/memory-ranking.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/lib/brain/memory-validation.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/lib/brain/memory-validation.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/lib/brain/memory.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/lib/brain/memory.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/lib/brain/orchestrator.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/lib/brain/orchestrator.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/lib/brain/quality.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/lib/brain/quality.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/lib/brain/reasoning.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/lib/brain/reasoning.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/lib/brain/strategy-lab.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/lib/brain/strategy-lab.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/lib/brain/strategy-validation.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/lib/brain/strategy-validation.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/lib/brain/types.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/lib/brain/types.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/lib/brain/society/ai-manager.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/lib/brain/society/ai-manager.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/lib/brain/society/consensus.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/lib/brain/society/consensus.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/lib/brain/society/manager.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/lib/brain/society/manager.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/lib/brain/society/memory.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/lib/brain/society/memory.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/lib/brain/society/models.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/lib/brain/society/models.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/lib/control-plane/reader.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/lib/control-plane/reader.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/lib/events/audit-store.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/lib/events/audit-store.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/lib/events/bus.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/lib/events/bus.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/lib/execution/engine.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/lib/execution/engine.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/lib/execution/types.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/lib/execution/types.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/lib/ops/monitor.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/lib/ops/monitor.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/lib/ops/probes.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/lib/ops/probes.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/lib/ops/realtime.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/lib/ops/realtime.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/lib/ops/registry.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/lib/ops/registry.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/lib/ops/store.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/lib/ops/store.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/lib/ops/types.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/aitrademinds-platform-development-brief_option_A/src/lib/ops/types.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `.aitm-secret`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/.aitm-secret`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `vitest.config.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/vitest.config.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `docs/ADR.md`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/docs/ADR.md`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `docs/ARCHITECTURE.md`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/docs/ARCHITECTURE.md`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `docs/CONSTITUTION.md`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/docs/CONSTITUTION.md`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `docs/DATABASE_ARCHITECTURE.md`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/docs/DATABASE_ARCHITECTURE.md`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `docs/IMPLEMENTATION_ROADMAP.md`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/docs/IMPLEMENTATION_ROADMAP.md`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `docs/PROJECT_BRAIN.md`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/docs/PROJECT_BRAIN.md`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `docs/REGISTRIES.md`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/docs/REGISTRIES.md`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `docs/RELEASE_MANAGEMENT.md`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/docs/RELEASE_MANAGEMENT.md`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `docs/RELEASE_NOTES.md`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/docs/RELEASE_NOTES.md`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `docs/SDLC.md`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/docs/SDLC.md`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `docs/TECHNICAL_DEBT.md`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/docs/TECHNICAL_DEBT.md`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/dashboard.tsx`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/dashboard.tsx`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/analytics/page.tsx`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/analytics/page.tsx`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/allocation/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/allocation/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/analytics/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/analytics/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/auth/login/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/auth/login/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/auth/logout/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/auth/logout/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/auth/me/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/auth/me/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/auth/register/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/auth/register/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/brain/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/brain/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/brain/consensus/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/brain/consensus/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/brain/selfreview/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/brain/selfreview/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/brokers/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/brokers/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/dashboard/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/dashboard/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/datasets/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/datasets/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/execution/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/execution/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/execution/history/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/execution/history/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/execution/journal/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/execution/journal/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/execution/metrics/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/execution/metrics/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/execution/quality/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/execution/quality/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/execution/replay/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/execution/replay/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/execution/timeline/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/execution/timeline/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/learning/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/learning/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/market/bootstrap/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/market/bootstrap/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/market/breadth/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/market/breadth/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/market/corporate-actions/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/market/corporate-actions/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/market/features/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/market/features/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/market/history/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/market/history/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/market/indicators/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/market/indicators/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/market/news/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/market/news/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/market/option-chain/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/market/option-chain/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/market/overview/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/market/overview/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/market/providers/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/market/providers/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/market/replay/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/market/replay/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/market/scanner/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/market/scanner/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/market/sectors/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/market/sectors/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/market/session/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/market/session/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/market/symbols/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/market/symbols/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/market/watchlists/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/market/watchlists/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/metrics/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/metrics/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/models/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/models/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/optimizer/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/optimizer/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/orders/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/orders/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/orgs/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/orgs/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/orgs/[id]/members/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/orgs/[id]/members/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/paper/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/paper/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/platform/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/platform/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/platform/audit/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/platform/audit/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/platform/command-center/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/platform/command-center/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/platform/diagnostics/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/platform/diagnostics/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/platform/health/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/platform/health/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/platform/recovery/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/platform/recovery/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/platform/score/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/platform/score/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/platform/supervisor/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/platform/supervisor/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/portfolio/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/portfolio/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/portfolio/capital/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/portfolio/capital/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/portfolio/history/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/portfolio/history/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/portfolio/holdings/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/portfolio/holdings/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/portfolio/performance/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/portfolio/performance/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/portfolio/positions/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/portfolio/positions/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/portfolio/snapshot/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/portfolio/snapshot/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/positions/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/positions/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/realtime/health/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/realtime/health/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/realtime/jobs/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/realtime/jobs/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/realtime/metrics/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/realtime/metrics/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/rebalance/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/rebalance/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/reports/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/reports/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/research/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/research/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/risk/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/risk/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/training/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/training/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/api/v1/users/route.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/api/v1/users/route.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/lib/api-client.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/lib/api-client.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/lib/auth-context.tsx`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/lib/auth-context.tsx`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/login/page.tsx`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/login/page.tsx`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/market/page.tsx`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/market/page.tsx`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/app/register/page.tsx`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/app/register/page.tsx`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/components/AppShell.tsx`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/components/AppShell.tsx`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/components/CandleChart.tsx`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/components/CandleChart.tsx`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/components/charts.tsx`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/components/charts.tsx`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/components/ui.tsx`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/components/ui.tsx`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/kernel/config.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/kernel/config.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/kernel/context.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/kernel/context.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/kernel/crypto.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/kernel/crypto.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/kernel/errors.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/kernel/errors.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/kernel/index.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/kernel/index.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/kernel/logger.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/kernel/logger.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/kernel/registry.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/kernel/registry.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/analytics/bootstrap.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/analytics/bootstrap.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/analytics/index.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/analytics/index.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/analytics/report-generator.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/analytics/report-generator.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/analytics/repository.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/analytics/repository.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/analytics/service.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/analytics/service.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/brain/ai-society.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/brain/ai-society.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/brain/bootstrap.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/brain/bootstrap.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/brain/brain.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/brain/brain.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/brain/calibration.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/brain/calibration.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/brain/consensus.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/brain/consensus.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/brain/digital-twin.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/brain/digital-twin.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/brain/health.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/brain/health.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/brain/index.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/brain/index.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/brain/knowledge-graph.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/brain/knowledge-graph.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/brain/market-dna.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/brain/market-dna.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/brain/meta-learning.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/brain/meta-learning.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/brain/repository.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/brain/repository.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/brain/reputation.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/brain/reputation.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/brain/rl-research.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/brain/rl-research.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/brain/self-review.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/brain/self-review.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/broker/adapters.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/broker/adapters.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/broker/bootstrap.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/broker/bootstrap.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/broker/constants.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/broker/constants.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/broker/health-monitor.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/broker/health-monitor.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/broker/index.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/broker/index.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/broker/manager.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/broker/manager.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/broker/registry.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/broker/registry.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/broker/state-machine.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/broker/state-machine.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/broker/types.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/broker/types.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/execution/bootstrap.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/execution/bootstrap.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/execution/index.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/execution/index.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/execution/journal.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/execution/journal.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/execution/metrics.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/execution/metrics.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/execution/quality-tracker.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/execution/quality-tracker.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/execution/replay.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/execution/replay.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/execution/repository.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/execution/repository.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/execution/timeline.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/execution/timeline.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/identity/auth-service.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/identity/auth-service.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/identity/bootstrap.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/identity/bootstrap.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/identity/guard.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/identity/guard.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/identity/index.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/identity/index.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/identity/org-service.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/identity/org-service.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/identity/repository.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/identity/repository.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/infra/bootstrap.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/infra/bootstrap.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/infra/http-guard.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/infra/http-guard.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/infra/index.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/infra/index.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/infra/repository.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/infra/repository.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/infra/scheduler.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/infra/scheduler.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/market_data/constants.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/market_data/constants.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/market_data/http.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/market_data/http.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/market_data/index.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/market_data/index.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/market_data/core/cache.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/market_data/core/cache.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/market_data/core/event-bus.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/market_data/core/event-bus.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/market_data/core/repository.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/market_data/core/repository.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/market_data/feed/feed-pipeline.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/market_data/feed/feed-pipeline.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/market_data/indicators/indicators.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/market_data/indicators/indicators.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/market_data/providers/provider-manager.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/market_data/providers/provider-manager.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/market_data/quality/quality.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/market_data/quality/quality.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/market_data/services/breadth.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/market_data/services/breadth.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/market_data/services/corporate-action.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/market_data/services/corporate-action.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/market_data/services/feature-engineering.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/market_data/services/feature-engineering.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/market_data/services/historical.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/market_data/services/historical.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/market_data/services/news.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/market_data/services/news.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/market_data/services/option-chain.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/market_data/services/option-chain.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/market_data/services/replay.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/market_data/services/replay.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/market_data/services/scanner.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/market_data/services/scanner.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/market_data/services/sector-intelligence.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/market_data/services/sector-intelligence.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/market_data/services/symbol-master.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/market_data/services/symbol-master.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/market_data/services/watchlist.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/market_data/services/watchlist.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/market_data/session/session.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/market_data/session/session.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/platform/bootstrap.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/platform/bootstrap.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/platform/command-center.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/platform/command-center.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/platform/health-engine.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/platform/health-engine.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/platform/index.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/platform/index.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/platform/pipeline.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/platform/pipeline.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/platform/repository.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/platform/repository.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/platform/supervisor.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/platform/supervisor.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/portfolio/bootstrap.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/portfolio/bootstrap.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/portfolio/capital.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/portfolio/capital.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/portfolio/index.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/portfolio/index.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/portfolio/ledger.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/portfolio/ledger.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/portfolio/performance.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/portfolio/performance.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/portfolio/snapshot-engine.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/portfolio/snapshot-engine.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/portfolio_intel/bootstrap.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/portfolio_intel/bootstrap.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/portfolio_intel/index.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/portfolio_intel/index.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/portfolio_intel/optimizer.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/portfolio_intel/optimizer.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/portfolio_intel/portfolio-intelligence.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/portfolio_intel/portfolio-intelligence.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/portfolio_intel/repository.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/portfolio_intel/repository.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/portfolio_intel/risk-budget.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/portfolio_intel/risk-budget.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/portfolio_intel/sizing.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/portfolio_intel/sizing.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/security/index.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/security/index.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/security/rate-limit.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/security/rate-limit.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/security/validation.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/security/validation.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/trading/execution-quality.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/trading/execution-quality.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/trading/index.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/trading/index.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/trading/oms.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/trading/oms.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/trading/paper-engine.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/trading/paper-engine.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/trading/portfolio.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/trading/portfolio.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/trading/repository.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/trading/repository.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/trading/rms.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/trading/rms.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/training/bootstrap.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/training/bootstrap.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/training/dataset-builder.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/training/dataset-builder.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/training/index.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/training/index.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/training/learning-engine.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/training/learning-engine.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/training/model.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/training/model.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/training/repository.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/training/repository.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/modules/training/trainer.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/modules/training/trainer.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/tests/ai-society.test.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/tests/ai-society.test.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/tests/analytics.test.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/tests/analytics.test.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/tests/brain-advanced.test.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/tests/brain-advanced.test.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/tests/brain.test.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/tests/brain.test.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/tests/broker.test.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/tests/broker.test.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/tests/cache-tier.test.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/tests/cache-tier.test.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/tests/execution-intel.test.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/tests/execution-intel.test.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/tests/identity.test.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/tests/identity.test.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/tests/kernel.test.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/tests/kernel.test.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/tests/meta-learning.test.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/tests/meta-learning.test.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/tests/org.test.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/tests/org.test.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/tests/platform.test.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/tests/platform.test.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/tests/portfolio-foundation.test.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/tests/portfolio-foundation.test.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/tests/portfolio-intel.test.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/tests/portfolio-intel.test.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/tests/rate-limit.test.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/tests/rate-limit.test.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/tests/trading.test.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/tests/trading.test.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.

### Component: `src/tests/training.test.ts`
- **Overlapping Copies Found:** 2
- **Chosen Candidate Path:** `./temp_extracted/market-data-platform-expansion_option_A/src/tests/training.test.ts`
- **Resolution Classification:** MERGED / CONSOLIDATED
- **Audit Decision Reason:** All 2 instances are binary or exact text duplicates (SHA256 identical). Unified under a single file.


---

## Skipped Files and Assets
In strict adherence to **Rule #3** and **Rule #6**, the following elements were bypassed or marked as SKIPPED during forensic recovery:

1. **Broker APIs & Live Integration Mocks:**
   - Files representing mock interactive brokers API, crypto integrations, and credit gateways.
   - *Reason:* Forbidden under the "DO NOT recover Live Broker / Crypto / Forex / Live Exchange Integration" guideline.
2. **Demo / Tutorial / Playground Components:**
   - Experimental testbed scrapers or temporary playground pages.
   - *Reason:* Skip experimental/playground structures to preserve a clean production codebase.
3. **Duplicate folder wrappers (`AITradeMinds_v1.0.0/` and `AITradeMinds_v1.0.0_Final/`):**
   - *Reason:* Flattened structural layout directly into the workspace root as a Single Source of Truth.
