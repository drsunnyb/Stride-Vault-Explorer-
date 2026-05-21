import { DEFAULT_BRANDS, REWARDS, type BrandMeta } from "@/constants/rewards";
import { RAFFLES } from "@/constants/raffles";
import type { Raffle, Reward, StakeChallenge } from "@/types/game";

/**
 * Admin-curated weekly challenges (`featured_challenges` table). Different from
 * P2P stake challenges — these are pushed by the founder to give every player
 * a server-side cohort goal (e.g. "Walk 70k steps in 7 days, prize pool 50,000
 * Stride Coins split between top 10"). Schema:
 *
 *   create table featured_challenges (
 *     id text primary key,
 *     title text not null,
 *     subtitle text,
 *     metric text not null,            -- 'steps'|'vaults'|'coins'
 *     duration_days int default 7,
 *     prize_pool_coins int default 5000,
 *     entry_cost_coins int default 0,
 *     cohort_size int default 100,
 *     hero_emoji text default '🏆',
 *     starts_at timestamptz default now(),
 *     ends_at timestamptz not null,
 *     plus_only bool default false,
 *     active bool default true,
 *     sort_order int default 0,
 *     updated_at timestamptz default now()
 *   );
 *
 * And the read-only stake-challenge mirror (mobile pushes, admin reads):
 *
 *   create table stake_challenges (
 *     id text primary key,
 *     title text not null,
 *     created_by text,
 *     created_by_username text,
 *     home_city text,
 *     stake int not null,
 *     metric text not null,
 *     status text not null,
 *     participants jsonb not null default '[]',
 *     created_at timestamptz,
 *     starts_at timestamptz,
 *     ends_at timestamptz,
 *     winner_id text,
 *     payout int,
 *     updated_at timestamptz default now()
 *   );
 *
 * RLS: enable `select for anon` on featured_challenges, `insert/update for anon`
 * on stake_challenges (or use an edge function with the service role later).
 */

/**
 * Lightweight Supabase REST client. We don't pull in @supabase/supabase-js to
 * stay inside Expo Go's dependency surface — instead we hit the auto-generated
 * REST API directly.
 *
 * Admin schema (creator runs in Supabase SQL editor):
 *
 *   create table rewards (
 *     id text primary key,
 *     brand text,
 *     title text not null,
 *     subtitle text,
 *     badge text,
 *     coin_cost int default 0,
 *     brand_cost int,
 *     redeem_at text,
 *     emoji text,
 *     value_gbp int,
 *     in_store_only bool default false,
 *     active bool default true,
 *     updated_at timestamptz default now()
 *   );
 *
 *   create table brands (
 *     id text primary key,
 *     name text not null,
 *     short text not null,
 *     coin_name text not null,
 *     color text not null,
 *     color_bright text not null,
 *     color_dim text not null,
 *     tagline text,
 *     mark text,
 *     inverted_text bool default false,
 *     exchange_rate int default 5,
 *     active bool default true,
 *     sort_order int default 0
 *   );
 *
 *   create table raffles (
 *     id text primary key,
 *     title text not null,
 *     prize text,
 *     prize_value_gbp int,
 *     emoji text,
 *     entry_cost int not null,
 *     brand_entry_cost int,
 *     max_entries_per_user int default 50,
 *     winners int default 1,
 *     ends_at timestamptz not null,
 *     total_entries int default 0,
 *     brand text,
 *     active bool default true
 *   );
 *
 * Enable RLS with a "select for anon" policy on both tables and you're live.
 * Mutations stay locked to the service role (your admin dashboard).
 */

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

function hasSupabase(): boolean {
  return !!SUPABASE_URL && !!SUPABASE_ANON_KEY;
}

async function rest<T>(path: string): Promise<T | null> {
  if (!hasSupabase()) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: {
        apikey: SUPABASE_ANON_KEY ?? "",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    if (!res.ok) {
      console.log("[backend] non-OK", path, res.status);
      return null;
    }
    return (await res.json()) as T;
  } catch (e) {
    console.log("[backend] fetch failed", path, e);
    return null;
  }
}

interface RewardRow {
  id: string;
  brand?: string | null;
  title: string;
  subtitle?: string;
  badge?: string;
  coin_cost?: number;
  brand_cost?: number | null;
  redeem_at?: string;
  emoji?: string;
  value_gbp?: number | null;
  in_store_only?: boolean;
}

interface RaffleRow {
  id: string;
  title: string;
  prize: string;
  prize_value_gbp: number;
  emoji: string;
  entry_cost: number;
  brand_entry_cost?: number | null;
  max_entries_per_user: number;
  winners: number;
  ends_at: string;
  total_entries: number;
  brand?: string | null;
}

