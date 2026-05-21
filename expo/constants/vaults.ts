import type { Tier } from "@/constants/theme";
import type { Vault, VaultIcon, VaultKind } from "@/types/game";

/**
 * Default respawn windows by tier.
 *
 * Long enough that you can't camp a single spot all day, short enough that if
 * you walk past the same vault tomorrow it's open again. Branded vaults
 * (Nike/Apple) override these to drive repeat traffic to partner stores.
 */
export const RESPAWN_HOURS_BY_TIER: Record<Tier, number> = {
  bronze: 6,
  silver: 10,
  gold: 16,
  platinum: 22,
};

/** Get effective respawn window for a vault in milliseconds. */
export function respawnMs(vault: Vault): number {
  const hours = vault.respawnHours ?? RESPAWN_HOURS_BY_TIER[vault.tier];
  return hours * 60 * 60 * 1000;
}

/**
 * Tokenomics v3 — raffles-only burn era.
 * Cut ~25% across tiers from v2 so weekly coin supply is roughly absorbed by
 * £500–£1,500 of raffle prizes. XP unchanged — only £-relevant coin yield.
 */
const TIER_REWARD: Record<Tier, { coins: [number, number]; xp: [number, number] }> = {
  bronze: { coins: [26, 38], xp: [25, 40] },
  silver: { coins: [52, 71], xp: [55, 75] },
  gold: { coins: [105, 150], xp: [110, 160] },
  platinum: { coins: [240, 315], xp: [230, 310] },
};

// ── Deterministic PRNG so 1,100 vaults are stable across reloads ───────────
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

/** Pick a deterministic reward for any vault id+tier. Stable across reloads. */
function rewardFor(id: string, tier: Tier): { coins: number; xp: number } {
  const rng = mulberry32(hashStr(id + ":reward"));
  const r = TIER_REWARD[tier];
  const coins = Math.round(r.coins[0] + rng() * (r.coins[1] - r.coins[0]));
  const xp = Math.round(r.xp[0] + rng() * (r.xp[1] - r.xp[0]));
  return { coins, xp };
}

// ── Curated landmarks + brand vaults (hand-placed; rewards re-priced) ──────

type CuratedSeed = Omit<Vault, "reward"> & { reward?: Vault["reward"] };

