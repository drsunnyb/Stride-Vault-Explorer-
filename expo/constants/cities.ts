/**
 * Global city expansion / waitlist.
 *
 * London is the only LIVE city — every other major metro on this list is
 * "WAITLIST". Players outside London pick their city, accrue votes (steps +
 * shares), and the next city to open is whichever has the highest vote count
 * at the next quarterly review. This drives FOMO + viral sharing.
 *
 * Players continue to earn Stride Coins normally everywhere — coins are
 * portable to whatever city eventually unlocks for them. No region lockout.
 */

export interface City {
  id: string;
  name: string;
  country: string;
  /** ISO 3166-1 alpha-2, used to render a flag emoji. */
  countryCode: string;
  lat: number;
  lng: number;
  /** Approx radius (km) used to detect whether the user is "in" this city. */
  radiusKm: number;
  status: "live" | "waitlist";
  /** Tagline shown under the name in the leaderboard card. */
  tagline: string;
}

export const LIVE_CITY_ID = "london" as const;

export const CITIES: City[] = [
  { id: "london", name: "London", country: "UK", countryCode: "GB",
    // ~25mi radius — anyone in Greater London + commuter belt is auto-granted.
    lat: 51.5074, lng: -0.1278, radiusKm: 40, status: "live",
    tagline: "1,100 vaults · live now" },

  // Europe
  { id: "paris", name: "Paris", country: "France", countryCode: "FR",
    lat: 48.8566, lng: 2.3522, radiusKm: 30, status: "waitlist",
    tagline: "Vault the boulevards" },
  { id: "amsterdam", name: "Amsterdam", country: "Netherlands", countryCode: "NL",
    lat: 52.3676, lng: 4.9041, radiusKm: 20, status: "waitlist",
    tagline: "Canals · cafés · coins" },
  { id: "berlin", name: "Berlin", country: "Germany", countryCode: "DE",
    lat: 52.5200, lng: 13.4050, radiusKm: 30, status: "waitlist",
    tagline: "Mitte → Kreuzberg sprints" },
  { id: "barcelona", name: "Barcelona", country: "Spain", countryCode: "ES",
    lat: 41.3851, lng: 2.1734, radiusKm: 25, status: "waitlist",
    tagline: "Ramblas to the beach" },
  { id: "madrid", name: "Madrid", country: "Spain", countryCode: "ES",
    lat: 40.4168, lng: -3.7038, radiusKm: 25, status: "waitlist",
    tagline: "Plaza-hop for loot" },
  { id: "rome", name: "Rome", country: "Italy", countryCode: "IT",
    lat: 41.9028, lng: 12.4964, radiusKm: 25, status: "waitlist",
    tagline: "Vaults at every fountain" },
  { id: "milan", name: "Milan", country: "Italy", countryCode: "IT",
    lat: 45.4642, lng: 9.1900, radiusKm: 20, status: "waitlist",
    tagline: "Fashion-district drops" },
  { id: "lisbon", name: "Lisbon", country: "Portugal", countryCode: "PT",
    lat: 38.7223, lng: -9.1393, radiusKm: 20, status: "waitlist",
    tagline: "Hills · tiles · coins" },
  { id: "dublin", name: "Dublin", country: "Ireland", countryCode: "IE",
    lat: 53.3498, lng: -6.2603, radiusKm: 20, status: "waitlist",
    tagline: "Liffey loop" },
  { id: "edinburgh", name: "Edinburgh", country: "UK", countryCode: "GB",
    lat: 55.9533, lng: -3.1883, radiusKm: 20, status: "waitlist",
    tagline: "Royal Mile run" },
  { id: "manchester", name: "Manchester", country: "UK", countryCode: "GB",
    lat: 53.4808, lng: -2.2426, radiusKm: 20, status: "waitlist",
    tagline: "Northern Quarter quest" },
  { id: "stockholm", name: "Stockholm", country: "Sweden", countryCode: "SE",
    lat: 59.3293, lng: 18.0686, radiusKm: 25, status: "waitlist",
    tagline: "Island-hop the archipelago" },
  { id: "copenhagen", name: "Copenhagen", country: "Denmark", countryCode: "DK",
    lat: 55.6761, lng: 12.5683, radiusKm: 20, status: "waitlist",
    tagline: "Bike-lane bounty" },
  { id: "vienna", name: "Vienna", country: "Austria", countryCode: "AT",
    lat: 48.2082, lng: 16.3738, radiusKm: 25, status: "waitlist",
    tagline: "Imperial ring runs" },
  { id: "warsaw", name: "Warsaw", country: "Poland", countryCode: "PL",
    lat: 52.2297, lng: 21.0122, radiusKm: 25, status: "waitlist",
    tagline: "Old Town to Praga" },
  { id: "istanbul", name: "Istanbul", country: "Turkey", countryCode: "TR",
    lat: 41.0082, lng: 28.9784, radiusKm: 40, status: "waitlist",
    tagline: "Bosphorus to Bazaar" },

  // North America
  { id: "new-york", name: "New York", country: "USA", countryCode: "US",
    lat: 40.7128, lng: -74.0060, radiusKm: 35, status: "waitlist",
    tagline: "Five boroughs of loot" },
  { id: "los-angeles", name: "Los Angeles", country: "USA", countryCode: "US",
    lat: 34.0522, lng: -118.2437, radiusKm: 50, status: "waitlist",
    tagline: "Sunset Strip to Venice" },
  { id: "san-francisco", name: "San Francisco", country: "USA", countryCode: "US",
    lat: 37.7749, lng: -122.4194, radiusKm: 25, status: "waitlist",
    tagline: "7×7 of coin-fuelled hills" },
  { id: "chicago", name: "Chicago", country: "USA", countryCode: "US",
    lat: 41.8781, lng: -87.6298, radiusKm: 35, status: "waitlist",
    tagline: "Lakefront loop" },
  { id: "miami", name: "Miami", country: "USA", countryCode: "US",
    lat: 25.7617, lng: -80.1918, radiusKm: 30, status: "waitlist",
    tagline: "Beach drops + Wynwood walls" },
  { id: "austin", name: "Austin", country: "USA", countryCode: "US",
    lat: 30.2672, lng: -97.7431, radiusKm: 25, status: "waitlist",
    tagline: "SXSW sprint" },
  { id: "toronto", name: "Toronto", country: "Canada", countryCode: "CA",
    lat: 43.6532, lng: -79.3832, radiusKm: 30, status: "waitlist",
    tagline: "CN to King West" },
  { id: "vancouver", name: "Vancouver", country: "Canada", countryCode: "CA",
    lat: 49.2827, lng: -123.1207, radiusKm: 25, status: "waitlist",
    tagline: "Seawall to Stanley" },
  { id: "mexico-city", name: "Mexico City", country: "Mexico", countryCode: "MX",
    lat: 19.4326, lng: -99.1332, radiusKm: 40, status: "waitlist",
    tagline: "Roma to Reforma" },

  // South America
  { id: "sao-paulo", name: "São Paulo", country: "Brazil", countryCode: "BR",
    lat: -23.5505, lng: -46.6333, radiusKm: 45, status: "waitlist",
    tagline: "Avenida Paulista pace" },
  { id: "rio", name: "Rio de Janeiro", country: "Brazil", countryCode: "BR",
    lat: -22.9068, lng: -43.1729, radiusKm: 30, status: "waitlist",
    tagline: "Copacabana → Christ" },
  { id: "buenos-aires", name: "Buenos Aires", country: "Argentina", countryCode: "AR",
    lat: -34.6037, lng: -58.3816, radiusKm: 30, status: "waitlist",
    tagline: "Palermo nightline" },

  // Asia
  { id: "tokyo", name: "Tokyo", country: "Japan", countryCode: "JP",
    lat: 35.6762, lng: 139.6503, radiusKm: 40, status: "waitlist",
    tagline: "Shibuya · Shinjuku · loot" },
  { id: "seoul", name: "Seoul", country: "South Korea", countryCode: "KR",
    lat: 37.5665, lng: 126.9780, radiusKm: 30, status: "waitlist",
    tagline: "Han River relay" },
  { id: "singapore", name: "Singapore", country: "Singapore", countryCode: "SG",
    lat: 1.3521, lng: 103.8198, radiusKm: 25, status: "waitlist",
    tagline: "Tiny island, huge prizes" },
  { id: "hong-kong", name: "Hong Kong", country: "Hong Kong", countryCode: "HK",
    lat: 22.3193, lng: 114.1694, radiusKm: 25, status: "waitlist",
    tagline: "Central to Kowloon" },
  { id: "bangkok", name: "Bangkok", country: "Thailand", countryCode: "TH",
    lat: 13.7563, lng: 100.5018, radiusKm: 30, status: "waitlist",
    tagline: "Sukhumvit street game" },
  { id: "mumbai", name: "Mumbai", country: "India", countryCode: "IN",
    lat: 19.0760, lng: 72.8777, radiusKm: 35, status: "waitlist",
    tagline: "Marine Drive miles" },
  { id: "delhi", name: "Delhi", country: "India", countryCode: "IN",
    lat: 28.6139, lng: 77.2090, radiusKm: 40, status: "waitlist",
    tagline: "Old Delhi to Hauz Khas" },
  { id: "dubai", name: "Dubai", country: "UAE", countryCode: "AE",
    lat: 25.2048, lng: 55.2708, radiusKm: 30, status: "waitlist",
    tagline: "Marina · Downtown · gold" },

  // Oceania + Africa
  { id: "sydney", name: "Sydney", country: "Australia", countryCode: "AU",
    lat: -33.8688, lng: 151.2093, radiusKm: 35, status: "waitlist",
    tagline: "Harbour bridge laps" },
  { id: "melbourne", name: "Melbourne", country: "Australia", countryCode: "AU",
    lat: -37.8136, lng: 144.9631, radiusKm: 30, status: "waitlist",
    tagline: "Laneway hunts" },
  { id: "auckland", name: "Auckland", country: "New Zealand", countryCode: "NZ",
    lat: -36.8485, lng: 174.7633, radiusKm: 25, status: "waitlist",
    tagline: "City of sails" },
  { id: "cape-town", name: "Cape Town", country: "South Africa", countryCode: "ZA",
    lat: -33.9249, lng: 18.4241, radiusKm: 30, status: "waitlist",
    tagline: "Table to Sea Point" },
  { id: "johannesburg", name: "Johannesburg", country: "South Africa", countryCode: "ZA",
    lat: -26.2041, lng: 28.0473, radiusKm: 35, status: "waitlist",
    tagline: "Sandton to Maboneng" },
  { id: "lagos", name: "Lagos", country: "Nigeria", countryCode: "NG",
    lat: 6.5244, lng: 3.3792, radiusKm: 35, status: "waitlist",
    tagline: "Lekki sprint" },
  { id: "nairobi", name: "Nairobi", country: "Kenya", countryCode: "KE",
    lat: -1.2921, lng: 36.8219, radiusKm: 30, status: "waitlist",
    tagline: "Westlands warmup" },
];

