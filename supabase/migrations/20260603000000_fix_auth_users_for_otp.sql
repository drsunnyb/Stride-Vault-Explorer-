-- 20260603000000_fix_auth_users_for_otp.sql
--
-- Fix magic-link sign-in. The waitlist signup RPC creates stub auth.users
-- rows that GoTrue's OTP flow can't use because:
--   1. email_confirmed_at is NULL (GoTrue refuses to send OTPs to unconfirmed
--      addresses when mailer_allow_unverified_email_sign_ins=false)
--   2. There's no matching row in auth.identities (which GoTrue uses to
--      resolve the user during OTP)
--
-- Two changes here:
--   A) Backfill confirmation + identity rows for the two surviving real users
--   B) Update join_waitlist_anon so future signups create them correctly
--   C) Leave the FK and PK intact -- no schema churn

begin;

-- A) Backfill confirmation + token fields for existing real users so OTP works.
-- GoTrue's user-lookup query reads confirmation_token/recovery_token/etc. as
-- non-nullable Go strings; NULL crashes the scan ("converting NULL to string
-- is unsupported"). Set them to empty strings.
update auth.users
   set email_confirmed_at         = now(),
       confirmation_sent_at       = now(),
       confirmation_token         = coalesce(confirmation_token, ''),
       recovery_token             = coalesce(recovery_token, ''),
       email_change               = coalesce(email_change, ''),
       email_change_token_new     = coalesce(email_change_token_new, ''),
       email_change_token_current = coalesce(email_change_token_current, ''),
       phone_change               = coalesce(phone_change, ''),
       phone_change_token         = coalesce(phone_change_token, ''),
       reauthentication_token     = coalesce(reauthentication_token, ''),
       raw_app_meta_data          = coalesce(raw_app_meta_data, '{}'::jsonb)
         || jsonb_build_object('provider','email','providers',jsonb_build_array('email'))
 where email_confirmed_at is null
    or confirmation_token is null
    or recovery_token is null;

-- Create identity rows so GoTrue can find users by email for OTP
insert into auth.identities (
  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(),
  u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email',
  u.email,
  null,
  now(),
  now()
from auth.users u
where not exists (
  select 1 from auth.identities i
  where i.user_id = u.id and i.provider = 'email'
);

-- B) Update join_waitlist_anon to insert proper auth.users + identity rows
create or replace function public.join_waitlist_anon(
  p_email text,
  p_referral_code text default null,
  p_cohort text default null,
  p_borough text default null
)
returns table(
  queue_position int,
  cohort text,
  referral_valid boolean,
  referrals_count int,
  share_code text
)
language plpgsql
security definer
set search_path = 'public'
as $fn$
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

  v_cohort := case
    when p_cohort in ('01','01-priority','priority') then '01'
    else 'waitlist'
  end;

  -- Idempotent path
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

  -- Resolve referrer
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

  v_user_id := gen_random_uuid();

  -- Create auth.users row with all fields GoTrue needs for OTP sign-in.
  -- NB: confirmation_token, recovery_token, and the email/phone change/token
  -- columns must be empty strings (not NULL) or GoTrue's user-lookup will
  -- panic ("converting NULL to string is unsupported").
  insert into auth.users (
    id, instance_id, aud, role, email,
    email_confirmed_at, confirmation_sent_at,
    confirmation_token, recovery_token,
    email_change, email_change_token_new, email_change_token_current,
    phone_change, phone_change_token, reauthentication_token,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) values (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    v_email,
    now(), now(),
    '', '',
    '', '', '',
    '', '', '',
    jsonb_build_object('provider','email','providers',jsonb_build_array('email')),
    '{}'::jsonb,
    now(), now()
  )
  on conflict (id) do nothing;

  -- And the matching identity row so GoTrue.signInWithOtp can find them
  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(),
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
    'email',
    v_email,
    null,
    now(), now()
  )
  on conflict do nothing;

  -- Allocate next queue position atomically
  perform pg_advisory_xact_lock(hashtext('sq_waitlist_seq'));
  select coalesce(max(p.queue_position), 0) + 1
    into v_queue_position
    from public.profiles p
   where p.cohort = v_cohort;

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
  end if;

  return query select
    v_queue_position::int,
    v_cohort::text,
    v_referral_valid::boolean,
    0::int,
    v_my_share_code::text;
end;
$fn$;

commit;