const CURATED: CuratedSeed[] = [
  // CENTRAL — iconic landmarks
  { id: "big-ben", name: "Big Ben", area: "Westminster", blurb: "The Elizabeth Tower keeps time — and keeps secrets.", lat: 51.5007, lng: -0.1246, tier: "gold", kind: "landmark", icon: "clock" },
  { id: "tower-bridge", name: "Tower Bridge", area: "Tower Hamlets", blurb: "A legendary haul awaits beneath the bascules.", lat: 51.5055, lng: -0.0754, tier: "platinum", kind: "landmark", icon: "castle" },
  { id: "london-eye", name: "London Eye", area: "South Bank", blurb: "Open space, weekend traffic — and a glittering wheel of loot.", lat: 51.5033, lng: -0.1196, tier: "gold", kind: "landmark", icon: "wheel" },
  { id: "buckingham", name: "Buckingham Palace", area: "Mayfair", blurb: "A royal cache hidden behind the gates.", lat: 51.5014, lng: -0.1419, tier: "gold", kind: "landmark", icon: "crown" },
  { id: "trafalgar", name: "Trafalgar Square", area: "Westminster", blurb: "Nelson watches — coins glint at the lions' feet.", lat: 51.5080, lng: -0.1281, tier: "silver", kind: "landmark", icon: "lion" },
  { id: "covent", name: "Covent Garden Piazza", area: "West End", blurb: "Street performers, influencer crowds, hidden loot.", lat: 51.5117, lng: -0.1240, tier: "gold", kind: "landmark", icon: "theater" },
  { id: "stpauls", name: "St Paul's", area: "City of London", blurb: "Whispers in the dome — riches in the crypt.", lat: 51.5138, lng: -0.0984, tier: "gold", kind: "landmark", icon: "church" },
  { id: "british-museum", name: "British Museum", area: "Bloomsbury", blurb: "Antiquities and a curator's secret.", lat: 51.5194, lng: -0.1270, tier: "silver", kind: "landmark", icon: "book" },
  { id: "hyde-park", name: "Hyde Park", area: "Westminster", blurb: "Joggers, wellness crowd — bronze stash by the Serpentine.", lat: 51.5074, lng: -0.1657, tier: "bronze", kind: "landmark", icon: "tree" },
  { id: "sky-garden", name: "Sky Garden", area: "City of London", blurb: "Sun-soaked palms hide a glittering prize.", lat: 51.5113, lng: -0.0838, tier: "gold", kind: "landmark", icon: "tower" },
  { id: "regents-park", name: "Regent's Park Inner Circle", area: "Marylebone", blurb: "Wellness, leisure, families — and a hidden bronze cache.", lat: 51.5294, lng: -0.1545, tier: "bronze", kind: "landmark", icon: "leaf" },
  { id: "camden-market", name: "Camden Market", area: "Camden", blurb: "Streetwear, vinyl, viral content — collect before the crowd does.", lat: 51.5414, lng: -0.1466, tier: "silver", kind: "landmark", icon: "market" },

  // BRAND — Nike
  { id: "nike-town-london", name: "Niketown London", area: "Oxford Circus", blurb: "Flagship vault. Tap in-store for an exclusive Air Drop.", lat: 51.5147, lng: -0.1421, tier: "platinum", kind: "brand", icon: "shopping", brand: "nike", respawnHours: 6 },
  { id: "nike-stratford", name: "Nike · Westfield Stratford", area: "Stratford", blurb: "Olympic legacy run — daily restock for the East London crew.", lat: 51.5436, lng: -0.0058, tier: "gold", kind: "brand", icon: "shopping", brand: "nike", respawnHours: 5 },
  { id: "nike-boxpark-shoreditch", name: "Nike · Boxpark Shoreditch", area: "Shoreditch", blurb: "Streetwear capsule vault — limited weekend drops.", lat: 51.5235, lng: -0.0769, tier: "gold", kind: "brand", icon: "shopping", brand: "nike", respawnHours: 8 },

  // BRAND — Apple
  { id: "apple-regent-st", name: "Apple Regent Street", area: "Mayfair", blurb: "The original UK flagship. Daily AirDrop of platinum coins.", lat: 51.5135, lng: -0.1421, tier: "platinum", kind: "brand", icon: "shopping", brand: "apple", respawnHours: 6 },
  { id: "apple-covent-garden", name: "Apple Covent Garden", area: "West End", blurb: "Largest Apple Store in the world. Tap inside for the vault.", lat: 51.5128, lng: -0.1239, tier: "gold", kind: "brand", icon: "shopping", brand: "apple", respawnHours: 6 },
  { id: "apple-battersea", name: "Apple Battersea Power Station", area: "Battersea", blurb: "Industrial cathedral, modern vault — riverside drop.", lat: 51.4811, lng: -0.1446, tier: "gold", kind: "brand", icon: "shopping", brand: "apple", respawnHours: 7 },
  { id: "apple-brompton-rd", name: "Apple Brompton Road", area: "Knightsbridge", blurb: "Knightsbridge cache — luxury district daily restock.", lat: 51.4994, lng: -0.1640, tier: "gold", kind: "brand", icon: "shopping", brand: "apple", respawnHours: 8 },

  // MEGA — brand-led, high footfall
  { id: "canary-wharf", name: "Canary Wharf", area: "Crossrail Place", blurb: "Futuristic, corporate lunchtime walkers. Mega-tier loot.", lat: 51.5054, lng: -0.0181, tier: "platinum", kind: "mega", icon: "tower" },
  { id: "westfield-london", name: "Westfield London", area: "Shepherd's Bush", blurb: "Retail partnerships and brand activations live here.", lat: 51.5072, lng: -0.2211, tier: "platinum", kind: "mega", icon: "shopping" },

  // SEASONAL / culture
  { id: "shoreditch", name: "Shoreditch Boxpark", area: "East London", blurb: "Youth culture, creatives — spray-paint and platinum in the alleys.", lat: 51.5232, lng: -0.0777, tier: "platinum", kind: "seasonal", icon: "spray" },
  { id: "kings-cross", name: "King's Cross Granary Sq", area: "Camden", blurb: "Young professionals, Google HQ, cultural events.", lat: 51.5346, lng: -0.1252, tier: "gold", kind: "landmark", icon: "train" },

  // OUTER — mini vaults / community
  { id: "wimbledon-common", name: "Wimbledon Common", area: "Wimbledon", blurb: "Affluent suburb, sports + outdoor lifestyle.", lat: 51.4346, lng: -0.2284, tier: "silver", kind: "mini", icon: "leaf" },
  { id: "richmond-riverside", name: "Richmond Riverside", area: "Richmond", blurb: "High-income families, fitness-conscious crowd.", lat: 51.4613, lng: -0.3037, tier: "silver", kind: "mini", icon: "leaf" },
  { id: "greenwich-park", name: "Greenwich · Cutty Sark", area: "Greenwich", blurb: "Heritage + family activity hub on the Thames.", lat: 51.4769, lng: -0.0095, tier: "gold", kind: "mini", icon: "ship" },
  { id: "hampstead-heath", name: "Parliament Hill", area: "Hampstead Heath", blurb: "Fitness walkers, panoramic skyline, affluent crowd.", lat: 51.5608, lng: -0.1571, tier: "gold", kind: "mini", icon: "tree" },
  { id: "crystal-palace", name: "Crystal Palace Park", area: "Crystal Palace", blurb: "Local loyalty, heritage, active families.", lat: 51.4226, lng: -0.0728, tier: "bronze", kind: "mini", icon: "star" },
  { id: "boxpark-croydon", name: "Boxpark Croydon", area: "Croydon", blurb: "Urban Gen Z crowd, Nike + Adidas demos.", lat: 51.3745, lng: -0.0973, tier: "silver", kind: "mini", icon: "spray" },
  { id: "ealing-broadway", name: "Ealing Broadway", area: "Ealing", blurb: "Commuter hub, commercial retail blend.", lat: 51.5152, lng: -0.3017, tier: "bronze", kind: "mini", icon: "shopping" },
  { id: "stratford-olympic", name: "Olympic Park", area: "Stratford", blurb: "Youth, athletics, event space. The Orbit watches over loot.", lat: 51.5440, lng: -0.0133, tier: "gold", kind: "mini", icon: "stadium" },
  { id: "twickenham", name: "Twickenham Stadium", area: "Twickenham", blurb: "Rugby crowd, large open zones.", lat: 51.4560, lng: -0.3416, tier: "silver", kind: "mini", icon: "stadium" },
  { id: "bromley", name: "Bromley High St", area: "Bromley", blurb: "Underserved audience, strong mall activation.", lat: 51.4053, lng: 0.0144, tier: "bronze", kind: "mini", icon: "shopping" },
  { id: "uxbridge", name: "Uxbridge · Pavilions", area: "Uxbridge", blurb: "Westside mall-based family engagement.", lat: 51.5465, lng: -0.4796, tier: "bronze", kind: "mini", icon: "shopping" },
  { id: "wembley", name: "Wembley Stadium", area: "Wembley", blurb: "The arch towers over a platinum-tier match-day cache.", lat: 51.5560, lng: -0.2796, tier: "platinum", kind: "landmark", icon: "stadium" },
  { id: "kew-gardens", name: "Kew Gardens", area: "Richmond", blurb: "Glasshouses, botanic riches — a gold-tier garden vault.", lat: 51.4787, lng: -0.2956, tier: "gold", kind: "landmark", icon: "leaf" },
  { id: "o2-arena", name: "The O2", area: "Greenwich Peninsula", blurb: "Event nights, post-show crowds — platinum loot under the tents.", lat: 51.5030, lng: 0.0032, tier: "platinum", kind: "landmark", icon: "stadium" },

  // TUBE drops
  { id: "tube-liverpool-st", name: "Liverpool St · Broadgate", area: "Tube Drop", blurb: "Lunch-rush vault outside the Broadgate Circle exit.", lat: 51.5188, lng: -0.0823, tier: "silver", kind: "tube", icon: "tube" },
  { id: "tube-bond-st", name: "Bond St · Fenwick", area: "Tube Drop", blurb: "South Molton St exit — limited-time vault.", lat: 51.5147, lng: -0.1493, tier: "gold", kind: "tube", icon: "tube" },
  { id: "tube-victoria", name: "Victoria · Plaza", area: "Tube Drop", blurb: "Tourist crossroads between coach + rail stations.", lat: 51.4951, lng: -0.1432, tier: "silver", kind: "tube", icon: "tube" },
  { id: "tube-tcr", name: "Tottenham Ct Rd · Outernet", area: "Tube Drop", blurb: "Outside the giant screens. Peak-hour chase vault.", lat: 51.5161, lng: -0.1306, tier: "gold", kind: "tube", icon: "tube" },
  { id: "tube-south-ken", name: "South Kensington · NHM", area: "Tube Drop", blurb: "Outside the Natural History Museum on Exhibition Rd.", lat: 51.4940, lng: -0.1738, tier: "silver", kind: "tube", icon: "museum" },
];

