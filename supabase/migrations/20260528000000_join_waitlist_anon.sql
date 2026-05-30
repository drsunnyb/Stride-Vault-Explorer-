-- =====================================================================
-- Stride Quest — Anonymous waitlist signup RPC
--
-- The 20260527 join_waitlist requires auth.uid() (post magic-link signup).
-- For the pre-launch landing page, users submit email-only — no auth yet.
-- This RPC accepts an anonymous signup, creates a stub auth.users row,
-- creates the profile, allocates queue_position atomically, and returns
-- the queue position.
--
-- When the user later confirms via magic link / first app login, the
-- existing user_id (already in auth.users) is reused — no duplicate.
--
-- This is SECURITY DEFINER and callable by anon. Email is the natural key.
-- =====================================================================

begin;

create or replace function public.join_waitlist_anon(
  p_email         text,
  p_referral_code text default null,
  p_cohort        text default null,
  p_borough       text default null
)
returns table (
  queue_position int,
  cohort         text,
  referral_valid boolean
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
begin
  -- Basic email validation
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid email';
  end if;

  -- Coerce cohort to allowed enum (table CHECK constraint)
  v_cohort := case
    when p_cohort in ('01', '01-priority', 'priority') then '01'
    else 'waitlist'
  end;

  -- Idempotent: same email already signed up?
  select p.user_id, p.queue_position, p.cohort
    into v_existing
    from public.profiles p
   where p.email = v_email
   limit 1;

  if found then
    return query select v_existing.queue_position, v_existing.cohort, false;
    return;
  end if;

  -- Resolve referrer if code provided
  if p_referral_code is not null and length(trim(p_referral_code)) > 0
     and trim(p_referral_code) <> '(none)' then
    select p.user_id into v_referrer
      from public.profiles p
     where p.referral_code = upper(trim(p_referral_code))
     limit 1;
    if v_referrer is not null then
      v_referral_valid := true;
    end if;
  end if;

  -- Create a stub auth.users row so the FK on profiles.user_id holds.
  -- Email confirmation / password / magic-link is handled later by the
  -- app's normal auth flow; here we just reserve the row.
  v_user_id := gen_random_uuid();
  insert into auth.users (id, email, instance_id, aud, role, created_at, updated_at)
  values (
    v_user_id,
    v_email,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  )
  on conflict (id) do nothing;

  -- Allocate next queue position atomically (advisory lock to serialise
  -- concurrent inserts; cheap at waitlist scale).
  perform pg_advisory_xact_lock(hashtext('sq_waitlist_seq'));
  select coalesce(max(p.queue_position), 0) + 1
    into v_queue_position
    from public.profiles p
   where p.cohort = v_cohort;

  insert into public.profiles (
    user_id, email, borough, cohort, queue_position,
    waitlist_joined_at, referred_by, referral_code, membership_tier
  ) values (
    v_user_id, v_email, p_borough, v_cohort, v_queue_position,
    now(), v_referrer,
    upper(substring(md5(v_user_id::text || clock_timestamp()::text) from 1 for 8)),
    'free'
  );

  if v_referrer is not null then
    insert into public.referrals (referrer_user_id, referred_user_id, referral_code)
    values (v_referrer, v_user_id, upper(trim(p_referral_code)))
    on conflict do nothing;
  end if;

  return query select v_queue_position, v_cohort, v_referral_valid;
end;
$$;

revoke all  on function public.join_waitlist_anon(text, text, text, text) from public;
grant execute on function public.join_waitlist_anon(text, text, text, text) to anon, authenticated;

comment on function public.join_waitlist_anon is
  'Anonymous pre-launch waitlist signup. Idempotent on email. Allocates queue_position atomically. Creates stub auth.users row for FK.';

commit;
