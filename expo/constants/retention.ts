/**
 * Retention engine — Power Hours, Hot Vaults, Streaks, Final Hour, Predictions,
 * and Football Tribes. All seven mechanics derive their schedule deterministically
 * from the date so every client agrees without a backend.
 */

import { periodEnd, periodStart, type Period } from "@/constants/periods";

// ── PRNG ────────────────────────────────────────────────────────────────────
function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// ── 1. POWER HOURS ──────────────────────────────────────────────────────────

export interface PowerHour {
  startsAt: number;
  endsAt: number;
  /** 2 or 3 — extra coin multiplier applied during this window. */
  multiplier: 2 | 3;
}

/** Deterministic Power Hour schedule for a given day (local time). */
export function powerHoursForDay(ms: number = Date.now()): PowerHour[] {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  const rng = mulberry32(hashStr("powerhour:" + dayKey(ms)));
  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
  // 2 windows on weekdays, 3 on weekends.
  const count = isWeekend ? 3 : 2;
  // Candidate start hours weighted around lunch / after-work / mornings.
  const buckets: { hour: number; weight: number }[] = isWeekend
    ? [
        { hour: 9, weight: 1 },
        { hour: 11, weight: 2 },
        { hour: 13, weight: 2 },
        { hour: 15, weight: 1.5 },
        { hour: 17, weight: 2 },
        { hour: 19, weight: 1.5 },
      ]
    : [
        { hour: 8, weight: 1 },
        { hour: 12, weight: 3 },
        { hour: 13, weight: 2 },
        { hour: 17, weight: 3 },
        { hour: 18, weight: 2 },
        { hour: 20, weight: 1.5 },
      ];
  const pool = [...buckets];
  const picks: number[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const totalW = pool.reduce((s, b) => s + b.weight, 0);
    let roll = rng() * totalW;
    let idx = 0;
    for (let j = 0; j < pool.length; j++) {
      roll -= pool[j].weight;
      if (roll <= 0) { idx = j; break; }
    }
    picks.push(pool[idx].hour);
    // Remove this hour + adjacent so windows don't overlap.
    const h = pool[idx].hour;
    for (let k = pool.length - 1; k >= 0; k--) {
      if (Math.abs(pool[k].hour - h) < 2) pool.splice(k, 1);
    }
  }
  picks.sort((a, b) => a - b);
  // One window per day is a rare 3× — pick the lunch/evening slot.
  const threeXIdx = picks.length > 1 ? Math.floor(rng() * picks.length) : -1;
  const dayStart = d.getTime();
  return picks.map((h, i) => ({
    startsAt: dayStart + h * 3600_000,
    endsAt: dayStart + (h + 1) * 3600_000,
    multiplier: (i === threeXIdx ? 3 : 2) as 2 | 3,
  }));
}

/** Currently-active Power Hour (if any). */
export function activePowerHour(now: number = Date.now()): PowerHour | null {
  for (const ph of powerHoursForDay(now)) {
    if (now >= ph.startsAt && now < ph.endsAt) return ph;
  }
  // Edge: late-night now spilling from previous day — usually none, but safe.
  return null;
}

/** Next upcoming Power Hour today or tomorrow. */
export function nextPowerHour(now: number = Date.now()): PowerHour | null {
  for (const ph of powerHoursForDay(now)) {
    if (ph.startsAt > now) return ph;
  }
  const tomorrow = now + 24 * 3600_000;
  const tom = powerHoursForDay(tomorrow);
  return tom[0] ?? null;
}

// ── 2. STREAK MULTIPLIERS ───────────────────────────────────────────────────

export interface StreakTier {
  days: number;
  multiplier: number;
  label: string;
}

export const STREAK_TIERS: StreakTier[] = [
  { days: 0, multiplier: 1.0, label: "Start your streak" },
  { days: 3, multiplier: 1.1, label: "Spark" },
  { days: 7, multiplier: 1.25, label: "Heat" },
  { days: 14, multiplier: 1.4, label: "Blaze" },
  { days: 30, multiplier: 1.6, label: "Inferno" },
  { days: 60, multiplier: 1.75, label: "Wildfire" },
];

