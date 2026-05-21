/**
 * CityWaitlistHome — the "map tab" experience for players outside London.
 *
 * Replaces the London map for users whose home city is on the waitlist. The
 * London game is geo-locked (~25mi radius around London), so showing the map
 * to a player in e.g. Manchester would be misleading. Instead we surface:
 *
 *  - Their own profile stats (steps, streak, coins, level)
 *  - Their city's waitlist position + a big share-to-rally CTA
 *  - The city leaderboard so they can see how close they are
 *  - A "Check my location" button that re-detects geolocation; if they've
 *    moved into the London radius the screen flips back to the live map.
 */
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { router } from "expo-router";
import {
  ChevronRight,
  Crown,
  Footprints,
  Globe2,
  MapPin,
  RefreshCw,
  Share2,
  Trophy,
} from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  CITY_BY_ID,
  LIVE_CITY_ID,
  flagEmoji,
  isInLondon,
} from "@/constants/cities";
import { theme } from "@/constants/theme";
import { useGame } from "@/providers/GameProvider";

export function CityWaitlistHome() {
  const {
    player,
    homeCity,
    homeCityRank,
    cityLeaderboard,
    boostHomeCity,
    setHomeCity,
    stepsPerCityVote,
    shareCityVoteBonus,
    referralBonusCoins,
    dailyStepGoal,
    xpNeeded,
  } = useGame();

  const [checking, setChecking] = useState<boolean>(false);

  const homeRow = useMemo(
    () => cityLeaderboard.find((r) => r.city.id === player.homeCityId),
    [cityLeaderboard, player.homeCityId]
  );
  const top5 = useMemo(() => cityLeaderboard.slice(0, 5), [cityLeaderboard]);

  const stepsToNextVote =
    homeCity && homeCity.id !== LIVE_CITY_ID
      ? stepsPerCityVote -
        ((player.steps - (player.cityVoteStepsCredited ?? 0)) % stepsPerCityVote)
      : 0;

  const stepPct = Math.min(1, player.stepsToday / dailyStepGoal);
  const xpPct = Math.min(1, player.xp / Math.max(1, xpNeeded));

  const refCode = useMemo(
    () => `STRIDE-${player.username.replace(/\W+/g, "").toUpperCase().slice(0, 6)}`,
    [player.username]
  );

  const onShare = useCallback(async () => {
    if (!homeCity) return;
    const flag = flagEmoji(homeCity.countryCode);
    const msg = `${flag} I'm rallying ${homeCity.name} to open next on Stride — every step earns coins AND votes my city up the waitlist.\n\nJoin with my code ${refCode} → we both get ${referralBonusCoins} coins.\n\nhttps://rork.app/stride-quest?ref=${refCode}&city=${homeCity.id}`;
    try {
      const res = await Share.share({ message: msg });
      if (res.action !== Share.dismissedAction) {
        await boostHomeCity(shareCityVoteBonus);
      }
    } catch (e) {
      console.log("[CityWaitlistHome] share", e);
    }
  }, [homeCity, refCode, referralBonusCoins, boostHomeCity, shareCityVoteBonus]);

  const onCheckLocation = useCallback(async () => {
    setChecking(true);
    try {
      let granted = false;
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        granted = perm.granted;
        if (!granted) {
          const req = await Location.requestForegroundPermissionsAsync();
          granted = req.granted;
        }
      } catch (e) {
        console.log("[CityWaitlistHome] perm", e);
      }
      if (!granted) {
        Alert.alert(
          "Location off",
          "Turn on location in Settings so we can check if you're in London."
        );
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (isInLondon(pos.coords.latitude, pos.coords.longitude)) {
        await setHomeCity(LIVE_CITY_ID);
        Alert.alert("You're in London", "Unlocking 1,100 vaults around you.");
      } else {
        Alert.alert(
          "Still on the waitlist",
          `We've got you in ${homeCity?.name ?? "your city"}. Keep walking + sharing to push it to the top.`
        );
      }
    } catch (e) {
      console.log("[CityWaitlistHome] geocheck", e);
    } finally {
      setChecking(false);
    }
  }, [homeCity, setHomeCity]);

  if (!homeCity) {
    return (
      <View style={styles.root}>
        <Text style={styles.title}>Pick your city</Text>
        <Pressable onPress={() => router.push("/cities")} style={styles.primaryCta}>
          <Text style={styles.primaryCtaText}>OPEN CITY PICKER</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <SafeAreaView edges={["top"]} style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.logoDot}>
              <LinearGradient colors={[theme.gold, theme.goldBright]} style={StyleSheet.absoluteFill} />
            </View>
            <View>
              <Text style={styles.brandName}>STRIDE QUEST</Text>
              <Text style={styles.brandSub}>{homeCity.name.toUpperCase()} · WAITLIST</Text>
            </View>
          </View>
        </SafeAreaView>

        {/* Hero card */}
        <View style={styles.hero}>
          <LinearGradient
            colors={["#101A36", "#0A0E1F", theme.bg]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroTop}>
            <View style={styles.kickerPill}>
              <Globe2 size={11} color={theme.goldBright} />
              <Text style={styles.kickerText}>WAITLIST</Text>
            </View>
            <View style={styles.rankPill}>
              <Text style={styles.rankNum}>#{homeCityRank || "—"}</Text>
              <Text style={styles.rankLabel}>RANK</Text>
            </View>
          </View>

          <View style={styles.flagRow}>
            <Text style={styles.flagBig}>{flagEmoji(homeCity.countryCode)}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.cityName}>{homeCity.name}</Text>
              <Text style={styles.cityCountry}>{homeCity.country}</Text>
            </View>
          </View>

          <Text style={styles.heroBlurb}>
            Stride isn't live in {homeCity.name} yet — the city with the most votes opens next. Walk
            and share to push it up the leaderboard.
          </Text>

          <View style={styles.statRow}>
            <Stat label="YOUR VOTES" value={(homeRow?.mine ?? 0).toLocaleString()} accent={theme.goldBright} />
            <Stat label="CITY TOTAL" value={(homeRow?.total ?? 0).toLocaleString()} accent={theme.emeraldBright} />
            <Stat label="NEXT VOTE" value={`${stepsToNextVote.toLocaleString()}`} sub="steps" accent={theme.sapphire} />
          </View>

          <Pressable onPress={onShare} style={({ pressed }) => [styles.shareCta, pressed && { transform: [{ scale: 0.99 }] }]}>
            <Share2 size={16} color="#06070D" />
            <Text style={styles.shareCtaText}>SHARE — +{shareCityVoteBonus} VOTES</Text>
          </Pressable>

          <Pressable onPress={onCheckLocation} disabled={checking} style={styles.geoBtn}>
            {checking ? (
              <ActivityIndicator size="small" color={theme.text} />
            ) : (
              <RefreshCw size={13} color={theme.text} />
            )}
            <Text style={styles.geoText}>
              {checking ? "CHECKING…" : "I'M IN LONDON — CHECK MY LOCATION"}
            </Text>
          </Pressable>
        </View>

        {/* Your stats — so they still feel progress */}
        <Text style={styles.sectionTitle}>YOUR PROGRESS</Text>
        <View style={styles.statsCard}>
          <View style={styles.statsTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.userHandle}>@{player.username}</Text>
              <Text style={styles.userLevel}>LEVEL {player.level} · {player.coins.toLocaleString()} coins</Text>
            </View>
            <View style={styles.streakChip}>
              <Text style={styles.streakNum}>{player.streakDays}</Text>
              <Text style={styles.streakLabel}>STREAK</Text>
            </View>
          </View>

          {/* Steps progress */}
          <View style={styles.barBlock}>
            <View style={styles.barHead}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Footprints size={13} color={theme.emeraldBright} />
                <Text style={styles.barLabel}>STEPS TODAY</Text>
              </View>
              <Text style={styles.barValue}>
                {player.stepsToday.toLocaleString()} / {dailyStepGoal.toLocaleString()}
              </Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${stepPct * 100}%`, backgroundColor: theme.emeraldBright }]} />
            </View>
          </View>

          {/* XP progress */}
          <View style={styles.barBlock}>
            <View style={styles.barHead}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Trophy size={13} color={theme.goldBright} />
                <Text style={styles.barLabel}>XP TO LEVEL {player.level + 1}</Text>
              </View>
              <Text style={styles.barValue}>
                {player.xp.toLocaleString()} / {xpNeeded.toLocaleString()}
              </Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${xpPct * 100}%`, backgroundColor: theme.goldBright }]} />
            </View>
          </View>

          <View style={styles.miniRow}>
            <MiniStat label="LIFETIME STEPS" value={player.steps.toLocaleString()} />
            <MiniStat label="SHARES" value={(player.lifetimeShares ?? 0).toLocaleString()} />
            <MiniStat label="REFERRALS" value={(player.referralSignups ?? 0).toLocaleString()} />
          </View>
        </View>

        {/* Leaderboard preview */}
        <View style={styles.lbHead}>
          <Text style={styles.sectionTitle}>CITY LEADERBOARD</Text>
          <Pressable onPress={() => router.push("/cities")} style={styles.linkRow}>
            <Text style={styles.linkText}>VIEW ALL</Text>
            <ChevronRight size={13} color={theme.goldBright} />
          </Pressable>
        </View>

        <View style={styles.lbCard}>
          {top5.map((row, i) => (
            <View
              key={row.city.id}
              style={[styles.lbRow, row.isHome && styles.lbRowYou, i < top5.length - 1 && styles.lbRowDivider]}
            >
              <Text style={styles.lbRank}>#{i + 1}</Text>
              <Text style={styles.lbFlag}>{flagEmoji(row.city.countryCode)}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.lbName} numberOfLines={1}>{row.city.name}</Text>
                <Text style={styles.lbTag} numberOfLines={1}>{row.city.tagline}</Text>
              </View>
              {row.isHome && (
                <View style={styles.youPill}>
                  <Text style={styles.youPillText}>YOU</Text>
                </View>
              )}
              <Text style={styles.lbVotes}>{row.total.toLocaleString()}</Text>
            </View>
          ))}
        </View>

        {/* London live callout */}
        <View style={styles.callout}>
          <Crown size={14} color={theme.goldBright} />
          <View style={{ flex: 1 }}>
            <Text style={styles.calloutTitle}>London is live</Text>
            <Text style={styles.calloutSub}>1,100 vaults · 9,088 walkers · ~25mi unlock zone</Text>
          </View>
          <View style={styles.livePill}>
            <Text style={styles.livePillText}>LIVE</Text>
          </View>
        </View>

        <Pressable onPress={() => router.push("/cities")} style={styles.swapBtn}>
          <MapPin size={13} color={theme.textDim} />
          <Text style={styles.swapText}>Change my city</Text>
        </Pressable>

        <Text style={styles.footer}>
          Coins keep minting wherever you walk. The moment {homeCity.name} hits #1, you'll unlock its
          vaults instantly with everything you've banked.
        </Text>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: accent }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  title: { color: theme.text, fontSize: 18, fontWeight: "900" as const, padding: 24 },
  primaryCta: {
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: theme.goldBright,
    alignItems: "center",
  },
  primaryCtaText: { color: theme.bg, fontWeight: "900" as const, letterSpacing: 1.4 },
  header: { paddingHorizontal: 16, paddingTop: 6 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 6, paddingBottom: 10 },
  logoDot: { width: 32, height: 32, borderRadius: 10, overflow: "hidden" },
  brandName: { color: theme.text, fontWeight: "900" as const, letterSpacing: 2, fontSize: 14 },
  brandSub: { color: theme.textDim, fontSize: 9, fontWeight: "700" as const, letterSpacing: 1.4 },

  hero: {
    marginHorizontal: 16,
    marginTop: 4,
    padding: 18,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.border,
  },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  kickerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(244,208,63,0.14)",
  },
  kickerText: { color: theme.goldBright, fontSize: 10, fontWeight: "900" as const, letterSpacing: 1.4 },
  rankPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
  },
  rankNum: { color: theme.goldBright, fontSize: 18, fontWeight: "900" as const },
  rankLabel: { color: theme.textDim, fontSize: 9, fontWeight: "800" as const, letterSpacing: 1.2 },

  flagRow: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 18 },
  flagBig: { fontSize: 48 },
  cityName: { color: theme.text, fontSize: 26, fontWeight: "900" as const },
  cityCountry: { color: theme.textMuted, fontSize: 12, fontWeight: "700" as const, marginTop: 2 },
  heroBlurb: { color: theme.textMuted, fontSize: 13, fontWeight: "600" as const, lineHeight: 18, marginTop: 12 },

  statRow: { flexDirection: "row", gap: 8, marginTop: 16 },
  stat: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
  },
  statValue: { fontSize: 15, fontWeight: "900" as const },
  statSub: { color: theme.textDim, fontSize: 9, fontWeight: "700" as const, marginTop: 1 },
  statLabel: { color: theme.textDim, fontSize: 9, fontWeight: "800" as const, letterSpacing: 1.1, marginTop: 4 },

  shareCta: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 999,
    backgroundColor: theme.goldBright,
  },
  shareCtaText: { color: "#06070D", fontWeight: "900" as const, letterSpacing: 1.6, fontSize: 13 },
  geoBtn: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 42,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  geoText: { color: theme.text, fontSize: 11, fontWeight: "900" as const, letterSpacing: 1.2 },

  sectionTitle: {
    color: theme.text,
    fontSize: 11,
    fontWeight: "900" as const,
    letterSpacing: 1.6,
    paddingHorizontal: 18,
    paddingTop: 28,
    paddingBottom: 10,
  },
  statsCard: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 20,
    backgroundColor: theme.bgElev,
    borderWidth: 1,
    borderColor: theme.border,
  },
  statsTop: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  userHandle: { color: theme.text, fontSize: 16, fontWeight: "900" as const },
  userLevel: { color: theme.textMuted, fontSize: 11, fontWeight: "700" as const, marginTop: 2 },
  streakChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "rgba(244,208,63,0.10)",
    borderWidth: 1,
    borderColor: "rgba(244,208,63,0.4)",
    alignItems: "center",
  },
  streakNum: { color: theme.goldBright, fontSize: 18, fontWeight: "900" as const },
  streakLabel: { color: theme.textDim, fontSize: 8, fontWeight: "900" as const, letterSpacing: 1.2 },

  barBlock: { marginTop: 4, marginBottom: 12 },
  barHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  barLabel: { color: theme.textDim, fontSize: 10, fontWeight: "900" as const, letterSpacing: 1.2 },
  barValue: { color: theme.text, fontSize: 11, fontWeight: "800" as const },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.05)", overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4 },

  miniRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  miniValue: { color: theme.text, fontSize: 14, fontWeight: "900" as const },
  miniLabel: { color: theme.textDim, fontSize: 9, fontWeight: "800" as const, letterSpacing: 1.1, marginTop: 2 },

  lbHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 2, paddingHorizontal: 18, paddingTop: 28, paddingBottom: 10 },
  linkText: { color: theme.goldBright, fontSize: 10, fontWeight: "900" as const, letterSpacing: 1.3 },

  lbCard: {
    marginHorizontal: 16,
    borderRadius: 18,
    backgroundColor: theme.bgElev,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: "hidden",
  },
  lbRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  lbRowDivider: { borderBottomWidth: 1, borderBottomColor: theme.border },
  lbRowYou: { backgroundColor: "rgba(16,185,129,0.08)" },
  lbRank: { color: theme.textDim, fontSize: 12, fontWeight: "900" as const, width: 28 },
  lbFlag: { fontSize: 22 },
  lbName: { color: theme.text, fontSize: 14, fontWeight: "900" as const },
  lbTag: { color: theme.textMuted, fontSize: 11, fontWeight: "600" as const, marginTop: 1 },
  lbVotes: { color: theme.goldBright, fontSize: 13, fontWeight: "900" as const, minWidth: 56, textAlign: "right" },
  youPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: theme.emerald },
  youPillText: { color: theme.bg, fontSize: 9, fontWeight: "900" as const, letterSpacing: 1 },

  callout: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(244,208,63,0.06)",
    borderWidth: 1,
    borderColor: "rgba(244,208,63,0.25)",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  calloutTitle: { color: theme.goldBright, fontSize: 13, fontWeight: "900" as const },
  calloutSub: { color: theme.textMuted, fontSize: 11, fontWeight: "600" as const, marginTop: 2 },
  livePill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: theme.emerald },
  livePillText: { color: theme.bg, fontSize: 10, fontWeight: "900" as const, letterSpacing: 1.2 },

  swapBtn: {
    marginTop: 16,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  swapText: { color: theme.textDim, fontSize: 11, fontWeight: "800" as const, letterSpacing: 1 },
  footer: {
    color: theme.textDim,
    fontSize: 11,
    fontWeight: "600" as const,
    paddingHorizontal: 24,
    paddingTop: 18,
    textAlign: "center",
    lineHeight: 16,
  },
});

// Suppress unused-Animated warning while keeping import available for future motion.
void Animated; void Easing;