// ── Borough seeds for procedural generation ────────────────────────────────

interface BoroughSeed {
  id: string;
  name: string; // e.g. "Brixton"
  zone: 1 | 2 | 3 | 4 | 5 | 6;
  center: { lat: number; lng: number };
  /** Radius in degrees. ~0.01 ≈ 1.1km. */
  radius: number;
  count: number;
}

/**
 * Greater London borough/neighbourhood seeds. Counts sum to ~1,050; combined
 * with the ~45 curated vaults above the total is ~1,100.
 */
const BOROUGHS: BoroughSeed[] = [
  // Zone 1 — Central (~200)
  { id: "westminster", name: "Westminster", zone: 1, center: { lat: 51.4975, lng: -0.137 }, radius: 0.012, count: 28 },
  { id: "city-of-london", name: "City of London", zone: 1, center: { lat: 51.515, lng: -0.092 }, radius: 0.01, count: 18 },
  { id: "soho", name: "Soho", zone: 1, center: { lat: 51.5133, lng: -0.1336 }, radius: 0.006, count: 14 },
  { id: "mayfair", name: "Mayfair", zone: 1, center: { lat: 51.5089, lng: -0.1474 }, radius: 0.008, count: 16 },
  { id: "covent-garden-west-end", name: "West End", zone: 1, center: { lat: 51.5117, lng: -0.124 }, radius: 0.006, count: 14 },
  { id: "bloomsbury", name: "Bloomsbury", zone: 1, center: { lat: 51.5215, lng: -0.127 }, radius: 0.008, count: 14 },
  { id: "marylebone", name: "Marylebone", zone: 1, center: { lat: 51.522, lng: -0.155 }, radius: 0.01, count: 16 },
  { id: "south-bank", name: "South Bank", zone: 1, center: { lat: 51.504, lng: -0.115 }, radius: 0.012, count: 14 },
  { id: "kings-cross-area", name: "King's Cross", zone: 1, center: { lat: 51.5345, lng: -0.122 }, radius: 0.012, count: 16 },
  { id: "shoreditch-area", name: "Shoreditch", zone: 1, center: { lat: 51.526, lng: -0.078 }, radius: 0.01, count: 18 },
  { id: "clerkenwell", name: "Clerkenwell", zone: 1, center: { lat: 51.5236, lng: -0.105 }, radius: 0.009, count: 12 },
  { id: "holborn", name: "Holborn", zone: 1, center: { lat: 51.517, lng: -0.118 }, radius: 0.008, count: 10 },
  { id: "fitzrovia", name: "Fitzrovia", zone: 1, center: { lat: 51.5205, lng: -0.137 }, radius: 0.007, count: 10 },

  // Zone 2 — Inner (~250)
  { id: "hackney", name: "Hackney", zone: 2, center: { lat: 51.545, lng: -0.056 }, radius: 0.018, count: 28 },
  { id: "islington", name: "Islington", zone: 2, center: { lat: 51.5362, lng: -0.103 }, radius: 0.015, count: 24 },
  { id: "camden-town", name: "Camden Town", zone: 2, center: { lat: 51.539, lng: -0.143 }, radius: 0.013, count: 22 },
  { id: "kentish-town", name: "Kentish Town", zone: 2, center: { lat: 51.551, lng: -0.142 }, radius: 0.012, count: 14 },
  { id: "notting-hill", name: "Notting Hill", zone: 2, center: { lat: 51.514, lng: -0.207 }, radius: 0.013, count: 20 },
  { id: "earls-court", name: "Earl's Court", zone: 2, center: { lat: 51.491, lng: -0.193 }, radius: 0.012, count: 16 },
  { id: "chelsea", name: "Chelsea", zone: 2, center: { lat: 51.487, lng: -0.169 }, radius: 0.013, count: 18 },
  { id: "brixton", name: "Brixton", zone: 2, center: { lat: 51.4628, lng: -0.1145 }, radius: 0.014, count: 24 },
  { id: "peckham", name: "Peckham", zone: 2, center: { lat: 51.474, lng: -0.069 }, radius: 0.013, count: 20 },
  { id: "bermondsey", name: "Bermondsey", zone: 2, center: { lat: 51.498, lng: -0.07 }, radius: 0.013, count: 18 },
  { id: "clapham", name: "Clapham", zone: 2, center: { lat: 51.461, lng: -0.138 }, radius: 0.014, count: 22 },
  { id: "battersea-area", name: "Battersea", zone: 2, center: { lat: 51.477, lng: -0.158 }, radius: 0.014, count: 14 },
  { id: "whitechapel", name: "Whitechapel", zone: 2, center: { lat: 51.519, lng: -0.06 }, radius: 0.012, count: 14 },
  { id: "vauxhall-nine-elms", name: "Vauxhall", zone: 2, center: { lat: 51.485, lng: -0.122 }, radius: 0.012, count: 12 },
  { id: "elephant-castle", name: "Elephant & Castle", zone: 2, center: { lat: 51.494, lng: -0.099 }, radius: 0.011, count: 12 },

  // Zone 3–4 — Mid (~400)
  { id: "stratford-area", name: "Stratford", zone: 3, center: { lat: 51.541, lng: -0.003 }, radius: 0.015, count: 22 },
  { id: "walthamstow", name: "Walthamstow", zone: 3, center: { lat: 51.583, lng: -0.018 }, radius: 0.016, count: 24 },
  { id: "leyton", name: "Leyton", zone: 3, center: { lat: 51.5567, lng: -0.0125 }, radius: 0.013, count: 16 },
  { id: "tooting", name: "Tooting", zone: 3, center: { lat: 51.4275, lng: -0.168 }, radius: 0.014, count: 20 },
  { id: "wimbledon-area", name: "Wimbledon", zone: 3, center: { lat: 51.421, lng: -0.207 }, radius: 0.015, count: 22 },
  { id: "putney", name: "Putney", zone: 3, center: { lat: 51.461, lng: -0.218 }, radius: 0.014, count: 18 },
  { id: "hammersmith", name: "Hammersmith", zone: 2, center: { lat: 51.492, lng: -0.223 }, radius: 0.013, count: 22 },
  { id: "shepherds-bush", name: "Shepherd's Bush", zone: 2, center: { lat: 51.505, lng: -0.227 }, radius: 0.013, count: 18 },
  { id: "ealing-area", name: "Ealing", zone: 3, center: { lat: 51.515, lng: -0.302 }, radius: 0.018, count: 26 },
  { id: "acton", name: "Acton", zone: 3, center: { lat: 51.508, lng: -0.273 }, radius: 0.014, count: 18 },
  { id: "wood-green", name: "Wood Green", zone: 3, center: { lat: 51.5975, lng: -0.111 }, radius: 0.015, count: 20 },
  { id: "finchley", name: "Finchley", zone: 4, center: { lat: 51.595, lng: -0.187 }, radius: 0.016, count: 20 },
  { id: "hampstead-area", name: "Hampstead", zone: 2, center: { lat: 51.557, lng: -0.178 }, radius: 0.013, count: 18 },
  { id: "lewisham", name: "Lewisham", zone: 3, center: { lat: 51.4615, lng: -0.012 }, radius: 0.015, count: 22 },
  { id: "greenwich-area", name: "Greenwich", zone: 3, center: { lat: 51.482, lng: 0.0 }, radius: 0.015, count: 22 },
  { id: "forest-hill", name: "Forest Hill", zone: 3, center: { lat: 51.4393, lng: -0.052 }, radius: 0.013, count: 16 },
  { id: "dulwich", name: "Dulwich", zone: 3, center: { lat: 51.4498, lng: -0.083 }, radius: 0.014, count: 16 },
  { id: "crystal-palace-area", name: "Crystal Palace", zone: 3, center: { lat: 51.4226, lng: -0.075 }, radius: 0.012, count: 14 },
  { id: "catford", name: "Catford", zone: 3, center: { lat: 51.4452, lng: -0.0258 }, radius: 0.013, count: 14 },
  { id: "holloway", name: "Holloway", zone: 2, center: { lat: 51.553, lng: -0.115 }, radius: 0.013, count: 14 },
  { id: "tottenham", name: "Tottenham", zone: 3, center: { lat: 51.5878, lng: -0.067 }, radius: 0.016, count: 22 },
  { id: "blackheath", name: "Blackheath", zone: 3, center: { lat: 51.467, lng: 0.012 }, radius: 0.012, count: 12 },
  { id: "willesden", name: "Willesden", zone: 3, center: { lat: 51.5494, lng: -0.232 }, radius: 0.014, count: 14 },

  // Zone 5–6 — Outer (~250)
  { id: "croydon", name: "Croydon", zone: 5, center: { lat: 51.3762, lng: -0.0982 }, radius: 0.02, count: 30 },
  { id: "bromley-area", name: "Bromley", zone: 5, center: { lat: 51.405, lng: 0.014 }, radius: 0.018, count: 24 },
  { id: "kingston", name: "Kingston upon Thames", zone: 5, center: { lat: 51.4123, lng: -0.3007 }, radius: 0.018, count: 24 },
  { id: "twickenham-area", name: "Twickenham", zone: 5, center: { lat: 51.4475, lng: -0.336 }, radius: 0.015, count: 16 },
  { id: "richmond-area", name: "Richmond", zone: 5, center: { lat: 51.461, lng: -0.302 }, radius: 0.014, count: 14 },
  { id: "harrow", name: "Harrow", zone: 5, center: { lat: 51.5793, lng: -0.3346 }, radius: 0.02, count: 24 },
  { id: "uxbridge-area", name: "Uxbridge", zone: 6, center: { lat: 51.5465, lng: -0.477 }, radius: 0.02, count: 20 },
  { id: "romford", name: "Romford", zone: 6, center: { lat: 51.5755, lng: 0.183 }, radius: 0.02, count: 24 },
  { id: "ilford", name: "Ilford", zone: 5, center: { lat: 51.5594, lng: 0.0782 }, radius: 0.018, count: 22 },
  { id: "enfield", name: "Enfield", zone: 5, center: { lat: 51.6523, lng: -0.0832 }, radius: 0.022, count: 24 },
  { id: "barnet", name: "Barnet", zone: 5, center: { lat: 51.6444, lng: -0.1997 }, radius: 0.018, count: 18 },
  { id: "sutton", name: "Sutton", zone: 5, center: { lat: 51.3618, lng: -0.1945 }, radius: 0.016, count: 16 },
  { id: "wembley-area", name: "Wembley", zone: 4, center: { lat: 51.5571, lng: -0.2823 }, radius: 0.014, count: 14 },
  { id: "hounslow", name: "Hounslow", zone: 5, center: { lat: 51.467, lng: -0.366 }, radius: 0.017, count: 16 },
  { id: "bexleyheath", name: "Bexleyheath", zone: 5, center: { lat: 51.4569, lng: 0.149 }, radius: 0.015, count: 14 },
  { id: "dagenham", name: "Dagenham", zone: 5, center: { lat: 51.546, lng: 0.147 }, radius: 0.016, count: 14 },
];

