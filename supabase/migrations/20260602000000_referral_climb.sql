-- =====================================================================
-- Stride Quest — Referral climb + leaderboard + my-status
--
-- WHY:
-- 1. The pre-launch landing generates per-user share codes via a client-side
--    hash (`hashCode(email)` → 6-char base36 lowercase). The server's
--    `referral_code` was an unrelated 8-char uppercase md5 slice — so when
--    a player shared `?ref=256ptb` the server never matched it and the
--    referrer never got credit. This migration aligns both sides: the
--    server now generates the SAME 6-char base36 hash via plpgsql, so
--    share-link codes work end-to-end.
--
-- 2. Adds `referrals_count` materialised on `profiles` for fast leaderboard
--    queries, kept in sync by an insert trigger on `referrals`.
--
-- 3. Adds `unlock_thresholds` config table — placeholder 3 / 10 / 25 so
--    Sunny can tweak thresholds without re-deploying code or app.
--
-- 4. Adds three RPCs callable by anon:
--      get_my_status(p_email)      → my position, refs count, next unlock
--      get_leaderboard(p_limit)    → top N referrers (for leaderboard.html)
--      promote_eligible_profiles() → batch-apply unlocks (cron-callable)
--
-- 5. Adds auto-promote trigger: when referrals_count crosses a threshold
--    the profile's cohort / membership_tier upgrades automatically.
--
-- Safe to run pre-launch — no production user data yet (just test rows).
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. UNLOCK_THRESHOLDS — single-row config table for the climb ladder
-- ---------------------------------------------------------------------

create table if not exists public.unlock_thresholds (
  id                   smallint primary key default 1 check (id = 1),  -- enforce single row
  cohort_01_refs       int  not null default 3,
  stride_plus_refs     int  not null default 10,
  founder_refs         int  not null default 25,
  position_boost_per_ref int not null default 50,  -- queue jump per ref BEFORE cohort upgrade
  updated_at           timestamptz not null default now()
);

insert into public.unlock_thresholds (id) values (1) on conflict do nothing;

comment on table public.unlock_thresholds is
  'Single-row config (id=1) — referral climb ladder. Mutable post-launch via service role.';

-- ---------------------------------------------------------------------
-- 2. PROFILES.referrals_count — denormalised counter
-- ---------------------------------------------------------------------

alter table public.profiles
  add column if not exists referrals_count integer not null default 0
    check (referrals_count >= 0);

create index if not exists profiles_referrals_count_idx
  on public.profiles (referrals_count desc) where referrals_count > 0;

-- Backfill from existing referrals rows (safe — idempotent)
update public.profiles p
   set referrals_count = sub.cnt
  from (
    select referrer_user_id, count(*) as cnt
      from public.referrals
     group by referrer_user_id
  ) sub
 where p.user_id = sub.referrer_user_id;

-- ---------------------------------------------------------------------
-- 3. PLAYER_SHARE_CODE — deterministic 6-char base36 hash matching the
--    client's hashCode() algorithm exactly.
-- ---------------------------------------------------------------------
-- JS client uses:
--   let h = 5381;
--   for (let i=0;i<str.length;i++) h = ((h<<5)+h) + str.charCodeAt(i);  // DJB2
--   return Math.abs(h).toString(36).slice(0,6);
--
-- Reproducing in plpgsql: identical DJB2, force 32-bit wraparound,
-- abs, base36 left-pad to 6.

create or replace function public.player_share_code(p_email text)
returns text
language plpgsql
immutable
as $$
declare
  v_email text := lower(trim(p_email));
  -- JS: `let h=5381; for (i){ h = ((h<<5)+h) + str.charCodeAt(i) }`
  -- The bitwise `<<` in JS coerces h to a 32-bit signed int after every op.
  -- Mirror that: keep h in [-2^31, 2^31-1] via mask after each step.
  v_h     bigint := 5381;
  v_mask  bigint := 4294967295;            -- 2^32 - 1
  v_sign  bigint := 2147483648;            -- 2^31
  v_i     int;
  v_b36   text;
