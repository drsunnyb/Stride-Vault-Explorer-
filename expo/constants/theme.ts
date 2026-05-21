/**
 * Stride Quest theme — cinematic dark "treasure hunt at night" palette.
 * Deep midnight navy backgrounds, gold + emerald jewel-tone accents.
 */
export const theme = {
  // base
  bg: "#06070D",
  bgElev: "#0C0F1A",
  bgCard: "#131826",
  surface: "#1B2233",
  surfaceHi: "#222B40",
  border: "#243049",
  borderSoft: "#1A2236",
  divider: "#1B2233",

  // text
  text: "#F5F7FB",
  textMuted: "#9AA3B8",
  textDim: "#5A6378",

  // brand
  gold: "#D4AF37",
  goldBright: "#F4D03F",
  goldDim: "#7A6420",
  emerald: "#10B981",
  emeraldBright: "#34D399",
  emeraldDim: "#0B6F4C",
  ruby: "#EF4444",
  sapphire: "#3B82F6",

  // map
  thames: "#0E3A4A",
  thamesGlow: "#1E6B82",
  thamesHi: "#2E92AE",
  park: "#0E2A1E",
  parkLight: "#163C2A",
  parkGlow: "#1F5C40",
  road: "#1A2236",
  roadHi: "#243049",
  mapGrad1: "#070A14",
  mapGrad2: "#0C1422",

  // tier colors
  tier: {
    bronze: "#CD7F32",
    bronzeBright: "#E69E5A",
    silver: "#C9CFDB",
    silverBright: "#E8EDF5",
    gold: "#D4AF37",
    goldBright: "#F4D03F",
    platinum: "#7DD3FC",
    platinumBright: "#BAE6FD",
  } as const,

  // layout
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 22,
    pill: 999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
} as const;

export type Tier = "bronze" | "silver" | "gold" | "platinum";

export const tierColor = (t: Tier): string => theme.tier[t];
export const tierGlow = (t: Tier): string => {
  switch (t) {
    case "bronze":
      return theme.tier.bronzeBright;
    case "silver":
      return theme.tier.silverBright;
    case "gold":
      return theme.tier.goldBright;
    case "platinum":
      return theme.tier.platinumBright;
  }
};

export const tierLabel = (t: Tier): string =>
  t.charAt(0).toUpperCase() + t.slice(1);