// Generation helpers ────────────────────────────────────────────────────────

/** Tier mix for procedurally generated vaults. Sums to 1.0. */
const TIER_MIX: { tier: Tier; weight: number }[] = [
  { tier: "bronze", weight: 0.56 },
  { tier: "silver", weight: 0.28 },
  { tier: "gold", weight: 0.12 },
  { tier: "platinum", weight: 0.04 },
];

const SUFFIXES_BY_KIND: Record<string, { suffix: string; icon: VaultIcon; kind: VaultKind }[]> = {
  default: [
    { suffix: "High St", icon: "shopping", kind: "mini" },
    { suffix: "Market", icon: "market", kind: "mini" },
    { suffix: "Common", icon: "leaf", kind: "mini" },
    { suffix: "Underground", icon: "tube", kind: "tube" },
    { suffix: "Library", icon: "book", kind: "mini" },
    { suffix: "Square", icon: "star", kind: "mini" },
    { suffix: "Park", icon: "tree", kind: "mini" },
    { suffix: "Station", icon: "train", kind: "tube" },
    { suffix: "Green", icon: "leaf", kind: "mini" },
    { suffix: "Plaza", icon: "star", kind: "mini" },
    { suffix: "Junction", icon: "train", kind: "mini" },
    { suffix: "Crescent", icon: "star", kind: "mini" },
    { suffix: "Heights", icon: "tower", kind: "mini" },
    { suffix: "Riverside", icon: "ship", kind: "mini" },
    { suffix: "Bridge", icon: "castle", kind: "mini" },
    { suffix: "Mews", icon: "star", kind: "mini" },
  ],
};

