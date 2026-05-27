-- =====================================================================
-- Stride Quest — Waitlist & Paid Tiers
-- Adds membership tiers, Stripe integration, founder numbers, cohort
-- segmentation, and the audit/idempotency table for webhook handling.
--
-- Safe to run pre-launch (no production user data yet).
-- RLS-first: every new surface is locked down by default.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. PROFILES — add membership + waitlist columns
-- ---------------------------------------------------------------------

alter table public.profiles
  add column if not exists membership_tier text
    not null default 'free'
    check (membership_tier in ('free', 'stride_plus', 'founder')),
  add column if not exists membership_started_at timestamptz,
  add column if not exists membership_renews_at timestamptz,
  add column if not exists stripe_customer_id text unique,
  add column if not exists stripe_subscription_id text unique,
  add column if not exists founder_number integer unique
    check (founder_number is null or (founder_number between 1 and 100)),
  add column if not exists queue_position integer,
  add column if not exists cohort text
    not null default 'public'
    check (cohort in ('waitlist', '01', 'public')),
  add column if not exists borough text,
  add column if not exists daily_step_goal integer
    not null default 8000
    check (daily_step_goal between 1000 and 100000),
  add column if not exists waitlist_joined_at timestamptz,
  add column if not exists email text;  -- denormalised for waitlist UX; populated on signup

-- Backfill membership_tier from legacy is_plus before we replace it.
update public.profiles
   set membership_tier = 'stride_plus'
 where is_plus = true
   and membership_tier = 'free';

-- Replace is_plus with a generated column so all existing frontends
-- (Expo, web admin, Swift iOS) continue reading it transparently.
alter table public.profiles drop column if exists is_plus;
alter table public.profiles
  add column is_plus boolean
  generated always as (membership_tier in ('stride_plus', 'founder')) stored;

-- Indexes for common waitlist + admin queries
create index if not exists profiles_cohort_idx        on public.profiles (cohort);
create index if not exists profiles_queue_position_idx on public.profiles (queue_position) where queue_position is not null;
create index if not exists profiles_membership_tier_idx on public.profiles (membership_tier);
create index if not exists profiles_borough_idx       on public.profiles (borough) where borough is not null;
create index if not exists profiles_waitlist_joined_idx on public.profiles (waitlist_joined_at) where waitlist_joined_at is not null;

comment on column public.profiles.membership_tier      is 'free | stride_plus | founder. Source of truth for paid status.';
comment on column public.profiles.founder_number       is 'Immutable 1-100. Set once at first founder purchase via founder_seq.';
comment on column public.profiles.queue_position       is 'Waitlist queue order. Becomes a historical badge post-launch.';
comment on column public.profiles.cohort               is 'waitlist (pre-launch) | 01 (founding cohort) | public (post-launch).';
comment on column public.profiles.is_plus              is 'Generated. True when membership_tier is stride_plus or founder. Read-only — do not write.';

-- ---------------------------------------------------------------------
-- 2. FOUNDER_SEQ — race-safe founder number assignment, hard cap 100
-- ---------------------------------------------------------------------

create sequence if not exists public.founder_seq
  start with 1
  minvalue 1
  no maxvalue
  cache 1;

comment on sequence public.founder_seq is
  'Atomic founder-number issuance. Webhook calls allocate_founder_number(); if returned value is null, refund and do not assign.';

-- Wrapper RPC so the webhook can call nextval() via PostgREST (which only
-- exposes functions, not raw sequences). Returns null when the cap is hit
-- so we never assign #101+. service_role only.
create or replace function public.allocate_founder_number()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next integer;
begin
  v_next := nextval('public.founder_seq');
  if v_next > 100 then
    return null;
  end if;
  return v_next;
end;
$$;

revoke all on function public.allocate_founder_number() from public, anon, authenticated;
-- service_role retains execute (bypasses revoke); webhook calls via service key.

