import type { Reward, VaultBrand } from "@/types/game";

/**
 * Brand metadata — colors, names, copy. Drives the visual treatment of brand
 * coins, wallets, vault markers and the rewards catalogue.
 *
 * The catalogue is fully dynamic: brands can be 0 (no partners yet),
 * 1 (single sponsor), or many. Admins upload brand rows from the backend
 * (see `lib/backend.ts → fetchBrands`) and the UI re-renders to match.
 */
export interface BrandMeta {
  id: VaultBrand;
  name: string;
  /** Display name for the brand-locked coin (e.g. "Nike Coins"). */
  coinName: string;
  /** Short uppercase tag used on pills, chips and filters. */
  short: string;
  color: string;
  colorBright: string;
  colorDim: string;
  /** Tagline shown on the wallet card. */
  tagline: string;
  /** Mark glyph (single character) shown on the coin token. */
  mark: string;
  /** True for light-on-dark brands (Apple-style silver) so we flip text color. */
  invertedText?: boolean;
}

/** Default seed brands. Admin can override or add more from the backend. */
export const DEFAULT_BRANDS: BrandMeta[] = [
  {
    id: "nike",
    name: "Nike",
    coinName: "Nike Coins",
    short: "NIKE",
    color: "#FA5400",
    colorBright: "#FF7A2C",
    colorDim: "#8A2D00",
    tagline: "Earn at Nike vaults. Redeem at Nike stores.",
    mark: "✓",
  },
  {
    id: "apple",
    name: "Apple",
    coinName: "Apple Credit",
    short: "APPLE",
    color: "#C9CFDB",
    colorBright: "#F2F4F8",
    colorDim: "#5A6378",
    tagline: "Earn at Apple vaults. Spend at Apple Store.",
    mark: "",
    invertedText: true,
  },
];

/**
 * Mutable runtime registry. We seed with defaults, then merge whatever the
 * backend serves on top. Components read brand styling through `getBrand(id)`,
 * which synthesises a deterministic fallback for any unknown id so the UI
 * never crashes when a vault references a brand we don't have a row for.
 */
export const BRANDS: Record<string, BrandMeta> = Object.fromEntries(
  DEFAULT_BRANDS.map((b) => [b.id, b])
);

/** Default Stride → brand exchange rate when not explicitly configured. */
export const DEFAULT_EXCHANGE_RATE = 5;

/**
 * Conversion rates: Stride Coins → Brand Coins. 5:1 by default — brand coins
 * are more valuable because they unlock partner-locked rewards. Backend rows
 * can override per-brand.
 */
export const EXCHANGE_RATES: Record<string, number> = {
  nike: 5,
  apple: 5,
};

/** Cap brand coins per stride exchange in one go to prevent infinite-grind. */
export const EXCHANGE_DAILY_CAP: Record<string, number> = {
  nike: 200,
  apple: 200,
};

export function exchangeRate(brand: VaultBrand | undefined): number {
  if (!brand) return DEFAULT_EXCHANGE_RATE;
  return EXCHANGE_RATES[brand] ?? DEFAULT_EXCHANGE_RATE;
}

/**
 * Deterministic fallback brand styling for an unknown id — uses a tiny string
 * hash so the same id always maps to the same hue. Keeps the UI usable while
 * the admin sets up a proper brand row.
 */
function synthesiseBrand(id: string): BrandMeta {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  const color = hslToHex(hue, 78, 50);
  const colorBright = hslToHex(hue, 86, 64);
  const colorDim = hslToHex(hue, 60, 22);
  const short = id.replace(/[^a-z0-9]+/gi, "").toUpperCase().slice(0, 6) || "BRAND";
  const name = id.charAt(0).toUpperCase() + id.slice(1);
  return {
    id,
    name,
    short,
    coinName: `${name} Coins`,
    color,
    colorBright,
    colorDim,
    tagline: `Earn at ${name} vaults. Redeem at ${name}.`,
    mark: short.charAt(0),
  };
}