const BLURBS: string[] = [
  "Daily restock — locals first.",
  "Hidden in the morning rush.",
  "Cafe corner stash — coffee + coins.",
  "After-work cache for the commute home.",
  "Weekend market drop.",
  "Loop runners get there first.",
  "Sun-soaked bench cache.",
  "Tube exit chase vault.",
  "Local heroes only.",
  "Drop-in or drop-out.",
  "Bus-stop bonus — five-minute window.",
  "School-run sweet spot.",
  "Late-night kebab queue prize.",
];

function pickTier(rng: () => number): Tier {
  const roll = rng();
  let acc = 0;
  for (const t of TIER_MIX) {
    acc += t.weight;
    if (roll < acc) return t.tier;
  }
  return "bronze";
}

function pickSuffix(rng: () => number) {
  const pool = SUFFIXES_BY_KIND.default;
  return pool[Math.floor(rng() * pool.length)];
}

/** Uniform random point inside a disk around centre (in degrees). */
function pointInDisk(rng: () => number, center: { lat: number; lng: number }, radius: number) {
  const r = radius * Math.sqrt(rng());
  const theta = rng() * Math.PI * 2;
  // Adjust lng for latitude so the disk is roughly circular on the ground.
  const cosLat = Math.cos((center.lat * Math.PI) / 180);
  return {
    lat: center.lat + r * Math.sin(theta),
    lng: center.lng + (r * Math.cos(theta)) / Math.max(0.2, cosLat),
  };
}

