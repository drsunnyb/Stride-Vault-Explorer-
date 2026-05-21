import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Crosshair, Crown, Share2, Sparkles, X, Zap } from "lucide-react-native";

import { PLUS } from "@/constants/plus";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CityWaitlistHome } from "@/components/CityWaitlistHome";
import { HUD } from "@/components/HUD";
import { LiveEventsStrip } from "@/components/LiveEventsStrip";
import { LondonMap } from "@/components/LondonMap";
import { MapKitMap } from "@/components/MapKitMap";
import { ShareSheet } from "@/components/ShareSheet";
import { VaultListCard } from "@/components/VaultListCard";
import { LIVE_CITY_ID } from "@/constants/cities";
import { theme } from "@/constants/theme";
import { VAULTS } from "@/constants/vaults";
import { useGame } from "@/providers/GameProvider";
import type { Vault, VaultBrand } from "@/types/game";

/** How long after a claim the share nudge stays on screen. */
const SHARE_NUDGE_WINDOW_MS = 5 * 60 * 1000;

const BRAND_TINT: Record<VaultBrand, { color: string; glow: string; tag: string }> = {
  nike: { color: "#FF6B00", glow: "#FFB266", tag: "NIKE DROP" },
  apple: { color: "#E5E7EB", glow: "#FFFFFF", tag: "APPLE DROP" },
};

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

