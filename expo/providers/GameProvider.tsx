import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ALL_KNOWN_USERS,
  GLOBAL_PLAYERS,
  SEED_FRIENDS,
  periodKey,
  pseudoPeriodCoins,
} from "@/constants/friends";
import {
  CITIES,
  CITY_BY_ID,
  LIVE_CITY_ID,
  REFERRAL_CITY_VOTE_BONUS,
  SHARE_CITY_VOTE_BONUS,
  STEPS_PER_CITY_VOTE,
  seededVotes,
  type City,
} from "@/constants/cities";
import { periodEnd, periodStart, type Period } from "@/constants/periods";
import {
  activePowerHour,
  combineMultipliers,
  COMEBACK_BOOST_CLAIMS,
  COMEBACK_DROP_THRESHOLD,
  COMEBACK_MULTIPLIER,
  currentPredictionMarketId,
  derbyTribesThisWeek,
  FINAL_HOUR_MULTIPLIER,
  hotVaultIdsForWindow,
  hotVaultWindowStart,
  HOT_VAULT_MULTIPLIER,
  inFinalHour,
  nextPowerHour,
  PREDICT_MAX_STAKE,
  PREDICT_MIN_STAKE,
  PREDICT_RAKE_PCT,
  predictionMarketEndsAt,
  pseudoTribeCoins,
  STREAK_FREEZE_COST,
  STREAK_FREEZE_FREE_INTERVAL,
  streakMultiplier,
  TRIBES,
  TRIBE_WIN_BONUS,
} from "@/constants/retention";
import { PLUS, isPlusActive, isoWeek, newPlusSubscription, type PlusPlan } from "@/constants/plus";
import { prizeForRank } from "@/constants/prizes";
import { findRaffle } from "@/constants/raffles";
import { exchangeRate, registerBrands, REWARDS, makeRedemptionCode, EXCHANGE_RATES, type BrandMeta } from "@/constants/rewards";
import { getStrideStatus } from "@/constants/status";
import { DEFAULT_PLAYER_POS, VAULTS, CLAIM_RADIUS_METERS, respawnMs } from "@/constants/vaults";
import { fetchBrands, fetchLiveConfig, fetchRaffles, fetchRewards, type LiveConfig } from "@/lib/backend";
import { distanceMeters } from "@/lib/geo";
import {
  cancelAllStrideNotifications,
  requestNotificationPermission,
  scheduleDailyReminder,
  scheduleVaultRespawn,
} from "@/lib/notifications";
import { getStepCountBetween, isPedometerAvailable, watchSteps } from "@/lib/pedometer";
import type {
  ChallengeMetric,
  ChallengeParticipant,
  ClaimedVault,
  Friend,
  InboxNotification,
  NotificationKind,
  PlayerState,
  PredictionPick,
  Raffle,
  RaffleEntry,
  Redemption,
  Reward,
  StakeChallenge,
  Vault,
  VaultBrand,
} from "@/types/game";

const STORAGE_KEY = "stridequest.player.v7";

/** Tokenomics v3: raffles-only burn era — daily coins-from-claims soft cap. */
export const DAILY_COIN_CAP_FREE = 3000;
export const DAILY_COIN_CAP_PLUS = 5000;

/** Rake taken from every settled stake challenge pot — funds the Champions Pool. */
export const CHALLENGE_RAKE_PCT = 0.02;
/** Hard cap of participants on a single stake challenge (inviter + 5). */
export const MAX_CHALLENGE_PARTICIPANTS = 6;

/** Daily step goal. Hitting it once per day mints bonus Stride Coins. */
export const DAILY_STEP_GOAL = 5000;
/** Tokenomics v2: down from 75 to match the 1,100-vault supply. */
export const DAILY_STEP_BONUS_COINS = 50;

/**
 * Minimum steps a player must walk between two vault claims. Prevents people
 * from cab-hopping between vaults. Tuned low for v1 — bump in tuning passes.
 */
export const MIN_STEPS_BETWEEN_CLAIMS = 80;

/** Coins paid per share, up to MAX_DAILY_SHARES per day. (v2: 50 → 30) */
export const SHARE_REWARD_COINS = 30;
export const MAX_DAILY_SHARES = 3;
/** Coins paid when a friend signs up via your referral (paid to both). */
export const REFERRAL_BONUS_COINS = 500;

const DEFAULT_PLAYER: PlayerState = {
  username: "Agent Halcyon",
  avatarSeed: "halcyon-7",
  level: 1,
  xp: 0,
  coins: 0,
  streakDays: 3,
  steps: 4812,
  stepsToday: 0,
  stepsAtLastClaim: 0,
  lat: DEFAULT_PLAYER_POS.lat,
  lng: DEFAULT_PLAYER_POS.lng,
  claimed: [],
  brandCoins: {},
  redemptions: [],
  raffleEntries: [],
  notificationsEnabled: false,
  sharesToday: 0,
  lifetimeShares: 0,
  shareCoinsEarned: 0,
  referralSignups: 0,
  claimsToday: 0,
  friends: SEED_FRIENDS,
  challenges: [],
  lockedCoins: 0,
  championBadges: [],
  lastLadderPayoutKey: {},
  streakFreezes: 1,
  hotVaultClaims: {},
  comebackClaimsRemaining: 0,
  predictions: [],
  predictionHistory: [],
  notifications: seedNotifications(),
};

/**
 * Seed the inbox with a handful of realistic incoming events so the
 * Notifications screen has something to render on first launch. These
 * are pure UI fixtures — the production backend will replace them with
 * server-driven push events.
 */
function seedNotifications(): InboxNotification[] {
  const now = Date.now();
  return [
    {
      id: "n_req_nova",
      kind: "friend-request",
      createdAt: now - 1000 * 60 * 18,
      read: false,
      actionable: true,
      title: "Nova Vance wants to be friends",
      body: "Walked 14,210 steps this week · same tribe",
      fromName: "Nova Vance",
      fromUsername: "novavance",
      avatarSeed: "nova-1",
    },
    {
      id: "n_req_atlas",
      kind: "friend-request",
      createdAt: now - 1000 * 60 * 60 * 6,
      read: false,
      actionable: true,
      title: "Atlas Jin wants to be friends",
      body: "Top 50 walker this month · invited by Kai",
      fromName: "Atlas Jin",
      fromUsername: "atlas.j",
      avatarSeed: "atlas-11",
    },
    {
      id: "n_chal_sable",
      kind: "challenge-invite",
      createdAt: now - 1000 * 60 * 60 * 2,
      read: false,
      actionable: true,
      title: "Sable invited you to a Step Showdown",
      body: "500c stake · 7 days · winner takes the pot",
      fromName: "Sable Wren",
      fromUsername: "sable",
      avatarSeed: "sable-4",
      challengeId: "c_seed_sable",
    },
    {
      id: "n_joined_juno",
      kind: "friend-joined",
      createdAt: now - 1000 * 60 * 60 * 26,
      read: true,
      actionable: false,
      title: "Juno Park joined via your link",
      body: "+500 coins paid to you both",
      fromName: "Juno Park",
      fromUsername: "junopark",
      avatarSeed: "juno-6",
    },
  ];
}

/** A seeded challenge attached to the seed Sable challenge invite. */
function seedSableChallenge(now: number): StakeChallenge {
  return {
    id: "c_seed_sable",
    title: "Sable's Step Showdown",
    createdBy: "f_sable",
    stake: 500,
    metric: "steps",
    createdAt: now - 1000 * 60 * 60 * 2,
    startsAt: now - 1000 * 60 * 60 * 2,
    endsAt: now + 1000 * 60 * 60 * 24 * 7,
    inviteExpiresAt: now + 1000 * 60 * 60 * 22,
    status: "live",
    participants: [
      { playerId: "f_sable", displayName: "Sable Wren", avatarSeed: "sable-4", state: "in", baseline: 0, current: 4200 },
      { playerId: "you", displayName: "You", avatarSeed: "halcyon-7", state: "invited", baseline: 0, current: 0 },
      { playerId: "f_kai", displayName: "Kai Mercer", avatarSeed: "kai-2", state: "in", baseline: 0, current: 3100 },
    ],
  };
}

/**
 * Daily claim ladder — diminishing returns so a player who walks all day still
 * gets value, but the economy stays sane with 1,100 vaults on the map.
 *  - claims 1–3  → 100% payout
 *  - claims 4–6  →  70%
 *  - claims 7–10 →  40%
 *  - claims 11+ → refused (hard cap)
 */
export const DAILY_CLAIM_HARD_CAP = PLUS.freeDailyCap;
export const DAILY_CLAIM_HARD_CAP_PLUS = PLUS.plusDailyCap;
export const DAILY_CLAIM_TIERS: { upTo: number; multiplier: number }[] = [
  { upTo: 3, multiplier: 1.0 },
  { upTo: 6, multiplier: 0.7 },
  { upTo: 10, multiplier: 0.4 },
];
/** Plus members get bonus slots above the free cap at reduced payout. */
export const DAILY_CLAIM_TIERS_PLUS: { upTo: number; multiplier: number }[] = [
  { upTo: 3, multiplier: 1.0 },
  { upTo: 6, multiplier: 0.7 },
  { upTo: 10, multiplier: 0.4 },
  { upTo: PLUS.plusDailyCap, multiplier: 0.25 },
];

/** Multiplier applied to the (claimsToday+1)-th claim of the day. */
export function dailyClaimMultiplier(claimsTodayBefore: number, plus: boolean = false): number {
  const nextN = claimsTodayBefore + 1;
  const tiers = plus ? DAILY_CLAIM_TIERS_PLUS : DAILY_CLAIM_TIERS;
  for (const t of tiers) {
    if (nextN <= t.upTo) return t.multiplier;
  }
  return 0;
}

