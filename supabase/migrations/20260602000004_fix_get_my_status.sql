-- =====================================================================
-- Fix: get_my_status column-name ambiguity. The OUT parameter `email`
-- collides with profiles.email inside the SELECT.
-- =====================================================================

begin;

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
  -- explicit alias avoids ambiguity with the OUT param `email`
  select p.* into v_profile
    from public.profiles p
   where p.email = v_email
   limit 1;
  if not found then
    return;
  end if;

  select * into v_thresh from public.unlock_thresholds where id = 1;

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

  -- Return rows from variables (no column-name collision)
  email             := v_profile.email;
  queue_position    := v_profile.queue_position;
  cohort            := v_profile.cohort;
  membership_tier   := v_profile.membership_tier;
  referrals_count   := v_profile.referrals_count;
  share_code        := v_profile.referral_code;
  next_unlock_label := v_label;
  next_unlock_refs  := v_target;
  return next;
end;
$$;

commit;
