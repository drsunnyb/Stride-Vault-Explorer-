import type { PlusSubscription } from "@/constants/plus";
import type { Tier } from "@/constants/theme";

export type VaultIcon =
  | "clock"
  | "castle"
  | "wheel"
  | "crown"
  | "lion"
  | "theater"
  | "church"
  | "book"
  | "spray"
  | "tree"
  | "tower"
  | "train"
  | "shopping"
  | "market"
  | "stadium"
  | "leaf"
  | "museum"
  | "ship"
  | "tube"
  | "star";

/**
 * Vault classification used for strategy + visual treatment.
 */
export type VaultKind = "landmark" | "mega" | "mini" | "seasonal" | "tube" | "brand";

/**
 * Brand sponsor id for branded retail vaults — drives foot traffic to stores.
 * Open string so the brand catalogue can be loaded dynamically from the backend
 * (admin can add/remove brands without a client update).
 */
export type VaultBrand = string;

/** Per-brand wallet — earned only from that brand's vaults / exchange. */
export type BrandWallet = Partial<Record<VaultBrand, number>>;

/** A redeemable reward in the in-app store. */
export interface Reward {
  id: string;
  brand?: VaultBrand;
  title: string;
  subtitle: string;
  /** Short tag like "10% OFF" or "FREE GIFT". */
  badge: string;
  /** Cost in Stride Coins. Brand rewards can ALSO accept brand coins (see brandCost). */
  coinCost: number;
  /** If set, this reward can be redeemed with brand coins at this lower cost. */
  brandCost?: number;
  /** Where to redeem — e.g. "Niketown London" or "Online". */
  redeemAt: string;
  /** Lucide icon name fallback. */
  emoji: string;
  /** Approx real-world value, displayed for transparency. */
  valueGbp?: number;
  /** True if user must visit a brand store (geofenced) to redeem. */
  inStoreOnly?: boolean;
}

/** A redemption a user has made. */
export interface Redemption {
  id: string;
  rewardId: string;
  redeemedAt: number;
  /** 8-char display code shown after redemption. */
  code: string;
  paidWith: "stride" | VaultBrand;
  paidAmount: number;
}

export interface Vault {
  id: string;
  name: string;
  area: string;
  blurb: string;
  lat: number;
  lng: number;
  tier: Tier;
  kind: VaultKind;
  icon: VaultIcon;
  /** If sponsored, the brand id (e.g. "nike", "apple"). */
  brand?: VaultBrand;
  /**
   * Hours until the vault respawns after being claimed.
   * Falls back to a tier-based default if not specified.
   */
  respawnHours?: number;
  reward: {
    coins: number;
    xp: number;
  };
}

/** One claim event in the user's history. */
export interface ClaimedVault {
  id: string;
  claimedAt: number;
  coins: number;
  xp: number;
}

/** A raffle prize draw — buy entries with Stride Coins, weekly/monthly draws. */
export interface Raffle {
  id: string;
  title: string;
  prize: string;
  prizeValueGbp: number;
  emoji: string;
  /** Cost in Stride Coins per entry. */
  entryCost: number;
  /** Cap of entries one user can buy. */
  maxEntriesPerUser: number;
  /** ISO timestamp ms when the draw closes. */
  endsAt: number;
  /** Number of winners drawn. */
  winners: number;
  /** Total entries across all players (drives perceived odds). */
  totalEntries: number;
  /** Optional brand sponsor. */
  brand?: VaultBrand;
  /** True if entries can also be bought with brand coins (alt cost). */
  brandEntryCost?: number;
  /** When true, only Stride+ members can enter (free can browse). */
  plusOnly?: boolean;
}

/** A user's entry record in a raffle. */
export interface RaffleEntry {
  raffleId: string;
  entries: number;
  enteredAt: number;
  paidWith: "stride" | VaultBrand;
}