/** XP required to advance from level L -> L+1. */
export function xpForLevel(level: number): number {
  return 200 + (level - 1) * 150;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Local-date key (avoids timezone-edge issues between hot-vault & claim). */
function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** Adds `n` votes to `cityId`. Returns a fresh map (never mutates). */
function addCityVotes(
  prev: Record<string, number> | undefined,
  cityId: string | undefined,
  n: number
): Record<string, number> {
  const cur = prev ?? {};
  if (!cityId || n <= 0 || cityId === LIVE_CITY_ID) return cur;
  return { ...cur, [cityId]: (cur[cityId] ?? 0) + n };
}

async function loadPlayer(): Promise<PlayerState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PLAYER;
    const parsed = JSON.parse(raw) as Partial<PlayerState>;
    const merged: PlayerState = { ...DEFAULT_PLAYER, ...parsed };
    // v3 migration: convert any legacy brand-coin balances into Stride Coins so
    // every burn lands in the raffle pool.
    if (!merged.brandCoinsMigratedV3) {
      let credit = 0;
      const balances = merged.brandCoins ?? {};
      for (const [brand, amount] of Object.entries(balances)) {
        if (!amount || amount <= 0) continue;
        const rate = EXCHANGE_RATES[brand] ?? 5;
        credit += Math.max(1, Math.round(amount * rate));
      }
      merged.coins = (merged.coins ?? 0) + credit;
      merged.brandCoins = {};
      merged.brandCoinsMigratedV3 = true;
    }
    return merged;
  } catch (e) {
    console.log("[GameProvider] loadPlayer failed", e);
    return DEFAULT_PLAYER;
  }
}

async function savePlayer(state: PlayerState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.log("[GameProvider] savePlayer failed", e);
  }
}

/** Latest claim event for a vault id, or undefined if never claimed. */
function lastClaimFor(claims: ClaimedVault[], id: string): ClaimedVault | undefined {
  let best: ClaimedVault | undefined;
  for (const c of claims) {
    if (c.id !== id) continue;
    if (!best || c.claimedAt > best.claimedAt) best = c;
  }
  return best;
}

