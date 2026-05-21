import type { Friend } from "@/types/game";

/**
 * Seed friend list — represents people the user already added.
 * In a real backend these come from Supabase; the local seed makes the
 * Friends/Ladder/Challenge screens feel alive on first launch.
 */
export const SEED_FRIENDS: Friend[] = [
  { id: "f_kai", username: "kai.mercer", displayName: "Kai Mercer", avatarSeed: "kai-2", addedAt: Date.now() - 1000 * 60 * 60 * 24 * 21 },
  { id: "f_sable", username: "sable", displayName: "Sable Wren", avatarSeed: "sable-4", addedAt: Date.now() - 1000 * 60 * 60 * 24 * 14 },
  { id: "f_juno", username: "junopark", displayName: "Juno Park", avatarSeed: "juno-6", addedAt: Date.now() - 1000 * 60 * 60 * 24 * 9 },
  { id: "f_rune", username: "rune", displayName: "Rune Calder", avatarSeed: "rune-8", addedAt: Date.now() - 1000 * 60 * 60 * 24 * 4 },
];

/**
 * A small pool of additional players that appear on the global ladder
 * (and as search-results when adding friends). Keeps the leaderboard from
 * looking empty before any social graph is built.
 */
export const GLOBAL_PLAYERS: { id: string; username: string; displayName: string; avatarSeed: string }[] = [
  { id: "g_nova", username: "novavance", displayName: "Nova Vance", avatarSeed: "nova-1" },
  { id: "g_iris", username: "irisdoyle", displayName: "Iris Doyle", avatarSeed: "iris-3" },
  { id: "g_onyx", username: "onyx", displayName: "Onyx Ravel", avatarSeed: "onyx-5" },
  { id: "g_pax", username: "pax", displayName: "Pax Holloway", avatarSeed: "pax-9" },
  { id: "g_echo", username: "echovale", displayName: "Echo Vale", avatarSeed: "echo-10" },
  { id: "g_atlas", username: "atlas.j", displayName: "Atlas Jin", avatarSeed: "atlas-11" },
  { id: "g_vesper", username: "vesper", displayName: "Vesper Locke", avatarSeed: "vesper-12" },
  { id: "g_rook", username: "rookwilde", displayName: "Rook Wilde", avatarSeed: "rook-13" },
  { id: "g_sage", username: "sage.bly", displayName: "Sage Bly", avatarSeed: "sage-14" },
  { id: "g_zara", username: "zarakade", displayName: "Zara Kade", avatarSeed: "zara-15" },
  { id: "g_finn", username: "finn", displayName: "Finn Asher", avatarSeed: "finn-16" },
  { id: "g_lyra", username: "lyrawren", displayName: "Lyra Wren", avatarSeed: "lyra-17" },
];

/** Combined directory used by `addFriendByUsername` search. */
export const ALL_KNOWN_USERS = [
  ...SEED_FRIENDS.map((f) => ({ id: f.id, username: f.username, displayName: f.displayName, avatarSeed: f.avatarSeed })),
  ...GLOBAL_PLAYERS,
];

/**
 * Deterministic seed used to fake period coin totals for non-you players.
 * Keeps the leaderboard stable across reloads (a player who's "winning the
 * week" stays winning the week) while still varying period-to-period.
 */
export function pseudoPeriodCoins(playerId: string, periodKey: string): number {
  let h = 0;
  const s = `${playerId}::${periodKey}`;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  // Different magnitudes per period length so the values feel right.
  const isYear = periodKey.length === 4;
  const isMonth = periodKey.length === 7;
  if (isYear) return 8000 + (h % 90000);
  if (isMonth) return 1500 + (h % 18000);
  return 200 + (h % 3500);
}

/** Convert a period start ms to a deterministic key for `pseudoPeriodCoins`. */
export function periodKey(start: number, length: "week" | "month" | "year"): string {
  const d = new Date(start);
  if (length === "year") return String(d.getFullYear());
  if (length === "month") return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  // week — ISO-ish week by start date
  return `${d.getFullYear()}-W${Math.floor((start - new Date(d.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))}`;
}