export const CITY_BY_ID: Record<string, City> = Object.fromEntries(
  CITIES.map((c) => [c.id, c])
);

/** Flag emoji from ISO country code (regional indicator symbols). */
export function flagEmoji(cc: string): string {
  return cc
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

/** Haversine distance (km) — good enough for city-radius checks. */
function distKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Best city for lat/lng, or undefined if more than 200km from any. */
export function detectCity(lat: number, lng: number): City | undefined {
  let best: { city: City; d: number } | undefined;
  for (const c of CITIES) {
    const d = distKm({ lat, lng }, { lat: c.lat, lng: c.lng });
    if (d <= c.radiusKm * 1.5 && (!best || d < best.d)) best = { city: c, d };
  }
  return best?.city;
}

/** True if the user's lat/lng is within ~25mi of central London. */
export function isInLondon(lat: number, lng: number): boolean {
  const london = CITY_BY_ID.london;
  return distKm({ lat, lng }, { lat: london.lat, lng: london.lng }) <= london.radiusKm;
}

// ── Seeded vote baseline ───────────────────────────────────────────────────
// Deterministic so every device shows the same "active waitlist" — feels
// alive, drives FOMO, and the user's own contributions add on top.

function hash32(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Slow daily creep so the leaderboard moves between sessions. */
function dayIndex(now: number = Date.now()): number {
  return Math.floor(now / 86_400_000);
}

/**
 * Seeded baseline votes for a city. Bigger metros get bigger baselines,
 * with a slow daily creep so the board feels alive between launches.
 */
export function seededVotes(city: City, now: number = Date.now()): number {
  if (city.status === "live") return 0;
  const h = hash32(city.id);
  // Population-ish weighting via tagline-free deterministic hash buckets.
  const bigCities = new Set([
    "new-york", "tokyo", "paris", "los-angeles", "mumbai", "sao-paulo",
    "delhi", "istanbul", "mexico-city", "seoul", "bangkok",
  ]);
  const midCities = new Set([
    "berlin", "barcelona", "madrid", "amsterdam", "milan", "toronto",
    "sydney", "chicago", "dubai", "hong-kong", "singapore", "lagos",
    "manchester", "rio", "buenos-aires", "miami",
  ]);
  const tier = bigCities.has(city.id) ? 3 : midCities.has(city.id) ? 2 : 1;
  const base = tier === 3 ? 4200 : tier === 2 ? 1900 : 620;
  const jitter = (h % 800) * 0.6;
  const drift = dayIndex(now) * (tier === 3 ? 11 : tier === 2 ? 5 : 2);
  return Math.round(base + jitter + (drift % (base * 0.2)));
}

/** Votes minted by walking a given step count toward your home city. */
export const STEPS_PER_CITY_VOTE = 1000;
/** Votes minted by each share toward your home city (capped by daily shares). */
export const SHARE_CITY_VOTE_BONUS = 5;
/** Votes minted when a referred friend signs up to your city. */
export const REFERRAL_CITY_VOTE_BONUS = 50;