-- ---------------------------------------------------------------------
-- 3. MEMBERSHIP_EVENTS — audit trail + Stripe webhook idempotency
-- ---------------------------------------------------------------------

create table if not exists public.membership_events (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(user_id) on delete cascade,
  event_type      text not null check (event_type in (
                    'subscribed', 'renewed', 'cancelled',
                    'upgraded', 'downgraded', 'payment_failed', 'refunded'
                  )),
  tier_from       text,
  tier_to         text,
  stripe_event_id text unique,           -- idempotency key — same webhook twice = no-op
  amount_paid_pence integer,
  currency        text not null default 'GBP',
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists membership_events_user_id_idx    on public.membership_events (user_id);
create index if not exists membership_events_event_type_idx on public.membership_events (event_type);
create index if not exists membership_events_created_at_idx on public.membership_events (created_at desc);

comment on table public.membership_events is
  'Append-only audit log for every paid-tier state change. stripe_event_id is the idempotency key — Stripe retries webhooks, this prevents double-processing.';

-- ---------------------------------------------------------------------
-- 4. RLS — Row Level Security
-- ---------------------------------------------------------------------

alter table public.profiles          enable row level security;
alter table public.membership_events enable row level security;

-- Drop any old policies we're replacing (idempotent)
drop policy if exists profiles_select_own           on public.profiles;
drop policy if exists profiles_select_public_fields on public.profiles;
drop policy if exists profiles_insert_self          on public.profiles;
drop policy if exists profiles_update_own           on public.profiles;
drop policy if exists membership_events_select_own  on public.membership_events;

-- A user can read their own full profile row.
create policy profiles_select_own
  on public.profiles for select
  using (auth.uid() = user_id);

-- A user can insert exactly one profile row for themselves (signup).
create policy profiles_insert_self
  on public.profiles for insert
  with check (auth.uid() = user_id);

-- A user can update their own row, BUT cannot modify monetary / tier /
-- founder / queue fields. Those are server-mediated via the service-role
-- key inside the Stripe webhook only.
create policy profiles_update_own
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    -- Anti-tampering: payload row must match stored sensitive fields.
    -- (Postgres evaluates with_check against the NEW row; we compare to OLD via a trigger below.)
  );

-- Belt-and-braces: a trigger that hard-rejects any client-side attempt
-- to write to the sensitive columns. Service role bypasses RLS entirely
-- so the webhook can still write to them.
create or replace function public.profiles_guard_sensitive_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_setting('role', true) = 'service_role' then
    return new;  -- webhook / admin — allow everything
  end if;

  if new.membership_tier        is distinct from old.membership_tier        then raise exception 'profiles.membership_tier is read-only from client'; end if;
  if new.membership_started_at  is distinct from old.membership_started_at  then raise exception 'profiles.membership_started_at is read-only from client'; end if;
  if new.membership_renews_at   is distinct from old.membership_renews_at   then raise exception 'profiles.membership_renews_at is read-only from client'; end if;
  if new.stripe_customer_id     is distinct from old.stripe_customer_id     then raise exception 'profiles.stripe_customer_id is read-only from client'; end if;
  if new.stripe_subscription_id is distinct from old.stripe_subscription_id then raise exception 'profiles.stripe_subscription_id is read-only from client'; end if;
  if new.founder_number         is distinct from old.founder_number         then raise exception 'profiles.founder_number is read-only from client'; end if;
  if new.queue_position         is distinct from old.queue_position         then raise exception 'profiles.queue_position is read-only from client'; end if;
  if new.cohort                 is distinct from old.cohort                 then raise exception 'profiles.cohort is read-only from client'; end if;
  if new.waitlist_joined_at     is distinct from old.waitlist_joined_at     then raise exception 'profiles.waitlist_joined_at is read-only from client'; end if;
  if new.user_id                is distinct from old.user_id                then raise exception 'profiles.user_id is immutable'; end if;
  if new.created_at             is distinct from old.created_at             then raise exception 'profiles.created_at is immutable'; end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard_sensitive on public.profiles;
