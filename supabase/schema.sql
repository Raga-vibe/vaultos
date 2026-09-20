-- VaultOS schema.
--
-- Run this in the Supabase SQL editor once, then set SUPABASE_URL and
-- SUPABASE_SERVICE_ROLE_KEY in .env.local. The app switches from the
-- in-memory store to this automatically; /api/health reports which is active.
--
-- NOTE ON AMOUNTS
-- Atomic amounts are TEXT, not numeric. They routinely exceed what a JSON
-- number holds safely, and a rounded amount is a wrong amount. Conversion to
-- bigint happens once, at the application boundary, in lib/store/supabase.ts.

-- ─── Policy ────────────────────────────────────────────────────────────────
-- A single row, id = 'default'. Stored as JSONB so adding a constraint does
-- not require a migration.
create table if not exists policies (
  id         text primary key,
  data       jsonb       not null,
  updated_at timestamptz not null default now()
);

-- ─── Audit log ─────────────────────────────────────────────────────────────
-- Append-only by intent and by grant: there is no UPDATE or DELETE policy
-- below, so even the service role cannot quietly rewrite history through
-- PostgREST. An audit log you can edit is not an audit log.
create table if not exists audit_events (
  id             bigserial primary key,
  seq            bigint      not null,
  at             timestamptz not null,
  type           text        not null,
  opportunity_id text,
  detail         jsonb       not null default '{}'::jsonb,
  verdict        jsonb
);

create index if not exists audit_events_at_idx on audit_events (at);
create index if not exists audit_events_type_idx on audit_events (type);

-- ─── Executions ────────────────────────────────────────────────────────────
-- The precise facts the policy engine does arithmetic on. Kept separate from
-- audit_events on purpose: deriving a safety limit by filtering log rows
-- would make that limit depend on log formatting.
create table if not exists executions (
  id             bigserial primary key,
  at             timestamptz not null,
  amount_atomic  text        not null,
  opportunity_id text        not null
);

create index if not exists executions_at_idx on executions (at);

-- ─── Open positions ────────────────────────────────────────────────────────
create table if not exists positions (
  id                    text primary key,
  open_exposure_atomic  text not null default '0',
  updated_at            timestamptz not null default now()
);

-- ─── Row level security ────────────────────────────────────────────────────
-- Enabled with no permissive policies for anon or authenticated roles. Only
-- the service role key — which never leaves the server — can read or write.
-- This matters: the anon key is designed to be public, and an audit log or a
-- policy table readable with it would be readable by anyone.
alter table policies     enable row level security;
alter table audit_events enable row level security;
alter table executions   enable row level security;
alter table positions    enable row level security;