export function streakMultiplier(days: number): number {
  let m = 1;
  for (const t of STREAK_TIERS) if (days >= t.days) m = t.multiplier;
  return m;
}

export function streakTier(days: number): StreakTier {
  let cur = STREAK_TIERS[0];
  for (const t of STREAK_TIERS) if (days >= t.days) cur = t;
  return cur;
}

export function nextStreakTier(days: number): StreakTier | null {
  for (const t of STREAK_TIERS) if (t.days > days) return t;
  return null;
}

/** Cost in coins to buy a Streak Freeze. */
export const STREAK_FREEZE_COST = 300;
/** Days between automatic free Streak Freeze grants. */
export const STREAK_FREEZE_FREE_INTERVAL = 14;

// ── 3. HOT VAULTS ───────────────────────────────────────────────────────────

/** How many vaults turn Hot per day. */
export const HOT_VAULT_COUNT = 5;
/** Extra coin multiplier on a Hot Vault claim. */
export const HOT_VAULT_MULTIPLIER = 5;
/** When the daily rotation flips (local hour). */
export const HOT_VAULT_RESET_HOUR = 6;

/** Start ms of the current Hot Vault window (06:00 local). */
export function hotVaultWindowStart(now: number = Date.now()): number {
  const d = new Date(now);
  d.setHours(HOT_VAULT_RESET_HOUR, 0, 0, 0);
  if (d.getTime() > now) d.setDate(d.getDate() - 1);
  return d.getTime();
}
export function hotVaultWindowEnd(now: number = Date.now()): number {
  return hotVaultWindowStart(now) + 24 * 3600_000;
}