create trigger profiles_guard_sensitive
  before update on public.profiles
  for each row execute function public.profiles_guard_sensitive_columns();

-- membership_events: user can read their own history; no client writes.
create policy membership_events_select_own
  on public.membership_events for select
  using (auth.uid() = user_id);
-- No insert/update/delete policy => only service_role can write. Correct.

-- ---------------------------------------------------------------------
-- 5. PUBLIC VIEW — safe leaderboard / counter for the waitlist page
-- ---------------------------------------------------------------------

create or replace view public.waitlist_stats as
select
  count(*) filter (where cohort = 'waitlist')                                                  as waitlist_total,
  count(*) filter (where cohort = '01' and membership_tier = 'founder')                        as founders_claimed,
  greatest(0, 100 - count(*) filter (where cohort = '01' and membership_tier = 'founder'))     as founders_remaining,
  count(*) filter (where cohort = '01' and membership_tier = 'stride_plus')                    as cohort_01_plus_members
from public.profiles;

comment on view public.waitlist_stats is
  'Public counters for the waitlist landing page. No PII. Safe for anon SELECT.';

grant select on public.waitlist_stats to anon, authenticated;

-- ---------------------------------------------------------------------
-- 6. RPC — atomic waitlist signup
-- Called by the waitlist site after magic-link confirmation.
-- ---------------------------------------------------------------------

create or replace function public.join_waitlist(
  p_email           text,
  p_borough         text default null,
  p_display_name    text default null,
  p_referral_code   text default null,
  p_daily_step_goal integer default 8000
)
returns table (
  user_id          uuid,
  queue_position   integer,
  cohort           text,
  founder_number   integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id        uuid := auth.uid();
  v_referrer       uuid;
  v_queue_position integer;
  v_existing       public.profiles%rowtype;
begin
  if v_user_id is null then
    raise exception 'must be authenticated';
  end if;

  -- Resolve referrer (if code provided & valid)
  if p_referral_code is not null and length(trim(p_referral_code)) > 0 then
    select user_id into v_referrer
      from public.profiles
     where referral_code = upper(trim(p_referral_code))
     limit 1;
  end if;

  -- Idempotent: if profile exists, return current state
  select * into v_existing from public.profiles where profiles.user_id = v_user_id;
  if found then
    return query
      select v_existing.user_id, v_existing.queue_position, v_existing.cohort, v_existing.founder_number;
    return;
  end if;

  -- Allocate next queue position atomically
  select coalesce(max(profiles.queue_position), 0) + 1
    into v_queue_position
    from public.profiles
   where profiles.cohort = 'waitlist';

  insert into public.profiles (
    user_id, email, display_name, borough, daily_step_goal,
    referred_by, cohort, queue_position, waitlist_joined_at,
    referral_code, membership_tier
  ) values (
    v_user_id, lower(trim(p_email)), p_display_name, p_borough, p_daily_step_goal,
    v_referrer, 'waitlist', v_queue_position, now(),
    -- Simple 8-char referral code; collisions ~zero at waitlist scale
    upper(substring(md5(v_user_id::text || clock_timestamp()::text) from 1 for 8)),
    'free'
  );

  -- Record referral edge (if any)
  if v_referrer is not null then
    insert into public.referrals (referrer_user_id, referred_user_id, referral_code)
    values (v_referrer, v_user_id, upper(trim(p_referral_code)))
    on conflict do nothing;
  end if;

  return query
    select v_user_id, v_queue_position, 'waitlist'::text, null::integer;
end;
$$;

revoke all  on function public.join_waitlist(text, text, text, text, integer) from public;
grant execute on function public.join_waitlist(text, text, text, text, integer) to authenticated;

comment on function public.join_waitlist is
  'Atomic waitlist signup. Idempotent. Auth required. Allocates next queue_position. Resolves referral_code → referred_by.';

commit;
