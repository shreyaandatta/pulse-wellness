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

-- ===========================================================================
-- Family (Pulse Plus): a household with up to two heads (parents) and many
-- kids. Heads can read each member's curated daily snapshot (full detail) so
-- parents can see their kids' steps, calories, protein, workouts and mood.
--
-- It rides the SAME privacy rails as Friends: members publish only the curated
-- `shared_summary` row (numbers, no journal text). Family heads read it through
-- a security-definer RPC; the raw `wellness` row is never exposed.
-- ===========================================================================

create table if not exists public.families (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 40),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- One row per (family, person). `status` is 'pending' until the invitee accepts.
create table if not exists public.family_members (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references public.families(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'kid'    check (role in ('head','kid')),
  status     text not null default 'pending' check (status in ('pending','active')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (family_id, user_id)
);
create index if not exists family_members_user_idx   on public.family_members(user_id);
create index if not exists family_members_family_idx on public.family_members(family_id);

-- SECURITY DEFINER helpers so the RLS policies below can ask "is the caller a
-- member / head of this family?" without recursively re-triggering RLS on
-- family_members itself.
create or replace function public.is_family_member(fid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.family_members m
    where m.family_id = fid and m.user_id = auth.uid() and m.status = 'active'
  );
$$;

create or replace function public.is_family_head(fid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.family_members m
    where m.family_id = fid and m.user_id = auth.uid()
      and m.status = 'active' and m.role = 'head'
  );
$$;

alter table public.families       enable row level security;
alter table public.family_members enable row level security;

-- families: members read; the creator makes one; heads rename/disband.
drop policy if exists "families_read" on public.families;
create policy "families_read" on public.families
  for select using (created_by = auth.uid() or public.is_family_member(id));
drop policy if exists "families_insert" on public.families;
create policy "families_insert" on public.families
  for insert with check (created_by = auth.uid());
drop policy if exists "families_update_head" on public.families;
create policy "families_update_head" on public.families
  for update using (public.is_family_head(id)) with check (public.is_family_head(id));
drop policy if exists "families_delete_head" on public.families;
create policy "families_delete_head" on public.families
  for delete using (public.is_family_head(id));

-- family_members: see your own row + the roster of any family you're active in.
drop policy if exists "fm_read" on public.family_members;
create policy "fm_read" on public.family_members
  for select using (user_id = auth.uid() or public.is_family_member(family_id));
-- insert: the family creator seeds their own head row, or a head invites others.
drop policy if exists "fm_insert" on public.family_members;
create policy "fm_insert" on public.family_members
  for insert with check (
    (user_id = auth.uid()
      and exists (select 1 from public.families f where f.id = family_id and f.created_by = auth.uid()))
    or public.is_family_head(family_id)
  );
-- update: a head manages members; an invitee can accept their own pending row.
drop policy if exists "fm_update" on public.family_members;
create policy "fm_update" on public.family_members
  for update using (public.is_family_head(family_id) or user_id = auth.uid())
            with check (public.is_family_head(family_id) or user_id = auth.uid());
-- delete: a head removes a member; anyone can remove themselves (leave).
drop policy if exists "fm_delete" on public.family_members;
create policy "fm_delete" on public.family_members
  for delete using (public.is_family_head(family_id) or user_id = auth.uid());

-- At most two heads per family (parents). Kids are unlimited.
create or replace function public.enforce_max_two_heads()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role = 'head' then
    if (select count(*) from public.family_members
        where family_id = new.family_id and role = 'head' and id <> new.id) >= 2 then
      raise exception 'A family can have at most two heads.';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists family_members_max_heads on public.family_members;
create trigger family_members_max_heads
  before insert or update on public.family_members
  for each row execute function public.enforce_max_two_heads();
-- This is a trigger function only — it must never be a callable RPC endpoint.
-- (Triggers still fire after this; EXECUTE grants don't gate trigger execution.)
revoke execute on function public.enforce_max_two_heads() from public, anon, authenticated;

-- Roster of every family the caller is ACTIVE in (with each member's profile).
-- Goes through this function so we don't have to widen the profiles RLS policy.
create or replace function public.get_family_overview()
returns table (family_id uuid, family_name text, created_by uuid,
  member_id uuid, member_user_id uuid, role text, status text, username text, display_name text)
language sql stable security definer set search_path = public as $$
  select f.id, f.name, f.created_by, m.id, m.user_id, m.role, m.status, p.username, p.display_name
  from public.family_members me
  join public.families f       on f.id = me.family_id
  join public.family_members m on m.family_id = f.id
  left join public.profiles p  on p.id = m.user_id
  where me.user_id = auth.uid() and me.status = 'active';
$$;

-- Pending invites addressed to the caller (family name + who invited them).
create or replace function public.get_family_invites()
returns table (member_id uuid, family_id uuid, family_name text, invited_by_name text, role text)
language sql stable security definer set search_path = public as $$
  select m.id, f.id, f.name,
         coalesce(ip.display_name, ip.username, 'A family head'), m.role
  from public.family_members m
  join public.families f      on f.id = m.family_id
  left join public.profiles ip on ip.id = m.invited_by
  where m.user_id = auth.uid() and m.status = 'pending';
$$;

-- For a head: each active member's snapshot, with FULL detail (heads always see
-- detail — that's the whole point of Family). Reads the curated shared_summary,
-- never the raw wellness row.
create or replace function public.get_family_snapshots()
returns table (family_id uuid, member_user_id uuid, summary jsonb, detail jsonb, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select m.family_id, m.user_id, ss.summary, ss.detail, ss.updated_at
  from public.family_members me
  join public.family_members m  on m.family_id = me.family_id
  join public.shared_summary ss on ss.user_id = m.user_id
  where me.user_id = auth.uid() and me.status = 'active' and me.role = 'head'
    and m.status = 'active';
$$;

revoke execute on function public.get_family_overview()  from public, anon;
revoke execute on function public.get_family_invites()   from public, anon;
revoke execute on function public.get_family_snapshots() from public, anon;
revoke execute on function public.is_family_member(uuid) from public, anon;
revoke execute on function public.is_family_head(uuid)   from public, anon;
grant execute on function public.get_family_overview()  to authenticated;
grant execute on function public.get_family_invites()   to authenticated;
grant execute on function public.get_family_snapshots() to authenticated;
grant execute on function public.is_family_member(uuid) to authenticated;
grant execute on function public.is_family_head(uuid)   to authenticated;

-- ===========================================================================
-- CHALLENGES (migration: challenges) — time-boxed shared goals across friends/
-- family. Each member's client writes its OWN daily progress row (value + whether
-- that day's goal was hit); the leaderboard aggregates those. The raw wellness
-- row is never exposed. Creating needs Plus (client-gated); joining is free.
-- ===========================================================================
create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 50),
  metric text not null check (metric in ('steps','active','score','goals')),
  goal numeric,                              -- optional daily target; null = pure ranking
  starts date not null default (now() at time zone 'utc')::date,
  ends date not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (ends >= starts)
);

create table if not exists public.challenge_members (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'invited' check (status in ('invited','active')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (challenge_id, user_id)
);
create index if not exists challenge_members_user_idx on public.challenge_members(user_id);
create index if not exists challenge_members_chal_idx on public.challenge_members(challenge_id);

-- One row per (challenge, person, day): that person's own value + goal-hit flag.
create table if not exists public.challenge_progress (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  value numeric not null default 0,
  hit boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (challenge_id, user_id, day)
);
create index if not exists challenge_progress_chal_idx on public.challenge_progress(challenge_id);

-- SECURITY DEFINER helper to break RLS recursion on challenge_members.
create or replace function public.is_challenge_member(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.challenge_members m
    where m.challenge_id = cid and m.user_id = auth.uid() and m.status = 'active');
$$;

alter table public.challenges enable row level security;
alter table public.challenge_members enable row level security;
alter table public.challenge_progress enable row level security;

-- challenges: members + creator read; creator makes/edits/deletes.
drop policy if exists "ch_read" on public.challenges;
create policy "ch_read" on public.challenges for select using (created_by = auth.uid() or public.is_challenge_member(id));
drop policy if exists "ch_insert" on public.challenges;
create policy "ch_insert" on public.challenges for insert with check (created_by = auth.uid());
drop policy if exists "ch_update" on public.challenges;
create policy "ch_update" on public.challenges for update using (created_by = auth.uid()) with check (created_by = auth.uid());
drop policy if exists "ch_delete" on public.challenges;
create policy "ch_delete" on public.challenges for delete using (created_by = auth.uid());

-- members: own row + roster of challenges you're in; creator invites/manages,
-- invitee accepts/leaves their own row.
drop policy if exists "cm_read" on public.challenge_members;
create policy "cm_read" on public.challenge_members for select using (user_id = auth.uid() or public.is_challenge_member(challenge_id));
drop policy if exists "cm_insert" on public.challenge_members;
create policy "cm_insert" on public.challenge_members for insert with check (exists (select 1 from public.challenges c where c.id = challenge_id and c.created_by = auth.uid()));
drop policy if exists "cm_update" on public.challenge_members;
create policy "cm_update" on public.challenge_members for update using (user_id = auth.uid() or exists (select 1 from public.challenges c where c.id = challenge_id and c.created_by = auth.uid())) with check (user_id = auth.uid() or exists (select 1 from public.challenges c where c.id = challenge_id and c.created_by = auth.uid()));
drop policy if exists "cm_delete" on public.challenge_members;
create policy "cm_delete" on public.challenge_members for delete using (user_id = auth.uid() or exists (select 1 from public.challenges c where c.id = challenge_id and c.created_by = auth.uid()));

-- progress: any active member reads all rows (the leaderboard); you write only your own.
drop policy if exists "cp_read" on public.challenge_progress;
create policy "cp_read" on public.challenge_progress for select using (public.is_challenge_member(challenge_id));
drop policy if exists "cp_insert" on public.challenge_progress;
create policy "cp_insert" on public.challenge_progress for insert with check (user_id = auth.uid() and public.is_challenge_member(challenge_id));
drop policy if exists "cp_update" on public.challenge_progress;
create policy "cp_update" on public.challenge_progress for update using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_challenge_member(challenge_id));
drop policy if exists "cp_delete" on public.challenge_progress;
create policy "cp_delete" on public.challenge_progress for delete using (user_id = auth.uid());

-- Read RPCs (security definer; revoked from anon, granted to authenticated).
create or replace function public.get_my_challenges()
returns table (id uuid, title text, metric text, goal numeric, starts date, ends date, created_by uuid, member_count bigint)
language sql stable security definer set search_path = public as $$
  select c.id, c.title, c.metric, c.goal, c.starts, c.ends, c.created_by,
    (select count(*) from public.challenge_members m2 where m2.challenge_id = c.id and m2.status='active')
  from public.challenge_members me join public.challenges c on c.id = me.challenge_id
  where me.user_id = auth.uid() and me.status = 'active';
$$;

create or replace function public.get_challenge_invites()
returns table (member_id uuid, challenge_id uuid, title text, metric text, ends date, invited_by_name text)
language sql stable security definer set search_path = public as $$
  select m.id, c.id, c.title, c.metric, c.ends, coalesce(ip.display_name, ip.username, 'A friend')
  from public.challenge_members m join public.challenges c on c.id = m.challenge_id
  left join public.profiles ip on ip.id = m.invited_by
  where m.user_id = auth.uid() and m.status = 'invited';
$$;

create or replace function public.get_challenge_standings(cid uuid)
returns table (user_id uuid, username text, display_name text, total numeric, days_hit bigint, today_value numeric)
language sql stable security definer set search_path = public as $$
  select m.user_id, p.username, p.display_name,
    coalesce(sum(pr.value),0), coalesce(count(*) filter (where pr.hit),0),
    coalesce(max(pr.value) filter (where pr.day = (now() at time zone 'utc')::date), 0)
  from public.challenge_members m
  left join public.profiles p on p.id = m.user_id
  left join public.challenge_progress pr on pr.challenge_id = m.challenge_id and pr.user_id = m.user_id
  where m.challenge_id = cid and m.status = 'active' and public.is_challenge_member(cid)
  group by m.user_id, p.username, p.display_name;
$$;

revoke execute on function public.is_challenge_member(uuid)       from public, anon;
revoke execute on function public.get_my_challenges()             from public, anon;
revoke execute on function public.get_challenge_invites()         from public, anon;
revoke execute on function public.get_challenge_standings(uuid)   from public, anon;
grant execute on function public.is_challenge_member(uuid)        to authenticated;
grant execute on function public.get_my_challenges()              to authenticated;
grant execute on function public.get_challenge_invites()          to authenticated;
grant execute on function public.get_challenge_standings(uuid)    to authenticated;

-- ============================================================
-- Sparks wallet (the engagement economy).
-- Server-authoritative: a signed-in user may READ their own wallet, but only
-- the service-role server functions ever WRITE it. There is deliberately no
-- insert/update/delete policy, so a tampered client cannot change a real
-- balance, grant itself items, or fake a purchase. Earns are recomputed
-- server-side from the user's own data under a per-day cap (see lib/economy.js).
-- ============================================================

create table if not exists public.wallets (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,   -- the wallet shape (balance, owned, equipped, claims…)
  updated_at timestamptz not null default now()
);

alter table public.wallets enable row level security;

-- READ own only. No write policy → writes are service-role (server) only.
drop policy if exists "wallets_select_own" on public.wallets;
create policy "wallets_select_own" on public.wallets
  for select using (auth.uid() = user_id);
