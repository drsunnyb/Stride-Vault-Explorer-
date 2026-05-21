import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Award, Bell, BellOff, ChevronRight, Check, Coins, Crown, Flame, Footprints, Globe2, Inbox, Lock, RotateCcw, Settings, Share2, Snowflake, Sparkles, Target, Trophy } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ShareSheet } from "@/components/ShareSheet";
import { CITY_BY_ID, LIVE_CITY_ID, flagEmoji } from "@/constants/cities";
import { StrideStatusBadge } from "@/components/StrideStatusBadge";
import { nextStreakTier, streakTier, TRIBES } from "@/constants/retention";
import { STRIDE_TIERS, getStrideStatus } from "@/constants/status";
import { theme } from "@/constants/theme";
import { useGame } from "@/providers/GameProvider";

export default function ProfileScreen() {
  const {
    player,
    xpNeeded,
    xpProgress,
    resetProgress,
    enableNotifications,
    disableNotifications,
    plusActive,
    streakDays,
    streakMult,
    streakFreezes,
    buyStreakFreeze,
    streakFreezeCost,
    tribe,
    pickTribe,
    predictionHistory,
    homeCity,
    homeCityRank,
    unreadNotifications,
    pendingNotifications,
  } = useGame();
  const inboxBadge = pendingNotifications > 0 ? pendingNotifications : unreadNotifications;
  const inboxSubtitle =
    pendingNotifications > 0
      ? `${pendingNotifications} pending · friend requests & challenge invites`
      : unreadNotifications > 0
        ? `${unreadNotifications} unread`
        : "All caught up";
  const sTier = streakTier(streakDays);
  const sNext = nextStreakTier(streakDays);
  const renewalLabel = useMemo(() => {
    if (!player.plus?.renewsAt) return "";
    return new Date(player.plus.renewsAt).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }, [player.plus?.renewsAt]);
  const vaultsClaimed = player.claimed.length;
  const status = getStrideStatus(vaultsClaimed);
  const [shareOpen, setShareOpen] = useState<boolean>(false);

  const onReset = useCallback(() => {
    Alert.alert(
      "Reset progress?",
      "This will erase all claimed vaults, coins, and XP.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Reset", style: "destructive", onPress: () => resetProgress() },
      ]
    );
  }, [resetProgress]);

  const onToggleNotifications = useCallback(async () => {
    if (player.notificationsEnabled) {
      await disableNotifications();
      return;
    }
    const ok = await enableNotifications();
    if (!ok) {
      Alert.alert(
        "Notifications blocked",
        "Enable notifications in your device settings to get vault respawn alerts and raffle reminders."
      );
    }
  }, [player.notificationsEnabled, enableNotifications, disableNotifications]);

  const onShare = useCallback(() => {
    setShareOpen(true);
  }, []);

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Stride+ card — always present, swaps state. */}
      <Pressable onPress={() => router.push("/plus")} style={styles.plusCard}>
        <LinearGradient
          colors={plusActive ? ["#FFC857", "#FF7A45"] : ["rgba(212,175,55,0.18)", "rgba(255,122,69,0.08)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            styles.plusCardIcon,
            plusActive
              ? { backgroundColor: "rgba(255,255,255,0.85)" }
              : { backgroundColor: theme.goldBright + "22", borderColor: theme.gold + "99", borderWidth: 1 },
          ]}
        >
          <Crown size={20} color={plusActive ? "#1A0A00" : theme.goldBright} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.plusCardLabel, plusActive && { color: "#0A0500" }]}>
            {plusActive ? "STRIDE+ · ACTIVE" : "STRIDE+"}
          </Text>
          <Text style={[styles.plusCardTitle, plusActive && { color: "#1A0A00" }]} numberOfLines={1}>
            {plusActive
              ? `${player.plus?.plan === "annual" ? "Annual" : "Monthly"} · renews ${renewalLabel}`
              : "Earn more on every step · from £3.25/mo"}
          </Text>
        </View>
        <ChevronRight size={18} color={plusActive ? "#1A0A00" : theme.goldBright} />
      </Pressable>

      {/* Unified notifications inbox */}
      <Pressable
        onPress={() => router.push("/notifications")}
        style={({ pressed }) => [styles.inboxCard, pressed && { transform: [{ scale: 0.99 }] }]}
      >
        <View style={styles.inboxIcon}>
          <Inbox size={16} color={theme.goldBright} />
          {inboxBadge > 0 ? (
            <View style={styles.inboxBadgeDot}>
              <Text style={styles.inboxBadgeText}>{inboxBadge > 9 ? "9+" : inboxBadge}</Text>
            </View>
          ) : null}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.inboxTitle}>NOTIFICATIONS</Text>
          <Text style={styles.inboxSub} numberOfLines={1}>{inboxSubtitle}</Text>
        </View>
        <ChevronRight size={16} color={theme.textMuted} />
      </Pressable>

      <View style={styles.heroCard}>
        <LinearGradient
          colors={["rgba(212,175,55,0.18)", "rgba(6,7,13,0)"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.avatarBig}>
          <LinearGradient
            colors={[theme.gold, theme.goldBright]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Text style={styles.avatarBigLetter}>{player.username.charAt(0)}</Text>
          {plusActive ? (
            <View style={styles.avatarPlusBadge}>
              <Crown size={10} color="#1A0A00" />
            </View>
          ) : null}
        </View>
        <Text style={styles.username}>{player.username}</Text>
        <Text style={styles.handle}>@halcyon · CENTRAL LONDON</Text>

        <View style={{ marginTop: 10, marginBottom: 8 }}>
          <StrideStatusBadge status={status.current} size="lg" showCaption />
        </View>
        <Text style={styles.tagline}>{status.current.tagline}</Text>

        <View style={styles.xpWrap}>
          <View style={styles.xpHeader}>
            <Text style={styles.xpLabel}>LEVEL {player.level}</Text>
            <Text style={styles.xpValue}>{player.xp} / {xpNeeded} XP</Text>
          </View>
          <View style={styles.xpBar}>
            <LinearGradient
              colors={[theme.emerald, theme.emeraldBright]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.xpFill, { width: `${Math.max(4, xpProgress * 100)}%` }]}
            />
          </View>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <StatCard icon={<Coins size={16} color={theme.gold} />} value={player.coins.toLocaleString()} label="COINS" />
        <StatCard icon={<Award size={16} color={theme.goldBright} />} value={player.claimed.length.toString()} label="VAULTS" />
        <StatCard icon={<Flame size={16} color={theme.ruby} />} value={`${player.streakDays}d`} label="STREAK" />
        <StatCard icon={<Footprints size={16} color={theme.emeraldBright} />} value={player.steps.toLocaleString()} label="STEPS" />
      </View>

      <Text style={styles.sectionTitle}>STRIDE STATUS</Text>
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.statusTitle}>{status.current.label}</Text>
            <Text style={styles.statusSub}>
              {vaultsClaimed} vault{vaultsClaimed === 1 ? "" : "s"} claimed
              {status.next ? ` · ${status.remaining} to ${status.next.label}` : " · max tier"}
            </Text>
          </View>
          {status.next ? (
            <View style={[styles.nextChip, { borderColor: status.next.color + "AA" }]}>
              <Text style={[styles.nextChipText, { color: status.next.glow }]}>NEXT · {status.next.label.toUpperCase()}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.statusBar}>
          <LinearGradient
            colors={[status.current.color, status.current.glow]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.statusFill, { width: `${Math.max(4, status.progress * 100)}%` }]}
          />
        </View>

        <View style={styles.ladder}>
          {STRIDE_TIERS.map((t) => {
            const unlocked = vaultsClaimed >= t.minVaults;
            const isCurrent = t.tier === status.current.tier;
            return (
              <View
                key={t.tier}
                style={[
                  styles.ladderRow,
                  isCurrent && { backgroundColor: t.color + "14", borderColor: t.color + "66" },
                ]}
              >
                <View
                  style={[
                    styles.ladderDot,
                    {
                      backgroundColor: unlocked ? t.glow : theme.surface,
                      borderColor: unlocked ? t.color : theme.border,
                    },
                  ]}
                >
                  {unlocked ? (
                    <Check size={11} color={"#0E1117"} />
                  ) : (
                    <Lock size={10} color={theme.textDim} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.ladderLabel, !unlocked && { color: theme.textMuted }]}>
                    {t.label}
                  </Text>
                  <Text style={styles.ladderDrop} numberOfLines={1}>
                    {t.drop}
                  </Text>
                </View>
                <Text style={[styles.ladderReq, { color: unlocked ? t.glow : theme.textDim }]}>
                  {t.minVaults}v
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Streak */}
      <Text style={styles.sectionTitle}>STREAK · {streakMult.toFixed(2)}×</Text>
      <View style={styles.streakCard}>
        <LinearGradient
          colors={streakDays >= 3 ? ["rgba(239,68,68,0.18)", "rgba(239,68,68,0.04)"] : ["rgba(154,163,184,0.10)", "rgba(154,163,184,0.02)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.flameBubble, { backgroundColor: streakDays >= 3 ? theme.ruby : theme.surface }]}>
          <Flame size={22} color={streakDays >= 3 ? "#FFFFFF" : theme.textMuted} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.streakTitle}>
            {streakDays} day{streakDays === 1 ? "" : "s"} · {sTier.label}
          </Text>
          <Text style={styles.streakSub}>
            {sNext
              ? `${sNext.days - streakDays} day${sNext.days - streakDays === 1 ? "" : "s"} to ${sNext.label} · ${sNext.multiplier}×`
              : "Max tier reached — keep the fire alive."}
          </Text>
          <View style={styles.freezeRow}>
            <Snowflake size={11} color={theme.sapphire} />
            <Text style={styles.freezeText}>{streakFreezes} freeze{streakFreezes === 1 ? "" : "s"} · saves your streak when you miss a day</Text>
          </View>
        </View>
        <Pressable
          onPress={async () => {
            const res = await buyStreakFreeze();
            if (!res.ok) Alert.alert("Freeze", res.reason === "no-coins" ? `Need ${streakFreezeCost} coins.` : "Max freezes stored.");
          }}
          style={styles.freezeBuy}
        >
          <Snowflake size={11} color="#0A0500" />
          <Text style={styles.freezeBuyText}>+1 · {streakFreezeCost}c</Text>
        </Pressable>
      </View>

      {/* Tribe */}
      <Text style={styles.sectionTitle}>FOOTBALL TRIBE</Text>
      <View style={styles.tribeWrap}>
        <Pressable
          onPress={() => router.push("/tribes")}
          style={[styles.tribeCard, tribe && { borderColor: tribe.primary + "AA", backgroundColor: tribe.primary + "14" }]}
        >
          <View style={[styles.tribeBadge, { backgroundColor: tribe?.primary ?? theme.surface }]}>
            <Text style={{ fontSize: 16 }}>{tribe?.emoji ?? "⚽"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.tribeName}>{tribe ? tribe.name : "Pick your tribe"}</Text>
            <Text style={styles.tribeArea}>{tribe ? tribe.area : "Compete in the weekly derby"}</Text>
          </View>
          <ChevronRight size={16} color={theme.textMuted} />
        </Pressable>
        {!tribe ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingTop: 8 }}>
            {TRIBES.slice(0, 7).map((t) => (
              <Pressable key={t.id} onPress={() => pickTribe(t.id)} style={[styles.tribeChip, { borderColor: t.primary + "AA" }]}>
                <Text style={{ fontSize: 12 }}>{t.emoji}</Text>
                <Text style={styles.tribeChipText}>{t.short}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
      </View>

      {/* City waitlist */}
      <Text style={styles.sectionTitle}>YOUR CITY</Text>
      <Pressable onPress={() => router.push("/cities")} style={styles.cityCard}>
        <Text style={{ fontSize: 30 }}>{homeCity ? flagEmoji(homeCity.countryCode) : "\uD83C\uDF0E"}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.cityCardName}>{homeCity ? homeCity.name : "Pick your city"}</Text>
          <Text style={styles.cityCardSub}>
            {homeCity
              ? homeCity.id === LIVE_CITY_ID
                ? "Live now \u00b7 hunt 1,100 vaults"
                : `Rank #${homeCityRank} on the waitlist \u00b7 vote with steps + shares`
              : "Vote your city to open next \u2014 walk, share, win"}
          </Text>
        </View>
        <ChevronRight size={16} color={theme.textMuted} />
      </Pressable>

      {/* Prediction history quick view */}
      {predictionHistory.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>PREDICTION HISTORY</Text>
          <Pressable onPress={() => router.push("/predict")} style={styles.predictRow}>
            <Target size={16} color={theme.sapphire} />
            <View style={{ flex: 1 }}>
              <Text style={styles.predictTitle}>
                {predictionHistory.filter((h) => h.result === "won").length} win{predictionHistory.filter((h) => h.result === "won").length === 1 ? "" : "s"} · {predictionHistory.length} pick{predictionHistory.length === 1 ? "" : "s"}
              </Text>
              <Text style={styles.predictSub}>Tap to view + place this week's pick</Text>
            </View>
            <ChevronRight size={16} color={theme.textMuted} />
          </Pressable>
        </>
      ) : null}

      <Text style={styles.sectionTitle}>DAILY QUEST</Text>
      <View style={styles.questCard}>
        <Sparkles size={18} color={theme.emeraldBright} />
        <View style={{ flex: 1 }}>
          <Text style={styles.questTitle}>Claim 2 vaults today</Text>
          <Text style={styles.questSub}>Earn +50 bonus coins · Resets at midnight</Text>
          <View style={styles.questBar}>
            <View
              style={[
                styles.questFill,
                { width: `${Math.min(100, (player.claimed.length / 2) * 100)}%` },
              ]}
            />
          </View>
        </View>
        <Text style={styles.questCount}>{Math.min(2, player.claimed.length)}/2</Text>
      </View>

      <Text style={styles.sectionTitle}>SETTINGS</Text>
      <View style={styles.menu}>
        <MenuItem
          icon={
            player.notificationsEnabled ? (
              <Bell size={16} color={theme.emeraldBright} />
            ) : (
              <BellOff size={16} color={theme.textMuted} />
            )
          }
          label="Daily reminders"
          hint={player.notificationsEnabled ? "On · 9:00 AM" : "Off"}
          onPress={onToggleNotifications}
        />
        <MenuItem
          icon={<Share2 size={16} color={theme.goldBright} />}
          label="Invite friends"
          hint={`+50 / share · +500 each signup`}
          onPress={onShare}
        />
        <MenuItem icon={<Settings size={16} color={theme.textMuted} />} label="Preferences" hint="London · EN" />
        <MenuItem
          icon={<RotateCcw size={16} color={theme.ruby} />}
          label="Reset progress"
          hint="Erase all data"
          danger
          onPress={onReset}
        />
      </View>

      <ShareSheet visible={shareOpen} onClose={() => setShareOpen(false)} />
    </ScrollView>
  );
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <View style={styles.statCard}>
      {icon}
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  hint,
  danger,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  danger?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: theme.surface }]}
    >
      {icon}
      <Text style={[styles.menuLabel, danger && { color: theme.ruby }]}>{label}</Text>
      {hint ? <Text style={styles.menuHint}>{hint}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  plusCard: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.gold + "99",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    overflow: "hidden",
  },
  plusCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  plusCardLabel: { color: theme.goldBright, fontSize: 10, fontWeight: "900" as const, letterSpacing: 1.6 },
  plusCardTitle: { color: theme.text, fontSize: 13, fontWeight: "800" as const, marginTop: 2 },
  avatarPlusBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.goldBright,
    borderWidth: 2,
    borderColor: theme.bgElev,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCard: {
    margin: 16,
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.bgElev,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    overflow: "hidden",
  },
  avatarBig: {
    width: 78,
    height: 78,
    borderRadius: 39,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  avatarBigLetter: { color: "#1A1300", fontSize: 32, fontWeight: "900" as const },
  username: { color: theme.text, fontSize: 20, fontWeight: "900" as const },
  handle: { color: theme.textDim, fontSize: 11, fontWeight: "700" as const, letterSpacing: 1.4, marginTop: 2 },
  tagline: { color: theme.textMuted, fontSize: 12, fontWeight: "600" as const, marginBottom: 16, textAlign: "center" as const },
  xpWrap: { width: "100%", gap: 6 },
  xpHeader: { flexDirection: "row", justifyContent: "space-between" },
  xpLabel: { color: theme.textMuted, fontSize: 10, fontWeight: "800" as const, letterSpacing: 1.4 },
  xpValue: { color: theme.text, fontSize: 11, fontWeight: "700" as const },
  xpBar: { height: 8, backgroundColor: theme.surface, borderRadius: 4, overflow: "hidden" },
  xpFill: { height: "100%", borderRadius: 4 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    gap: 8,
  },
  statCard: {
    flexBasis: "47%",
    flexGrow: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.borderSoft,
    gap: 4,
  },
  statValue: { color: theme.text, fontSize: 22, fontWeight: "900" as const },
  statLabel: { color: theme.textDim, fontSize: 9, fontWeight: "800" as const, letterSpacing: 1.4 },
  sectionTitle: {
    color: theme.text,
    fontSize: 13,
    fontWeight: "900" as const,
    letterSpacing: 2,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 10,
  },
  questCard: {
    marginHorizontal: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.emerald + "55",
  },
  questTitle: { color: theme.text, fontSize: 14, fontWeight: "800" as const },
  questSub: { color: theme.textMuted, fontSize: 11, marginTop: 2 },
  questBar: { marginTop: 8, height: 4, backgroundColor: theme.surface, borderRadius: 2, overflow: "hidden" },
  questFill: { height: "100%", backgroundColor: theme.emeraldBright, borderRadius: 2 },
  questCount: { color: theme.emeraldBright, fontSize: 14, fontWeight: "900" as const },
  statusCard: {
    marginHorizontal: 16,
    padding: 16,
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.borderSoft,
    gap: 12,
  },
  statusHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  statusTitle: { color: theme.text, fontSize: 16, fontWeight: "900" as const },
  statusSub: { color: theme.textMuted, fontSize: 11, marginTop: 2 },
  nextChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  nextChipText: { fontSize: 9, fontWeight: "900" as const, letterSpacing: 1 },
  statusBar: { height: 6, backgroundColor: theme.surface, borderRadius: 3, overflow: "hidden" },
  statusFill: { height: "100%", borderRadius: 3 },
  ladder: { gap: 6, marginTop: 4 },
  ladderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "transparent",
  },
  ladderDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  ladderLabel: { color: theme.text, fontSize: 13, fontWeight: "800" as const },
  ladderDrop: { color: theme.textDim, fontSize: 10, fontWeight: "600" as const, marginTop: 1 },
  ladderReq: { fontSize: 11, fontWeight: "900" as const, letterSpacing: 0.5 },
  menu: { marginHorizontal: 16, backgroundColor: theme.bgCard, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.borderSoft, overflow: "hidden" },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderSoft,
  },
  menuLabel: { flex: 1, color: theme.text, fontSize: 14, fontWeight: "700" as const },
  menuHint: { color: theme.textDim, fontSize: 12 },
  streakCard: {
    marginHorizontal: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.borderSoft,
    overflow: "hidden",
  },
  flameBubble: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  streakTitle: { color: theme.text, fontSize: 15, fontWeight: "900" as const },
  streakSub: { color: theme.textMuted, fontSize: 11, marginTop: 2 },
  freezeRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 },
  freezeText: { color: theme.textDim, fontSize: 10, fontWeight: "700" as const },
  freezeBuy: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, backgroundColor: theme.goldBright },
  freezeBuyText: { color: "#0A0500", fontSize: 11, fontWeight: "900" as const, letterSpacing: 0.6 },
  tribeWrap: { paddingHorizontal: 16, gap: 4 },
  tribeCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.borderSoft, backgroundColor: theme.bgCard },
  cityCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.borderSoft, backgroundColor: theme.bgCard, marginHorizontal: 16 },
  cityCardName: { color: theme.text, fontSize: 14, fontWeight: "800" as const },
  cityCardSub: { color: theme.textMuted, fontSize: 11, fontWeight: "600" as const, marginTop: 2 },
  tribeBadge: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  tribeName: { color: theme.text, fontSize: 14, fontWeight: "900" as const },
  tribeArea: { color: theme.textMuted, fontSize: 11, marginTop: 2 },
  tribeChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, borderWidth: 1.5, backgroundColor: theme.bgCard },
  tribeChipText: { color: theme.text, fontSize: 11, fontWeight: "900" as const },
  predictRow: { marginHorizontal: 16, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: theme.bgCard, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.borderSoft },
  predictTitle: { color: theme.text, fontSize: 13, fontWeight: "800" as const },
  predictSub: { color: theme.textMuted, fontSize: 11, marginTop: 2 },
  inboxCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.gold + "55",
  },
  inboxIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(244,208,63,0.12)",
    borderWidth: 1,
    borderColor: theme.gold + "55",
    alignItems: "center",
    justifyContent: "center",
  },
  inboxBadgeDot: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: theme.goldBright,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: theme.bgCard,
  },
  inboxBadgeText: { color: "#1A0A00", fontSize: 9, fontWeight: "900" as const },
  inboxTitle: { color: theme.goldBright, fontSize: 11, fontWeight: "900" as const, letterSpacing: 1.4 },
  inboxSub: { color: theme.textMuted, fontSize: 11, marginTop: 2 },
});
