-- LCA posting intranet — schema
-- Run once in the Supabase SQL editor (Dashboard → SQL → New query → Run),
-- or via `supabase db` with the project's DB connection string.
--
-- Records each H-1B Labor Condition Application (LCA) internal electronic
-- notice posting for Cassandra Labs BUILD Fellows, mirroring the OAF "Fellow
-- Workspace" intranet, plus the compliance window and placed/removed
-- confirmations.

create extension if not exists "pgcrypto";

create table if not exists public.lca_postings (
  id                   uuid primary key default gen_random_uuid(),

  -- Displayed on the intranet card
  fellowship_title     text not null,          -- e.g. "Computer Science Fellow — NY"
  fellow_name          text,                   -- H-1B beneficiary named on the LCA (OAF "Employee")
  worksite             text,                   -- optional worksite location from the LCA
  posted_by            text not null,          -- name of the employee who placed the notice
  posted_by_email      text,                   -- account that created the record (audit)

  -- Compliance window
  posting_date         date not null,          -- date the notice was placed
  remains_through      date not null,          -- computed date of the 10th business day
  business_days        int  not null default 10,

  -- Document (stored in the private "lca-documents" bucket)
  document_path        text not null,          -- storage object path
  document_name        text not null,          -- original filename
  document_type        text,                   -- mime type

  -- Confirmations for the Public Access File
  placed_confirmed_at  timestamptz not null default now(),
  removed_at           timestamptz,            -- set when removal is confirmed
  removed_by           text,

  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists lca_postings_posting_date_idx
  on public.lca_postings (posting_date desc);

-- keep updated_at fresh
create or replace function public.lca_postings_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists lca_postings_updated_at on public.lca_postings;
create trigger lca_postings_updated_at
  before update on public.lca_postings
  for each row execute function public.lca_postings_set_updated_at();

-- All reads/writes go through the Next.js server using the service-role key,
-- which bypasses RLS. Enable RLS with no anon/authenticated policies so the
-- table is not directly readable with the public anon key.
alter table public.lca_postings enable row level security;