/** Deterministic Hot Vault ids for the current window from a vault catalogue. */
export function hotVaultIdsForWindow(vaultIds: string[], now: number = Date.now()): string[] {
  if (vaultIds.length === 0) return [];
  const key = String(hotVaultWindowStart(now));
  const rng = mulberry32(hashStr("hot:" + key));
  const pool = [...vaultIds];
  const out: string[] = [];
  const n = Math.min(HOT_VAULT_COUNT, pool.length);
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(rng() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

// ── 4. COMEBACK BOOST ───────────────────────────────────────────────────────

export const COMEBACK_DROP_THRESHOLD = 3;
export const COMEBACK_BOOST_CLAIMS = 3;
export const COMEBACK_MULTIPLIER = 1.5;

// ── 5. FINAL HOUR ───────────────────────────────────────────────────────────

export const FINAL_HOUR_MS = 60 * 60_000;
export const FINAL_HOUR_MULTIPLIER = 2;

/** True if we're in the final hour of the given period. */
export function inFinalHour(period: Period, now: number = Date.now()): boolean {
  const end = periodEnd(period, now);
  return now >= end - FINAL_HOUR_MS && now < end;
}

/** ms until the next Final Hour begins for the given period. */
export function nextFinalHourAt(period: Period, now: number = Date.now()): number {
  return periodEnd(period, now) - FINAL_HOUR_MS;
}

// ── 6. STRIDE PREDICT ───────────────────────────────────────────────────────

/** Min / max stake on a single prediction. */
export const PREDICT_MIN_STAKE = 50;
export const PREDICT_MAX_STAKE = 500;
/** House rake on the prediction pot — funds the ladder prize pool. */
export const PREDICT_RAKE_PCT = 0.05;

/** Stable id for the current weekly market. */
export function currentPredictionMarketId(now: number = Date.now()): string {
  const s = periodStart("week", now);
  return `pm_${new Date(s).toISOString().slice(0, 10)}`;
}

export function predictionMarketEndsAt(now: number = Date.now()): number {
  return periodEnd("week", now);
}

// ── 7. TRIBES (Football + Run Crews + Wellness + Workplace + Borough + Uni) ─

export type TribeCategory =
  | "football"
  | "runCrew"
  | "wellness"
  | "workplace"
  | "borough"
  | "university";

export interface TribePerk {
  /** "streak-freeze" | "free-raffle-ticket" | "local-cafe" | "mystery-box" */
  kind: "streak-freeze" | "free-raffle-ticket" | "local-cafe" | "mystery-box";
  label: string;
}

export interface TribeWinReward {
  coins: number;
  brandId?: "nike" | "apple" | "lulu";
  brandCoins?: number;
  perk?: TribePerk;
  /** Short headline shown on the claim card. */
  headline: string;
}

/** Per-category default win reward — each tribe's `winReward` overrides if set. */
export const CATEGORY_WIN_REWARDS: Record<TribeCategory, TribeWinReward> = {
  football:   { coins: 200, headline: "200 coins for backing the winning club" },
  runCrew:    { coins: 150, brandId: "nike",  brandCoins: 50, perk: { kind: "free-raffle-ticket", label: "+1 Vaporfly Raffle Ticket" }, headline: "150 coins + 50 Nike coins + free Vaporfly raffle ticket" },
  wellness:   { coins: 150, brandId: "lulu",  brandCoins: 40, perk: { kind: "streak-freeze", label: "+1 Streak Freeze" },             headline: "150 coins + 40 Lulu coins + 1 streak freeze" },
  workplace:  { coins: 150, brandId: "apple", brandCoins: 30,                                                                          headline: "150 coins + 30 Apple credit for the office crew" },
  borough:    { coins: 250, perk: { kind: "local-cafe", label: "+1 Pret Voucher" },                                                     headline: "250 coins + a free Pret coffee on the postcode" },
  university: { coins: 175, perk: { kind: "mystery-box", label: "Mystery Box" },                                                        headline: "175 coins + a mystery box for the campus" },
};

export interface Tribe {
  id: string;
  name: string;
  short: string;
  area: string;
  primary: string;
  accent: string;
  emoji: string;
  category: TribeCategory;
  /**
   * City scope. If set, this tribe only appears for players whose home city
   * matches. If undefined, the tribe is "shared" — it shows everywhere
   * (e.g. Parkrun Posse, Marathon Build, Yoga Riders, NHS Walkers).
   */
  cityId?: string;
  /** Optional override; falls back to `CATEGORY_WIN_REWARDS[category]`. */
  winReward?: TribeWinReward;
}

export const TRIBES: Tribe[] = [
  // ── London football ─────────────────────────────────────────────────────
  { id: "arsenal", name: "Arsenal", short: "ARS", area: "North London (Highbury)", primary: "#EF0107", accent: "#FFFFFF", emoji: "🔴", category: "football", cityId: "london" },
  { id: "spurs", name: "Tottenham Hotspur", short: "TOT", area: "North London (Tottenham)", primary: "#132257", accent: "#FFFFFF", emoji: "⚪", category: "football", cityId: "london" },
  { id: "chelsea", name: "Chelsea", short: "CHE", area: "West London (Fulham)", primary: "#034694", accent: "#FFFFFF", emoji: "🔵", category: "football", cityId: "london" },
  { id: "west-ham", name: "West Ham United", short: "WHU", area: "East London (Stratford)", primary: "#7A263A", accent: "#1BB1E7", emoji: "🟣", category: "football", cityId: "london" },
  { id: "crystal-palace", name: "Crystal Palace", short: "CRY", area: "South London (Selhurst)", primary: "#1B458F", accent: "#C4122E", emoji: "🦅", category: "football", cityId: "london" },
  { id: "fulham", name: "Fulham", short: "FUL", area: "West London (Craven Cottage)", primary: "#000000", accent: "#FFFFFF", emoji: "⚫", category: "football", cityId: "london" },
  { id: "brentford", name: "Brentford", short: "BRE", area: "West London (Brentford)", primary: "#E30613", accent: "#FBB800", emoji: "🐝", category: "football", cityId: "london" },

  // ── Manchester football ────────────────────────────────────────────────
  { id: "man-utd", name: "Manchester United", short: "MUN", area: "Old Trafford", primary: "#DA291C", accent: "#FBE122", emoji: "🔺", category: "football", cityId: "manchester" },
  { id: "man-city", name: "Manchester City", short: "MCI", area: "Etihad", primary: "#6CABDD", accent: "#1C2C5B", emoji: "🟦", category: "football", cityId: "manchester" },

  // ── Liverpool football ─────────────────────────────────────────────────
  // (Liverpool isn't in the city list yet — still surface for transplants if they pick Manchester.)
  { id: "liverpool", name: "Liverpool", short: "LIV", area: "Anfield", primary: "#C8102E", accent: "#F6EB61", emoji: "🔴", category: "football", cityId: "manchester" },

  // ── New York football (soccer) ─────────────────────────────────────────
  { id: "nycfc", name: "New York City FC", short: "NYC", area: "Yankee Stadium", primary: "#6CADDF", accent: "#00285E", emoji: "🟦", category: "football", cityId: "new-york" },
  { id: "ny-red-bulls", name: "NY Red Bulls", short: "NYRB", area: "Red Bull Arena", primary: "#E32227", accent: "#FFFFFF", emoji: "🔴", category: "football", cityId: "new-york" },

  // ── Paris football ─────────────────────────────────────────────────────
  { id: "psg", name: "Paris Saint-Germain", short: "PSG", area: "Parc des Princes", primary: "#004170", accent: "#DA291C", emoji: "🔵", category: "football", cityId: "paris" },

  // ── Run crews → Nike-skewed (shared across cities) ────────────────────
  { id: "parkrun", name: "Parkrun Posse", short: "PRK", area: "Saturday 9am, anywhere", primary: "#FA5400", accent: "#FFFFFF", emoji: "🏃", category: "runCrew" },
  { id: "marathon-build", name: "Marathon Build", short: "M26", area: "Anywhere", primary: "#E32636", accent: "#FFFFFF", emoji: "🏅", category: "runCrew" },
  { id: "trackmafia", name: "Track Mafia", short: "TKM", area: "East London (Mile End)", primary: "#FF7A2C", accent: "#000000", emoji: "⚡", category: "runCrew", cityId: "london" },
  { id: "mcr-track", name: "MCR Track Club", short: "MCR", area: "Sportcity", primary: "#FF7A2C", accent: "#000000", emoji: "⚡", category: "runCrew", cityId: "manchester" },
  { id: "nyrr", name: "New York Road Runners", short: "NYRR", area: "Central Park", primary: "#FF7A2C", accent: "#000000", emoji: "🏞️", category: "runCrew", cityId: "new-york" },

  // ── Wellness → Lulu-skewed (shared across cities) ─────────────────────
  { id: "yoga-riders", name: "Yoga Riders", short: "YGA", area: "Anywhere", primary: "#D62828", accent: "#FFFFFF", emoji: "🧘", category: "wellness" },
  { id: "pilates-club", name: "Pilates Club", short: "PIL", area: "Anywhere", primary: "#FF4D4D", accent: "#FFFFFF", emoji: "🌿", category: "wellness" },

  // ── Workplace → Apple credit ──────────────────────────────────────────
  { id: "tech-crew", name: "Tech Crew", short: "TECH", area: "Shoreditch / King's X", primary: "#C9CFDB", accent: "#000000", emoji: "💻", category: "workplace", cityId: "london" },
  { id: "city-mile", name: "The City Mile", short: "CITY", area: "Bank / Canary Wharf", primary: "#1F4E79", accent: "#FFFFFF", emoji: "📈", category: "workplace", cityId: "london" },
  { id: "nhs-walkers", name: "NHS Walkers", short: "NHS", area: "All UK", primary: "#005EB8", accent: "#FFFFFF", emoji: "💙", category: "workplace" },
  { id: "nyc-finance", name: "Wall St Walkers", short: "WST", area: "Financial District", primary: "#1F4E79", accent: "#FFFFFF", emoji: "📈", category: "workplace", cityId: "new-york" },
  { id: "mcr-mediacity", name: "MediaCity Crew", short: "MCU", area: "Salford Quays", primary: "#C9CFDB", accent: "#000000", emoji: "📺", category: "workplace", cityId: "manchester" },

  // ── Boroughs → local cafe perks ───────────────────────────────────────
  // London
  { id: "hackney", name: "Hackney", short: "E8", area: "East London", primary: "#22C55E", accent: "#FFFFFF", emoji: "🟢", category: "borough", cityId: "london" },
  { id: "camden", name: "Camden", short: "NW1", area: "North London", primary: "#F97316", accent: "#FFFFFF", emoji: "🟠", category: "borough", cityId: "london" },
  { id: "brixton", name: "Brixton", short: "SW9", area: "South London", primary: "#EAB308", accent: "#000000", emoji: "🟡", category: "borough", cityId: "london" },
  { id: "shoreditch", name: "Shoreditch", short: "EC2", area: "East London", primary: "#0F172A", accent: "#FFFFFF", emoji: "⚫", category: "borough", cityId: "london" },
  // Manchester
  { id: "northern-quarter", name: "Northern Quarter", short: "NQ", area: "Manchester", primary: "#F97316", accent: "#FFFFFF", emoji: "🎨", category: "borough", cityId: "manchester" },
  { id: "ancoats", name: "Ancoats", short: "ANC", area: "Manchester", primary: "#22C55E", accent: "#FFFFFF", emoji: "☕", category: "borough", cityId: "manchester" },
  { id: "didsbury", name: "Didsbury", short: "DID", area: "South Manchester", primary: "#EAB308", accent: "#000000", emoji: "🌳", category: "borough", cityId: "manchester" },
  { id: "salford", name: "Salford", short: "SAL", area: "Greater Manchester", primary: "#7C3AED", accent: "#FFFFFF", emoji: "🟣", category: "borough", cityId: "manchester" },
  // New York
  { id: "manhattan", name: "Manhattan", short: "MAN", area: "NYC", primary: "#0F172A", accent: "#FFFFFF", emoji: "🏙️", category: "borough", cityId: "new-york" },
  { id: "brooklyn", name: "Brooklyn", short: "BK", area: "NYC", primary: "#22C55E", accent: "#FFFFFF", emoji: "🌉", category: "borough", cityId: "new-york" },
  { id: "queens", name: "Queens", short: "QNS", area: "NYC", primary: "#F97316", accent: "#FFFFFF", emoji: "🟠", category: "borough", cityId: "new-york" },
  { id: "the-bronx", name: "The Bronx", short: "BX", area: "NYC", primary: "#EAB308", accent: "#000000", emoji: "🟡", category: "borough", cityId: "new-york" },
  // Paris
  { id: "le-marais", name: "Le Marais", short: "MRS", area: "Paris", primary: "#EF4444", accent: "#FFFFFF", emoji: "🥖", category: "borough", cityId: "paris" },
  { id: "montmartre", name: "Montmartre", short: "MMT", area: "Paris", primary: "#F97316", accent: "#FFFFFF", emoji: "🎨", category: "borough", cityId: "paris" },
  // Tokyo
  { id: "shibuya", name: "Shibuya", short: "SHB", area: "Tokyo", primary: "#EF4444", accent: "#FFFFFF", emoji: "🟥", category: "borough", cityId: "tokyo" },
  { id: "shinjuku", name: "Shinjuku", short: "SHJ", area: "Tokyo", primary: "#7C3AED", accent: "#FFFFFF", emoji: "🌆", category: "borough", cityId: "tokyo" },

  // ── Universities → mystery boxes ──────────────────────────────────────
  // London
  { id: "ucl", name: "UCL", short: "UCL", area: "Bloomsbury", primary: "#500778", accent: "#FFFFFF", emoji: "🟣", category: "university", cityId: "london" },
  { id: "kcl", name: "King's College", short: "KCL", area: "Strand", primary: "#E2231A", accent: "#FFFFFF", emoji: "🔴", category: "university", cityId: "london" },
  { id: "imperial", name: "Imperial", short: "ICL", area: "South Ken", primary: "#003E74", accent: "#FFFFFF", emoji: "🔵", category: "university", cityId: "london" },
  { id: "lse", name: "LSE", short: "LSE", area: "Holborn", primary: "#7C2855", accent: "#FFFFFF", emoji: "⚫", category: "university", cityId: "london" },
  // Manchester
  { id: "uom", name: "Univ of Manchester", short: "UoM", area: "Oxford Rd", primary: "#660066", accent: "#FFFFFF", emoji: "🟣", category: "university", cityId: "manchester" },
  { id: "mmu", name: "Manchester Met", short: "MMU", area: "All Saints", primary: "#FFCC00", accent: "#000000", emoji: "🟡", category: "university", cityId: "manchester" },
  // New York
  { id: "nyu", name: "NYU", short: "NYU", area: "Greenwich Village", primary: "#57068C", accent: "#FFFFFF", emoji: "🟣", category: "university", cityId: "new-york" },
  { id: "columbia", name: "Columbia", short: "CU", area: "Morningside Heights", primary: "#75B2DD", accent: "#FFFFFF", emoji: "🔵", category: "university", cityId: "new-york" },
  // Paris
  { id: "sorbonne", name: "Sorbonne", short: "SBN", area: "Latin Quarter", primary: "#7C2855", accent: "#FFFFFF", emoji: "⚫", category: "university", cityId: "paris" },
];

/**
 * Tribes visible to a player in `cityId`. Returns all shared tribes plus any
 * scoped to that city. If `cityId` is undefined, returns shared + London
 * (default flagship) so brand-new users always see something.
 */
export function tribesForCity(cityId: string | undefined): Tribe[] {
  const effective = cityId ?? "london";
  return TRIBES.filter((t) => !t.cityId || t.cityId === effective);
}

export function findTribe(id: string | undefined): Tribe | undefined {
  if (!id) return undefined;
  return TRIBES.find((t) => t.id === id);
}

/** Resolved win reward for a tribe (override → category default). */
export function tribeWinReward(tribe: Tribe): TribeWinReward {
  return tribe.winReward ?? CATEGORY_WIN_REWARDS[tribe.category];
}

export const TRIBE_CATEGORY_META: Record<TribeCategory, { title: string; caption: string }> = {
  football:   { title: "FOOTBALL",     caption: "Back your club. Win for the badge." },
  runCrew:    { title: "RUN CREWS",    caption: "Stack miles with the crew. Win Nike drops." },
  wellness:   { title: "WELLNESS",     caption: "Move soft, win Lulu." },
  workplace:  { title: "WORKPLACE",    caption: "Crew up with your office. Apple credit on the line." },
  borough:    { title: "BOROUGHS",     caption: "Rep your postcode. Win local perks." },
  university: { title: "UNIVERSITIES", caption: "Reppin' the campus." },
};

/** Tribe of the week that doubles the stakes — pseudo-derby weeks. */
export function derbyTribesThisWeek(now: number = Date.now()): [string, string] | null {
  const wk = String(periodStart("week", now));
  const rng = mulberry32(hashStr("derby:" + wk));
  // Roughly 1-in-4 weeks are derby weeks.
  if (rng() > 0.25) return null;
  const a = TRIBES[Math.floor(rng() * TRIBES.length)];
  let b = TRIBES[Math.floor(rng() * TRIBES.length)];
  if (b.id === a.id) b = TRIBES[(TRIBES.indexOf(b) + 1) % TRIBES.length];
  return [a.id, b.id];
}

/** Bonus coins awarded to every player in the winning tribe at week settlement. */
export const TRIBE_WIN_BONUS = 200;

/** Pseudo tribe weekly total — same deterministic style as friend leaderboards. */
export function pseudoTribeCoins(tribeId: string, weekStart: number): number {
  const s = `tribe::${tribeId}::${weekStart}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return 12000 + (h % 60000);
}

// ── COMBINED MULTIPLIER HELPER ──────────────────────────────────────────────

/** Hard global cap so a perfect-storm claim can't break the economy. */
export const MAX_TOTAL_MULTIPLIER = 20;

export interface MultiplierBreakdown {
  base: number;
  tier: number;
  daily: number;
  plus: number;
  streak: number;
  hot: number;
  power: number;
  comeback: number;
  tribe: number;
  /** Product, clamped to MAX_TOTAL_MULTIPLIER. */
  total: number;
  /** True if MAX_TOTAL_MULTIPLIER was hit. */
  capped: boolean;
}

export function combineMultipliers(parts: Omit<MultiplierBreakdown, "total" | "capped">): MultiplierBreakdown {
  const raw =
    parts.base *
    parts.tier *
    parts.daily *
    parts.plus *
    parts.streak *
    parts.hot *
    parts.power *
    parts.comeback *
    parts.tribe;
  const capped = raw > MAX_TOTAL_MULTIPLIER;
  return { ...parts, total: Math.min(MAX_TOTAL_MULTIPLIER, raw), capped };
}
