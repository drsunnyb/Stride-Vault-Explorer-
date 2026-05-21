/**
 * Period helpers for the Ladder leaderboards.
 * Periods reset on local time, Monday for weeks.
 */

export type Period = "week" | "month" | "year";

export const PERIOD_LABELS: Record<Period, string> = {
  week: "WEEK",
  month: "MONTH",
  year: "YEAR",
};

export const PERIOD_TITLES: Record<Period, string> = {
  week: "This Week",
  month: "This Month",
  year: "This Year",
};

/** Start of the period containing `ms` (local time). */
export function periodStart(period: Period, ms: number = Date.now()): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  if (period === "week") {
    // Monday as week start.
    const day = d.getDay(); // 0=Sun..6=Sat
    const diff = (day + 6) % 7; // days since Monday
    d.setDate(d.getDate() - diff);
    return d.getTime();
  }
  if (period === "month") {
    d.setDate(1);
    return d.getTime();
  }
  // year
  d.setMonth(0, 1);
  return d.getTime();
}

/** End of the period containing `ms` (exclusive). */
export function periodEnd(period: Period, ms: number = Date.now()): number {
  const start = periodStart(period, ms);
  const d = new Date(start);
  if (period === "week") {
    d.setDate(d.getDate() + 7);
  } else if (period === "month") {
    d.setMonth(d.getMonth() + 1);
  } else {
    d.setFullYear(d.getFullYear() + 1);
  }
  return d.getTime();
}

/** Human countdown like "2d 14h" or "47m". */
export function formatRemaining(toMs: number, nowMs: number = Date.now()): string {
  const diff = Math.max(0, toMs - nowMs);
  const day = 24 * 60 * 60 * 1000;
  const hour = 60 * 60 * 1000;
  const min = 60 * 1000;
  if (diff >= day) {
    const days = Math.floor(diff / day);
    const hours = Math.floor((diff % day) / hour);
    return `${days}d ${hours}h`;
  }
  if (diff >= hour) {
    const hours = Math.floor(diff / hour);
    const minutes = Math.floor((diff % hour) / min);
    return `${hours}h ${minutes}m`;
  }
  const minutes = Math.max(0, Math.floor(diff / min));
  return `${minutes}m`;
}
