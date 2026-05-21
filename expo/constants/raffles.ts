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

export const RAFFLES: Raffle[] = [
  {
    id: "plus-iphone-17-pro",
    title: "Stride+ Exclusive · iPhone 17 Pro",
    prize: "iPhone 17 Pro (256GB)",
    prizeValueGbp: 1199,
    emoji: "📱",
    entryCost: 300,
    maxEntriesPerUser: 30,
    endsAt: endsIn(10),
    winners: 1,
    totalEntries: 612,
    plusOnly: true,
  },
  {
    id: "macbook-air-m4",
    title: "MacBook Air M4 Giveaway",
    prize: "MacBook Air M4 (13\", 512GB)",
    prizeValueGbp: 1199,
    emoji: "💻",
    entryCost: 250,
    maxEntriesPerUser: 50,
    endsAt: endsIn(7),
    winners: 1,
    totalEntries: 4318,
    brand: "apple",
    brandEntryCost: 50,
  },
  {
    id: "nike-vaporfly-3",
    title: "Nike Vaporfly 3 Drop",
    prize: "Nike Vaporfly 3 (pick your size)",
    prizeValueGbp: 270,
    emoji: "👟",
    entryCost: 150,
    maxEntriesPerUser: 30,
    endsAt: endsIn(3),
    winners: 3,
    totalEntries: 2107,
    brand: "nike",
    brandEntryCost: 30,
  },
  {
    id: "airpods-pro-2",
    title: "AirPods Pro 2",
    prize: "AirPods Pro 2 (USB-C)",
    prizeValueGbp: 229,
    emoji: "🎧",
    entryCost: 120,
    maxEntriesPerUser: 25,
    endsAt: endsIn(5),
    winners: 2,
    totalEntries: 3091,
    brand: "apple",
    brandEntryCost: 25,
  },
  {
    id: "westfield-100",
    title: "£100 Westfield Voucher",
    prize: "£100 to spend at Westfield London",
    prizeValueGbp: 100,
    emoji: "🛍️",
    entryCost: 90,
    maxEntriesPerUser: 40,
    endsAt: endsIn(14),
    winners: 5,
    totalEntries: 1782,
  },
  {
    id: "deliveroo-50",
    title: "£50 Deliveroo Plus",
    prize: "£50 Deliveroo voucher + Plus month",
    prizeValueGbp: 50,
    emoji: "🍔",
    entryCost: 50,
    maxEntriesPerUser: 50,
    endsAt: endsIn(2),
    winners: 10,
    totalEntries: 5430,
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
