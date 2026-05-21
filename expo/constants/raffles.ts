import type { Raffle } from "@/types/game";

/**
 * Default raffles. Endsdates are computed from "now" so the timer always feels
 * live. In production these come from the Supabase `raffles` table (see
 * `lib/backend.ts`).
 */
const DAY = 24 * 60 * 60 * 1000;

function endsIn(days: number): number {
  return Date.now() + days * DAY;
}

/**
 * Default raffles — priced for a £500–£1,500 weekly outlay.
 *  - 1 headline (£500–£600), 2 mid (£150–£250), 3 small (£25–£50).
 *  - Entry costs sized so the weekly coin supply lands ~80% absorbed.
 */
export const RAFFLES: Raffle[] = [
  // ── Headline (£500–£600) ──
  {
    id: "airpods-pro-2",
    title: "AirPods Pro 2",
    prize: "AirPods Pro 2 (USB-C) — Apple Regent St",
    prizeValueGbp: 249,
    emoji: "🎧",
    entryCost: 1500,
    maxEntriesPerUser: 10,
    endsAt: endsIn(7),
    winners: 1,
    totalEntries: 318,
  },
  {
    id: "plus-airpods-max",
    title: "Stride+ Exclusive · AirPods Max",
    prize: "AirPods Max (Midnight, USB-C)",
    prizeValueGbp: 549,
    emoji: "🎧",
    entryCost: 2500,
    maxEntriesPerUser: 6,
    endsAt: endsIn(10),
    winners: 1,
    totalEntries: 142,
    plusOnly: true,
  },
  // ── Mid (£100–£250) ──
  {
    id: "nike-vaporfly-3",
    title: "Nike Vaporfly 3",
    prize: "Nike Vaporfly 3 (your size)",
    prizeValueGbp: 270,
    emoji: "👟",
    entryCost: 900,
    maxEntriesPerUser: 12,
    endsAt: endsIn(5),
    winners: 1,
    totalEntries: 612,
  },
  {
    id: "westfield-100",
    title: "£100 Westfield Voucher",
    prize: "£100 to spend at Westfield London",
    prizeValueGbp: 100,
    emoji: "🛍️",
    entryCost: 450,
    maxEntriesPerUser: 15,
    endsAt: endsIn(7),
    winners: 2,
    totalEntries: 540,
  },
  // ── Small (£25–£50) ──
  {
    id: "deliveroo-50",
    title: "£50 Deliveroo Credit",
    prize: "£50 Deliveroo voucher",
    prizeValueGbp: 50,
    emoji: "🍔",
    entryCost: 220,
    maxEntriesPerUser: 20,
    endsAt: endsIn(3),
    winners: 3,
    totalEntries: 980,
  },
  {
    id: "coffee-25",
    title: "£25 Indie Coffee Crawl",
    prize: "£25 voucher · Stride café network",
    prizeValueGbp: 25,
    emoji: "☕️",
    entryCost: 110,
    maxEntriesPerUser: 25,
    endsAt: endsIn(2),
    winners: 5,
    totalEntries: 1240,
  },
];

/** Find a raffle by id. */
export function findRaffle(id: string): Raffle | undefined {
  return RAFFLES.find((r) => r.id === id);
}

/** Format millisecond duration as "Dd Hh" or "Hh Mm" or "Mm Ss". */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return "ENDED";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  const sec = s % 60;
  return `${m}m ${sec}s`;
}
