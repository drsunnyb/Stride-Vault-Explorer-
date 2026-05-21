/**
 * City Waitlist — the global "next city" leaderboard.
 *
 * Every user who isn't in London picks a home city and adds votes to it
 * (passive from steps, +5 per share, +50 per referral). The city with the
 * most votes at the next quarterly review opens next. Drives organic FOMO.
 *
 * Players continue to earn coins normally everywhere — there is no region
 * lockout. This screen is part rallying point, part viral share engine.
 */
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack } from "expo-router";
import { Check, ChevronLeft, Crown, Footprints, Globe2, Share2, Trophy, X } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CITIES, CITY_BY_ID, LIVE_CITY_ID, flagEmoji, seededVotes } from "@/constants/cities";
import { theme } from "@/constants/theme";
import { useGame } from "@/providers/GameProvider";

export default function CitiesScreen() {
  const {
    player,
    homeCity,
    homeCityRank,
    cityLeaderboard,
    setHomeCity,
    boostHomeCity,
    stepsPerCityVote,
    shareCityVoteBonus,
    referralBonusCoins,
  } = useGame();

  const [pickerOpen, setPickerOpen] = useState<boolean>(false);
  const [filter, setFilter] = useState<string>("");

  const top = cityLeaderboard.slice(0, 3);
  const rest = cityLeaderboard.slice(3);
  const totalVotesAllCities = useMemo(
    () => cityLeaderboard.reduce((s, r) => s + r.total, 0),
    [cityLeaderboard]
  );
  const homeRow = useMemo(
    () => cityLeaderboard.find((r) => r.city.id === player.homeCityId),
    [cityLeaderboard, player.homeCityId]
  );
  const yourContribution = homeRow?.mine ?? 0;
  const stepsToNextVote =
    homeCity && homeCity.id !== LIVE_CITY_ID
      ? stepsPerCityVote - ((player.steps - (player.cityVoteStepsCredited ?? 0)) % stepsPerCityVote)
      : 0;

  const filteredPicker = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return CITIES;
    return CITIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)
    );
  }, [filter]);

  const refCode = useMemo(
    () => `STRIDE-${player.username.replace(/\W+/g, "").toUpperCase().slice(0, 6)}`,
    [player.username]
  );

  const onShareCity = useCallback(async () => {
    if (!homeCity) return;
    const flag = flagEmoji(homeCity.countryCode);
    const msg = `${flag} I'm rallying ${homeCity.name} to open next on Stride — every step earns coins AND votes my city up the waitlist.\n\nJoin with my code ${refCode} → we both get ${referralBonusCoins} coins, and you'll lock in your vote for ${homeCity.name}.\n\nhttps://rork.app/stride-quest?ref=${refCode}&city=${homeCity.id}`;
    try {
      const res = await Share.share({ message: msg });
      if (res.action !== Share.dismissedAction) {
        // Reward the player a small extra boost outside of the daily share cap
        // — the city is a separate metric, so capped share-coin payouts don't
        // block the city vote ladder.
        await boostHomeCity(shareCityVoteBonus);
      }
    } catch (e) {
      console.log("[Cities] share failed", e);
    }
  }, [homeCity, refCode, referralBonusCoins, boostHomeCity, shareCityVoteBonus]);

  const onPick = useCallback(
    async (cityId: string) => {
      await setHomeCity(cityId);
      setPickerOpen(false);
    },
    [setHomeCity]
  );

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={[theme.bg, "#0A0E1F", theme.bg]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.iconBtn}>
            <ChevronLeft size={20} color={theme.text} />
          </Pressable>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={styles.headerKicker}>GLOBAL WAITLIST</Text>
            <Text style={styles.headerTitle}>Next city to open</Text>
          </View>
          <View style={styles.iconBtn} />
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* Your city card */}
          <View style={styles.yourCard}>
            <View style={styles.yourCardTop}>
              <View style={styles.globePill}>
                <Globe2 size={14} color={theme.goldBright} />
                <Text style={styles.globePillText}>YOUR CITY</Text>
              </View>
              <Pressable
                onPress={() => setPickerOpen(true)}
                style={({ pressed }) => [styles.changeBtn, pressed && { opacity: 0.7 }]}
                hitSlop={8}
              >
                <Text style={styles.changeBtnText}>{homeCity ? "CHANGE" : "PICK"}</Text>
              </Pressable>
            </View>

            {homeCity ? (
              <>
                <View style={styles.yourFlagRow}>
                  <Text style={styles.yourFlag}>{flagEmoji(homeCity.countryCode)}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.yourName}>{homeCity.name}</Text>
                    <Text style={styles.yourCountry}>{homeCity.country}</Text>
                  </View>
                  {homeCity.id !== LIVE_CITY_ID ? (
                    <View style={styles.rankPill}>
                      <Text style={styles.rankPillNum}>#{homeCityRank || "—"}</Text>
                      <Text style={styles.rankPillLabel}>RANK</Text>
                    </View>
                  ) : (
                    <View style={styles.livePill}>
                      <Text style={styles.livePillText}>LIVE</Text>
                    </View>
                  )}
                </View>

                {homeCity.id !== LIVE_CITY_ID ? (
                  <>
                    <View style={styles.statRow}>
                      <Stat
                        label="YOUR VOTES"
                        value={yourContribution.toLocaleString()}
                        accent={theme.goldBright}
                      />
                      <Stat
                        label="TOTAL"
                        value={(homeRow?.total ?? 0).toLocaleString()}
                        accent={theme.emerald}
                      />
                      <Stat
                        label="NEXT VOTE IN"
                        value={`${stepsToNextVote.toLocaleString()} steps`}
                        accent={theme.sapphire}
                      />
                    </View>

                    <Pressable
                      onPress={onShareCity}
                      style={({ pressed }) => [styles.shareCta, pressed && { transform: [{ scale: 0.99 }] }]}
                    >
                      <Share2 size={16} color="#06070D" />
                      <Text style={styles.shareCtaText}>
                        SHARE — +{shareCityVoteBonus} VOTES
                      </Text>
                    </Pressable>
                    <Text style={styles.helperText}>
                      Every {stepsPerCityVote.toLocaleString()} steps = +1 vote · Each friend you bring with your code = +50 votes · Coins still mint normally
                    </Text>
                  </>
                ) : (
                  <Text style={styles.helperText}>
                    {homeCity.name} is live. Hunt all 1,100 vaults across Greater London.
                  </Text>
                )}
              </>
            ) : (
              <Pressable onPress={() => setPickerOpen(true)} style={styles.pickPrompt}>
                <Text style={styles.pickPromptText}>Tap to pick your city →</Text>
              </Pressable>
            )}
          </View>

          {/* Top 3 podium */}
          {top.length > 0 ? (
            <View style={styles.podiumWrap}>
              <Text style={styles.sectionLabel}>LEADERBOARD</Text>
              <View style={styles.podiumRow}>
                {top.map((row, i) => (
                  <View
                    key={row.city.id}
                    style={[
                      styles.podiumCard,
                      i === 0 && styles.podiumGold,
                      i === 1 && styles.podiumSilver,
                      i === 2 && styles.podiumBronze,
                      row.isHome && styles.podiumYou,
                    ]}
                  >
                    <Text style={styles.podiumRank}>#{i + 1}</Text>
                    <Text style={styles.podiumFlag}>{flagEmoji(row.city.countryCode)}</Text>
                    <Text style={styles.podiumName} numberOfLines={1}>
                      {row.city.name}
                    </Text>
                    <Text style={styles.podiumVotes}>{row.total.toLocaleString()}</Text>
                    {row.isHome ? (
                      <View style={styles.youBadge}>
                        <Text style={styles.youBadgeText}>YOU</Text>
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Live city callout */}
          <View style={styles.liveCallout}>
            <View style={styles.liveCalloutLeft}>
              <Crown size={16} color={theme.goldBright} />
              <Text style={styles.liveCalloutTitle}>London is live now</Text>
            </View>
            <Text style={styles.liveCalloutSub}>1,100 vaults · 9,088 walkers</Text>
          </View>

          {/* Rest of the list */}
          <View style={styles.listWrap}>
            {rest.map((row, i) => (
              <View
                key={row.city.id}
                style={[
                  styles.listRow,
                  row.isHome && styles.listRowHome,
                  i === rest.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <Text style={styles.listRank}>#{i + 4}</Text>
                <Text style={styles.listFlag}>{flagEmoji(row.city.countryCode)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listName}>{row.city.name}</Text>
                  <Text style={styles.listSub}>{row.city.tagline}</Text>
                </View>
                {row.isHome ? (
                  <View style={styles.youBadgeSmall}>
                    <Text style={styles.youBadgeText}>YOU</Text>
                  </View>
                ) : null}
                <Text style={styles.listVotes}>{row.total.toLocaleString()}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.footerNote}>
            Total votes across all cities: {totalVotesAllCities.toLocaleString()}.{"\n"}
            Next review: end of the quarter. Top-voted city opens next.
          </Text>
        </ScrollView>
      </SafeAreaView>

      {/* City picker modal */}
      <CityPickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={onPick}
        filter={filter}
        setFilter={setFilter}
        items={filteredPicker}
        currentId={player.homeCityId}
      />
    </View>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function CityPickerModal({
  visible,
  onClose,
  onPick,
  filter,
  setFilter,
  items,
  currentId,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (id: string) => void;
  filter: string;
  setFilter: (s: string) => void;
  items: typeof CITIES;
  currentId?: string;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.sheetRoot}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Pick your city</Text>
          <Pressable onPress={onClose} hitSlop={10} style={styles.iconBtn}>
            <X size={20} color={theme.text} />
          </Pressable>
        </View>
        <TextInput
          value={filter}
          onChangeText={setFilter}
          placeholder="Search by city or country…"
          placeholderTextColor={theme.textDim}
          style={styles.searchInput}
        />
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          {items.map((c) => {
            const isCurrent = c.id === currentId;
            const isLive = c.status === "live";
            return (
              <Pressable
                key={c.id}
                onPress={() => onPick(c.id)}
                style={({ pressed }) => [
                  styles.pickerRow,
                  isCurrent && styles.pickerRowCurrent,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={styles.listFlag}>{flagEmoji(c.countryCode)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listName}>{c.name}</Text>
                  <Text style={styles.listSub}>{c.country}</Text>
                </View>
                {isLive ? (
                  <View style={styles.livePillSmall}>
                    <Text style={styles.livePillText}>LIVE</Text>
                  </View>
                ) : null}
                {isCurrent ? <Check size={18} color={theme.goldBright} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.bgCard,
    alignItems: "center",
    justifyContent: "center",
  },
  headerKicker: {
    color: theme.textMuted,
    fontSize: 10,
    fontWeight: "900" as const,
    letterSpacing: 1.6,
  },
  headerTitle: {
    color: theme.text,
    fontSize: 20,
    fontWeight: "900" as const,
    marginTop: 2,
  },

  yourCard: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    backgroundColor: theme.bgCard,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.border,
  },
  yourCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  globePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(244,208,63,0.12)",
  },
  globePillText: {
    color: theme.goldBright,
    fontSize: 10,
    fontWeight: "900" as const,
    letterSpacing: 1.4,
  },
  changeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  changeBtnText: {
    color: theme.text,
    fontSize: 10,
    fontWeight: "900" as const,
    letterSpacing: 1.2,
  },
  yourFlagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  yourFlag: { fontSize: 48 },
  yourName: { color: theme.text, fontSize: 24, fontWeight: "900" as const },
  yourCountry: { color: theme.textMuted, fontSize: 12, fontWeight: "700" as const, marginTop: 2 },
  rankPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.bg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
  },
  rankPillNum: { color: theme.goldBright, fontSize: 18, fontWeight: "900" as const },
  rankPillLabel: { color: theme.textDim, fontSize: 9, fontWeight: "900" as const, letterSpacing: 1.2 },
  livePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.emerald,
    borderRadius: 14,
  },
  livePillSmall: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: theme.emerald,
    borderRadius: 999,
  },
  livePillText: { color: "#06070D", fontSize: 10, fontWeight: "900" as const, letterSpacing: 1.2 },
  statRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  stat: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: theme.bg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
  },
  statValue: { fontSize: 16, fontWeight: "900" as const },
  statLabel: {
    color: theme.textDim,
    fontSize: 9,
    fontWeight: "900" as const,
    letterSpacing: 1.2,
    marginTop: 4,
  },
  shareCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: theme.goldBright,
    paddingVertical: 14,
    borderRadius: 999,
  },
  shareCtaText: { color: "#06070D", fontSize: 14, fontWeight: "900" as const, letterSpacing: 1.4 },
  helperText: {
    color: theme.textMuted,
    fontSize: 11,
    fontWeight: "600" as const,
    marginTop: 10,
    textAlign: "center",
    lineHeight: 16,
  },
  pickPrompt: {
    paddingVertical: 22,
    alignItems: "center",
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 16,
  },
  pickPromptText: { color: theme.goldBright, fontSize: 14, fontWeight: "900" as const, letterSpacing: 1 },

  podiumWrap: { marginTop: 20, paddingHorizontal: 16 },
  sectionLabel: {
    color: theme.textMuted,
    fontSize: 10,
    fontWeight: "900" as const,
    letterSpacing: 1.6,
    marginBottom: 10,
  },
  podiumRow: { flexDirection: "row", gap: 8 },
  podiumCard: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    backgroundColor: theme.bgCard,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    gap: 4,
  },
  podiumGold: { borderColor: theme.goldBright, backgroundColor: "rgba(244,208,63,0.08)" },
  podiumSilver: { borderColor: theme.tier.silver },
  podiumBronze: { borderColor: theme.tier.bronze },
  podiumYou: { borderColor: theme.emerald },
  podiumRank: { color: theme.textMuted, fontSize: 11, fontWeight: "900" as const, letterSpacing: 1 },
  podiumFlag: { fontSize: 28 },
  podiumName: { color: theme.text, fontSize: 13, fontWeight: "900" as const, textAlign: "center" },
  podiumVotes: { color: theme.goldBright, fontSize: 14, fontWeight: "900" as const },
  youBadge: {
    backgroundColor: theme.emerald,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginTop: 2,
  },
  youBadgeSmall: {
    backgroundColor: theme.emerald,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  youBadgeText: { color: "#06070D", fontSize: 9, fontWeight: "900" as const, letterSpacing: 1 },

  liveCallout: {
    marginTop: 16,
    marginHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "rgba(244,208,63,0.06)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(244,208,63,0.25)",
  },
  liveCalloutLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  liveCalloutTitle: { color: theme.goldBright, fontSize: 13, fontWeight: "900" as const, letterSpacing: 0.6 },
  liveCalloutSub: { color: theme.textMuted, fontSize: 11, fontWeight: "700" as const },

  listWrap: {
    marginTop: 12,
    marginHorizontal: 16,
    backgroundColor: theme.bgCard,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: "hidden",
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  listRowHome: { backgroundColor: "rgba(16,185,129,0.08)" },
  listRank: { color: theme.textDim, fontSize: 12, fontWeight: "900" as const, width: 32 },
  listFlag: { fontSize: 22 },
  listName: { color: theme.text, fontSize: 14, fontWeight: "800" as const },
  listSub: { color: theme.textMuted, fontSize: 11, fontWeight: "600" as const, marginTop: 1 },
  listVotes: { color: theme.goldBright, fontSize: 13, fontWeight: "900" as const, minWidth: 56, textAlign: "right" },

  footerNote: {
    color: theme.textDim,
    fontSize: 11,
    fontWeight: "600" as const,
    textAlign: "center",
    marginTop: 20,
    paddingHorizontal: 32,
    lineHeight: 16,
  },

  // Picker sheet
  sheetRoot: { flex: 1, backgroundColor: theme.bg },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  sheetTitle: { color: theme.text, fontSize: 18, fontWeight: "900" as const },
  searchInput: {
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: theme.bgCard,
    borderRadius: 12,
    color: theme.text,
    fontSize: 14,
    fontWeight: "600" as const,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 12,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  pickerRowCurrent: { backgroundColor: "rgba(244,208,63,0.06)" },
});
