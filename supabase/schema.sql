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

-- ============================================================
-- Social layer: friends / family connections.
-- The `wellness` table above stays fully private — friends never touch it.
-- They can only read a small, curated snapshot (`shared_summary`), and only
-- the part each person chooses to share (summary vs detail).
-- ============================================================

-- A shareable @handle so people can find each other.
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text,
  created_at   timestamptz not null default now()
);

-- A request that becomes a two-way link once accepted. Each side independently
-- sets how much they share with the other ('summary' | 'detail').
create table if not exists public.friendships (
  id              uuid primary key default gen_random_uuid(),
  requester       uuid not null references auth.users(id) on delete cascade,
  addressee       uuid not null references auth.users(id) on delete cascade,
  status          text not null default 'pending' check (status in ('pending','accepted','declined')),
  requester_share text not null default 'summary' check (requester_share in ('summary','detail')),
  addressee_share text not null default 'summary' check (addressee_share in ('summary','detail')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (requester, addressee),
  check (requester <> addressee)
);

-- The only thing a friend can ever read. Curated, numbers-only, no journal text.
create table if not exists public.shared_summary (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  summary    jsonb not null default '{}'::jsonb,
  detail     jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.profiles      enable row level security;
alter table public.friendships   enable row level security;
alter table public.shared_summary enable row level security;

-- Read your own profile + anyone you share a friendship row with. Username
-- *search* goes through find_profile() so the whole user list is never exposed.
drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read" on public.profiles
  for select using (
    id = auth.uid()
    or exists (
      select 1 from public.friendships f
      where (f.requester = auth.uid() and f.addressee = profiles.id)
         or (f.addressee = auth.uid() and f.requester = profiles.id)
    )
  );
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (id = auth.uid());
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (id = auth.uid());

drop policy if exists "friendships_read_mine" on public.friendships;
create policy "friendships_read_mine" on public.friendships
  for select using (requester = auth.uid() or addressee = auth.uid());
drop policy if exists "friendships_insert_mine" on public.friendships;
create policy "friendships_insert_mine" on public.friendships
  for insert with check (requester = auth.uid());
drop policy if exists "friendships_update_mine" on public.friendships;
create policy "friendships_update_mine" on public.friendships
  for update using (requester = auth.uid() or addressee = auth.uid());
drop policy if exists "friendships_delete_mine" on public.friendships;
create policy "friendships_delete_mine" on public.friendships
  for delete using (requester = auth.uid() or addressee = auth.uid());

-- Only the owner touches their snapshot row directly. Friends read it solely
-- through get_friend_snapshots(), which gates the `detail` field per share level.
drop policy if exists "summary_owner_all" on public.shared_summary;
create policy "summary_owner_all" on public.shared_summary
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Exact-handle lookup (no user enumeration; at most one row, never yourself).
create or replace function public.find_profile(handle text)
returns table (id uuid, username text, display_name text)
language sql stable security definer set search_path = public
as $$
  select p.id, p.username, p.display_name
  from public.profiles p
  where p.username = lower(trim(handle)) and p.id <> auth.uid()
  limit 1;
$$;

-- For each accepted friend: their summary always; their detail only if THEY
-- chose to share detail with me. This enforces the per-person toggle server-side.
create or replace function public.get_friend_snapshots()
returns table (friend_id uuid, summary jsonb, detail jsonb, updated_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select
    ss.user_id,
    ss.summary,
    case when (
      (f.requester = ss.user_id and f.requester_share = 'detail') or
      (f.addressee = ss.user_id and f.addressee_share = 'detail')
    ) then ss.detail else '{}'::jsonb end,
    ss.updated_at
  from public.friendships f
  join public.shared_summary ss
    on ss.user_id = case when f.requester = auth.uid() then f.addressee else f.requester end
  where f.status = 'accepted'
    and (f.requester = auth.uid() or f.addressee = auth.uid());
$$;

-- These helpers are for signed-in users only — never anonymous callers.
revoke execute on function public.find_profile(text) from public, anon;
revoke execute on function public.get_friend_snapshots() from public, anon;
grant execute on function public.find_profile(text) to authenticated;
grant execute on function public.get_friend_snapshots() to authenticated;

-- ===========================================================================
-- Web-Push reminders: one row per device/browser that opted into reminders.
-- RLS limits each user to their own rows; the reminder cron uses the service
-- role (which bypasses RLS) to read every enabled subscription.
-- ===========================================================================
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  tz text,
  enabled boolean not null default true,
  last_sent_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "select own push subs" on public.push_subscriptions for select using (auth.uid() = user_id);
create policy "insert own push subs" on public.push_subscriptions for insert with check (auth.uid() = user_id);
create policy "update own push subs" on public.push_subscriptions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own push subs" on public.push_subscriptions for delete using (auth.uid() = user_id);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);
create index if not exists push_subscriptions_enabled_idx on public.push_subscriptions(enabled) where enabled;