export interface PlayerState {
  username: string;
  avatarSeed: string;
  level: number;
  xp: number;
  coins: number;
  streakDays: number;
  /** Lifetime steps (cumulative, persisted). */
  steps: number;
  /** Steps counted today (reset at local midnight). */
  stepsToday: number;
  /** Steps recorded at the moment of the last vault claim (anti-cheat baseline). */
  stepsAtLastClaim: number;
  /** ISO date string (YYYY-MM-DD) when the daily step-coin bonus was last paid. */
  lastStepBonusDate?: string;
  /** ISO date string for when stepsToday was last reset. */
  stepsTodayDate?: string;
  lat: number;
  lng: number;
  /** Full history of claim events (most recent first). */
  claimed: ClaimedVault[];
  /** Per-brand coin balances (locked to that brand). */
  brandCoins: BrandWallet;
  /** Redemption history (most recent first). */
  redemptions: Redemption[];
  /** Raffle entries (most recent first). */
  raffleEntries: RaffleEntry[];
  /** Whether notifications have been enabled. */
  notificationsEnabled: boolean;
  /** Number of times the user has shared today (caps daily coin payouts). */
  sharesToday: number;
  /** ISO date string (YYYY-MM-DD) for sharesToday rollover. */
  sharesTodayDate?: string;
  /** Lifetime share count — surfaces social proof on profile. */
  lifetimeShares: number;
  /** Total coins earned from sharing — surfaced in the share sheet. */
  shareCoinsEarned: number;
  /** Friends who joined via this player's referral code. */
  referralSignups: number;
  /** Vaults claimed today — drives diminishing-returns ladder. */
  claimsToday: number;
  /** ISO date string (YYYY-MM-DD) for claimsToday rollover. */
  claimsTodayDate?: string;
  /** Coins paid from vault claims today (post-multiplier). Drives v3 soft cap. */
  coinsFromClaimsToday?: number;
  /** YYYY-MM-DD when the daily coin soft cap was last hit (used to surface a toast). */
  hitDailyCoinCapOn?: string;
  /** True once the v3 brand-coin auto-conversion migration has run. */
  brandCoinsMigratedV3?: boolean;
  /** Has the user seen the v2 rebalance note. */
  seenRebalanceV2?: boolean;
  /** Stride+ subscription state. Absent = never subscribed. */
  plus?: PlusSubscription;
  /** Has the user seen the onboarding paywall once? */
  seenPlusOnboarding?: boolean;
  /** Friends the player has added (persisted). */
  friends?: Friend[];
  /** Active + settled stake challenges (most recent first). */
  challenges?: StakeChallenge[];
  /** Coins locked inside open challenges — not spendable elsewhere. */
  lockedCoins?: number;
  /** Permanent profile badges earned from past ladders. */
  championBadges?: string[];
  /** ISO key of the last week the user was paid ladder prizes — prevents double-pay. */
  lastLadderPayoutKey?: { week?: string; month?: string; year?: string };
  /** Last YYYY-MM-DD a vault was claimed — drives streak rollover. */
  lastClaimDate?: string;
  /** Streak freezes available — auto-grants every 14 days, also buyable. */
  streakFreezes?: number;
  /** Last YYYY-MM-DD a free streak freeze was granted. */
  lastStreakFreezeGrantDate?: string;
  /** Map of dayKey -> vaultId claimed as Hot today (player locks in one). */
  hotVaultClaims?: Record<string, string>;
  /** Comeback boost claims remaining (paid 1.5× on next N vault claims). */
  comebackClaimsRemaining?: number;
  /** Snapshot of last week's rank — used to compute comeback eligibility. */
  lastWeekRank?: number;
  /** Football tribe id (Arsenal / Spurs / …). Unset until user picks. */
  tribeId?: string;
  /** Tribe badge color granted by last week's derby win. */
  lastTribeWinWeekKey?: string;
  /**
   * If set, the player was in the losing side of last week's derby. Triggers
   * a soft "Redemption" perk: +10% multiplier on claims for this week, plus
   * a visible banner in the Tribes screen. Never zeros their balance — soft
   * consequence only so churn risk stays low.
   */
  lastTribeLossWeekKey?: string;
  /** Active prediction picks. */
  predictions?: PredictionPick[];
  /** Settled prediction history. */
  predictionHistory?: PredictionPick[];
  /** Has the user completed the first-run onboarding flow? */
  hasOnboarded?: boolean;
  /** Optional display first name from onboarding. */
  firstName?: string;
  /** Linked auth identity (id + provider + email). */
  authId?: string;
  authEmail?: string;
  authProvider?: "google" | "apple" | "email";
  /** Daily step goal in steps (user-chosen during onboarding). */
  dailyStepGoal?: number;
  /** Permissions granted during onboarding (mirrored from system). */
  motionGranted?: boolean;
  locationGranted?: boolean;
  /** Has the soft paywall been shown after first vault claim? */
  seenSoftPaywall?: boolean;
  /** ISO week (YYYY-Www) when paywall was last surfaced — caps re-triggers. */
  lastPaywallWeek?: string;
  /** Player's chosen home city (drives the global waitlist). */
  homeCityId?: string;
  /** Per-city votes minted from this player's steps + shares. */
  cityVotes?: Record<string, number>;
  /** Steps already credited toward the city-vote ladder (avoids double-count). */
  cityVoteStepsCredited?: number;
  /** Inbox notifications (most recent first). */
  notifications?: InboxNotification[];
  /** Newest sent_at (ms) of a server-pushed broadcast already merged into the inbox. */
  serverInboxCursor?: number;
  /** v3 brand-coin -> Stride Coin migration flag. */
  brandCoinsMigratedV3?: boolean;
}