function generateForBorough(seed: BoroughSeed): Vault[] {
  const out: Vault[] = [];
  const rng = mulberry32(hashStr("borough:" + seed.id));
  for (let i = 0; i < seed.count; i++) {
    // Guarantee at least one gold per borough (slot 0).
    let tier: Tier;
    if (i === 0) tier = "gold";
    else if (i === 1 && seed.count > 14) tier = "silver";
    else tier = pickTier(rng);

    const pos = pointInDisk(rng, seed.center, seed.radius);
    const suf = pickSuffix(rng);
    const id = `proc-${seed.id}-${i}`;
    const blurb = BLURBS[Math.floor(rng() * BLURBS.length)];
    out.push({
      id,
      name: `${seed.name} · ${suf.suffix}`,
      area: seed.name,
      blurb,
      lat: +pos.lat.toFixed(5),
      lng: +pos.lng.toFixed(5),
      tier,
      kind: suf.kind,
      icon: suf.icon,
      reward: rewardFor(id, tier),
    });
  }
  return out;
}

/** Re-price curated entries with the v2 tokenomics. */
const REPRICED_CURATED: Vault[] = CURATED.map((c) => ({
  ...c,
  reward: c.reward ?? rewardFor(c.id, c.tier),
}));

const PROCEDURAL: Vault[] = BOROUGHS.flatMap(generateForBorough);

/**
 * Final 1,100-vault catalogue across Greater London.
 *  - ~45 hand-curated landmarks + brand stores
 *  - ~1,050 procedurally placed neighbourhood drops across 50+ boroughs
 *  - Stable IDs / coords / rewards across reloads (deterministic PRNG)
 */
export const VAULTS: Vault[] = [...REPRICED_CURATED, ...PROCEDURAL];

/** Bounding box for the Greater London map view. */
export const MAP_BOUNDS = {
  south: 51.30,
  north: 51.70,
  west: -0.55,
  east: 0.25,
} as const;

/** Default player starting location: Trafalgar Square area. */
export const DEFAULT_PLAYER_POS = { lat: 51.5085, lng: -0.1278 } as const;

/** Distance threshold (meters) within which a vault can be claimed. */
export const CLAIM_RADIUS_METERS = 120;