export const [GameProvider, useGame] = createContextHook(() => {
  const qc = useQueryClient();

  const playerQuery = useQuery<PlayerState>({
    queryKey: ["player"],
    queryFn: loadPlayer,
    staleTime: Infinity,
  });

  // Remote-driven catalogues. Fall back to local constants on first load / offline.
  const rewardsQuery = useQuery<Reward[]>({
    queryKey: ["rewards"],
    queryFn: fetchRewards,
    initialData: REWARDS,
    staleTime: 5 * 60 * 1000,
  });

  const rafflesQuery = useQuery<Raffle[]>({
    queryKey: ["raffles"],
    queryFn: fetchRaffles,
    staleTime: 60 * 1000,
  });

  /**
   * Brand catalogue — drives every dynamic brand-aware UI surface (wallets,
   * exchange tabs, filter chips, vault marker colours). Admin uploads brands
   * to Supabase and they appear here on next refresh. Side-effect: merge into
   * the runtime BRANDS registry so non-React callers (CoinIcon, helpers) see
   * the latest styling without prop drilling.
   */
  const brandsQuery = useQuery<{ brands: BrandMeta[]; exchangeRates: Record<string, number> }>({
    queryKey: ["brands"],
    queryFn: fetchBrands,
    staleTime: 5 * 60 * 1000,
  });

  /**
   * Live admin-pushed overrides (hot vaults, power hour, waitlist membership
   * perks). Refetched every 60s so admin edits propagate to players quickly
   * without a relaunch.
   */
  const liveConfigQuery = useQuery<LiveConfig>({
    queryKey: ["live-config"],
    queryFn: fetchLiveConfig,
    refetchInterval: 60 * 1000,
    initialData: { hotVaults: null, powerHour: null, membership: null },
  });
  const liveConfig = liveConfigQuery.data ?? { hotVaults: null, powerHour: null, membership: null };

  /**
   * Hot-vault override resolver. Returns admin-pinned IDs while the override
   * is live, otherwise falls back to the deterministic daily rotation.
   */
  const resolveHotVaultIds = useCallback((nowMs: number, vaultIds: string[]): string[] => {
    const ov = liveConfig.hotVaults;
    if (ov && ov.endsAt > nowMs && ov.vaultIds.length > 0) return ov.vaultIds;
    return hotVaultIdsForWindow(vaultIds, nowMs);
  }, [liveConfig.hotVaults]);

  /** Active hot-vault multiplier (admin override beats default). */
  const resolveHotMultiplier = useCallback((nowMs: number): number => {
    const ov = liveConfig.hotVaults;
    if (ov && ov.endsAt > nowMs) return ov.multiplier;
    return HOT_VAULT_MULTIPLIER;
  }, [liveConfig.hotVaults]);

  /** Power-hour resolver: admin override beats deterministic schedule. */
  const resolveActivePowerHour = useCallback((nowMs: number) => {
    const ov = liveConfig.powerHour;
    if (ov && ov.startsAt <= nowMs && ov.endsAt > nowMs) {
      return { startsAt: ov.startsAt, endsAt: ov.endsAt, multiplier: ov.multiplier as 2 | 3 };
    }
    return activePowerHour(nowMs);
  }, [liveConfig.powerHour]);

  const resolveNextPowerHour = useCallback((nowMs: number) => {
    const ov = liveConfig.powerHour;
    if (ov && ov.startsAt > nowMs) {
      return { startsAt: ov.startsAt, endsAt: ov.endsAt, multiplier: ov.multiplier as 2 | 3 };
    }
    return nextPowerHour(nowMs);
  }, [liveConfig.powerHour]);

  useEffect(() => {
    const data = brandsQuery.data;
    if (!data) return;
    registerBrands(data.brands);
    for (const [k, v] of Object.entries(data.exchangeRates)) {
      EXCHANGE_RATES[k] = v;
    }
  }, [brandsQuery.data]);

  const player = playerQuery.data ?? DEFAULT_PLAYER;

  // Tick every 30s so respawn timers / raffle timers refresh in the UI.
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const setPlayer = useCallback(
    async (next: PlayerState) => {
      qc.setQueryData(["player"], next);
      await savePlayer(next);
    },
    [qc]
  );

  // ── Pedometer integration ────────────────────────────────────────────────
  // We hold a baseline + ref of the last reported watch value so we can derive
  // an "added since session start" delta and apply it on top of persisted steps.
  const sessionBaselineRef = useRef<number>(0);
  const sessionLastRef = useRef<number>(0);

  useEffect(() => {
    let sub: { remove: () => void } | null = null;
    let mounted = true;
    (async () => {
      const ok = await isPedometerAvailable();
      if (!ok || !mounted) return;
      // Seed today's count from system pedometer (iOS only — Android returns 0).
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const todays = await getStepCountBetween(start, new Date());
      if (todays > 0) {
        const cur = qc.getQueryData<PlayerState>(["player"]) ?? DEFAULT_PLAYER;
        const tk = todayKey();
        if (cur.stepsTodayDate !== tk || todays > cur.stepsToday) {
          await setPlayer({ ...cur, stepsToday: todays, stepsTodayDate: tk });
        }
      }
      // Live updates while app is foregrounded.
      sub = await watchSteps((delta) => {
        if (!mounted) return;
        if (sessionBaselineRef.current === 0 && delta > 0) {
          sessionBaselineRef.current = delta;
        }
        const added = Math.max(0, delta - sessionLastRef.current);
        sessionLastRef.current = delta;
        if (added === 0) return;
        const cur = qc.getQueryData<PlayerState>(["player"]) ?? DEFAULT_PLAYER;
        const tk = todayKey();
        const rollover = cur.stepsTodayDate !== tk;
        const next: PlayerState = {
          ...cur,
          steps: cur.steps + added,
          stepsToday: (rollover ? 0 : cur.stepsToday) + added,
          stepsTodayDate: tk,
        };
        qc.setQueryData(["player"], next);
        savePlayer(next).catch(() => {});
      });
    })();
    return () => {
      mounted = false;
      sub?.remove();
    };
  }, [qc, setPlayer]);

  // ── City-vote step credit ────────────────────────────────────────────────
  // Every STEPS_PER_CITY_VOTE walked adds +1 vote to the player's home city.
  // Runs only for waitlist cities; London players just walk for coins.
  useEffect(() => {
    const cityId = player.homeCityId;
    if (!cityId || cityId === LIVE_CITY_ID) return;
    const credited = player.cityVoteStepsCredited ?? 0;
    const newVotes = Math.floor((player.steps - credited) / STEPS_PER_CITY_VOTE);
    if (newVotes <= 0) return;
    const next: PlayerState = {
      ...player,
      cityVotes: addCityVotes(player.cityVotes, cityId, newVotes),
      cityVoteStepsCredited: credited + newVotes * STEPS_PER_CITY_VOTE,
    };
    setPlayer(next).catch(() => {});
  }, [player, setPlayer]);

  // ── Daily step bonus payout ──────────────────────────────────────────────
  useEffect(() => {
    const tk = todayKey();
    if (player.stepsToday >= DAILY_STEP_GOAL && player.lastStepBonusDate !== tk) {
      const next: PlayerState = {
        ...player,
        coins: player.coins + DAILY_STEP_BONUS_COINS,
        lastStepBonusDate: tk,
      };
      setPlayer(next).catch(() => {});
    }
  }, [player, setPlayer]);

  const claimMutation = useMutation({
    mutationFn: async (vault: Vault) => {
      const current = qc.getQueryData<PlayerState>(["player"]) ?? DEFAULT_PLAYER;
      const plusActive = isPlusActive(current.plus);
      const plusRespawn = plusActive
        ? respawnMs(vault) * PLUS.plusRespawnMultiplier
        : respawnMs(vault);
      // Respect respawn — if last claim is still within cooldown, ignore.
      const last = lastClaimFor(current.claimed, vault.id);
      if (last && Date.now() - last.claimedAt < plusRespawn) return current;

      // Anti-cheat: require some real steps since the previous claim.
      const stepsSince = current.steps - current.stepsAtLastClaim;
      if (current.claimed.length > 0 && stepsSince < MIN_STEPS_BETWEEN_CLAIMS) {
        return current;
      }

      // Daily claim cap + diminishing returns.
      const tk = todayKey();
      const claimsTodayBefore =
        current.claimsTodayDate === tk ? current.claimsToday : 0;
      const dailyMult = dailyClaimMultiplier(claimsTodayBefore, plusActive);
      if (dailyMult <= 0) return current; // hard cap reached

      // Tier multiplier — Stride Status passively boosts every payout.
      const tier = getStrideStatus(current.claimed.length).current;
      const plusBonus = plusActive ? 1 + PLUS.payoutBonus : 1;

      // ── Retention engine multipliers ──────────────────────────────────────
      const streakMult = streakMultiplier(current.streakDays);
      const dayK = dayKey(Date.now());
      const hotIds = resolveHotVaultIds(Date.now(), VAULTS.map((v) => v.id));
      // Hot vault is honoured only if no one in this player's session has
      // already locked another hot vault this window (one-per-day rule).
      const alreadyLockedHotId = (current.hotVaultClaims ?? {})[dayK];
      const isHot =
        hotIds.includes(vault.id) &&
        (!alreadyLockedHotId || alreadyLockedHotId === vault.id);
      const hotMult = isHot ? resolveHotMultiplier(Date.now()) : 1;
      const ph = resolveActivePowerHour(Date.now());
      const powerMult = ph ? ph.multiplier : 1;
      const finalMult = inFinalHour("week", Date.now()) ? FINAL_HOUR_MULTIPLIER : 1;
      const comebackActive = (current.comebackClaimsRemaining ?? 0) > 0;
      const comebackMult = comebackActive ? COMEBACK_MULTIPLIER : 1;
      // Tribe boost — both winners and losers of the prior derby get a quiet
      // +10% this week. Winners feel the victory bonus; losers get a
      // "Redemption" arc so a loss never feels like a punishment.
      const currentWeekKey = String(periodStart("week", Date.now()));
      const tribeMult =
        current.lastTribeWinWeekKey === currentWeekKey ||
        current.lastTribeLossWeekKey === currentWeekKey
          ? 1.1
          : 1;

      const breakdown = combineMultipliers({
        base: 1,
        tier: tier.payoutMultiplier,
        daily: dailyMult,
        plus: plusBonus,
        streak: streakMult,
        hot: hotMult,
        power: powerMult * finalMult, // final-hour stacks with power-hour
        comeback: comebackMult,
        tribe: tribeMult,
      });
      const coinsPaid = Math.max(1, Math.round(vault.reward.coins * breakdown.total));
      const xpPaid = Math.max(1, Math.round(vault.reward.xp * dailyMult));

      const entry: ClaimedVault = {
        id: vault.id,
        claimedAt: Date.now(),
        coins: cappedCoinsPaid,
        xp: xpPaid,
      };

      let newXp = current.xp + xpPaid;
      let newLevel = current.level;
      let need = xpForLevel(newLevel);
      while (newXp >= need) {
        newXp -= need;
        newLevel += 1;
        need = xpForLevel(newLevel);
      }

      // v3 (raffles-only era): branded vaults no longer mint brand-locked
      // currency — the equivalent value is auto-converted into Stride Coins so
      // every burn lands in the raffle pool. Brand chips on vault cards stay
      // (they still steer foot traffic to partner stores).
      let coinsAfterBrand = coinsPaid;
      const brandCoins = { ...current.brandCoins };
      if (vault.brand) {
        const brandFraction = plusActive
          ? PLUS.plusBrandCoinFraction
          : PLUS.freeBrandCoinFraction;
        const brandEquivalent = Math.max(1, Math.round(coinsPaid * brandFraction));
        // Convert brand coins → stride at the exchange rate (default 5:1).
        const rate = exchangeRate(vault.brand);
        coinsAfterBrand += Math.max(1, Math.round(brandEquivalent * rate));
      }

      // Daily coin soft-cap on claim payouts. Caps how many coins the player
      // can earn from vault claims in a single calendar day. XP unaffected.
      const coinsEarnedTodayBefore =
        current.claimsTodayDate === tk ? current.coinsFromClaimsToday ?? 0 : 0;
      const dailyCoinCap = plusActive ? DAILY_COIN_CAP_PLUS : DAILY_COIN_CAP_FREE;
      const remainingBudget = Math.max(0, dailyCoinCap - coinsEarnedTodayBefore);
      const cappedCoinsPaid = Math.min(coinsAfterBrand, remainingBudget);
      const hitDailyCoinCap = cappedCoinsPaid < coinsAfterBrand;

      // ── Streak update ─────────────────────────────────────────────────────
      let streakDays = current.streakDays;
      let streakFreezes = current.streakFreezes ?? 0;
      const lastClaimDate = current.lastClaimDate;
      if (!lastClaimDate) {
        streakDays = 1;
      } else if (lastClaimDate === tk) {
        // already counted today
      } else {
        const yest = new Date();
        yest.setDate(yest.getDate() - 1);
        const yestKey = yest.toISOString().slice(0, 10);
        if (lastClaimDate === yestKey) {
          streakDays += 1;
        } else if (streakFreezes > 0) {
          streakFreezes -= 1;
          streakDays += 1; // freeze saves the streak
        } else {
          streakDays = 1; // broken — reset to today
        }
      }

      // Hot vault lock-in for the day.
      const hotVaultClaims = { ...(current.hotVaultClaims ?? {}) };
      if (isHot && !alreadyLockedHotId) hotVaultClaims[dayK] = vault.id;

      const comebackClaimsRemaining = Math.max(
        0,
        (current.comebackClaimsRemaining ?? 0) - (comebackActive ? 1 : 0)
      );

      const next: PlayerState = {
        ...current,
        coins: current.coins + cappedCoinsPaid,
        xp: newXp,
        level: newLevel,
        claimed: [entry, ...current.claimed],
        brandCoins,
        stepsAtLastClaim: current.steps,
        claimsToday: claimsTodayBefore + 1,
        claimsTodayDate: tk,
        coinsFromClaimsToday: coinsEarnedTodayBefore + cappedCoinsPaid,
        hitDailyCoinCapOn: hitDailyCoinCap ? tk : current.hitDailyCoinCapOn,
        streakDays,
        streakFreezes,
        lastClaimDate: tk,
        hotVaultClaims,
        comebackClaimsRemaining,
      };
      await savePlayer(next);

      // Schedule a "vault respawned" local notification.
      if (next.notificationsEnabled) {
        scheduleVaultRespawn(vault.id, vault.name, Date.now() + plusRespawn).catch(() => {});
      }

      return next;
    },
    onSuccess: (next) => {
      qc.setQueryData(["player"], next);
    },
  });

  const teleportTo = useCallback(
    async (lat: number, lng: number) => {
      const next = { ...player, lat, lng };
      await setPlayer(next);
    },
    [player, setPlayer]
  );

  const resetProgress = useCallback(async () => {
    await cancelAllStrideNotifications();
    await setPlayer(DEFAULT_PLAYER);
  }, [setPlayer]);

  const exchangeMutation = useMutation({
    mutationFn: async ({ brand, brandAmount }: { brand: VaultBrand; brandAmount: number }) => {
      const current = qc.getQueryData<PlayerState>(["player"]) ?? DEFAULT_PLAYER;
      const rate = exchangeRate(brand);
      const cost = brandAmount * rate;
      if (current.coins < cost || brandAmount <= 0) return current;
      const next: PlayerState = {
        ...current,
        coins: current.coins - cost,
        brandCoins: {
          ...current.brandCoins,
          [brand]: (current.brandCoins[brand] ?? 0) + brandAmount,
        },
      };
      await savePlayer(next);
      return next;
    },
    onSuccess: (next) => qc.setQueryData(["player"], next),
  });

  const redeemMutation = useMutation({
    mutationFn: async ({ rewardId, payWith }: { rewardId: string; payWith: "stride" | VaultBrand }) => {
      const current = qc.getQueryData<PlayerState>(["player"]) ?? DEFAULT_PLAYER;
      const reward = (rewardsQuery.data ?? REWARDS).find((r) => r.id === rewardId);
      if (!reward) return current;

      let nextCoins = current.coins;
      const nextBrand = { ...current.brandCoins };
      let paidAmount = 0;

      if (payWith === "stride") {
        if (reward.coinCost <= 0 || current.coins < reward.coinCost) return current;
        nextCoins -= reward.coinCost;
        paidAmount = reward.coinCost;
      } else {
        if (!reward.brand || reward.brand !== payWith) return current;
        const cost = reward.brandCost ?? 0;
        const have = nextBrand[payWith] ?? 0;
        if (cost <= 0 || have < cost) return current;
        nextBrand[payWith] = have - cost;
        paidAmount = cost;
      }

      const redemption: Redemption = {
        id: `r_${Date.now()}`,
        rewardId,
        redeemedAt: Date.now(),
        code: makeRedemptionCode(),
        paidWith: payWith,
        paidAmount,
      };

      const next: PlayerState = {
        ...current,
        coins: nextCoins,
        brandCoins: nextBrand,
        redemptions: [redemption, ...current.redemptions],
      };
      await savePlayer(next);
      return { state: next, redemption } as unknown as PlayerState;
    },
    onSuccess: (result) => {
      const next = (result as unknown as { state?: PlayerState }).state ?? (result as PlayerState);
      qc.setQueryData(["player"], next);
    },
  });

  const enterRaffleMutation = useMutation({
    mutationFn: async ({
      raffleId,
      entries,
      payWith,
    }: {
      raffleId: string;
      entries: number;
      payWith: "stride" | VaultBrand;
    }) => {
      const current = qc.getQueryData<PlayerState>(["player"]) ?? DEFAULT_PLAYER;
      const raffle = (rafflesQuery.data ?? []).find((r) => r.id === raffleId) ?? findRaffle(raffleId);
      if (!raffle || entries <= 0) return current;
      if (raffle.endsAt < Date.now()) return current;

      const existing = current.raffleEntries
        .filter((e) => e.raffleId === raffleId)
        .reduce((sum, e) => sum + e.entries, 0);
      if (existing + entries > raffle.maxEntriesPerUser) return current;

      let nextCoins = current.coins;
      const nextBrand = { ...current.brandCoins };

      // Plus-only gate.
      if (raffle.plusOnly && !isPlusActive(current.plus)) return current;

      // Tier-based raffle discount applies to Stride Coin entries only.
      const tier = getStrideStatus(current.claimed.length).current;
      const discount = tier.raffleDiscount;
      const plusActive = isPlusActive(current.plus);
      const wk = isoWeek(Date.now());
      let freebieUsed = false;
      // Plus members get N free entries per week (any raffle, Stride-paid only).
      let freeEntriesLeft =
        plusActive && current.plus && current.plus.lastFreeEntryWeek !== wk
          ? PLUS.weeklyFreeRaffleEntries
          : 0;

      if (payWith === "stride") {
        const unit = Math.max(1, Math.round(raffle.entryCost * (1 - discount)));
        const billable = Math.max(0, entries - freeEntriesLeft);
        if (freeEntriesLeft > 0 && entries > 0) {
          freebieUsed = true;
          freeEntriesLeft = Math.max(0, freeEntriesLeft - entries);
        }
        const cost = unit * billable;
        if (current.coins < cost) return current;
        nextCoins -= cost;
      } else {
        if (!raffle.brand || raffle.brand !== payWith || !raffle.brandEntryCost) return current;
        const cost = raffle.brandEntryCost * entries;
        const have = nextBrand[payWith] ?? 0;
        if (have < cost) return current;
        nextBrand[payWith] = have - cost;
      }

      const entry: RaffleEntry = {
        raffleId,
        entries,
        enteredAt: Date.now(),
        paidWith: payWith,
      };

      const next: PlayerState = {
        ...current,
        coins: nextCoins,
        brandCoins: nextBrand,
        raffleEntries: [entry, ...current.raffleEntries],
        plus:
          freebieUsed && current.plus
            ? { ...current.plus, lastFreeEntryWeek: wk }
            : current.plus,
      };
      await savePlayer(next);
      return next;
    },
    onSuccess: (next) => qc.setQueryData(["player"], next),
  });

  const enableNotifications = useCallback(async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      await scheduleDailyReminder();
      const next = { ...player, notificationsEnabled: true };
      await setPlayer(next);
    }
    return granted;
  }, [player, setPlayer]);

  const recordShare = useMutation({
    mutationFn: async () => {
      const current = qc.getQueryData<PlayerState>(["player"]) ?? DEFAULT_PLAYER;
      const tk = todayKey();
      const rollover = current.sharesTodayDate !== tk;
      const sharesToday = rollover ? 0 : current.sharesToday;
      // Anti-leak: share payouts only mint coins on days the user also claimed a
      // vault. Keeps the economy walking-gated — you can't farm coins from the
      // couch by spamming the share sheet.
      const claimedTodayMs = current.claimed[0]?.claimedAt ?? 0;
      const claimedToday = new Date(claimedTodayMs).toISOString().slice(0, 10) === tk;
      const withinCap = sharesToday < MAX_DAILY_SHARES;
      const willPay = withinCap && claimedToday;
      const payout = willPay ? SHARE_REWARD_COINS : 0;
      const next: PlayerState = {
        ...current,
        coins: current.coins + payout,
        sharesToday: sharesToday + 1,
        sharesTodayDate: tk,
        lifetimeShares: current.lifetimeShares + 1,
        shareCoinsEarned: current.shareCoinsEarned + payout,
        // Every share boosts the user's home city in the waitlist — even if
        // the share-coin payout is capped, the city vote is still credited.
        cityVotes: addCityVotes(current.cityVotes, current.homeCityId, SHARE_CITY_VOTE_BONUS),
      };
      await savePlayer(next);
      return {
        state: next,
        payout,
        capped: !withinCap,
        gatedNoClaim: withinCap && !claimedToday,
      };
    },
    onSuccess: ({ state }) => qc.setQueryData(["player"], state),
  });

  /** Simulate a friend signing up via this player's referral. Pays both. */
  const claimReferral = useCallback(async () => {
    const current = qc.getQueryData<PlayerState>(["player"]) ?? DEFAULT_PLAYER;
    const next: PlayerState = {
      ...current,
      coins: current.coins + REFERRAL_BONUS_COINS,
      referralSignups: current.referralSignups + 1,
      cityVotes: addCityVotes(current.cityVotes, current.homeCityId, REFERRAL_CITY_VOTE_BONUS),
    };
    await setPlayer(next);
  }, [qc, setPlayer]);

  // ── Stride+ subscription ─────────────────────────────────────────────────
  const subscribeMutation = useMutation({
    mutationFn: async ({ plan }: { plan: PlusPlan }) => {
      const current = qc.getQueryData<PlayerState>(["player"]) ?? DEFAULT_PLAYER;
      const wasSubbed = !!current.plus;
      const sub = newPlusSubscription(plan);
      // Only first-ever subscribe pays the welcome bonus.
      const paysWelcome = !wasSubbed || !current.plus?.welcomeClaimed;
      const next: PlayerState = {
        ...current,
        coins: current.coins + (paysWelcome ? PLUS.welcomeCoins : 0),
        plus: {
          ...sub,
          welcomeClaimed: true,
          lastFreeEntryWeek: current.plus?.lastFreeEntryWeek,
          lastStreakFreezeWeek: current.plus?.lastStreakFreezeWeek,
        },
        seenPlusOnboarding: true,
      };
      await savePlayer(next);
      return next;
    },
    onSuccess: (next) => qc.setQueryData(["player"], next),
  });

  const cancelPlus = useCallback(async () => {
    const current = qc.getQueryData<PlayerState>(["player"]) ?? DEFAULT_PLAYER;
    if (!current.plus) return;
    // Mark inactive immediately. Renewal/expiry kept for receipt.
    await setPlayer({
      ...current,
      plus: { ...current.plus, active: false, renewsAt: Date.now() },
    });
  }, [qc, setPlayer]);

  // ── Onboarding ────────────────────────────────────────────────────────
  const completeOnboarding = useCallback(
    async (input: {
      username?: string;
      avatarSeed?: string;
      firstName?: string;
      dailyStepGoal?: number;
      tribeId?: string;
      authId?: string;
      authEmail?: string;
      authProvider?: "google" | "apple" | "email";
      motionGranted?: boolean;
      locationGranted?: boolean;
      notificationsEnabled?: boolean;
      welcomeBonus?: number;
    }) => {
      const cur = qc.getQueryData<PlayerState>(["player"]) ?? DEFAULT_PLAYER;
      const bonus = input.welcomeBonus ?? 100;
      const alreadyPaid = !!cur.hasOnboarded;
      const next: PlayerState = {
        ...cur,
        username: input.username?.trim() || cur.username,
        avatarSeed: input.avatarSeed ?? cur.avatarSeed,
        firstName: input.firstName ?? cur.firstName,
        dailyStepGoal: input.dailyStepGoal ?? cur.dailyStepGoal ?? DAILY_STEP_GOAL,
        tribeId: input.tribeId ?? cur.tribeId,
        authId: input.authId ?? cur.authId,
        authEmail: input.authEmail ?? cur.authEmail,
        authProvider: input.authProvider ?? cur.authProvider,
        motionGranted: input.motionGranted ?? cur.motionGranted,
        locationGranted: input.locationGranted ?? cur.locationGranted,
        notificationsEnabled: input.notificationsEnabled ?? cur.notificationsEnabled,
        coins: cur.coins + (alreadyPaid ? 0 : bonus),
        hasOnboarded: true,
      };
      await setPlayer(next);
      return next;
    },
    [qc, setPlayer]
  );

  const updateProfile = useCallback(
    async (input: { username?: string; avatarSeed?: string; firstName?: string }) => {
      const cur = qc.getQueryData<PlayerState>(["player"]) ?? DEFAULT_PLAYER;
      await setPlayer({
        ...cur,
        username: input.username?.trim() || cur.username,
        avatarSeed: input.avatarSeed ?? cur.avatarSeed,
        firstName: input.firstName ?? cur.firstName,
      });
    },
    [qc, setPlayer]
  );

  /** Paywall re-trigger gate — cap to once per ISO week. */
  const markPlusOnboardingSeen = useCallback(async () => {
    const current = qc.getQueryData<PlayerState>(["player"]) ?? DEFAULT_PLAYER;
    if (current.seenPlusOnboarding) return;
    await setPlayer({ ...current, seenPlusOnboarding: true });
  }, [qc, setPlayer]);

  const disableNotifications = useCallback(async () => {
    await cancelAllStrideNotifications();
    const next = { ...player, notificationsEnabled: false };
    await setPlayer(next);
  }, [player, setPlayer]);

  // ── Notifications inbox ──────────────────────────────────────────────
  /** Make sure the seed Sable challenge is attached when the matching
   *  invite notification is present — so accepting it has something
   *  concrete to bind to in the challenges list. Idempotent. */
  useEffect(() => {
    const cur = qc.getQueryData<PlayerState>(["player"]) ?? DEFAULT_PLAYER;
    const hasSeedInvite = (cur.notifications ?? []).some((n) => n.id === "n_chal_sable");
    if (!hasSeedInvite) return;
    const hasSeedChallenge = (cur.challenges ?? []).some((c) => c.id === "c_seed_sable");
    if (hasSeedChallenge) return;
    setPlayer({
      ...cur,
      challenges: [seedSableChallenge(Date.now()), ...(cur.challenges ?? [])],
    }).catch(() => {});
    // run once at mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unreadNotifications = useMemo(
    () => (player.notifications ?? []).filter((n) => !n.read).length,
    [player.notifications]
  );
  const pendingNotifications = useMemo(
    () => (player.notifications ?? []).filter((n) => n.actionable && !n.resolution).length,
    [player.notifications]
  );

  const markNotificationRead = useCallback(
    async (id: string) => {
      const cur = qc.getQueryData<PlayerState>(["player"]) ?? DEFAULT_PLAYER;
      const next = (cur.notifications ?? []).map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      await setPlayer({ ...cur, notifications: next });
    },
    [qc, setPlayer]
  );

  const markAllNotificationsRead = useCallback(async () => {
    const cur = qc.getQueryData<PlayerState>(["player"]) ?? DEFAULT_PLAYER;
    if ((cur.notifications ?? []).every((n) => n.read)) return;
    const next = (cur.notifications ?? []).map((n) => ({ ...n, read: true }));
    await setPlayer({ ...cur, notifications: next });
  }, [qc, setPlayer]);

  const resolveNotification = useCallback(
    async (id: string, resolution: "accepted" | "declined") => {
      const cur = qc.getQueryData<PlayerState>(["player"]) ?? DEFAULT_PLAYER;
      const next = (cur.notifications ?? []).map((n) =>
        n.id === id ? { ...n, read: true, actionable: false, resolution } : n
      );
      await setPlayer({ ...cur, notifications: next });
    },
    [qc, setPlayer]
  );

  /** Pushes a fresh notification onto the inbox (most recent first). */
  const pushNotification = useCallback(
    async (n: Omit<InboxNotification, "id" | "createdAt" | "read">) => {
      const cur = qc.getQueryData<PlayerState>(["player"]) ?? DEFAULT_PLAYER;
      const fresh: InboxNotification = {
        id: `n_${Date.now().toString(36)}`,
        createdAt: Date.now(),
        read: false,
        ...n,
      };
      await setPlayer({
        ...cur,
        notifications: [fresh, ...(cur.notifications ?? [])],
      });
    },
    [qc, setPlayer]
  );

  // ── Friends ─────────────────────────────────────────────────────────
  const addFriend = useCallback(
    async (input: { username: string }) => {
      const cur = qc.getQueryData<PlayerState>(["player"]) ?? DEFAULT_PLAYER;
      const friends = cur.friends ?? [];
      const q = input.username.trim().toLowerCase().replace(/^@/, "");
      if (!q) return { ok: false, reason: "empty" as const };
      if (friends.some((f) => f.username.toLowerCase() === q)) {
        return { ok: false, reason: "already-added" as const };
      }
      const hit = ALL_KNOWN_USERS.find((u) => u.username.toLowerCase() === q);
      if (!hit) return { ok: false, reason: "not-found" as const };
      const friend: Friend = {
        id: hit.id,
        username: hit.username,
        displayName: hit.displayName,
        avatarSeed: hit.avatarSeed,
        addedAt: Date.now(),
      };
      await setPlayer({ ...cur, friends: [friend, ...friends] });
      return { ok: true as const, friend };
    },
    [qc, setPlayer]
  );

  const removeFriend = useCallback(
    async (friendId: string) => {
      const cur = qc.getQueryData<PlayerState>(["player"]) ?? DEFAULT_PLAYER;
      const friends = (cur.friends ?? []).filter((f) => f.id !== friendId);
      await setPlayer({ ...cur, friends });
    },
    [qc, setPlayer]
  );

  // ── Stake Challenges ──────────────────────────────────────────────────
  /** Returns the player's metric value at this exact moment. */
  const metricValue = useCallback(
    (state: PlayerState, metric: ChallengeMetric, since: number): number => {
      if (metric === "steps") return state.steps;
      if (metric === "vaults") return state.claimed.filter((c) => c.claimedAt >= since).length;
      // coins earned (in-period) — sum over claims since `since`
      return state.claimed.filter((c) => c.claimedAt >= since).reduce((s, c) => s + c.coins, 0);
    },
    []
  );

  const createChallenge = useCallback(
    async (input: {
      friendIds: string[];
      metric: ChallengeMetric;
      stake: number;
      title?: string;
    }) => {
      const cur = qc.getQueryData<PlayerState>(["player"]) ?? DEFAULT_PLAYER;
      const friends = cur.friends ?? [];
      const chosen = friends.filter((f) => input.friendIds.includes(f.id));
      if (chosen.length === 0) return { ok: false as const, reason: "no-friends" };
      if (input.stake <= 0) return { ok: false as const, reason: "bad-stake" };
      const spendable = cur.coins - (cur.lockedCoins ?? 0);
      if (spendable < input.stake) return { ok: false as const, reason: "no-coins" };

      const startsAt = Date.now();
      const endsAt = startsAt + 7 * 24 * 60 * 60 * 1000;
      const inviteExpiresAt = startsAt + 24 * 60 * 60 * 1000;

      const participants: ChallengeParticipant[] = [
        {
          playerId: "you",
          displayName: cur.username,
          avatarSeed: cur.avatarSeed,
          state: "in",
          baseline: metricValue(cur, input.metric, startsAt),
          current: metricValue(cur, input.metric, startsAt),
        },
        ...chosen.slice(0, MAX_CHALLENGE_PARTICIPANTS - 1).map<ChallengeParticipant>((f) => ({
          playerId: f.id,
          displayName: f.displayName,
          avatarSeed: f.avatarSeed,
          state: "invited",
          baseline: 0,
          current: 0,
        })),
      ];

      const ch: StakeChallenge = {
        id: `c_${Date.now().toString(36)}`,
        title:
          input.title?.trim() ||
          `${cur.username.split(" ")[0]}'s ${
            input.metric === "steps" ? "Step" : input.metric === "vaults" ? "Vault" : "Coin"
          } Showdown`,
        createdBy: "you",
        stake: input.stake,
        metric: input.metric,
        createdAt: startsAt,
        startsAt,
        endsAt,
        inviteExpiresAt,
        status: "live",
        participants,
      };

      await setPlayer({
        ...cur,
        challenges: [ch, ...(cur.challenges ?? [])],
        lockedCoins: (cur.lockedCoins ?? 0) + input.stake,
      });
      return { ok: true as const, challenge: ch };
    },
    [qc, setPlayer, metricValue]
  );

  const acceptChallenge = useCallback(
    async (challengeId: string) => {
      const cur = qc.getQueryData<PlayerState>(["player"]) ?? DEFAULT_PLAYER;
      const chs = cur.challenges ?? [];
      const ch = chs.find((c) => c.id === challengeId);
      if (!ch) return { ok: false as const };
      const you = ch.participants.find((p) => p.playerId === "you");
      if (!you || you.state !== "invited") return { ok: false as const };
      const spendable = cur.coins - (cur.lockedCoins ?? 0);
      if (spendable < ch.stake) return { ok: false as const, reason: "no-coins" };
      const next: StakeChallenge = {
        ...ch,
        participants: ch.participants.map((p) =>
          p.playerId === "you"
            ? {
                ...p,
                state: "in",
                baseline: metricValue(cur, ch.metric, ch.startsAt),
                current: metricValue(cur, ch.metric, ch.startsAt),
              }
            : p
        ),
      };
      await setPlayer({
        ...cur,
        challenges: chs.map((c) => (c.id === challengeId ? next : c)),
        lockedCoins: (cur.lockedCoins ?? 0) + ch.stake,
      });
      return { ok: true as const };
    },
    [qc, setPlayer, metricValue]
  );

  const declineChallenge = useCallback(
    async (challengeId: string) => {
      const cur = qc.getQueryData<PlayerState>(["player"]) ?? DEFAULT_PLAYER;
      const chs = cur.challenges ?? [];
      const ch = chs.find((c) => c.id === challengeId);
      if (!ch) return;
      const next = {
        ...ch,
        participants: ch.participants.map((p) =>
          p.playerId === "you" ? { ...p, state: "out" as const } : p
        ),
      };
      await setPlayer({
        ...cur,
        challenges: chs.map((c) => (c.id === challengeId ? next : c)),
      });
    },
    [qc, setPlayer]
  );

  /**
   * Settle every challenge whose `endsAt` has passed. Pays the winner the pot
   * minus rake; refunds non-participants; unlocks staked coins; flags the
   * challenge as settled. Idempotent — only runs on challenges still "live".
   */
  useEffect(() => {
    const cur = qc.getQueryData<PlayerState>(["player"]) ?? DEFAULT_PLAYER;
    const chs = cur.challenges ?? [];
    const due = chs.filter((c) => c.status === "live" && c.endsAt <= now);
    if (due.length === 0) return;

    let coins = cur.coins;
    let locked = cur.lockedCoins ?? 0;
    const updated = chs.map((c) => {
      if (c.status !== "live" || c.endsAt > now) return c;
      // Refresh "you" current value.
      const refreshed: StakeChallenge = {
        ...c,
        participants: c.participants.map((p) =>
          p.playerId === "you" ? { ...p, current: metricValue(cur, c.metric, c.startsAt) } : p
        ),
      };
      const joined = refreshed.participants.filter((p) => p.state === "in");
      if (joined.length < 2) {
        // Not enough takers — refund the local player's stake.
        if (joined.some((p) => p.playerId === "you")) locked -= c.stake;
        return { ...refreshed, status: "cancelled" as const };
      }
      const youIn = joined.some((p) => p.playerId === "you");
      const pot = c.stake * joined.length;
      const top = joined.reduce((m, p) => (p.current - p.baseline > m.current - m.baseline ? p : m), joined[0]);
      const rake = Math.round(pot * CHALLENGE_RAKE_PCT);
      const payout = pot - rake;
      if (youIn) {
        locked -= c.stake;
        if (top.playerId === "you") coins += payout;
      }
      return { ...refreshed, status: "settled" as const, winnerId: top.playerId, payout };
    });

    setPlayer({
      ...cur,
      challenges: updated,
      coins,
      lockedCoins: Math.max(0, locked),
    }).catch(() => {});
  }, [now, qc, setPlayer, metricValue]);

  // ── Period coin earnings + ladder ──────────────────────────────────────────
  const periodCoinsEarned = useCallback(
    (period: Period, nowMs: number = now): number => {
      const since = periodStart(period, nowMs);
      return player.claimed
        .filter((c) => c.claimedAt >= since)
        .reduce((sum, c) => sum + c.coins, 0);
    },
    [player.claimed, now]
  );

  /**
   * Period coins earned from a specific brand's vaults. Used to power the
   * brand-scoped ladders (e.g. who's the biggest Nike walker this week).
   */
  const brandPeriodCoinsEarned = useCallback(
    (brand: VaultBrand, period: Period, nowMs: number = now): number => {
      const since = periodStart(period, nowMs);
      const brandVaultIds = new Set(VAULTS.filter((v) => v.brand === brand).map((v) => v.id));
      return player.claimed
        .filter((c) => c.claimedAt >= since && brandVaultIds.has(c.id))
        .reduce((sum, c) => sum + c.coins, 0);
    },
    [player.claimed, now]
  );

  /**
   * Build the brand-scoped ladder. Same shape as `leaderboardFor` but ranks
   * players by coins earned at that brand's vaults only — drives partner
   * engagement (Nike walkers compete against Nike walkers).
   */
  const brandLeaderboardFor = useCallback(
    (brand: VaultBrand, period: Period, scope: "global" | "friends" = "global") => {
      const start = periodStart(period, now);
      const pKey = `${brand}::${periodKey(start, period)}`;
      const friendIds = new Set((player.friends ?? []).map((f) => f.id));
      // Brand pools are smaller — divide pseudo totals down so the numbers
      // feel like brand-only earnings (~25–35% of total ladder coins).
      const scale = 0.3;
      const pool = [
        ...(player.friends ?? []).map((f) => ({
          id: f.id,
          name: f.displayName,
          avatarSeed: f.avatarSeed,
          coins: Math.round(pseudoPeriodCoins(f.id, pKey) * scale),
          isFriend: true,
          isYou: false,
        })),
        ...GLOBAL_PLAYERS.filter((g) => !friendIds.has(g.id)).map((g) => ({
          id: g.id,
          name: g.displayName,
          avatarSeed: g.avatarSeed,
          coins: Math.round(pseudoPeriodCoins(g.id, pKey) * scale),
          isFriend: false,
          isYou: false,
        })),
        {
          id: "you",
          name: player.username,
          avatarSeed: player.avatarSeed,
          coins: brandPeriodCoinsEarned(brand, period),
          isFriend: false,
          isYou: true,
        },
      ];
      const filtered = scope === "friends" ? pool.filter((p) => p.isFriend || p.isYou) : pool;
      filtered.sort((a, b) => b.coins - a.coins);
      return filtered.map((p, i) => ({ ...p, rank: i + 1, vaults: 0 }));
    },
    [now, player.friends, player.username, player.avatarSeed, brandPeriodCoinsEarned]
  );

  /**
   * Build the global leaderboard for `period`. Mixes friends + global mock
   * players (with deterministic pseudo totals) so the ladder always feels
   * populated. Local player uses real `periodCoinsEarned`.
   */
  const leaderboardFor = useCallback(
    (period: Period, scope: "global" | "friends" = "global") => {
      const start = periodStart(period, now);
      const pKey = periodKey(start, period);
      const friendIds = new Set((player.friends ?? []).map((f) => f.id));
      const pool = [
        ...(player.friends ?? []).map((f) => ({
          id: f.id,
          name: f.displayName,
          avatarSeed: f.avatarSeed,
          coins: pseudoPeriodCoins(f.id, pKey),
          isFriend: true,
          isYou: false,
        })),
        ...GLOBAL_PLAYERS.filter((g) => !friendIds.has(g.id)).map((g) => ({
          id: g.id,
          name: g.displayName,
          avatarSeed: g.avatarSeed,
          coins: pseudoPeriodCoins(g.id, pKey),
          isFriend: false,
          isYou: false,
        })),
        {
          id: "you",
          name: player.username,
          avatarSeed: player.avatarSeed,
          coins: periodCoinsEarned(period),
          isFriend: false,
          isYou: true,
        },
      ];
      const filtered = scope === "friends" ? pool.filter((p) => p.isFriend || p.isYou) : pool;
      filtered.sort((a, b) => b.coins - a.coins);
      return filtered.map((p, i) => ({ ...p, rank: i + 1, vaults: 0 }));
    },
    [now, player.friends, player.username, player.avatarSeed, periodCoinsEarned]
  );

  const myRankFor = useCallback(
    (period: Period): { rank: number; total: number; coins: number } => {
      const board = leaderboardFor(period, "global");
      const me = board.find((b) => b.isYou);
      return {
        rank: me?.rank ?? board.length,
        total: board.length,
        coins: me?.coins ?? 0,
      };
    },
    [leaderboardFor]
  );

  /** Paywall re-trigger gate — cap to once per ISO week. */
  const shouldShowPaywall = useCallback(
    (trigger: "first_claim" | "streak_3" | "top_50" | "branded_vault" | "plus_raffle"): boolean => {
      if (isPlusActive(player.plus, now)) return false;
      const wk = isoWeek(now);
      if (player.lastPaywallWeek === wk) return false;
      if (trigger === "first_claim") return !player.seenSoftPaywall && player.claimed.length >= 1;
      if (trigger === "streak_3") return player.streakDays >= 3;
      if (trigger === "top_50") return myRankFor("week").rank <= 50;
      return true;
    },
    [player.plus, player.lastPaywallWeek, player.seenSoftPaywall, player.claimed.length, player.streakDays, now, myRankFor]
  );

  const markPaywallShown = useCallback(async () => {
    const cur = qc.getQueryData<PlayerState>(["player"]) ?? DEFAULT_PLAYER;
    await setPlayer({
      ...cur,
      seenSoftPaywall: true,
      lastPaywallWeek: isoWeek(Date.now()),
    });
  }, [qc, setPlayer]);

  /**
   * Claim end-of-period prizes. Called from the Ladder "Claim" CTA once the
   * period has rolled over. Uses `lastLadderPayoutKey` to prevent double-claim.
   */
  const claimLadderRewards = useCallback(
    async (period: Period) => {
      const cur = qc.getQueryData<PlayerState>(["player"]) ?? DEFAULT_PLAYER;
      const lastStart = periodStart(period, now) - 1; // anything inside previous period
      const lastKey = periodKey(periodStart(period, lastStart), period);
      const stamp = cur.lastLadderPayoutKey ?? {};
      if (stamp[period] === lastKey) return { ok: false as const, reason: "already-paid" };
      // For the prototype we pay based on this period's projected rank (good enough
      // to demo — a real backend would snapshot the previous period at settlement).
      const rank = myRankFor(period).rank;
      const tier = prizeForRank(period, rank);
      if (!tier) return { ok: false as const, reason: "no-prize" };
      const newBadges = tier.badge && !(cur.championBadges ?? []).includes(tier.badge)
        ? [tier.badge, ...(cur.championBadges ?? [])]
        : cur.championBadges ?? [];
      await setPlayer({
        ...cur,
        coins: cur.coins + tier.coins,
        championBadges: newBadges,
        lastLadderPayoutKey: { ...stamp, [period]: lastKey },
      });
      return { ok: true as const, tier, rank };
    },
    [qc, setPlayer, now, myRankFor]
  );

  const plusActive = isPlusActive(player.plus, now);
  const vaultsWithDistance = useMemo(() => {
    const respawnFactor = isPlusActive(player.plus, now) ? PLUS.plusRespawnMultiplier : 1;
    return VAULTS.map((v) => {
      const d = distanceMeters({ lat: player.lat, lng: player.lng }, v);
      const last = lastClaimFor(player.claimed, v.id);
      const cooldownMs = respawnMs(v) * respawnFactor;
      const respawnAt = last ? last.claimedAt + cooldownMs : 0;
      const cooling = !!last && respawnAt > now;
      const stepsSince = player.steps - player.stepsAtLastClaim;
      const stepGated =
        player.claimed.length > 0 && stepsSince < MIN_STEPS_BETWEEN_CLAIMS;
      return {
        vault: v,
        distanceMeters: d,
        canClaim: d <= CLAIM_RADIUS_METERS && !cooling && !stepGated,
        claimed: cooling,
        stepGated,
        stepsNeeded: Math.max(0, MIN_STEPS_BETWEEN_CLAIMS - stepsSince),
        lastClaimedAt: last?.claimedAt,
        respawnAt,
        cooldownMs,
      };
    }).sort((a, b) => a.distanceMeters - b.distanceMeters);
  }, [player.lat, player.lng, player.claimed, player.steps, player.stepsAtLastClaim, player.plus, now]);

  /** Total Stride Coins a player has spent on a given raffle so far. */
  const entriesForRaffle = useCallback(
    (raffleId: string): number => {
      return player.raffleEntries
        .filter((e) => e.raffleId === raffleId)
        .reduce((s, e) => s + e.entries, 0);
    },
    [player.raffleEntries]
  );

  const xpNeeded = xpForLevel(player.level);
  const xpProgress = Math.min(1, player.xp / xpNeeded);
  const dailyStepProgress = Math.min(1, player.stepsToday / DAILY_STEP_GOAL);
  const strideStatus = useMemo(() => getStrideStatus(player.claimed.length), [player.claimed.length]);

  // ── Retention engine derived state ───────────────────────────────────────
  const powerHour = useMemo(() => resolveActivePowerHour(now), [now, resolveActivePowerHour]);
  const nextPower = useMemo(() => resolveNextPowerHour(now), [now, resolveNextPowerHour]);
  const hotVaultIds = useMemo(
    () => new Set(resolveHotVaultIds(now, VAULTS.map((v) => v.id))),
    [now, resolveHotVaultIds]
  );
  const finalHourWeek = useMemo(() => inFinalHour("week", now), [now]);
  const finalHourMonth = useMemo(() => inFinalHour("month", now), [now]);
  const todayHotLockedId = (player.hotVaultClaims ?? {})[dayKey(now)];
  const streakMult = streakMultiplier(player.streakDays);
  const comebackActive = (player.comebackClaimsRemaining ?? 0) > 0;
  const tribe = useMemo(
    () => (player.tribeId ? TRIBES.find((t) => t.id === player.tribeId) : undefined),
    [player.tribeId]
  );

  /** Tribe leaderboard for the current week. Your tribe's total uses your real coins, others use a pseudo-deterministic value. */
  const tribeBoard = useMemo(() => {
    const wkStart = periodStart("week", now);
    const myWeeklyCoins = periodCoinsEarned("week");
    return TRIBES.map((t) => ({
      tribe: t,
      coins:
        t.id === player.tribeId
          ? pseudoTribeCoins(t.id, wkStart) + myWeeklyCoins
          : pseudoTribeCoins(t.id, wkStart),
      isYou: t.id === player.tribeId,
    })).sort((a, b) => b.coins - a.coins);
  }, [now, player.tribeId, periodCoinsEarned]);

  const derbyTribes = useMemo(() => derbyTribesThisWeek(now), [now]);

  // ── Streak rollover — fires when day flips without a claim ────────────────────────────
  useEffect(() => {
    const cur = qc.getQueryData<PlayerState>(["player"]) ?? DEFAULT_PLAYER;
    const tk = todayKey();
    // Free Streak Freeze grant: every 14 days, max 2 stored.
    const lastGrant = cur.lastStreakFreezeGrantDate;
    let next = cur;
    if (!lastGrant) {
      next = { ...next, lastStreakFreezeGrantDate: tk };
    } else {
      const days = Math.floor((Date.now() - new Date(lastGrant).getTime()) / 86400_000);
      if (days >= STREAK_FREEZE_FREE_INTERVAL && (next.streakFreezes ?? 0) < 2) {
        next = {
          ...next,
          streakFreezes: Math.min(2, (next.streakFreezes ?? 0) + 1),
          lastStreakFreezeGrantDate: tk,
        };
      }
    }
    if (next !== cur) setPlayer(next).catch(() => {});
  }, [now, qc, setPlayer]);

  /** Buy a streak freeze with Stride Coins. */
  const buyStreakFreeze = useCallback(async () => {
    const cur = qc.getQueryData<PlayerState>(["player"]) ?? DEFAULT_PLAYER;
    if (cur.coins < STREAK_FREEZE_COST) return { ok: false as const, reason: "no-coins" };
    if ((cur.streakFreezes ?? 0) >= 3) return { ok: false as const, reason: "max" };
    await setPlayer({
      ...cur,
      coins: cur.coins - STREAK_FREEZE_COST,
      streakFreezes: (cur.streakFreezes ?? 0) + 1,
    });
    return { ok: true as const };
  }, [qc, setPlayer]);

  /** Pick / change tribe. */
  const pickTribe = useCallback(
    async (tribeId: string) => {
      const cur = qc.getQueryData<PlayerState>(["player"]) ?? DEFAULT_PLAYER;
      await setPlayer({ ...cur, tribeId });
    },
    [qc, setPlayer]
  );

  // ── Stride Predict ───────────────────────────────────────────────────────────────
  const placePrediction = useCallback(
    async (input: { pickPlayerId: string; pickName: string; stake: number }) => {
      const cur = qc.getQueryData<PlayerState>(["player"]) ?? DEFAULT_PLAYER;
      const stake = Math.max(PREDICT_MIN_STAKE, Math.min(PREDICT_MAX_STAKE, Math.round(input.stake)));
      const spendable = cur.coins - (cur.lockedCoins ?? 0);
      if (spendable < stake) return { ok: false as const, reason: "no-coins" };
      const marketId = currentPredictionMarketId(Date.now());
      // Replace any existing pick on this market (one pick per week).
      const others = (cur.predictions ?? []).filter((p) => p.marketId !== marketId);
      const prev = (cur.predictions ?? []).find((p) => p.marketId === marketId);
      const refund = prev?.stake ?? 0;
      const pick: PredictionPick = {
        marketId,
        pickPlayerId: input.pickPlayerId,
        pickName: input.pickName,
        stake,
        placedAt: Date.now(),
      };
      await setPlayer({
        ...cur,
        coins: cur.coins - stake + refund,
        lockedCoins: (cur.lockedCoins ?? 0) - refund + stake,
        predictions: [pick, ...others],
      });
      return { ok: true as const, pick };
    },
    [qc, setPlayer]
  );

  /** Settle prediction markets whose period has ended. */
  useEffect(() => {
    const cur = qc.getQueryData<PlayerState>(["player"]) ?? DEFAULT_PLAYER;
    const due = (cur.predictions ?? []).filter((p) => predictionMarketEndsAt(p.placedAt) <= now);
    if (due.length === 0) return;
    let coins = cur.coins;
    let locked = cur.lockedCoins ?? 0;
    const stillOpen = (cur.predictions ?? []).filter((p) => predictionMarketEndsAt(p.placedAt) > now);
    const settledNew: PredictionPick[] = [];
    for (const p of due) {
      const board = leaderboardFor("week", "global");
      const winnerId = board[0]?.id;
      locked = Math.max(0, locked - p.stake);
      if (winnerId === p.pickPlayerId) {
        // Simulate a pot: 5× stake as a baseline payout minus rake.
        const pot = p.stake * 5;
        const payout = Math.round(pot * (1 - PREDICT_RAKE_PCT));
        coins += payout;
        settledNew.push({ ...p, result: "won", payout, settledAt: Date.now() });
      } else {
        settledNew.push({ ...p, result: "lost", payout: 0, settledAt: Date.now() });
      }
    }
    setPlayer({
      ...cur,
      coins,
      lockedCoins: locked,
      predictions: stillOpen,
      predictionHistory: [...settledNew, ...(cur.predictionHistory ?? [])],
    }).catch(() => {});
  }, [now, qc, setPlayer, leaderboardFor]);

  // ── Comeback boost — detect rank drop on Monday rollover ────────────────────────
  useEffect(() => {
    const cur = qc.getQueryData<PlayerState>(["player"]) ?? DEFAULT_PLAYER;
    const myRank = myRankFor("week").rank;
    const lastRank = cur.lastWeekRank;
    if (lastRank === undefined) {
      setPlayer({ ...cur, lastWeekRank: myRank }).catch(() => {});
      return;
    }
    const drop = myRank - lastRank;
    if (drop >= COMEBACK_DROP_THRESHOLD && (cur.comebackClaimsRemaining ?? 0) === 0) {
      setPlayer({
        ...cur,
        comebackClaimsRemaining: COMEBACK_BOOST_CLAIMS,
        lastWeekRank: myRank,
      }).catch(() => {});
    }
  }, [now, qc, setPlayer, myRankFor]);

  // ── Tribe derby auto-settlement ─────────────────────────────────────────────────
  /**
   * On each week roll, if the player's tribe was in last week's derby pair
   * we mark their `lastTribeWinWeekKey` (top of the derby) or
   * `lastTribeLossWeekKey` (other derby side) for the *current* week. Both
   * grant a +10% claim multiplier so the loser experience stays warm.
   */
  useEffect(() => {
    const cur = qc.getQueryData<PlayerState>(["player"]) ?? DEFAULT_PLAYER;
    if (!cur.tribeId) return;
    const curWkKey = String(periodStart("week", now));
    if (cur.lastTribeWinWeekKey === curWkKey || cur.lastTribeLossWeekKey === curWkKey) return;
    const prev = now - 7 * 86400_000;
    const prevDerby = derbyTribesThisWeek(prev);
    if (!prevDerby) return;
    if (!prevDerby.includes(cur.tribeId)) return;
    const prevWkStart = periodStart("week", prev);
    const aCoins = pseudoTribeCoins(prevDerby[0], prevWkStart);
    const bCoins = pseudoTribeCoins(prevDerby[1], prevWkStart);
    const winnerId = aCoins >= bCoins ? prevDerby[0] : prevDerby[1];
    if (winnerId === cur.tribeId) {
      setPlayer({ ...cur, lastTribeWinWeekKey: curWkKey }).catch(() => {});
    } else {
      setPlayer({ ...cur, lastTribeLossWeekKey: curWkKey }).catch(() => {});
    }
  }, [now, qc, setPlayer]);

  // ── Tribe derby weekly settlement ───────────────────────────────────────────────
  const claimTribeBonus = useCallback(async () => {
    const cur = qc.getQueryData<PlayerState>(["player"]) ?? DEFAULT_PLAYER;
    if (!cur.tribeId) return { ok: false as const, reason: "no-tribe" };
    const myTribe = TRIBES.find((t) => t.id === cur.tribeId);
    if (!myTribe) return { ok: false as const, reason: "no-tribe" };
    const wkStart = String(periodStart("week", now) - 7 * 86400_000);
    if (cur.lastTribeWinWeekKey === wkStart) return { ok: false as const, reason: "already" };
    // Use last week's pseudo totals to decide.
    const prevStart = periodStart("week", now) - 1; // anything inside previous week
    const prevWkStart = periodStart("week", prevStart);
    const sorted = TRIBES
      .map((t) => ({ id: t.id, coins: pseudoTribeCoins(t.id, prevWkStart) }))
      .sort((a, b) => b.coins - a.coins);
    if (sorted[0]?.id !== cur.tribeId) return { ok: false as const, reason: "didnt-win" };
    // Per-tribe reward: football → 200 coins; Run Crew → Nike coins + raffle
    // ticket; Wellness → Lulu coins + streak freeze; etc.
    const reward = tribeWinReward(myTribe);
    const nextBrandCoins = { ...(cur.brandCoins ?? {}) };
    if (reward.brandId && reward.brandCoins) {
      nextBrandCoins[reward.brandId] = (nextBrandCoins[reward.brandId] ?? 0) + reward.brandCoins;
    }
    const nextStreakFreezes =
      reward.perk?.kind === "streak-freeze"
        ? Math.min(3, (cur.streakFreezes ?? 0) + 1)
        : cur.streakFreezes ?? 0;
    await setPlayer({
      ...cur,
      coins: cur.coins + reward.coins,
      brandCoins: nextBrandCoins,
      streakFreezes: nextStreakFreezes,
      lastTribeWinWeekKey: String(periodStart("week", now)),
    });
    return { ok: true as const, payout: reward.coins, reward };
  }, [qc, setPlayer, now]);

  // ── City waitlist ────────────────────────────────────────────────────────
  const setHomeCity = useCallback(
    async (cityId: string) => {
      const cur = qc.getQueryData<PlayerState>(["player"]) ?? DEFAULT_PLAYER;
      const prevId = cur.homeCityId;
      const cityVotes = { ...(cur.cityVotes ?? {}) };
      // Switching cities: starter vote goes to the new pick (avoids gaming
      // by hopping between cities — they don't carry the old contribution).
      if (!cityVotes[cityId] && cityId !== LIVE_CITY_ID) cityVotes[cityId] = 1;
      await setPlayer({
        ...cur,
        homeCityId: cityId,
        cityVotes,
        // Reset the steps-credited baseline so the meter starts fresh on
        // the new city instead of dumping accumulated steps in one go.
        cityVoteStepsCredited: prevId === cityId ? cur.cityVoteStepsCredited : cur.steps,
      });
    },
    [qc, setPlayer]
  );

  const boostHomeCity = useCallback(
    async (n: number = 10) => {
      const cur = qc.getQueryData<PlayerState>(["player"]) ?? DEFAULT_PLAYER;
      if (!cur.homeCityId || cur.homeCityId === LIVE_CITY_ID) return;
      await setPlayer({
        ...cur,
        cityVotes: addCityVotes(cur.cityVotes, cur.homeCityId, n),
      });
    },
    [qc, setPlayer]
  );

  /** Leaderboard: seeded baseline + this player's contribution, sorted desc. */
  const cityLeaderboard = useMemo(() => {
    const my = player.cityVotes ?? {};
    return CITIES
      .filter((c) => c.status === "waitlist")
      .map((c) => ({
        city: c,
        base: seededVotes(c, now),
        mine: my[c.id] ?? 0,
        total: seededVotes(c, now) + (my[c.id] ?? 0),
        isHome: c.id === player.homeCityId,
      }))
      .sort((a, b) => b.total - a.total);
  }, [player.cityVotes, player.homeCityId, now]);

  const homeCity: City | undefined = player.homeCityId ? CITY_BY_ID[player.homeCityId] : undefined;
  const homeCityRank = useMemo(() => {
    if (!player.homeCityId || player.homeCityId === LIVE_CITY_ID) return 0;
    const idx = cityLeaderboard.findIndex((r) => r.city.id === player.homeCityId);
    return idx >= 0 ? idx + 1 : 0;
  }, [cityLeaderboard, player.homeCityId]);

  return useMemo(
    () => ({
      player,
      now,
      isLoading: playerQuery.isLoading,
      vaultsWithDistance,
      rewards: rewardsQuery.data ?? REWARDS,
      raffles: rafflesQuery.data ?? [],
      brands: brandsQuery.data?.brands ?? [],
      strideStatus,
      plusActive,
      plusDailyCap: plusActive ? DAILY_CLAIM_HARD_CAP_PLUS : DAILY_CLAIM_HARD_CAP,
      subscribePlus: subscribeMutation.mutateAsync,
      isSubscribing: subscribeMutation.isPending,
      cancelPlus,
      markPlusOnboardingSeen,
      xpNeeded,
      xpProgress,
      dailyStepProgress,
      dailyStepGoal: DAILY_STEP_GOAL,
      minStepsBetweenClaims: MIN_STEPS_BETWEEN_CLAIMS,
      claimVault: claimMutation.mutateAsync,
      isClaiming: claimMutation.isPending,
      exchange: exchangeMutation.mutateAsync,
      isExchanging: exchangeMutation.isPending,
      redeem: redeemMutation.mutateAsync,
      isRedeeming: redeemMutation.isPending,
      enterRaffle: enterRaffleMutation.mutateAsync,
      isEnteringRaffle: enterRaffleMutation.isPending,
      entriesForRaffle,
      enableNotifications,
      disableNotifications,
      teleportTo,
      resetProgress,
      recordShare: recordShare.mutateAsync,
      claimReferral,
      shareDailyCap: MAX_DAILY_SHARES,
      shareRewardCoins: SHARE_REWARD_COINS,
      referralBonusCoins: REFERRAL_BONUS_COINS,
      dailyClaimHardCap: DAILY_CLAIM_HARD_CAP,
      dailyClaimTiers: DAILY_CLAIM_TIERS,
      claimsToday: player.claimsTodayDate === todayKey() ? player.claimsToday : 0,
      // Friends + challenges + ladder
      friends: player.friends ?? [],
      challenges: player.challenges ?? [],
      lockedCoins: player.lockedCoins ?? 0,
      spendableCoins: Math.max(0, player.coins - (player.lockedCoins ?? 0)),
      championBadges: player.championBadges ?? [],
      addFriend,
      removeFriend,
      createChallenge,
      acceptChallenge,
      declineChallenge,
      // Notifications inbox
      notifications: player.notifications ?? [],
      unreadNotifications,
      pendingNotifications,
      markNotificationRead,
      markAllNotificationsRead,
      resolveNotification,
      pushNotification,
      periodCoinsEarned,
      brandPeriodCoinsEarned,
      leaderboardFor,
      brandLeaderboardFor,
      myRankFor,
      claimLadderRewards,
      challengeRakePct: CHALLENGE_RAKE_PCT,
      maxChallengeParticipants: MAX_CHALLENGE_PARTICIPANTS,
      periodEnd: (p: Period) => periodEnd(p, now),
      // Retention engine
      powerHour,
      nextPowerHour: nextPower,
      hotVaultIds,
      todayHotLockedId,
      finalHourWeek,
      finalHourMonth,
      streakDays: player.streakDays,
      streakMult,
      streakFreezes: player.streakFreezes ?? 0,
      buyStreakFreeze,
      streakFreezeCost: STREAK_FREEZE_COST,
      comebackActive,
      comebackClaimsRemaining: player.comebackClaimsRemaining ?? 0,
      tribeLossRedemptionActive: player.lastTribeLossWeekKey === String(periodStart("week", now)),
      tribeWinActive: player.lastTribeWinWeekKey === String(periodStart("week", now)),
      weekEnd: periodEnd("week", now),
      tribe,
      pickTribe,
      tribeBoard,
      derbyTribes,
      claimTribeBonus,
      placePrediction,
      predictions: player.predictions ?? [],
      predictionHistory: player.predictionHistory ?? [],
      predictMinStake: PREDICT_MIN_STAKE,
      predictMaxStake: PREDICT_MAX_STAKE,
      predictionMarketId: currentPredictionMarketId(now),
      predictionMarketEndsAt: predictionMarketEndsAt(now),
      hasOnboarded: !!player.hasOnboarded,
      completeOnboarding,
      updateProfile,
      shouldShowPaywall,
      markPaywallShown,
      // City waitlist
      cities: CITIES,
      homeCity,
      homeCityRank,
      cityLeaderboard,
      setHomeCity,
      boostHomeCity,
      stepsPerCityVote: STEPS_PER_CITY_VOTE,
      shareCityVoteBonus: SHARE_CITY_VOTE_BONUS,
      markRebalanceSeen: async () => {
        const cur = qc.getQueryData<PlayerState>(["player"]) ?? DEFAULT_PLAYER;
        if (cur.seenRebalanceV2) return;
        await setPlayer({ ...cur, seenRebalanceV2: true });
      },
    }),
    [
      player,
      now,
      playerQuery.isLoading,
      vaultsWithDistance,
      rewardsQuery.data,
      rafflesQuery.data,
      brandsQuery.data,
      strideStatus,
      xpNeeded,
      xpProgress,
      dailyStepProgress,
      plusActive,
      subscribeMutation.mutateAsync,
      subscribeMutation.isPending,
      cancelPlus,
      markPlusOnboardingSeen,
      claimMutation.mutateAsync,
      claimMutation.isPending,
      exchangeMutation.mutateAsync,
      exchangeMutation.isPending,
      redeemMutation.mutateAsync,
      redeemMutation.isPending,
      enterRaffleMutation.mutateAsync,
      enterRaffleMutation.isPending,
      entriesForRaffle,
      enableNotifications,
      disableNotifications,
      teleportTo,
      resetProgress,
      recordShare.mutateAsync,
      claimReferral,
      addFriend,
      removeFriend,
      createChallenge,
      acceptChallenge,
      declineChallenge,
      unreadNotifications,
      pendingNotifications,
      markNotificationRead,
      markAllNotificationsRead,
      resolveNotification,
      pushNotification,
      periodCoinsEarned,
      brandPeriodCoinsEarned,
      leaderboardFor,
      brandLeaderboardFor,
      myRankFor,
      claimLadderRewards,
      powerHour,
      nextPower,
      hotVaultIds,
      todayHotLockedId,
      finalHourWeek,
      finalHourMonth,
      streakMult,
      buyStreakFreeze,
      comebackActive,
      tribe,
      pickTribe,
      tribeBoard,
      derbyTribes,
      claimTribeBonus,
      placePrediction,
      completeOnboarding,
      updateProfile,
      shouldShowPaywall,
      markPaywallShown,
      homeCity,
      homeCityRank,
      cityLeaderboard,
      setHomeCity,
      boostHomeCity,
    ]
  );
});

export type VaultWithDistance = ReturnType<typeof useGame>["vaultsWithDistance"][number];
