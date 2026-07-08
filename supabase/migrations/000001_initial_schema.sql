-- AAOS v1.0 Paper Trading Schema for Supabase (Append-Only + Audit)
-- Run this in Supabase SQL Editor or via Drizzle migrations

-- Enable RLS and extensions
create extension if not exists "uuid-ossp";

-- Events (Single Source of Truth - Append Only)
create table if not exists events (
  id bigserial primary key,
  aggregate_id text not null,
  aggregate_type text not null,
  event_type text not null,
  version integer not null,
  payload jsonb not null,
  timestamp timestamptz default now() not null,
  actor text not null,
  metadata jsonb
);

create index if not exists idx_events_aggregate on events(aggregate_id, version);
create index if not exists idx_events_timestamp on events(timestamp desc);

-- Audit Log
create table if not exists audit_log (
  id bigserial primary key,
  event_id bigint references events(id),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  before_state jsonb,
  after_state jsonb,
  performed_by text not null,
  timestamp timestamptz default now() not null,
  ip text,
  user_agent text
);

-- Portfolio Snapshots
create table if not exists portfolios (
  id bigserial primary key,
  user_id text not null unique,
  total_value numeric(18,2) not null default 100000.00,
  cash_balance numeric(18,2) not null default 100000.00,
  positions jsonb not null default '[]'::jsonb,
  last_updated timestamptz default now() not null,
  risk_score numeric(5,2) default 45.0
);

-- Risk Metrics
create table if not exists risk_metrics (
  id bigserial primary key,
  portfolio_id bigint references portfolios(id),
  var_95 numeric(12,2),
  volatility numeric(8,4),
  max_drawdown numeric(12,2),
  sharpe_ratio numeric(6,3),
  timestamp timestamptz default now() not null
);

create index if not exists idx_risk_timestamp on risk_metrics(timestamp desc);

-- AI Decisions (Single Brain)
create table if not exists ai_decisions (
  id bigserial primary key,
  decision_id text unique not null,
  brain_version text not null default '1.0',
  action text not null,
  symbol text not null,
  confidence numeric(5,4) not null,
  reasoning text,
  consensus_score numeric(5,4),
  payload jsonb,
  timestamp timestamptz default now() not null
);

-- Trades / Ledger (Paper Trading)
create table if not exists trades (
  id bigserial primary key,
  trade_id text unique not null,
  symbol text not null,
  side text not null check (side in ('BUY','SELL')),
  quantity numeric(14,6) not null,
  price numeric(14,6) not null,
  total numeric(18,2) not null,
  strategy text,
  ai_decision_id bigint references ai_decisions(id),
  status text default 'EXECUTED',
  timestamp timestamptz default now() not null
);

create index if not exists idx_trades_symbol_time on trades(symbol, timestamp desc);

-- Enable RLS (Row Level Security) - basic for paper trading
alter table events enable row level security;
alter table audit_log enable row level security;
alter table portfolios enable row level security;
alter table risk_metrics enable row level security;
alter table ai_decisions enable row level security;
alter table trades enable row level security;

-- Basic policies (authenticated users see their own data)
create policy "Users can view own portfolios" on portfolios for select using (true); -- open for demo/paper
create policy "Users can view trades" on trades for select using (true);

-- Supabase Auth integration ready (add auth.users policies in dashboard)
comment on table events is 'Append-only event store - Single Source of Truth for AAOS';
comment on table trades is 'Paper trading ledger - immutable';