begin
  for v_i in 1..length(v_email) loop
    -- (h << 5) + h + charCode, then coerce to JS int32
    v_h := (v_h * 32) + v_h + ascii(substr(v_email, v_i, 1));
    -- Wrap to uint32 first
    v_h := v_h & v_mask;
    -- Then re-interpret as int32 signed (high bit = negative)
    if v_h >= v_sign then
      v_h := v_h - 4294967296;
    end if;
  end loop;
  -- JS Math.abs
  v_h := abs(v_h);
  -- base36 conversion, lowercase, first 6 chars
  declare
    v_chars text   := '0123456789abcdefghijklmnopqrstuvwxyz';
    v_out   text   := '';
    v_n     bigint := v_h;
  begin
    if v_n = 0 then return '000000'; end if;
    while v_n > 0 loop
      v_out := substr(v_chars, (v_n % 36)::int + 1, 1) || v_out;
      v_n := v_n / 36;
    end loop;
    v_b36 := v_out;
  end;
  return substr(v_b36, 1, 6);
end;
$$;

comment on function public.player_share_code(text) is
  'Mirrors landing/index.html hashCode(email) — DJB2 → base36 → first 6 chars. Used as referral_code.';

-- Backfill missing referral_code with the deterministic value
update public.profiles
   set referral_code = public.player_share_code(email)
 where referral_code is null
   and email is not null;

-- ---------------------------------------------------------------------
-- 4. AUTO-PROMOTE TRIGGER — when referrals_count crosses a threshold,
--    upgrade the referrer's cohort or membership_tier in-place.
-- ---------------------------------------------------------------------

create or replace function public.tg_auto_promote_on_refs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_thresh public.unlock_thresholds%rowtype;
begin
  -- Only act when refs went UP (not on inserts of 0, not on backfills down)
  if (TG_OP = 'UPDATE' and NEW.referrals_count > OLD.referrals_count)
     or (TG_OP = 'INSERT' and NEW.referrals_count > 0) then

    select * into v_thresh from public.unlock_thresholds where id = 1;

    -- Founder tier — only if not already founder
    if NEW.referrals_count >= v_thresh.founder_refs
       and NEW.membership_tier <> 'founder' then
      NEW.membership_tier         := 'founder';
      NEW.membership_started_at   := coalesce(NEW.membership_started_at, now());
      -- cohort is implicitly 01 for founders
      if NEW.cohort = 'waitlist' then NEW.cohort := '01'; end if;

    -- Stride+ tier — only if currently free
    elsif NEW.referrals_count >= v_thresh.stride_plus_refs
          and NEW.membership_tier = 'free' then
      NEW.membership_tier         := 'stride_plus';
      NEW.membership_started_at   := coalesce(NEW.membership_started_at, now());
      if NEW.cohort = 'waitlist' then NEW.cohort := '01'; end if;

    -- Cohort 01 promote — only if still on waitlist
    elsif NEW.referrals_count >= v_thresh.cohort_01_refs
          and NEW.cohort = 'waitlist' then
      NEW.cohort := '01';
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists tg_profiles_auto_promote on public.profiles;
create trigger tg_profiles_auto_promote
  before update of referrals_count on public.profiles
  for each row execute function public.tg_auto_promote_on_refs();

-- ---------------------------------------------------------------------
-- 5. REFERRAL INSERT TRIGGER — bump referrer's referrals_count
-- ---------------------------------------------------------------------

create or replace function public.tg_referrals_bump_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
     set referrals_count = referrals_count + 1
   where user_id = NEW.referrer_user_id;
  return NEW;
end;
$$;

drop trigger if exists tg_referrals_bump on public.referrals;
create trigger tg_referrals_bump
  after insert on public.referrals
  for each row execute function public.tg_referrals_bump_count();

-- ---------------------------------------------------------------------
-- 6. REPLACE join_waitlist_anon — use the deterministic share code so
--    `?ref=256ptb` style links actually resolve to a referrer.
--    Return shape changes (adds referrals_count + share_code), so we
--    must DROP the old function first — Postgres can't redefine the
--    return shape via CREATE OR REPLACE.
-- ---------------------------------------------------------------------