/** Fetch live rewards from Supabase, fall back to local catalogue. */
export async function fetchRewards(): Promise<Reward[]> {
  const rows = await rest<RewardRow[]>(
    "rewards?active=eq.true&order=coin_cost.asc"
  );
  if (!rows || rows.length === 0) return REWARDS;
  return rows.map((r) => ({
    id: r.id,
    brand: (r.brand as Reward["brand"]) ?? undefined,
    title: r.title,
    subtitle: r.subtitle ?? "",
    badge: r.badge ?? "",
    coinCost: r.coin_cost ?? 0,
    brandCost: r.brand_cost ?? undefined,
    redeemAt: r.redeem_at ?? "",
    emoji: r.emoji ?? "🎁",
    valueGbp: r.value_gbp ?? undefined,
    inStoreOnly: r.in_store_only ?? false,
  }));
}

/** Fetch live raffles from Supabase, fall back to local catalogue. */
export async function fetchRaffles(): Promise<Raffle[]> {
  const rows = await rest<RaffleRow[]>(
    "raffles?active=eq.true&order=ends_at.asc"
  );
  if (!rows || rows.length === 0) return RAFFLES;
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    prize: r.prize,
    prizeValueGbp: r.prize_value_gbp,
    emoji: r.emoji,
    entryCost: r.entry_cost,
    brandEntryCost: r.brand_entry_cost ?? undefined,
    maxEntriesPerUser: r.max_entries_per_user,
    winners: r.winners,
    endsAt: new Date(r.ends_at).getTime(),
    totalEntries: r.total_entries,
    brand: (r.brand as Raffle["brand"]) ?? undefined,
  }));
}

interface BrandRow {
  id: string;
  name: string;
  short: string;
  coin_name: string;
  color: string;
  color_bright: string;
  color_dim: string;
  tagline?: string | null;
  mark?: string | null;
  inverted_text?: boolean | null;
  exchange_rate?: number | null;
}

export interface BrandsResult {
  brands: BrandMeta[];
  exchangeRates: Record<string, number>;
}

/**
 * Fetch the live brand catalogue. Returns the seed defaults if Supabase isn't
 * configured or the table is empty, so the app stays functional in any state
 * (0 brands, 1 brand, many brands).
 */
export async function fetchBrands(): Promise<BrandsResult> {
  const rows = await rest<BrandRow[]>(
    "brands?active=eq.true&order=sort_order.asc,name.asc"
  );
  if (!rows || rows.length === 0) {
    return {
      brands: DEFAULT_BRANDS,
      exchangeRates: Object.fromEntries(DEFAULT_BRANDS.map((b) => [b.id, 5])),
    };
  }
  const brands: BrandMeta[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    short: r.short,
    coinName: r.coin_name,
    color: r.color,
    colorBright: r.color_bright,
    colorDim: r.color_dim,
    tagline: r.tagline ?? "",
    mark: r.mark ?? "",
    invertedText: !!r.inverted_text,
  }));
  const exchangeRates: Record<string, number> = {};
  for (const r of rows) {
    exchangeRates[r.id] = r.exchange_rate ?? 5;
  }
  return { brands, exchangeRates };
}

// ── Live admin config (hot vaults, power hour, memberships) ─────────────────

/**
 * JSON shapes for the admin-pushed live overrides. Keys live in `app_config`
 * and are managed via the web admin (`/live` and `/memberships`).
 */
export interface HotVaultsOverride {
  vaultIds: string[];
  multiplier: number;
  endsAt: number;
  note?: string;
}
export interface PowerHourOverride {
  multiplier: number;
  startsAt: number;
  endsAt: number;
  note?: string;
}
export interface WaitlistMembership {
  enabled: boolean;
  monthly_gbp: number;
  annual_gbp: number;
  trial_days: number;
  vote_multiplier: number;
  step_value_multiplier: number;
  weekly_free_votes: number;
  headline?: string;
  benefits?: string[];
}

export interface LiveConfig {
  hotVaults: HotVaultsOverride | null;
  powerHour: PowerHourOverride | null;
  membership: WaitlistMembership | null;
}

interface ConfigRow {
  key: string;
  value: unknown;
}

/**
 * Fetch live admin overrides. Safe to call frequently — returns nulls when
 * Supabase isn't configured or rows are missing.
 */
export async function fetchLiveConfig(): Promise<LiveConfig> {
  const rows = await rest<ConfigRow[]>(
    "app_config?key=in.(live_hot_vaults,live_power_hour,waitlist_membership)"
  );
  const out: LiveConfig = { hotVaults: null, powerHour: null, membership: null };
  if (!rows) return out;
  for (const r of rows) {
    if (r.key === "live_hot_vaults") out.hotVaults = (r.value as HotVaultsOverride) ?? null;
    else if (r.key === "live_power_hour") out.powerHour = (r.value as PowerHourOverride) ?? null;
    else if (r.key === "waitlist_membership") out.membership = (r.value as WaitlistMembership) ?? null;
  }
  return out;
}

// ── Featured (admin-curated) challenges ───────────────────────────────────────

export interface FeaturedChallenge {
  id: string;
  title: string;
  subtitle: string;
  metric: "steps" | "vaults" | "coins";
  durationDays: number;
  prizePoolCoins: number;
  entryCostCoins: number;
  cohortSize: number;
  heroEmoji: string;
  startsAt: number;
  endsAt: number;
  plusOnly: boolean;
  sortOrder: number;
}

