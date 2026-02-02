-- Migration 001: Data Provenance & Multi-State Support
-- Run this in the Supabase SQL Editor

-- ============================================================
-- 1. data_sources table — tracks where imported data came from
-- ============================================================
create table if not exists data_sources (
  id uuid primary key default uuid_generate_v4(),
  source_key text not null,          -- e.g. 'nhpfc_expenditures_2023'
  source_name text not null,         -- e.g. 'NHPFC Expenditure Report'
  source_url text,                   -- URL where data was fetched
  source_type text not null,         -- 'csv', 'pdf', 'api', 'manual'
  state text,                        -- 'ME', 'NH', or null for multi-state
  fiscal_year integer,
  fetched_at timestamptz not null default now(),
  row_count integer default 0
);

create index if not exists idx_data_sources_key on data_sources(source_key);

-- ============================================================
-- 2. town_financials table — non-budget metrics (revenue sharing, tax rates, etc.)
-- ============================================================
create table if not exists town_financials (
  id uuid primary key default uuid_generate_v4(),
  town_id uuid not null references towns(id) on delete cascade,
  fiscal_year integer not null,
  metric_key text not null,          -- e.g. 'revenue_sharing', 'tax_rate', 'full_value_tax_rate'
  metric_value numeric not null default 0,
  source_id uuid references data_sources(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_town_financials_town on town_financials(town_id);
create index if not exists idx_town_financials_metric on town_financials(metric_key);

-- ============================================================
-- 3. Add columns to existing tables
-- ============================================================

-- Add county and source_id to towns
alter table towns add column if not exists county text;
alter table towns add column if not exists source_id uuid references data_sources(id) on delete set null;

-- Add source_id to budget_line_items
alter table budget_line_items add column if not exists source_id uuid references data_sources(id) on delete set null;

-- ============================================================
-- 4. Unique constraint on towns(name, state) for upsert support
-- ============================================================
-- Drop if exists first to make idempotent
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'towns_name_state_unique'
  ) then
    alter table towns add constraint towns_name_state_unique unique (name, state);
  end if;
end $$;

-- ============================================================
-- 5. RLS policies for new tables
-- ============================================================
alter table data_sources enable row level security;
alter table town_financials enable row level security;

-- Allow anonymous read/write for development (tighten for production)
create policy "Allow all on data_sources" on data_sources for all using (true) with check (true);
create policy "Allow all on town_financials" on town_financials for all using (true) with check (true);
