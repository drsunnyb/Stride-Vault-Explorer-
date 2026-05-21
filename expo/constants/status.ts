/**
 * Stride Status — YouTube Play Button-style tier system.
 *
 * Visible across the app (HUD, profile, leaderboard, vault unlock) so users
 * always know what they're climbing toward. Physical drops (badges, tees,
 * hoodies) hang off the higher tiers later.
 */
export type StrideTier = "recruit" | "bronze" | "silver" | "gold" | "platinum" | "legend";

export interface StrideStatus {
  tier: StrideTier;
  /** Short label for badges / pills. */
  label: string;
  /** Longer tagline for the profile hero. */
  tagline: string;
  /** Vaults claimed required to reach this tier. */
  minVaults: number;
  /** Real-world drop unlocked at this tier (used in the profile reward list). */
  drop: string;
  color: string;
  glow: string;
  /** Passive multiplier applied to every vault coin payout. 1.0 = no bonus. */
  payoutMultiplier: number;
  /** Fractional discount on raffle entry cost (0..1). 0.10 = 10% off. */
  raffleDiscount: number;
  /** Short perk copy for the profile / status screen. */
  perk: string;
}

export const STRIDE_TIERS: StrideStatus[] = [
  {
    tier: "recruit",
    label: "Recruit",
    tagline: "Your story begins.",
    minVaults: 0,
    drop: "Welcome pack",
    color: "#5A6378",
    glow: "#9AA3B8",
    payoutMultiplier: 1.0,
    raffleDiscount: 0,
    perk: "Standard payouts",
  },
  {
    tier: "bronze",
    label: "First Steps",
    tagline: "Habit forming.",
    minVaults: 5,
    drop: "First Steps badge pin",
    color: "#CD7F32",
    glow: "#E69E5A",
    payoutMultiplier: 1.05,
    raffleDiscount: 0,
    perk: "+5% coins on every claim",
  },
  {
    tier: "silver",
    label: "Strider",
    tagline: "Building the streak.",
    minVaults: 15,
    drop: "StrideBand silicone wristband",
    color: "#C9CFDB",
    glow: "#E8EDF5",
    payoutMultiplier: 1.10,
    raffleDiscount: 0,
    perk: "+10% coins · 1 free loot box / week",
  },
  {
    tier: "gold",
    label: "Vault Hunter",
    tagline: "Known on the leaderboard.",
    minVaults: 40,
    drop: "100 Club tee",
    color: "#D4AF37",
    glow: "#F4D03F",
    payoutMultiplier: 1.20,
    raffleDiscount: 0.05,
    perk: "+20% coins · 5% off raffles · early vault access",
  },
  {
    tier: "platinum",
    label: "Stride Elite",
    tagline: "Top of the city.",
    minVaults: 100,
    drop: "Stride Elite socks + vault keychain",
    color: "#7DD3FC",
    glow: "#BAE6FD",
    payoutMultiplier: 1.35,
    raffleDiscount: 0.10,
    perk: "+35% coins · 10% off raffles · Platinum-only draws",
  },
  {
    tier: "legend",
    label: "Stride Legend",
    tagline: "Founder's circle. IRL invites unlocked.",
    minVaults: 250,
    drop: "Limited hoodie + Stride Awards invite",
    color: "#A78BFA",
    glow: "#C4B5FD",
    payoutMultiplier: 1.50,
    raffleDiscount: 0.15,
    perk: "+50% coins · 15% off raffles · 1 free entry / week · IRL invites",
  },
];

export interface StrideStatusResult {
  current: StrideStatus;
  next?: StrideStatus;
  /** Progress from current tier minimum to next tier minimum (0..1). */
  progress: number;
  /** Vaults remaining to next tier. */
  remaining: number;
}

/** Compute Stride Status from total vaults claimed. */
export function getStrideStatus(vaultsClaimed: number): StrideStatusResult {
  let currentIdx = 0;
  for (let i = 0; i < STRIDE_TIERS.length; i++) {
    if (vaultsClaimed >= STRIDE_TIERS[i].minVaults) currentIdx = i;
  }
  const current = STRIDE_TIERS[currentIdx];
  const next = STRIDE_TIERS[currentIdx + 1];
  if (!next) return { current, progress: 1, remaining: 0 };
  const span = next.minVaults - current.minVaults;
  const into = vaultsClaimed - current.minVaults;
  const progress = Math.max(0, Math.min(1, into / span));
  return { current, next, progress, remaining: Math.max(0, next.minVaults - vaultsClaimed) };
}
