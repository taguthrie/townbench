-- TownBench Database Schema
-- Run this in the Supabase SQL Editor

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Towns table
create table if not exists towns (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  state text not null,
  population integer not null default 0,
  road_miles numeric not null default 0,
  grand_list_valuation numeric not null default 0,
  fiscal_year integer not null default 2024,
  created_at timestamptz not null default now()
);

-- Documents table (uploaded PDFs)
create table if not exists documents (
  id uuid primary key default uuid_generate_v4(),
  town_id uuid not null references towns(id) on delete cascade,
  filename text not null,
  fiscal_year integer not null,
  uploaded_at timestamptz not null default now(),
  raw_text text
);

-- Budget line items table
create table if not exists budget_line_items (
  id uuid primary key default uuid_generate_v4(),
  town_id uuid not null references towns(id) on delete cascade,
  document_id uuid references documents(id) on delete set null,
  fiscal_year integer not null,
  category text not null,
  subcategory text not null,
  line_item text not null,
  amount numeric not null default 0,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_budget_town on budget_line_items(town_id);
create index if not exists idx_budget_category on budget_line_items(category);
create index if not exists idx_budget_fiscal_year on budget_line_items(fiscal_year);
create index if not exists idx_documents_town on documents(town_id);

-- Enable Row Level Security (open for now; tighten for production)
alter table towns enable row level security;
alter table documents enable row level security;
alter table budget_line_items enable row level security;

-- Allow anonymous read/write for development
create policy "Allow all on towns" on towns for all using (true) with check (true);
create policy "Allow all on documents" on documents for all using (true) with check (true);
create policy "Allow all on budget_line_items" on budget_line_items for all using (true) with check (true);