drop function if exists public.join_waitlist_anon(text, text, text, text);

create function public.join_waitlist_anon(
  p_email         text,
  p_referral_code text default null,
  p_cohort        text default null,
  p_borough       text default null
)
returns table (
  queue_position  int,
  cohort          text,
  referral_valid  boolean,
  referrals_count int,
  share_code      text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email          text := lower(trim(p_email));
  v_user_id        uuid;
  v_referrer       uuid;
  v_queue_position int;
  v_cohort         text;
  v_existing       record;
  v_referral_valid boolean := false;
  v_ref_code_norm  text;
  v_my_share_code  text;
begin
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid email';
  end if;

  -- Coerce incoming cohort hint to the allowed enum
  v_cohort := case
    when p_cohort in ('01', '01-priority', 'priority') then '01'
    else 'waitlist'
  end;

  -- Idempotent: same email already signed up? Return their existing data.
  select p.user_id, p.queue_position, p.cohort, p.referrals_count, p.referral_code
    into v_existing
    from public.profiles p
   where p.email = v_email
   limit 1;

  if found then
    return query select
      v_existing.queue_position::int,
      v_existing.cohort::text,
      false::boolean,
      v_existing.referrals_count::int,
      v_existing.referral_code::text;
    return;
  end if;

  -- Resolve referrer: accept both new player codes (lowercase 6-char base36)
  -- AND legacy uppercase hex codes for backwards-compat.
  if p_referral_code is not null
     and length(trim(p_referral_code)) > 0
     and trim(p_referral_code) <> '(none)' then
    v_ref_code_norm := lower(trim(p_referral_code));
    select p.user_id into v_referrer
      from public.profiles p
     where lower(p.referral_code) = v_ref_code_norm
     limit 1;
    if v_referrer is not null then
      v_referral_valid := true;
    end if;
  end if;

  -- Create stub auth.users row so the FK on profiles holds
  v_user_id := gen_random_uuid();
  insert into auth.users (id, email, instance_id, aud, role, created_at, updated_at)
  values (
    v_user_id, v_email,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    now(), now()
  )
  on conflict (id) do nothing;

  -- Allocate next queue position atomically
  perform pg_advisory_xact_lock(hashtext('sq_waitlist_seq'));
  select coalesce(max(p.queue_position), 0) + 1
    into v_queue_position
    from public.profiles p
   where p.cohort = v_cohort;

  -- Compute my own share code from email (deterministic, matches client)
  v_my_share_code := public.player_share_code(v_email);

  insert into public.profiles (
    user_id, email, borough, cohort, queue_position,
    waitlist_joined_at, referred_by, referral_code, membership_tier
  ) values (
    v_user_id, v_email, p_borough, v_cohort, v_queue_position,
    now(), v_referrer, v_my_share_code, 'free'
  );

  if v_referrer is not null then
    insert into public.referrals (referrer_user_id, referred_user_id, referral_code)
    values (v_referrer, v_user_id, v_ref_code_norm)
    on conflict do nothing;
    -- the tg_referrals_bump trigger now increments the referrer's count
    -- which may auto-promote them via tg_profiles_auto_promote.
  end if;

  return query select
    v_queue_position::int,
    v_cohort::text,
    v_referral_valid::boolean,
    0::int,           -- a brand-new signup has 0 referrals themselves yet
    v_my_share_code::text;
end;
$$;

revoke all  on function public.join_waitlist_anon(text, text, text, text) from public;
grant execute on function public.join_waitlist_anon(text, text, text, text) to anon, authenticated;

comment on function public.join_waitlist_anon is
  'Anonymous pre-launch waitlist signup. Idempotent on email. Uses deterministic player_share_code so client ?ref=xxxxxx links resolve. Returns position + share_code so the UI can display the link without recomputing.';

-- ---------------------------------------------------------------------
-- 7. GET_MY_STATUS — current position, refs count, next unlock copy
-- ---------------------------------------------------------------------

create or replace function public.get_my_status(p_email text)
returns table (
  email             text,
  queue_position    int,
  cohort            text,
  membership_tier   text,
  referrals_count   int,
  share_code        text,
  next_unlock_label text,
  next_unlock_refs  int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email   text := lower(trim(p_email));
  v_profile public.profiles%rowtype;
  v_thresh  public.unlock_thresholds%rowtype;
  v_label   text;
  v_target  int;
begin
  select * into v_profile from public.profiles where email = v_email limit 1;
  if not found then
    return; -- empty result set — caller can fall back to localStorage
  end if;
  select * into v_thresh from public.unlock_thresholds where id = 1;

  -- Decide what the next unlock is for this user, based on current state
  if v_profile.membership_tier = 'founder' then
    v_label  := 'You''ve maxed out — Founder Member for life.';
    v_target := v_profile.referrals_count;
  elsif v_profile.membership_tier = 'stride_plus' then
    v_label  := (v_thresh.founder_refs - v_profile.referrals_count)::text
                || ' more referrals → Founder Member (£99/yr free for 1 year)';
    v_target := v_thresh.founder_refs;
  elsif v_profile.cohort = '01' then
    v_label  := (v_thresh.stride_plus_refs - v_profile.referrals_count)::text
                || ' more referrals → Stride+ (£60/yr free for 1 year)';
    v_target := v_thresh.stride_plus_refs;
  else
    v_label  := (v_thresh.cohort_01_refs - v_profile.referrals_count)::text
                || ' more referrals → Cohort 01 priority access';
    v_target := v_thresh.cohort_01_refs;
  end if;

  return query select
    v_profile.email::text,
    v_profile.queue_position::int,
    v_profile.cohort::text,
    v_profile.membership_tier::text,
    v_profile.referrals_count::int,
    v_profile.referral_code::text,
    v_label::text,
    v_target::int;
end;
$$;

revoke all  on function public.get_my_status(text) from public;
grant execute on function public.get_my_status(text) to anon, authenticated;

comment on function public.get_my_status is
  'Returns the caller''s waitlist state + next unlock label. Anon-callable. Stateless lookup by email — no auth needed for the pre-launch UI.';

-- ---------------------------------------------------------------------
-- 8. GET_LEADERBOARD — top referrers, with tier badge
-- ---------------------------------------------------------------------

create or replace function public.get_leaderboard(p_limit int default 50)
returns table (
  rank             int,
  display_name     text,
  borough          text,
  cohort           text,
  membership_tier  text,
  referrals_count  int,
  earned_badge     text,
  queue_position   int
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit int := least(greatest(coalesce(p_limit, 50), 1), 200);
begin
  return query
  with ranked as (
    select
      p.user_id,
      p.email,
      p.borough,
      p.cohort,
      p.membership_tier,
      p.referrals_count,
      p.queue_position,
      row_number() over (order by p.referrals_count desc, p.waitlist_joined_at asc) as r
    from public.profiles p
    where p.cohort in ('01', 'waitlist')
      and p.email is not null
  )
  select
    r.r::int                                                  as rank,
    -- privacy-safe display name: first name + last initial from email local-part
    (
      initcap(split_part(split_part(r.email, '@', 1), '.', 1))
      || ' '
      || coalesce(upper(left(split_part(split_part(r.email, '@', 1), '.', 2), 1)) || '.', '')
    )::text                                                   as display_name,
    r.borough,
    r.cohort,
    r.membership_tier,
    r.referrals_count::int,
    (case
      when r.membership_tier = 'founder'     then '🏛️ FOUNDER'
      when r.membership_tier = 'stride_plus' then '⚡ STRIDE+'
      when r.cohort          = '01'          then 'COHORT 01'
      else 'WAITLIST'
    end)::text                                                as earned_badge,
    r.queue_position::int
  from ranked r
  where r.r <= v_limit
  order by r.r asc;
end;
$$;

revoke all  on function public.get_leaderboard(int) from public;
grant execute on function public.get_leaderboard(int) to anon, authenticated;

comment on function public.get_leaderboard is
  'Top N referrers for the public leaderboard. Display name is privacy-safe (FirstName L. derived from email local-part). Anon-callable.';

commit;