export default function MapScreen() {
  const {
    player,
    vaultsWithDistance,
    xpNeeded,
    xpProgress,
    dailyStepGoal,
    shareRewardCoins,
    claimsToday,
    dailyClaimHardCap,
    markRebalanceSeen,
    plusActive,
    plusDailyCap,
  } = useGame();
  const capHit = !plusActive && claimsToday >= dailyClaimHardCap;

  // Geo-gate: only players inside the ~25mi London radius see the live map.
  // Everyone else gets the waitlist home — share to rally, see leaderboard,
  // track their own stats. Coins still mint everywhere.
  const onWaitlist =
    !!player.homeCityId && player.homeCityId !== LIVE_CITY_ID;
  if (onWaitlist) {
    return <CityWaitlistHome />;
  }

  // Post-claim Plus nudge: when a free player just claimed, show what Plus would've added.
  const latestClaimForPlus = player.claimed[0];
  const showPlusClaimNudge =
    !plusActive &&
    !!latestClaimForPlus &&
    Date.now() - latestClaimForPlus.claimedAt < 90_000;
  const wouldveEarned = latestClaimForPlus
    ? Math.max(1, Math.round(latestClaimForPlus.coins * PLUS.payoutBonus))
    : 0;

  // First-launch onboarding paywall — fires once.
  useEffect(() => {
    if (!player.seenPlusOnboarding && !plusActive) {
      const t = setTimeout(() => router.push("/plus"), 800);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [player.seenPlusOnboarding, plusActive]);
  const showRebalanceNote = !player.seenRebalanceV2;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState<boolean>(false);
  const [dismissedClaimAt, setDismissedClaimAt] = useState<number>(0);

  // Detect most recent claim and surface a share nudge banner for SHARE_NUDGE_WINDOW_MS.
  const latestClaim = player.claimed[0];
  const nudgeActive =
    !!latestClaim &&
    Date.now() - latestClaim.claimedAt < SHARE_NUDGE_WINDOW_MS &&
    latestClaim.claimedAt > dismissedClaimAt;
  const nudgeVault: Vault | undefined = useMemo(
    () => (latestClaim ? VAULTS.find((v) => v.id === latestClaim.id) : undefined),
    [latestClaim]
  );

  const nudgeAnim = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(nudgeAnim, {
      toValue: nudgeActive ? 1 : 0,
      duration: nudgeActive ? 380 : 220,
      easing: nudgeActive
        ? Easing.out(Easing.back(1.4))
        : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
    if (nudgeActive) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
    return undefined;
  }, [nudgeActive, nudgeAnim, pulse]);

  const nudgeTint = nudgeVault?.brand ? BRAND_TINT[nudgeVault.brand] : null;

  const mapHeight = Math.round(SCREEN_H * 0.62);

  const claimedIds = useMemo(
    () => new Set(vaultsWithDistance.filter((v) => v.claimed).map((v) => v.vault.id)),
    [vaultsWithDistance]
  );
  const claimableIds = useMemo(
    () => new Set(vaultsWithDistance.filter((v) => v.canClaim).map((v) => v.vault.id)),
    [vaultsWithDistance]
  );

  const openVault = useCallback((id: string) => {
    setSelectedId(id);
    router.push(`/vault/${id}`);
  }, []);

  const nearest = vaultsWithDistance[0];
  const inRangeCount = vaultsWithDistance.filter((v) => v.canClaim).length;

  const openShare = useCallback(() => {
    setShareOpen(true);
  }, []);
  const dismissNudge = useCallback(() => {
    if (latestClaim) setDismissedClaimAt(latestClaim.claimedAt);
  }, [latestClaim]);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header — floats above map */}
        <SafeAreaView edges={["top"]} style={styles.header} pointerEvents="box-none">
          <LinearGradient
            colors={["rgba(6,7,13,0.95)", "rgba(6,7,13,0.65)", "transparent"]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={styles.brandRow} pointerEvents="box-none">
            <View style={styles.brandLeft}>
              <View style={styles.logoDot}>
                <LinearGradient
                  colors={[theme.gold, theme.goldBright]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
              </View>
              <View>
                <Text style={styles.brandName}>STRIDE QUEST</Text>
                <Text style={styles.brandSub}>GREATER LONDON · LIVE</Text>
              </View>
            </View>
            <View style={styles.inRangePill}>
              <Sparkles size={12} color={theme.emeraldBright} />
              <Text style={styles.inRangeText}>{inRangeCount} in range</Text>
            </View>
          </View>
        </SafeAreaView>

        {/* Map */}
        <View style={[styles.mapFrame, { height: mapHeight }]}>
          {Platform.OS === "web" ? (
            <LondonMap
              width={SCREEN_W}
              height={mapHeight}
              player={player}
              selectedId={selectedId}
              claimedIds={claimedIds}
              claimableIds={claimableIds}
              onSelectVault={openVault}
            />
          ) : (
            <MapKitMap
              player={player}
              claimedIds={claimedIds}
              claimableIds={claimableIds}
              onSelectVault={openVault}
            />
          )}

          {/* nearest hint */}
          {nearest && (
            <Pressable
              onPress={() => openVault(nearest.vault.id)}
              style={styles.nearestHint}
            >
              <Crosshair size={14} color={theme.emeraldBright} />
              <View style={{ flex: 1 }}>
                <Text style={styles.nearestLabel}>NEAREST VAULT</Text>
                <Text style={styles.nearestName} numberOfLines={1}>
                  {nearest.vault.name} ·{" "}
                  <Text
                    style={{
                      color: nearest.canClaim
                        ? theme.emeraldBright
                        : nearest.claimed
                        ? theme.textDim
                        : theme.textMuted,
                    }}
                  >
                    {nearest.canClaim
                      ? "IN RANGE"
                      : nearest.claimed
                      ? "RESPAWNING"
                      : `${Math.round(nearest.distanceMeters)}m`}
                  </Text>
                </Text>
              </View>
            </Pressable>
          )}
        </View>

        {/* Live retention events strip */}
        <LiveEventsStrip />

        {/* HUD */}
        <View style={styles.hudWrap}>
          <HUD
            level={player.level}
            xp={player.xp}
            xpNeeded={xpNeeded}
            xpProgress={xpProgress}
            coins={player.coins}
            streakDays={player.streakDays}
            steps={player.steps}
            stepsToday={player.stepsToday}
            dailyStepGoal={dailyStepGoal}
            vaultsClaimed={player.claimed.length}
            claimsToday={claimsToday}
            dailyClaimHardCap={plusDailyCap}
            plusActive={plusActive}
          />
        </View>

        {capHit && (
          <Pressable onPress={() => router.push("/plus")} style={styles.plusBanner}>
            <LinearGradient
              colors={["#FFC857", "#FF7A45"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.plusBannerIcon}>
              <Crown size={16} color="#1A0A00" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.plusBannerTitle}>DAILY CAP HIT</Text>
              <Text style={styles.plusBannerBody}>
                Stride+ members claim up to {plusDailyCap}/day. Unlock {plusDailyCap - dailyClaimHardCap} more.
              </Text>
            </View>
            <View style={styles.plusBannerChip}>
              <Text style={styles.plusBannerChipText}>UPGRADE</Text>
            </View>
          </Pressable>
        )}

        {showPlusClaimNudge && (
          <Pressable onPress={() => router.push("/plus")} style={styles.plusSoftBanner}>
            <LinearGradient
              colors={["rgba(212,175,55,0.22)", "rgba(255,122,69,0.10)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Crown size={14} color={theme.goldBright} />
            <Text style={styles.plusSoftText}>
              Stride+ would've paid <Text style={styles.plusSoftBold}>+{wouldveEarned}</Text> on that claim.
            </Text>
            <Text style={styles.plusSoftCta}>SEE PLAN</Text>
          </Pressable>
        )}

        {showRebalanceNote && (
          <Pressable onPress={() => markRebalanceSeen()} style={styles.rebalanceNote}>
            <LinearGradient
              colors={["rgba(16,185,129,0.18)", "rgba(16,185,129,0.06)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.rebalanceIcon}>
              <Zap size={16} color={theme.emeraldBright} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rebalanceTitle}>LONDON-WIDE LAUNCH · 1,100 VAULTS LIVE</Text>
              <Text style={styles.rebalanceBody}>
                Vaults now cover every borough from Heathrow to Romford. Payouts re-tuned for scale, plus a daily ladder: claims 1–3 pay 100%, 4–6 pay 70%, 7–10 pay 40%. Tap to dismiss.
              </Text>
            </View>
            <X size={14} color={theme.textDim} />
          </Pressable>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>NEARBY VAULTS</Text>
          <Text style={styles.sectionCount}>
            {vaultsWithDistance.filter((v) => !v.claimed).length.toLocaleString()} live · nearest {Math.min(50, vaultsWithDistance.length)}
          </Text>
        </View>

        <View style={styles.list}>
          {vaultsWithDistance.slice(0, 50).map((v) => (
            <VaultListCard
              key={v.vault.id}
              vault={v.vault}
              distance={v.distanceMeters}
              claimed={v.claimed}
              canClaim={v.canClaim}
              respawnAt={v.respawnAt}
              onPress={() => openVault(v.vault.id)}
            />
          ))}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Floating share nudge — appears for ~5 min after every vault claim. */}
      {nudgeActive && nudgeVault && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.nudgeWrap,
            {
              opacity: nudgeAnim,
              transform: [
                {
                  translateY: nudgeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-24, 0],
                  }),
                },
                {
                  scale: nudgeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.94, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <SafeAreaView edges={["top"]} pointerEvents="box-none">
            <View style={styles.nudgeRow} pointerEvents="box-none">
              <Pressable onPress={openShare} style={styles.nudgeCard}>
                <LinearGradient
                  colors={
                    nudgeTint
                      ? [nudgeTint.color + "F2", nudgeTint.color + "CC"]
                      : [theme.gold + "EE", "#B8862C"]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Animated.View
                  pointerEvents="none"
                  style={[
                    StyleSheet.absoluteFill,
                    styles.nudgePulse,
                    {
                      opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] }),
                      backgroundColor: nudgeTint?.glow ?? theme.goldBright,
                    },
                  ]}
                />
                <View style={styles.nudgeIconWrap}>
                  <Share2 size={18} color={nudgeTint ? "#1A0A00" : "#1A1206"} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nudgeLabel}>
                    {nudgeTint ? nudgeTint.tag + " UNLOCKED" : "VAULT UNLOCKED"}
                  </Text>
                  <Text style={styles.nudgeTitle} numberOfLines={1}>
                    Share {nudgeVault.name} · +{shareRewardCoins}
                  </Text>
                </View>
                <View style={styles.nudgeChip}>
                  <Text style={styles.nudgeChipText}>SHARE</Text>
                </View>
              </Pressable>
              <Pressable
                onPress={dismissNudge}
                hitSlop={10}
                style={styles.nudgeClose}
              >
                <X size={14} color={theme.textDim} />
              </Pressable>
            </View>
          </SafeAreaView>
        </Animated.View>
      )}

      <ShareSheet
        visible={shareOpen}
        onClose={() => {
          setShareOpen(false);
          dismissNudge();
        }}
        vault={nudgeVault}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  scrollContent: { paddingBottom: 16 },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 10,
    zIndex: 20,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 6,
  },
  brandLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoDot: {
    width: 32,
    height: 32,
    borderRadius: 10,
    overflow: "hidden",
    shadowColor: theme.gold,
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  brandName: { color: theme.text, fontWeight: "900" as const, letterSpacing: 2, fontSize: 14 },
  brandSub: { color: theme.textDim, fontSize: 9, fontWeight: "700" as const, letterSpacing: 1.4 },
  inRangePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: "rgba(16, 185, 129, 0.18)",
    borderColor: theme.emerald + "88",
    borderWidth: 1,
  },
  inRangeText: { color: theme.emeraldBright, fontSize: 11, fontWeight: "800" as const, letterSpacing: 0.6 },
  mapFrame: {
    position: "relative",
    backgroundColor: theme.bgElev,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  nearestHint: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(12, 15, 26, 0.94)",
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.border,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.4,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 6 },
    }),
  },
  nearestLabel: { color: theme.textDim, fontSize: 9, fontWeight: "800" as const, letterSpacing: 1.4 },
  nearestName: { color: theme.text, fontSize: 13, fontWeight: "800" as const, marginTop: 2 },
  hudWrap: { paddingHorizontal: 16, paddingTop: 14 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 10,
  },
  sectionTitle: { color: theme.text, fontSize: 13, fontWeight: "900" as const, letterSpacing: 2 },
  sectionCount: { color: theme.textMuted, fontSize: 11, fontWeight: "700" as const },
  list: { paddingHorizontal: 16, gap: 8 },
  rebalanceNote: {
    marginHorizontal: 16,
    marginTop: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.emerald + "55",
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rebalanceIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(16,185,129,0.18)",
    borderWidth: 1,
    borderColor: theme.emerald + "88",
  },
  rebalanceTitle: {
    color: theme.emeraldBright,
    fontSize: 11,
    fontWeight: "900" as const,
    letterSpacing: 1.2,
  },
  rebalanceBody: {
    color: theme.text,
    fontSize: 12,
    fontWeight: "600" as const,
    marginTop: 4,
    lineHeight: 16,
  },
  plusBanner: {
    marginHorizontal: 16,
    marginTop: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  plusBannerIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.85)",
  },
  plusBannerTitle: {
    color: "#0A0500",
    fontSize: 10,
    fontWeight: "900" as const,
    letterSpacing: 1.6,
  },
  plusBannerBody: {
    color: "#1A0A00",
    fontSize: 12,
    fontWeight: "700" as const,
    marginTop: 2,
  },
  plusBannerChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(10,5,0,0.85)",
  },
  plusBannerChipText: {
    color: "#FFE9B0",
    fontSize: 10,
    fontWeight: "900" as const,
    letterSpacing: 1.4,
  },
  plusSoftBanner: {
    marginHorizontal: 16,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.gold + "66",
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  plusSoftText: { flex: 1, color: theme.text, fontSize: 12, fontWeight: "600" as const },
  plusSoftBold: { color: theme.goldBright, fontWeight: "900" as const },
  plusSoftCta: { color: theme.goldBright, fontSize: 10, fontWeight: "900" as const, letterSpacing: 1.4 },
  nudgeWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    zIndex: 40,
  },
  nudgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 56,
  },
  nudgeCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.45,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 10 },
    }),
  },
  nudgePulse: { borderRadius: theme.radius.lg },
  nudgeIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.85)",
  },
  nudgeLabel: {
    color: "rgba(20,10,0,0.7)",
    fontSize: 9,
    fontWeight: "900" as const,
    letterSpacing: 1.6,
  },
  nudgeTitle: {
    color: "#0A0500",
    fontSize: 14,
    fontWeight: "900" as const,
    letterSpacing: 0.2,
    marginTop: 2,
  },
  nudgeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: "rgba(10,5,0,0.85)",
  },
  nudgeChipText: {
    color: "#FFE9B0",
    fontSize: 11,
    fontWeight: "900" as const,
    letterSpacing: 1.2,
  },
  nudgeClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(12,15,26,0.85)",
    borderWidth: 1,
    borderColor: theme.border,
  },
});
