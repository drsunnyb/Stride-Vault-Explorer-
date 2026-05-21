/** Row shapes for the live Stride catalogue (mirrors Postgres tables). */

export interface BrandRow {
  id: string;
  name: string;
  short: string;
  coin_name: string;
  color: string;
  color_bright: string;
  color_dim: string;
  tagline: string | null;
  mark: string | null;
  inverted_text: boolean;
  exchange_rate: number;
  daily_cap: number;
  active: boolean;
  sort_order: number;
}

export interface RewardRow {
  id: string;
  brand: string | null;
  title: string;
  subtitle: string | null;
  badge: string | null;
  coin_cost: number;
  brand_cost: number | null;
  redeem_at: string | null;
  emoji: string | null;
  value_gbp: number | null;
  in_store_only: boolean;
  active: boolean;
  sort_order: number;
}

export interface RaffleRow {
  id: string;
  title: string;
  prize: string;
  prize_value_gbp: number;
  emoji: string;
  entry_cost: number;
  brand_entry_cost: number | null;
  max_entries_per_user: number;
  winners: number;
  ends_at: string;
  total_entries: number;
  brand: string | null;
  plus_only: boolean;
  active: boolean;
  sort_order: number;
}

export interface CityRow {
  id: string;
  name: string;
  country: string;
  country_code: string;
  lat: number;
  lng: number;
  radius_km: number;
  status: "live" | "waitlist";
  tagline: string | null;
  votes: number;
  active: boolean;
  sort_order: number;
}

export interface ConfigRow {
  key: string;
  value: unknown;
}
