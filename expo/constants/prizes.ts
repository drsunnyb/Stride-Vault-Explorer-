import type { Period } from "@/constants/periods";

/**
 * Tiered prize ladder paid at end of each period. Scales with period length
 * so yearly is the headline event.
 */
export interface PrizeTier {
  /** Inclusive top rank for this tier. */
  rankFrom: number;
  rankTo: number;
  label: string;
  coins: number;
  raffleEntries: number;
  /** Bonus payout multiplier applied to next period's vault claims. */
  nextPeriodMultiplier: number;
  /** Display accent color. */
  accent: string;
  /** Permanent profile badge unlocked at this rank. */
  badge?: string;
}

const WEEK_LADDER: PrizeTier[] = [
  { rankFrom: 1, rankTo: 1, label: "Champion", coins: 2500, raffleEntries: 3, nextPeriodMultiplier: 1.5, accent: "#F4D03F", badge: "Weekly Champion" },
  { rankFrom: 2, rankTo: 3, label: "Podium", coins: 1200, raffleEntries: 2, nextPeriodMultiplier: 1.3, accent: "#E8EDF5" },
  { rankFrom: 4, rankTo: 10, label: "Top 10", coins: 500, raffleEntries: 1, nextPeriodMultiplier: 1.15, accent: "#E69E5A" },
  { rankFrom: 11, rankTo: 50, label: "Top 50", coins: 150, raffleEntries: 0, nextPeriodMultiplier: 1, accent: "#7DD3FC" },
];

const MONTH_LADDER: PrizeTier[] = [
  { rankFrom: 1, rankTo: 1, label: "Champion", coins: 12000, raffleEntries: 6, nextPeriodMultiplier: 1.5, accent: "#F4D03F", badge: "Monthly Champion" },
  { rankFrom: 2, rankTo: 3, label: "Podium", coins: 5000, raffleEntries: 4, nextPeriodMultiplier: 1.3, accent: "#E8EDF5" },
  { rankFrom: 4, rankTo: 10, label: "Top 10", coins: 2000, raffleEntries: 2, nextPeriodMultiplier: 1.15, accent: "#E69E5A" },
  { rankFrom: 11, rankTo: 50, label: "Top 50", coins: 600, raffleEntries: 0, nextPeriodMultiplier: 1, accent: "#7DD3FC" },
];

const YEAR_LADDER: PrizeTier[] = [
  { rankFrom: 1, rankTo: 1, label: "Champion", coins: 100000, raffleEntries: 25, nextPeriodMultiplier: 1.5, accent: "#F4D03F", badge: "Legend of the Year" },
  { rankFrom: 2, rankTo: 3, label: "Podium", coins: 40000, raffleEntries: 15, nextPeriodMultiplier: 1.3, accent: "#E8EDF5", badge: "Yearly Podium" },
  { rankFrom: 4, rankTo: 10, label: "Top 10", coins: 15000, raffleEntries: 6, nextPeriodMultiplier: 1.15, accent: "#E69E5A", badge: "Yearly Top 10" },
  { rankFrom: 11, rankTo: 50, label: "Top 50", coins: 4000, raffleEntries: 1, nextPeriodMultiplier: 1, accent: "#7DD3FC" },
];

export const PRIZE_LADDERS: Record<Period, PrizeTier[]> = {
  week: WEEK_LADDER,
  month: MONTH_LADDER,
  year: YEAR_LADDER,
};

export function prizeForRank(period: Period, rank: number): PrizeTier | undefined {
  return PRIZE_LADDERS[period].find((t) => rank >= t.rankFrom && rank <= t.rankTo);
}
