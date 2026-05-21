import { DEFAULT_BRANDS, REWARDS, type BrandMeta } from "@/constants/rewards";
import { RAFFLES } from "@/constants/raffles";
import type { Raffle, Reward } from "@/types/game";

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

export const BACKEND_CONNECTED = hasSupabase();
