/**
 * Stride+ subscription — single-tier paid membership.
 * Perks are deliberately time/convenience focused, never raw coin sales,
 * so the walking premise of the economy is preserved.
 */
export const PLUS = {
  /** Display pricing. Real billing goes through StoreKit / Play Billing later. */
  monthlyGbp: 4.99,
  annualGbp: 39,
  /** Marketing math — annual saves vs 12× monthly. */
  annualSavingsPct: 35,

  /** Stacks on top of tier payoutMultiplier. e.g. Legend 1.5× * 1.25 = 1.875×. */
  payoutBonus: 0.25,
  /** Free daily claim hard cap. Plus members get freeCap + dailyCapBonus. */
  freeDailyCap: 10,
  plusDailyCap: 14,
  /** Brand-coin grant fraction (free 35%, plus 50%). */
  freeBrandCoinFraction: 0.35,
  plusBrandCoinFraction: 0.5,
  /** Multiplier on respawn cooldown for Plus (0.75 = 25% faster). */
  plusRespawnMultiplier: 0.75,
  /** Welcome bonus paid once on first subscribe. */
  welcomeCoins: 1000,
  /** Weekly perks. */
  weeklyFreeRaffleEntries: 1,
  weeklyStreakFreezes: 1,
  /** Hours of early access to newly launched vaults / drops. */
  earlyAccessHours: 48,
} as const;

export type PlusPlan = "monthly" | "annual";

export interface PlusSubscription {
  active: boolean;
  plan: PlusPlan;
  /** Epoch ms when first subscribed (or current period start). */
  startedAt: number;
  /** Epoch ms when current period renews/expires. */
  renewsAt: number;
  /** True once the one-time +1,000 welcome bonus has been paid. */
  welcomeClaimed: boolean;
  /** ISO week (YYYY-Www) for last used free raffle entry. */
  lastFreeEntryWeek?: string;
  /** ISO week for last used streak freeze. */
  lastStreakFreezeWeek?: string;
}

/** ISO-style week key for a given epoch ms (YYYY-Www). */
export function isoWeek(ms: number): string {
  const d = new Date(ms);
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Build a default Plus subscription record for a fresh subscribe. */
export function newPlusSubscription(plan: PlusPlan, now: number = Date.now()): PlusSubscription {
  const period = plan === "annual" ? 365 : 30;
  return {
    active: true,
    plan,
    startedAt: now,
    renewsAt: now + period * 24 * 60 * 60 * 1000,
    welcomeClaimed: false,
  };
}

/** Does the Plus subscription cover this moment? */
export function isPlusActive(sub: PlusSubscription | undefined, now: number = Date.now()): boolean {
  return !!sub && sub.active && sub.renewsAt > now;
}
