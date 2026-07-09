CREATE TABLE "ai_datasets" (
	"id" serial PRIMARY KEY NOT NULL,
	"training_id" text NOT NULL,
	"symbol" text NOT NULL,
	"timeframe" text NOT NULL,
	"feature_version" text NOT NULL,
	"feature_names" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"row_count" integer DEFAULT 0 NOT NULL,
	"regime" text,
	"rows" jsonb NOT NULL,
	"tenant_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_lessons" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"model_key" text NOT NULL,
	"symbol" text NOT NULL,
	"strategy" text,
	"regime" text,
	"expected_reward" double precision,
	"actual_reward" double precision,
	"confidence" double precision,
	"holding_time" integer,
	"drawdown" double precision,
	"slippage" double precision,
	"result" text,
	"lesson" text NOT NULL,
	"source" text DEFAULT 'PAPER' NOT NULL,
	"tenant_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_models" (
	"id" serial PRIMARY KEY NOT NULL,
	"model_key" text NOT NULL,
	"version" integer NOT NULL,
	"hash" text NOT NULL,
	"parent_version" integer,
	"dataset_training_id" text NOT NULL,
	"weights" jsonb NOT NULL,
	"feature_names" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metrics" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"approval_status" text DEFAULT 'PENDING' NOT NULL,
	"tenant_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_reports" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"period" text,
	"title" text NOT NULL,
	"payload" jsonb NOT NULL,
	"generated_by" text,
	"tenant_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "apikey_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"key_hash" text NOT NULL,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"actor_id" text,
	"target" text,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip" text,
	"tenant_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" text NOT NULL,
	"ip" text,
	"user_agent" text,
	"revoked" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "authz_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "authz_user_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"role_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brain_calibration" (
	"id" serial PRIMARY KEY NOT NULL,
	"model_key" text NOT NULL,
	"regime" text NOT NULL,
	"bucket" integer NOT NULL,
	"predicted" integer DEFAULT 0 NOT NULL,
	"correct" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brain_consensus" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"exchange" text DEFAULT 'NSE' NOT NULL,
	"regime" text NOT NULL,
	"method" text NOT NULL,
	"decision" text NOT NULL,
	"score" double precision NOT NULL,
	"agreement" double precision NOT NULL,
	"disagreement" double precision NOT NULL,
	"opinions" jsonb NOT NULL,
	"tenant_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brain_feature_importance" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"model_key" text NOT NULL,
	"feature" text NOT NULL,
	"contribution" double precision DEFAULT 0 NOT NULL,
	"helpful_count" integer DEFAULT 0 NOT NULL,
	"harmful_count" integer DEFAULT 0 NOT NULL,
	"regime" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brain_formulas" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"definition" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"creator" text DEFAULT 'system' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"parent_id" text,
	"dependencies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"stats" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"confidence" double precision DEFAULT 0.5 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brain_knowledge_edges" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text NOT NULL,
	"relation" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"confidence" double precision DEFAULT 0.5 NOT NULL,
	"observations" integer DEFAULT 1 NOT NULL,
	"tenant_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brain_market_dna" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"timeframe" text NOT NULL,
	"ts" timestamp with time zone NOT NULL,
	"pattern" text NOT NULL,
	"regime" text NOT NULL,
	"fingerprint" jsonb NOT NULL,
	"forward_return" double precision,
	"tenant_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brain_memory" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"domain" text,
	"module" text,
	"key" text,
	"payload" jsonb DEFAULT '{}'::jsonb,
	"tier" text,
	"kind" text,
	"subject" text,
	"content" jsonb,
	"importance" double precision DEFAULT 0.5,
	"tenant_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brain_meta_recommendations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"model_key" text NOT NULL,
	"kind" text NOT NULL,
	"severity" text DEFAULT 'INFO' NOT NULL,
	"rationale" text NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"tenant_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brain_model_reputation" (
	"id" serial PRIMARY KEY NOT NULL,
	"model_key" text NOT NULL,
	"regime" text DEFAULT 'ALL' NOT NULL,
	"trades" integer DEFAULT 0 NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"cum_reward" double precision DEFAULT 0 NOT NULL,
	"cum_return_sq" double precision DEFAULT 0 NOT NULL,
	"max_drawdown" double precision DEFAULT 0 NOT NULL,
	"recent_score" double precision DEFAULT 0.5 NOT NULL,
	"influence" double precision DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brain_models" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"stats" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"activated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brain_rl_experiences" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"episode" text NOT NULL,
	"agent" text NOT NULL,
	"state" jsonb NOT NULL,
	"action" text NOT NULL,
	"reward" double precision DEFAULT 0 NOT NULL,
	"next_state" jsonb,
	"terminal" boolean DEFAULT false NOT NULL,
	"tenant_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brain_self_reviews" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"scope" text NOT NULL,
	"health_score" integer DEFAULT 0 NOT NULL,
	"strengths" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"weaknesses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"proposals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tenant_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brain_strategies" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"stats" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"parent_id" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_by" text DEFAULT 'seed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "control_plane_state" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decision_quality" (
	"decision_id" text PRIMARY KEY NOT NULL,
	"cycle_id" text NOT NULL,
	"symbol" text NOT NULL,
	"action" text NOT NULL,
	"strategy_id" text,
	"confidence" integer NOT NULL,
	"reasoning_quality" integer NOT NULL,
	"risk_score" integer NOT NULL,
	"expected_move_pct" double precision NOT NULL,
	"target_price" double precision NOT NULL,
	"stop_price" double precision NOT NULL,
	"horizon_bars" integer DEFAULT 10 NOT NULL,
	"expected_reward" double precision DEFAULT 0 NOT NULL,
	"expected_risk" double precision DEFAULT 0 NOT NULL,
	"market_regime" text DEFAULT 'UNKNOWN' NOT NULL,
	"models_participated" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"holding_time_sec" integer,
	"entry_price" double precision,
	"status" text DEFAULT 'pending' NOT NULL,
	"actual_move_pct" double precision,
	"prediction_error" double precision,
	"outcome" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"evaluated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "exec_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"decision_id" text NOT NULL,
	"symbol" text NOT NULL,
	"side" text NOT NULL,
	"quantity" double precision NOT NULL,
	"request_price" double precision NOT NULL,
	"fill_price" double precision,
	"status" text DEFAULT 'CREATED' NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"source" text DEFAULT 'ai' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exec_orders_decision_id_unique" UNIQUE("decision_id")
);
--> statement-breakpoint
CREATE TABLE "exec_portfolios" (
	"id" text PRIMARY KEY NOT NULL,
	"cash" double precision NOT NULL,
	"used_margin" double precision DEFAULT 0 NOT NULL,
	"realized_pnl" double precision DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exec_positions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"direction" text NOT NULL,
	"quantity" double precision NOT NULL,
	"avg_entry_price" double precision NOT NULL,
	"mark_price" double precision NOT NULL,
	"realized_pnl" double precision DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "execution_journal" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"order_id" bigint,
	"symbol" text,
	"stage" text NOT NULL,
	"event" text NOT NULL,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"correlation_id" text,
	"tenant_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_quality" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"order_id" bigint NOT NULL,
	"fill_id" bigint NOT NULL,
	"symbol" text NOT NULL,
	"side" text NOT NULL,
	"expected_price" double precision NOT NULL,
	"fill_price" double precision NOT NULL,
	"slippage" double precision NOT NULL,
	"slippage_bps" double precision NOT NULL,
	"spread" double precision NOT NULL,
	"latency_ms" integer NOT NULL,
	"requested_qty" integer NOT NULL,
	"filled_qty" integer NOT NULL,
	"fill_ratio" double precision NOT NULL,
	"market_impact_bps" double precision DEFAULT 0 NOT NULL,
	"execution_score" double precision NOT NULL,
	"tenant_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_replay" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"order_id" bigint NOT NULL,
	"account_id" integer NOT NULL,
	"symbol" text NOT NULL,
	"steps" jsonb NOT NULL,
	"outcome" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"tenant_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_timeline" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"order_id" bigint NOT NULL,
	"account_id" integer NOT NULL,
	"symbol" text NOT NULL,
	"stages" jsonb NOT NULL,
	"final_status" text NOT NULL,
	"total_latency_ms" integer DEFAULT 0 NOT NULL,
	"tenant_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_edges" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"from_type" text NOT NULL,
	"from_id" text NOT NULL,
	"relation" text NOT NULL,
	"to_type" text NOT NULL,
	"to_id" text NOT NULL,
	"weight" double precision DEFAULT 1 NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_bars" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"exchange" text DEFAULT 'NSE' NOT NULL,
	"bar_date" text NOT NULL,
	"open" double precision NOT NULL,
	"high" double precision NOT NULL,
	"low" double precision NOT NULL,
	"close" double precision NOT NULL,
	"volume" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_intel" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"symbol" text,
	"sector" text,
	"impact" text,
	"horizon" text,
	"title" text DEFAULT '' NOT NULL,
	"value" double precision,
	"effective_date" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "md_candles" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"exchange" text NOT NULL,
	"timeframe" text NOT NULL,
	"ts" timestamp with time zone NOT NULL,
	"open" double precision NOT NULL,
	"high" double precision NOT NULL,
	"low" double precision NOT NULL,
	"close" double precision NOT NULL,
	"volume" bigint DEFAULT 0 NOT NULL,
	"oi" bigint DEFAULT 0 NOT NULL,
	"adjusted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "md_corporate_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"exchange" text NOT NULL,
	"action_type" text NOT NULL,
	"ex_date" date NOT NULL,
	"record_date" date,
	"ratio_from" double precision,
	"ratio_to" double precision,
	"value" double precision,
	"details" text,
	"applied" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "md_news" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"category" text NOT NULL,
	"symbol" text,
	"headline" text NOT NULL,
	"body" text,
	"url" text,
	"impact" text DEFAULT 'LOW' NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "md_option_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"underlying" text NOT NULL,
	"expiry" date NOT NULL,
	"ts" timestamp with time zone DEFAULT now() NOT NULL,
	"spot" double precision NOT NULL,
	"pcr" double precision NOT NULL,
	"max_pain" double precision NOT NULL,
	"total_call_oi" bigint DEFAULT 0 NOT NULL,
	"total_put_oi" bigint DEFAULT 0 NOT NULL,
	"chain" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "md_symbols" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"exchange" text NOT NULL,
	"token" text,
	"name" text,
	"instrument_type" text NOT NULL,
	"segment" text,
	"sector" text,
	"industry" text,
	"isin" text,
	"lot_size" integer DEFAULT 1 NOT NULL,
	"tick_size" double precision DEFAULT 0.05 NOT NULL,
	"freeze_qty" integer DEFAULT 0 NOT NULL,
	"face_value" double precision DEFAULT 10 NOT NULL,
	"expiry" date,
	"strike" double precision,
	"option_type" text,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"listing_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "md_watchlist_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"watchlist_id" integer NOT NULL,
	"symbol" text NOT NULL,
	"exchange" text DEFAULT 'NSE' NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "md_watchlists" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'USER' NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_memory" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"model_id" text NOT NULL,
	"kind" text NOT NULL,
	"key" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops_alerts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"dedupe_key" text NOT NULL,
	"component_id" text,
	"severity" text NOT NULL,
	"title" text NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"triggered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_evaluated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ops_component_state" (
	"component_id" text PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"latency_ms" double precision,
	"metrics" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_checked_at" timestamp with time zone NOT NULL,
	"last_status_change_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"component_id" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops_health_snapshots" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"component_id" text NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops_metrics" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"component_id" text,
	"name" text NOT NULL,
	"value" double precision NOT NULL,
	"unit" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops_registry" (
	"component_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"kind" text DEFAULT 'engine' NOT NULL,
	"mode" text DEFAULT 'heartbeat' NOT NULL,
	"probe" text,
	"heartbeat_timeout_sec" integer DEFAULT 120 NOT NULL,
	"dependencies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"alert_rules" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"source" text DEFAULT 'self-registered' NOT NULL,
	"registered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" text DEFAULT 'MEMBER' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_orgs" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"owner_id" integer NOT NULL,
	"tenant_id" text,
	"version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pf_ledger" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"entry_type" text NOT NULL,
	"account" text NOT NULL,
	"direction" text NOT NULL,
	"amount" double precision NOT NULL,
	"symbol" text,
	"ref_type" text,
	"ref_id" text,
	"balance_after" double precision,
	"note" text,
	"tenant_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pf_snapshots" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"equity" double precision NOT NULL,
	"cash" double precision NOT NULL,
	"invested_value" double precision NOT NULL,
	"unrealized_pnl" double precision NOT NULL,
	"realized_pnl" double precision NOT NULL,
	"exposure_pct" double precision NOT NULL,
	"open_positions" integer DEFAULT 0 NOT NULL,
	"concentration" double precision DEFAULT 0 NOT NULL,
	"sector_exposure" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"daily_return" double precision DEFAULT 0 NOT NULL,
	"tenant_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pfi_allocations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"optimizer" text NOT NULL,
	"regime" text NOT NULL,
	"targets" jsonb NOT NULL,
	"expected_return" double precision DEFAULT 0 NOT NULL,
	"expected_risk" double precision DEFAULT 0 NOT NULL,
	"diversification_score" double precision DEFAULT 0 NOT NULL,
	"rationale" text,
	"tenant_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pfi_rebalances" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"reason" text NOT NULL,
	"actions" jsonb NOT NULL,
	"status" text DEFAULT 'RECOMMENDED' NOT NULL,
	"tenant_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pfi_risk_budgets" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"var_95" double precision DEFAULT 0 NOT NULL,
	"cvar_95" double precision DEFAULT 0 NOT NULL,
	"portfolio_beta" double precision DEFAULT 0 NOT NULL,
	"portfolio_vol" double precision DEFAULT 0 NOT NULL,
	"concentration" double precision DEFAULT 0 NOT NULL,
	"sector_risk" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plat_health_snapshots" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"overall_score" integer NOT NULL,
	"grade" text NOT NULL,
	"subsystems" jsonb NOT NULL,
	"platform_score" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plat_pipeline_runs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"correlation_id" text NOT NULL,
	"symbol" text NOT NULL,
	"regime" text NOT NULL,
	"consensus_decision" text NOT NULL,
	"consensus_score" double precision NOT NULL,
	"risk_decision" text NOT NULL,
	"executed" boolean DEFAULT false NOT NULL,
	"order_status" text,
	"stages" jsonb NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"actor_id" text,
	"tenant_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plat_supervisor_alerts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"severity" text NOT NULL,
	"subject" text NOT NULL,
	"detail" text NOT NULL,
	"recommendation" text,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"tenant_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rt_dead_letter" (
	"id" serial PRIMARY KEY NOT NULL,
	"topic" text NOT NULL,
	"payload" jsonb NOT NULL,
	"error" text NOT NULL,
	"retries" integer DEFAULT 0 NOT NULL,
	"resolved" boolean DEFAULT false NOT NULL,
	"tenant_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rt_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"status" text NOT NULL,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"error" text,
	"tenant_id" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rt_stream_offsets" (
	"id" serial PRIMARY KEY NOT NULL,
	"stream" text NOT NULL,
	"consumer_group" text NOT NULL,
	"last_offset" text NOT NULL,
	"tenant_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trade_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"kind" text DEFAULT 'PAPER' NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"starting_balance" double precision DEFAULT 1000000 NOT NULL,
	"cash" double precision DEFAULT 1000000 NOT NULL,
	"realized_pnl" double precision DEFAULT 0 NOT NULL,
	"tenant_id" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trade_fills" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"order_id" bigint NOT NULL,
	"account_id" integer NOT NULL,
	"symbol" text NOT NULL,
	"side" text NOT NULL,
	"quantity" integer NOT NULL,
	"price" double precision NOT NULL,
	"expected_price" double precision NOT NULL,
	"slippage" double precision DEFAULT 0 NOT NULL,
	"spread" double precision DEFAULT 0 NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trade_order_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"order_id" bigint NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trade_orders" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"symbol" text NOT NULL,
	"exchange" text DEFAULT 'NSE' NOT NULL,
	"side" text NOT NULL,
	"order_type" text NOT NULL,
	"product" text DEFAULT 'INTRADAY' NOT NULL,
	"quantity" integer NOT NULL,
	"filled_quantity" integer DEFAULT 0 NOT NULL,
	"limit_price" double precision,
	"trigger_price" double precision,
	"avg_fill_price" double precision,
	"status" text NOT NULL,
	"reject_reason" text,
	"strategy" text,
	"confidence" double precision,
	"tenant_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trade_positions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"symbol" text NOT NULL,
	"exchange" text DEFAULT 'NSE' NOT NULL,
	"product" text DEFAULT 'INTRADAY' NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"avg_price" double precision DEFAULT 0 NOT NULL,
	"realized_pnl" double precision DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"tenant_id" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trade_risk_decisions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"symbol" text NOT NULL,
	"decision" text NOT NULL,
	"rules_passed" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rules_failed" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usr_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" text,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"tenant_id" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "apikey_keys" ADD CONSTRAINT "apikey_keys_user_id_usr_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."usr_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_usr_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."usr_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authz_user_roles" ADD CONSTRAINT "authz_user_roles_user_id_usr_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."usr_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authz_user_roles" ADD CONSTRAINT "authz_user_roles_role_id_authz_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."authz_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_journal" ADD CONSTRAINT "execution_journal_account_id_trade_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."trade_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_journal" ADD CONSTRAINT "execution_journal_order_id_trade_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."trade_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_quality" ADD CONSTRAINT "execution_quality_account_id_trade_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."trade_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_quality" ADD CONSTRAINT "execution_quality_order_id_trade_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."trade_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_quality" ADD CONSTRAINT "execution_quality_fill_id_trade_fills_id_fk" FOREIGN KEY ("fill_id") REFERENCES "public"."trade_fills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_replay" ADD CONSTRAINT "execution_replay_order_id_trade_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."trade_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_replay" ADD CONSTRAINT "execution_replay_account_id_trade_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."trade_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_timeline" ADD CONSTRAINT "execution_timeline_order_id_trade_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."trade_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_timeline" ADD CONSTRAINT "execution_timeline_account_id_trade_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."trade_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_org_id_org_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org_orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_user_id_usr_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."usr_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pf_ledger" ADD CONSTRAINT "pf_ledger_account_id_trade_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."trade_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pf_snapshots" ADD CONSTRAINT "pf_snapshots_account_id_trade_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."trade_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pfi_allocations" ADD CONSTRAINT "pfi_allocations_account_id_trade_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."trade_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pfi_rebalances" ADD CONSTRAINT "pfi_rebalances_account_id_trade_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."trade_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pfi_risk_budgets" ADD CONSTRAINT "pfi_risk_budgets_account_id_trade_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."trade_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_accounts" ADD CONSTRAINT "trade_accounts_user_id_usr_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."usr_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_fills" ADD CONSTRAINT "trade_fills_order_id_trade_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."trade_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_fills" ADD CONSTRAINT "trade_fills_account_id_trade_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."trade_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_order_events" ADD CONSTRAINT "trade_order_events_order_id_trade_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."trade_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_orders" ADD CONSTRAINT "trade_orders_account_id_trade_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."trade_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_positions" ADD CONSTRAINT "trade_positions_account_id_trade_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."trade_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_risk_decisions" ADD CONSTRAINT "trade_risk_decisions_account_id_trade_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."trade_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_ai_datasets_training" ON "ai_datasets" USING btree ("training_id");--> statement-breakpoint
CREATE INDEX "idx_ai_datasets_symbol" ON "ai_datasets" USING btree ("symbol","timeframe");--> statement-breakpoint
CREATE INDEX "idx_ai_lessons_model" ON "ai_lessons" USING btree ("model_key","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_ai_models_key_version" ON "ai_models" USING btree ("model_key","version");--> statement-breakpoint
CREATE INDEX "idx_ai_models_active" ON "ai_models" USING btree ("model_key","active");--> statement-breakpoint
CREATE INDEX "idx_analytics_reports_kind" ON "analytics_reports" USING btree ("kind","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_apikey_keys_hash" ON "apikey_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "idx_apikey_keys_user" ON "apikey_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_audit_events_action" ON "audit_events" USING btree ("action","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_auth_sessions_token" ON "auth_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "idx_auth_sessions_user" ON "auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_authz_roles_name" ON "authz_roles" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_authz_user_roles" ON "authz_user_roles" USING btree ("user_id","role_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_brain_calibration" ON "brain_calibration" USING btree ("model_key","regime","bucket");--> statement-breakpoint
CREATE INDEX "idx_brain_consensus_symbol" ON "brain_consensus" USING btree ("symbol","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_brain_feature" ON "brain_feature_importance" USING btree ("model_key","feature","regime");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_brain_edge" ON "brain_knowledge_edges" USING btree ("source_type","source_id","relation","target_type","target_id");--> statement-breakpoint
CREATE INDEX "idx_brain_edge_source" ON "brain_knowledge_edges" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "idx_brain_dna_symbol" ON "brain_market_dna" USING btree ("symbol","pattern");--> statement-breakpoint
CREATE INDEX "idx_brain_memory_domain_key" ON "brain_memory" USING btree ("domain","key","id");--> statement-breakpoint
CREATE INDEX "idx_brain_memory_tier" ON "brain_memory" USING btree ("tier","created_at");--> statement-breakpoint
CREATE INDEX "idx_brain_meta_model" ON "brain_meta_recommendations" USING btree ("model_key","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_brain_reputation" ON "brain_model_reputation" USING btree ("model_key","regime");--> statement-breakpoint
CREATE INDEX "idx_brain_rl_episode" ON "brain_rl_experiences" USING btree ("episode","created_at");--> statement-breakpoint
CREATE INDEX "idx_brain_selfreview_scope" ON "brain_self_reviews" USING btree ("scope","created_at");--> statement-breakpoint
CREATE INDEX "idx_decision_quality_status" ON "decision_quality" USING btree ("status","symbol");--> statement-breakpoint
CREATE INDEX "idx_exec_orders_created" ON "exec_orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_exec_positions_symbol_status" ON "exec_positions" USING btree ("symbol","status");--> statement-breakpoint
CREATE INDEX "idx_exec_journal_acct" ON "execution_journal" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_exec_journal_order" ON "execution_journal" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_exec_quality_acct" ON "execution_quality" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_exec_quality_order" ON "execution_quality" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_exec_replay_order" ON "execution_replay" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_exec_timeline_order" ON "execution_timeline" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_knowledge_from" ON "knowledge_edges" USING btree ("from_type","from_id");--> statement-breakpoint
CREATE INDEX "idx_knowledge_to" ON "knowledge_edges" USING btree ("to_type","to_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_knowledge_edge" ON "knowledge_edges" USING btree ("from_type","from_id","relation","to_type","to_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_market_bars_symbol_date" ON "market_bars" USING btree ("symbol","bar_date");--> statement-breakpoint
CREATE INDEX "idx_market_intel_kind_date" ON "market_intel" USING btree ("kind","effective_date");--> statement-breakpoint
CREATE UNIQUE INDEX "md_candles_uq" ON "md_candles" USING btree ("symbol","exchange","timeframe","ts");--> statement-breakpoint
CREATE INDEX "md_candles_lookup_idx" ON "md_candles" USING btree ("symbol","timeframe","ts");--> statement-breakpoint
CREATE INDEX "md_ca_symbol_idx" ON "md_corporate_actions" USING btree ("symbol","ex_date");--> statement-breakpoint
CREATE UNIQUE INDEX "md_ca_uq" ON "md_corporate_actions" USING btree ("symbol","exchange","action_type","ex_date");--> statement-breakpoint
CREATE INDEX "md_news_published_idx" ON "md_news" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "md_news_symbol_idx" ON "md_news" USING btree ("symbol");--> statement-breakpoint
CREATE INDEX "md_opt_snap_idx" ON "md_option_snapshots" USING btree ("underlying","expiry","ts");--> statement-breakpoint
CREATE UNIQUE INDEX "md_symbols_uq" ON "md_symbols" USING btree ("exchange","symbol","instrument_type","expiry","strike","option_type");--> statement-breakpoint
CREATE INDEX "md_symbols_symbol_idx" ON "md_symbols" USING btree ("symbol");--> statement-breakpoint
CREATE INDEX "md_symbols_sector_idx" ON "md_symbols" USING btree ("sector");--> statement-breakpoint
CREATE INDEX "md_symbols_type_idx" ON "md_symbols" USING btree ("instrument_type");--> statement-breakpoint
CREATE UNIQUE INDEX "md_wl_items_uq" ON "md_watchlist_items" USING btree ("watchlist_id","symbol","exchange");--> statement-breakpoint
CREATE INDEX "md_wl_items_wl_idx" ON "md_watchlist_items" USING btree ("watchlist_id");--> statement-breakpoint
CREATE INDEX "idx_model_memory_model_kind" ON "model_memory" USING btree ("model_id","kind","id");--> statement-breakpoint
CREATE INDEX "idx_ops_alerts_dedupe_status" ON "ops_alerts" USING btree ("dedupe_key","status");--> statement-breakpoint
CREATE INDEX "idx_ops_events_time" ON "ops_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_ops_events_component_type" ON "ops_events" USING btree ("component_id","type","id");--> statement-breakpoint
CREATE INDEX "idx_ops_snapshots_component_time" ON "ops_health_snapshots" USING btree ("component_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_ops_metrics_name_time" ON "ops_metrics" USING btree ("name","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_org_members" ON "org_members" USING btree ("org_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_org_orgs_slug" ON "org_orgs" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_pf_ledger_acct" ON "pf_ledger" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_pf_snapshots_acct" ON "pf_snapshots" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_pfi_alloc_acct" ON "pfi_allocations" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_pfi_rebal_acct" ON "pfi_rebalances" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_pfi_risk_acct" ON "pfi_risk_budgets" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_plat_health_created" ON "plat_health_snapshots" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_plat_pipeline_symbol" ON "plat_pipeline_runs" USING btree ("symbol","created_at");--> statement-breakpoint
CREATE INDEX "idx_plat_alerts_cat" ON "plat_supervisor_alerts" USING btree ("category","created_at");--> statement-breakpoint
CREATE INDEX "rt_dlq_topic_idx" ON "rt_dead_letter" USING btree ("topic","resolved");--> statement-breakpoint
CREATE INDEX "rt_jobs_name_idx" ON "rt_jobs" USING btree ("name","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "rt_offsets_uq" ON "rt_stream_offsets" USING btree ("stream","consumer_group");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_trade_accounts_user_kind" ON "trade_accounts" USING btree ("user_id","kind");--> statement-breakpoint
CREATE INDEX "idx_trade_fills_acct" ON "trade_fills" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_trade_order_events_order" ON "trade_order_events" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_trade_orders_acct" ON "trade_orders" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_trade_positions_acct" ON "trade_positions" USING btree ("account_id","status");--> statement-breakpoint
CREATE INDEX "idx_trade_risk_acct" ON "trade_risk_decisions" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_usr_users_email" ON "usr_users" USING btree ("email");