-- Leaderboard with "you are here" — returns top N rows plus a small window
-- centered on the calling user, so the status page can show everyone where
-- they stand vs the leaders AND vs their direct neighbours on one screen.
--
-- Ranking key: referrals_count DESC, waitlist_joined_at ASC (older signups
-- win ties — same as get_leaderboard()).
--
-- Returns a single result set with TWO logical groups distinguished by
-- the `section` column:
--   'top'    → top N players by referral count (default 5)
--   'window' → user's row + ±N rows around them (default ±2 → 5 rows)
--
-- If the user is already in the top N, the window section is empty
-- (deduped — no need to show their row twice).
--
-- Idempotent. Safe to re-run.

begin;

create or replace function public.get_leaderboard_with_me(
  p_email      text  default null,    -- caller's email (lowercased on lookup)
  p_top        int   default 5,       -- how many top rows to return
  p_window     int   default 2        -- ± rows around the user
)
returns table (
  section          text,    -- 'top' or 'window'
  rank             int,
  display_name     text,
  borough          text,
  cohort           text,
  membership_tier  text,
  referrals_count  int,
  earned_badge     text,
  queue_position   int,
  is_me            boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_top      int := least(greatest(coalesce(p_top, 5), 1), 50);
  v_window   int := least(greatest(coalesce(p_window, 2), 0), 10);
  v_my_rank  int;
begin
  -- Build the ranked CTE once and use it for both sections.
  return query
  with ranked as (
    select
      p.user_id,
      lower(p.email)                        as email_lc,
      p.borough,
      p.cohort,
      p.membership_tier,
      p.referrals_count,
      p.queue_position,
      row_number() over (
        order by p.referrals_count desc, p.waitlist_joined_at asc
      ) as r
    from public.profiles p
    where p.cohort in ('01', 'waitlist')
      and p.email is not null
  ),
  my_row as (
    select r.r as my_rank
    from ranked r
    where p_email is not null
      and r.email_lc = lower(p_email)
    limit 1
  ),
  display as (
    select
      r.*,
      (
        initcap(split_part(split_part(r.email_lc, '@', 1), '.', 1))
        || ' '
        || coalesce(upper(left(split_part(split_part(r.email_lc, '@', 1), '.', 2), 1)) || '.', '')
      )::text                                                    as display_name,
      (case
        when r.membership_tier = 'founder'     then '🏛️ FOUNDER'
        when r.membership_tier = 'stride_plus' then '⚡ STRIDE+'
        when r.cohort          = '01'          then 'COHORT 01'
        else 'WAITLIST'
      end)::text                                                 as earned_badge,
      (my_row.my_rank is not null and r.r = my_row.my_rank)      as is_me_flag
    from ranked r
    left join my_row on true
  )
  -- 'top' section: always the top N
  select
    'top'::text                                                  as section,
    d.r::int                                                     as rank,
    d.display_name,
    d.borough,
    d.cohort,
    d.membership_tier,
    d.referrals_count::int,
    d.earned_badge,
    d.queue_position::int,
    d.is_me_flag                                                 as is_me
  from display d
  where d.r <= v_top
  union all
  -- 'window' section: ±v_window rows around the user's rank,
  -- but ONLY if the user exists AND is NOT already inside the top N
  -- (to avoid showing their row twice on the client).
  select
    'window'::text                                               as section,
    d.r::int                                                     as rank,
    d.display_name,
    d.borough,
    d.cohort,
    d.membership_tier,
    d.referrals_count::int,
    d.earned_badge,
    d.queue_position::int,
    d.is_me_flag                                                 as is_me
  from display d, my_row m
  where d.r between greatest(1, m.my_rank - v_window) and (m.my_rank + v_window)
    and d.r > v_top
  order by section asc, rank asc;
end;
$$;

revoke all  on function public.get_leaderboard_with_me(text, int, int) from public;
grant execute on function public.get_leaderboard_with_me(text, int, int) to anon, authenticated;

comment on function public.get_leaderboard_with_me is
  'Top N referrers + ±window rows centered on the caller (matched by email). Used by /status.html to show "you are here" context on the main dashboard. Anon-callable. Display names are privacy-safe.';

commit;