function hslToHex(h: number, s: number, l: number): string {
  const sN = s / 100;
  const lN = l / 100;
  const c = (1 - Math.abs(2 * lN - 1)) * sN;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lN - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

/**
 * Look up brand styling. Always returns a usable BrandMeta — caches synthesised
 * fallbacks so colours stay stable across renders.
 */
export function getBrand(id: VaultBrand | undefined | null): BrandMeta | null {
  if (!id) return null;
  const hit = BRANDS[id];
  if (hit) return hit;
  const synth = synthesiseBrand(id);
  BRANDS[id] = synth;
  return synth;
}

/** Replace the brand registry with backend rows (keeps defaults as fallback). */
export function registerBrands(list: BrandMeta[]): void {
  if (list.length === 0) return;
  for (const b of list) {
    BRANDS[b.id] = b;
  }
}

/** All currently known brand metas (defaults + remote + synthesised). */
export function listBrands(): BrandMeta[] {
  return Object.values(BRANDS);
}

/** Convenience for legacy callers — same as getBrand. */
export function brandOf(brand: VaultBrand | undefined): BrandMeta | null {
  return getBrand(brand);
}

/**
 * Universal rewards (paid with Stride Coins, brand-agnostic) +
 * brand-locked rewards (paid with that brand's coins — Stride Coins not
 * accepted directly, but you can convert).
 *
 * This is a *fallback* catalogue only — production rewards come from the
 * Supabase `rewards` table. Admin can upload, edit and toggle rewards live
 * without shipping an app update.
 */
export const REWARDS: Reward[] = [
  // ───── UNIVERSAL — Stride Coins ─────
  {
    id: "stride-coffee-5",
    title: "£5 Coffee Voucher",
    subtitle: "Any indie roaster in the Stride network.",
    badge: "£5 OFF",
    coinCost: 500,
    redeemAt: "Online · 40+ cafés",
    emoji: "☕️",
    valueGbp: 5,
  },
  {
    id: "stride-classpass-day",
    title: "ClassPass Day Pass",
    subtitle: "One free studio class anywhere in London.",
    badge: "FREE",
    coinCost: 1200,
    redeemAt: "Online",
    emoji: "🧘",
    valueGbp: 22,
  },
  {
    id: "stride-deliveroo-10",
    title: "£10 Deliveroo Credit",
    subtitle: "Refuel after the run.",
    badge: "£10 CREDIT",
    coinCost: 900,
    redeemAt: "Online",
    emoji: "🍱",
    valueGbp: 10,
  },
  {
    id: "stride-cineworld-15",
    title: "Cineworld 15% Off",
    subtitle: "Any film, any week.",
    badge: "15% OFF",
    coinCost: 600,
    redeemAt: "Online",
    emoji: "🎬",
    valueGbp: 4,
  },
  {
    id: "stride-loot-box",
    title: "Stride Loot Box",
    subtitle: "Spin for an avatar skin, XP boost, or rare coin trail.",
    badge: "MYSTERY",
    coinCost: 350,
    redeemAt: "In-app",
    emoji: "🎁",
  },

  // ───── NIKE — Nike Coins ─────
  {
    id: "nike-10-off",
    brand: "nike",
    title: "10% Off Nike Order",
    subtitle: "Sitewide. Stacks with member sale.",
    badge: "10% OFF",
    coinCost: 0,
    brandCost: 120,
    redeemAt: "Online · Nike.com",
    emoji: "👟",
    valueGbp: 12,
  },
  {
    id: "nike-pegasus-15",
    brand: "nike",
    title: "£15 Off Pegasus 41",
    subtitle: "Unlocked by Stride Quest steppers.",
    badge: "£15 OFF",
    coinCost: 0,
    brandCost: 200,
    redeemAt: "Niketown London / Westfield",
    emoji: "🏃",
    valueGbp: 15,
    inStoreOnly: true,
  },
  {
    id: "nike-dropmate",
    brand: "nike",
    title: "SNKRS Early Access",
    subtitle: "30-min jump on the next exclusive drop.",
    badge: "EARLY ACCESS",
    coinCost: 0,
    brandCost: 350,
    redeemAt: "SNKRS app",
    emoji: "🎟️",
  },
  {
    id: "nike-vault-socks",
    brand: "nike",
    title: "Nike × Stride Socks",
    subtitle: "Limited co-branded run socks. Limited 500 pairs.",
    badge: "LIMITED",
    coinCost: 0,
    brandCost: 500,
    redeemAt: "Niketown London (collect)",
    emoji: "🧦",
    valueGbp: 22,
    inStoreOnly: true,
  },
  {
    id: "nike-run-club-vip",
    brand: "nike",
    title: "NRC London — VIP Pace Group",
    subtitle: "Skip the line for Nike Run Club Sunday sessions.",
    badge: "VIP",
    coinCost: 0,
    brandCost: 250,
    redeemAt: "Niketown London",
    emoji: "🏁",
  },

  // ───── APPLE — Apple Credit ─────
  {
    id: "apple-airpods-50",
    brand: "apple",
    title: "£50 Off AirPods",
    subtitle: "AirPods 4, AirPods Pro 2 or Max.",
    badge: "£50 OFF",
    coinCost: 0,
    brandCost: 400,
    redeemAt: "Apple Regent Street / Online",
    emoji: "🎧",
    valueGbp: 50,
  },
  {
    id: "apple-today-session",
    brand: "apple",
    title: "Today at Apple — Private Slot",
    subtitle: "Reserved seat in the next Photo Walk.",
    badge: "FREE BOOKING",
    coinCost: 0,
    brandCost: 150,
    redeemAt: "Apple Covent Garden",
    emoji: "📸",
    inStoreOnly: true,
  },
  {
    id: "apple-watch-band",
    brand: "apple",
    title: "Free Sport Band",
    subtitle: "Any colour. With any Apple Watch purchase.",
    badge: "FREE",
    coinCost: 0,
    brandCost: 300,
    redeemAt: "Apple Brompton Road",
    emoji: "⌚️",
    valueGbp: 49,
    inStoreOnly: true,
  },
  {
    id: "apple-engraving",
    brand: "apple",
    title: "Free Engraving",
    subtitle: "On any AirPods or iPad case.",
    badge: "FREE",
    coinCost: 0,
    brandCost: 80,
    redeemAt: "Apple Battersea",
    emoji: "✒️",
  },
];

/** Generate an 8-character redemption code. */
export function makeRedemptionCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
  return out;
}
