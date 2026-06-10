-- Pulse cloud storage. Run this once in the Supabase dashboard:
--   SQL Editor → New query → paste this → Run.
-- It creates one table that holds each user's whole Pulse state as JSON, and
-- locks it down with Row Level Security so a signed-in user can only ever read
-- or write their *own* row.

create table if not exists public.wellness (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.wellness enable row level security;

-- Each policy ties access to the logged-in user's id (auth.uid()).
drop policy if exists "wellness_select_own" on public.wellness;
create policy "wellness_select_own" on public.wellness
  for select using (auth.uid() = user_id);

drop policy if exists "wellness_insert_own" on public.wellness;
create policy "wellness_insert_own" on public.wellness
  for insert with check (auth.uid() = user_id);

drop policy if exists "wellness_update_own" on public.wellness;
create policy "wellness_update_own" on public.wellness
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