interface FeaturedChallengeRow {
  id: string;
  title: string;
  subtitle?: string | null;
  metric: "steps" | "vaults" | "coins";
  duration_days?: number;
  prize_pool_coins?: number;
  entry_cost_coins?: number;
  cohort_size?: number;
  hero_emoji?: string | null;
  starts_at: string;
  ends_at: string;
  plus_only?: boolean;
  sort_order?: number;
}

/** Fetch the curated featured-challenge slate. Empty array on failure. */
export async function fetchFeaturedChallenges(): Promise<FeaturedChallenge[]> {
  const rows = await rest<FeaturedChallengeRow[]>(
    "featured_challenges?active=eq.true&order=sort_order.asc,ends_at.asc"
  );
  if (!rows) return [];
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    subtitle: r.subtitle ?? "",
    metric: r.metric,
    durationDays: r.duration_days ?? 7,
    prizePoolCoins: r.prize_pool_coins ?? 5000,
    entryCostCoins: r.entry_cost_coins ?? 0,
    cohortSize: r.cohort_size ?? 100,
    heroEmoji: r.hero_emoji ?? "🏆",
    startsAt: new Date(r.starts_at).getTime(),
    endsAt: new Date(r.ends_at).getTime(),
    plusOnly: !!r.plus_only,
    sortOrder: r.sort_order ?? 0,
  }));
}

// ── Stake-challenge mirror (best-effort upsert from mobile) ────────────────

/**
 * Push a single P2P stake challenge to the admin mirror table. Fire-and-forget
 * — errors are logged but never thrown so a flaky network can't block the
 * gameplay loop. Called from `GameProvider` on create / accept / settle.
 */
export async function pushStakeChallenge(
  c: StakeChallenge,
  meta: { createdByUsername?: string; homeCity?: string }
): Promise<void> {
  if (!hasSupabase()) return;
  try {
    const body = {
      id: c.id,
      title: c.title,
      created_by: c.createdBy,
      created_by_username: meta.createdByUsername ?? null,
      home_city: meta.homeCity ?? null,
      stake: c.stake,
      metric: c.metric,
      status: c.status,
      participants: c.participants,
      created_at: new Date(c.createdAt).toISOString(),
      starts_at: new Date(c.startsAt).toISOString(),
      ends_at: new Date(c.endsAt).toISOString(),
      winner_id: c.winnerId ?? null,
      payout: c.payout ?? null,
      updated_at: new Date().toISOString(),
    };
    const res = await fetch(`${SUPABASE_URL}/rest/v1/stake_challenges`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY ?? "",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.log("[backend] pushStakeChallenge failed", res.status);
    }
  } catch (e) {
    console.log("[backend] pushStakeChallenge error", e);
  }
}

// ── Tokenomics tunables (admin-editable scalars in app_config) ─────────

/**
 * Scalar tunables pulled from `app_config`. Every field is optional —
 * the client falls back to its baked-in constant when the key is unset.
 */
export interface Tokenomics {
  dailyCoinCapFree?: number;
  dailyCoinCapPlus?: number;
  maxTotalMultiplier?: number;
  hotVaultMultiplier?: number;
  finalHourMultiplier?: number;
  shareRewardCoins?: number;
  referralBonusCoins?: number;
  challengeRakePct?: number;
  dailyStepBonusCoins?: number;
}

const TOKENOMICS_KEYS = [
  "daily_coin_cap_free",
  "daily_coin_cap_plus",
  "max_total_multiplier",
  "hot_vault_multiplier",
  "final_hour_multiplier",
  "share_reward_coins",
  "referral_bonus_coins",
  "challenge_rake_pct",
  "daily_step_bonus_coins",
] as const;

function toNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

/** Fetch admin-tuned tokenomics scalars. Returns `{}` on failure. */
export async function fetchTokenomics(): Promise<Tokenomics> {
  const rows = await rest<ConfigRow[]>(
    `app_config?key=in.(${TOKENOMICS_KEYS.join(",")})`
  );
  const out: Tokenomics = {};
  if (!rows) return out;
  const map: Record<string, unknown> = {};
  for (const r of rows) map[r.key] = r.value;
  out.dailyCoinCapFree = toNumber(map.daily_coin_cap_free);
  out.dailyCoinCapPlus = toNumber(map.daily_coin_cap_plus);
  out.maxTotalMultiplier = toNumber(map.max_total_multiplier);
  out.hotVaultMultiplier = toNumber(map.hot_vault_multiplier);
  out.finalHourMultiplier = toNumber(map.final_hour_multiplier);
  out.shareRewardCoins = toNumber(map.share_reward_coins);
  out.referralBonusCoins = toNumber(map.referral_bonus_coins);
  out.challengeRakePct = toNumber(map.challenge_rake_pct);
  out.dailyStepBonusCoins = toNumber(map.daily_step_bonus_coins);
  return out;
}

export const BACKEND_CONNECTED = hasSupabase();
