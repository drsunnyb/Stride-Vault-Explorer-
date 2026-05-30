-- =====================================================================
-- Stride Quest — Bootstrap baseline schema
-- Creates the minimum tables/columns that the 20260527 migration assumes
-- already exist (profiles + referrals). Safe to run on a fresh project.
-- The next migration tightens RLS and adds the membership/waitlist columns.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- profiles — keyed on auth.users(id) via user_id column (legacy convention)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  email          text,
  display_name   text,
  referral_code  text unique,
  referred_by    uuid references public.profiles(user_id) on delete set null,
  is_plus        boolean not null default false
);

create index if not exists profiles_referral_code_idx on public.profiles (referral_code) where referral_code is not null;
create index if not exists profiles_referred_by_idx   on public.profiles (referred_by)   where referred_by   is not null;

comment on table public.profiles is
  'Stride Quest user profile, 1:1 with auth.users. Bootstrapped by 20260526; extended by 20260527.';

-- Permissive RLS for bootstrap — the 20260527 migration replaces these policies.
alter table public.profiles enable row level security;

drop policy if exists profiles_bootstrap_all on public.profiles;
create policy profiles_bootstrap_all
  on public.profiles for all
  using (true) with check (true);

-- ---------------------------------------------------------------------
-- referrals — edge table for creator-code → new-signup attribution
-- ---------------------------------------------------------------------
create table if not exists public.referrals (
  id                uuid primary key default gen_random_uuid(),
  referrer_user_id  uuid not null references public.profiles(user_id) on delete cascade,
  referred_user_id  uuid not null references public.profiles(user_id) on delete cascade,
  referral_code     text not null,
  created_at        timestamptz not null default now(),
  unique (referrer_user_id, referred_user_id)
);

create index if not exists referrals_referrer_idx on public.referrals (referrer_user_id);
create index if not exists referrals_referred_idx on public.referrals (referred_user_id);
create index if not exists referrals_code_idx     on public.referrals (referral_code);

alter table public.referrals enable row level security;

drop policy if exists referrals_select_own on public.referrals;
create policy referrals_select_own
  on public.referrals for select
  using (auth.uid() = referrer_user_id or auth.uid() = referred_user_id);
-- No client write policy — service_role / SECURITY DEFINER RPCs only.

commit;