/** One pick in the weekly Stride Predict market. */
export interface PredictionPick {
  marketId: string;
  /** Player id picked to top the weekly ladder. */
  pickPlayerId: string;
  pickName: string;
  stake: number;
  placedAt: number;
  /** Once settled: did the pick win? */
  result?: "won" | "lost";
  payout?: number;
  settledAt?: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  avatarSeed: string;
  level: number;
  vaults: number;
  /** Number of Nike-sponsored vaults this player has unlocked. */
  nikeVaults: number;
  isFriend: boolean;
  isYou?: boolean;
}

/** A user a player has added to their friends list. */
export interface Friend {
  id: string;
  username: string;
  displayName: string;
  avatarSeed: string;
  /** Epoch ms when the friendship was created. */
  addedAt: number;
}

/** What metric a stake challenge ranks players on. */
export type ChallengeMetric = "steps" | "vaults" | "coins";

export type ChallengeStatus = "pending" | "live" | "settled" | "cancelled";

/** A single participant slot inside a stake challenge. */
export interface ChallengeParticipant {
  /** "you" for the local player, otherwise a friend id. */
  playerId: string;
  displayName: string;
  avatarSeed: string;
  /** "invited" until they accept, then "in"; "out" if they declined or timed out. */
  state: "invited" | "in" | "out";
  /** Snapshot of their metric value at challenge start (for delta calc). */
  baseline: number;
  /** Current metric value (live for you, simulated for friends). */
  current: number;
}

/** A user-facing notification surfaced in the inbox. */
export type NotificationKind =
  | "friend-request"
  | "friend-joined"
  | "challenge-invite"
  | "challenge-won"
  | "challenge-lost"
  | "city-live"
  | "system";

export interface InboxNotification {
  id: string;
  kind: NotificationKind;
  createdAt: number;
  /** Has the user opened/read the notification. */
  read: boolean;
  /** Top-line headline (e.g. "Kai wants to be friends"). */
  title: string;
  /** Sub-line body / context (e.g. "Walked 12,400 steps this week"). */
  body: string;
  /** Optional avatar seed of the sender (drives initial-circle colour). */
  avatarSeed?: string;
  /** Optional display name for sender — used in avatars. */
  fromName?: string;
  /** Friend username (for friend-request kind). */
  fromUsername?: string;
  /** Linked stake-challenge id (for challenge-invite/won/lost kinds). */
  challengeId?: string;
  /** Whether this notification still has pending accept/decline actions. */
  actionable: boolean;
  /** Once acted on: "accepted" | "declined". */
  resolution?: "accepted" | "declined";
}

export interface StakeChallenge {
  id: string;
  /** Display title — defaults to a generated phrase like "Sable's Step Showdown". */
  title: string;
  /** The player who created the challenge. */
  createdBy: string;
  /** Per-player stake. Total pot = stake × participants who joined. */
  stake: number;
  metric: ChallengeMetric;
  /** Epoch ms when staking opens (creation time). */
  createdAt: number;
  /** Epoch ms when the challenge starts — typically = createdAt. */
  startsAt: number;
  /** Epoch ms when results are settled and pot pays out. */
  endsAt: number;
  /** 24h hard limit for invitees to accept. */
  inviteExpiresAt: number;
  status: ChallengeStatus;
  participants: ChallengeParticipant[];
  /** Winner id once settled. */
  winnerId?: string;
  /** Coins paid out to the winner (after 2% rake). */
  payout?: number;
}
