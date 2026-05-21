import type { LeaderboardEntry } from "@/types/game";

export const LEADERBOARD: LeaderboardEntry[] = [
  { id: "p1", name: "Nova Vance", avatarSeed: "nova-1", level: 14, vaults: 47, nikeVaults: 18, isFriend: false },
  { id: "p2", name: "Kai Mercer", avatarSeed: "kai-2", level: 12, vaults: 41, nikeVaults: 22, isFriend: true },
  { id: "p3", name: "Iris Doyle", avatarSeed: "iris-3", level: 11, vaults: 38, nikeVaults: 9, isFriend: false },
  { id: "p4", name: "Sable Wren", avatarSeed: "sable-4", level: 10, vaults: 34, nikeVaults: 15, isFriend: true },
  { id: "p5", name: "Onyx Ravel", avatarSeed: "onyx-5", level: 9, vaults: 31, nikeVaults: 11, isFriend: false },
  { id: "p6", name: "Juno Park", avatarSeed: "juno-6", level: 8, vaults: 27, nikeVaults: 6, isFriend: true },
  { id: "you", name: "Agent Halcyon", avatarSeed: "halcyon-7", level: 1, vaults: 0, nikeVaults: 0, isFriend: false, isYou: true },
  { id: "p8", name: "Rune Calder", avatarSeed: "rune-8", level: 5, vaults: 14, nikeVaults: 4, isFriend: true },
  { id: "p9", name: "Pax Holloway", avatarSeed: "pax-9", level: 4, vaults: 11, nikeVaults: 7, isFriend: false },
  { id: "p10", name: "Echo Vale", avatarSeed: "echo-10", level: 3, vaults: 7, nikeVaults: 2, isFriend: false },
];

/** Vault IDs that belong to the Nike sponsor campaign. */
export const NIKE_VAULT_IDS: ReadonlyArray<string> = [
  "nike-town-london",
  "nike-stratford",
  "nike-boxpark-shoreditch",
] as const;
