-- Run this once in the Supabase SQL Editor when you're ready to turn on sync.
--
-- Two tables, both locked down with Row Level Security so that even though the
-- anon key ships inside the app, it can only ever reach rows belonging to the
-- signed-in user. Without RLS this database would be world-readable. Do not
-- skip the `enable row level security` lines.

-- ---------------------------------------------------------------- days

create table if not exists public.days (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  date       text        not null,                 -- "2026-08-18", local date
  data       jsonb       not null,                 -- the whole day record
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

-- The sync engine's pull query is "everything changed since X", so index that.
create index if not exists days_updated_at_idx
  on public.days (user_id, updated_at desc);

alter table public.days enable row level security;

drop policy if exists "days are private" on public.days;
create policy "days are private" on public.days
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------- prefs

create table if not exists public.prefs (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  data       jsonb       not null,                 -- goals, protein weighting
  updated_at timestamptz not null default now(),
  primary key (user_id)
);

alter table public.prefs enable row level security;

drop policy if exists "prefs are private" on public.prefs;
create policy "prefs are private" on public.prefs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------- notes
--
-- Why jsonb instead of real columns for exercises and food?
--
-- Because in v1 the app only ever reads and writes a WHOLE DAY at a time —
-- it never asks "all bench press sets in March". One jsonb blob per day makes
-- sync trivial (one row in, one row out) and there is nothing to migrate when
-- the day shape changes.
--
-- When you build progress tracking, that changes: you'll want to query across
-- days by exerciseId. Two options at that point, neither of which requires
-- touching the app's data model:
--
--   1. Index into the jsonb -- Postgres can do this today:
--        create index on days using gin ((data -> 'workout' -> 'exercises'));
--      Good enough for a few years of one person's training.
--
--   2. Add a proper `sets` table and a trigger that flattens data->workout
--      into it on write. More work, but then the charts are plain SQL.
--
-- Start with option 1.
