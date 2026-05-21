import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Flame, Heart, Sparkles, Timer, Trophy, Zap } from "lucide-react-native";
import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { findTribe, streakTier, nextStreakTier } from "@/constants/retention";
import { theme } from "@/constants/theme";
import { VAULTS } from "@/constants/vaults";
import { useGame } from "@/providers/GameProvider";

function fmtRemaining(ms: number): string {
  const m = Math.max(0, Math.floor(ms / 60_000));
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
  return `${m}m`;
}

/**
 * Surfaces every live retention event in one horizontal strip:
 * Power Hour · Final Hour · Hot Vaults · Streak · Tribe Derby · Comeback · Predict.
 * Cards self-hide when not relevant so the strip stays dense and useful.
 */
export function LiveEventsStrip() {
  const {
    powerHour,
    nextPowerHour,
    hotVaultIds,
    todayHotLockedId,
    finalHourWeek,
    streakDays,
    streakMult,
    streakFreezes,
    comebackActive,
    comebackClaimsRemaining,
    tribe,
    tribeBoard,
    derbyTribes,
    predictions,
    tribeLossRedemptionActive,
    tribeWinActive,
    weekEnd,
    now,
    periodEnd,
  } = useGame();

  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  // Resolve hot vaults to full vault objects for the strip.
  const hotVaults = useMemo(
    () => VAULTS.filter((v) => hotVaultIds.has(v.id)).slice(0, 5),
    [hotVaultIds]
  );

  const tStreakNext = nextStreakTier(streakDays);
  const sTier = streakTier(streakDays);

  const myTribeRow = tribeBoard.find((t) => t.tribe.id === tribe?.id);
  const myTribeRank = myTribeRow ? tribeBoard.indexOf(myTribeRow) + 1 : 0;

  const isDerbyWeek =
    !!derbyTribes && !!tribe && (derbyTribes[0] === tribe.id || derbyTribes[1] === tribe.id);

  const activePrediction = predictions[0];

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Sparkles size={12} color={theme.goldBright} />
        <Text style={styles.headerText}>LIVE EVENTS</Text>
        <View style={styles.liveDotWrap}>
          <Animated.View
            style={[
              styles.liveDot,
              { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
            ]}
          />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
      >
        {/* Power Hour */}
        {powerHour ? (
          <Card
            tint={["#FFB200", "#FF7A45"]}
            icon={<Zap size={14} color="#1A0A00" />}
            label={`POWER HOUR · ${powerHour.multiplier}×`}
            title={`${fmtRemaining(powerHour.endsAt - now)} left`}
            sub="Every vault pays double. Walk now."
            onPress={() => router.push("/")}
            pulse={pulse}
          />
        ) : nextPowerHour ? (
          <Card
            tint={["rgba(255,200,0,0.16)", "rgba(255,122,69,0.06)"]}
            icon={<Zap size={14} color={theme.goldBright} />}
            label="NEXT POWER HOUR"
            title={`in ${fmtRemaining(nextPowerHour.startsAt - now)}`}
            sub={`+${nextPowerHour.multiplier}× coins for 60 min`}
            outline
          />
        ) : null}

        {/* Final Hour */}
        {finalHourWeek ? (
          <Card
            tint={["#EF4444", "#7A1F1F"]}
            icon={<Timer size={14} color="#FFE9B0" />}
            label="FINAL HOUR · WEEKLY LADDER"
            title={`${fmtRemaining(periodEnd("week") - now)} left`}
            sub="Every coin counts 2× toward your rank."
            onPress={() => router.push("/leaderboard")}
            pulse={pulse}
            light
          />
        ) : null}

        {/* Hot Vaults */}
        {hotVaults.length > 0 ? (
          <Pressable onPress={() => router.push("/")} style={[styles.card, { backgroundColor: "rgba(239,68,68,0.10)", borderColor: theme.ruby + "AA" }]}>
            <View style={styles.cardHead}>
              <View style={[styles.iconBubble, { backgroundColor: theme.ruby }]}>
                <Flame size={14} color="#FFFFFF" />
              </View>
              <Text style={[styles.cardLabel, { color: theme.ruby }]}>HOT VAULTS · 5×</Text>
            </View>
            <Text style={styles.cardTitle}>
              {todayHotLockedId
                ? `Locked: ${VAULTS.find((v) => v.id === todayHotLockedId)?.name ?? "your pick"}`
                : `${hotVaults.length} live now`}
            </Text>
            <View style={styles.hotRow}>
              {hotVaults.slice(0, 3).map((v) => (
                <Text key={v.id} numberOfLines={1} style={styles.hotPill}>
                  {v.area}
                </Text>
              ))}
            </View>
          </Pressable>
        ) : null}

        {/* Streak */}
        <Pressable
          onPress={() => router.push("/profile")}
          style={[styles.card, { backgroundColor: streakDays >= 3 ? "rgba(239,68,68,0.10)" : theme.bgCard, borderColor: streakDays >= 3 ? theme.ruby + "66" : theme.borderSoft }]}
        >
          <View style={styles.cardHead}>
            <View style={[styles.iconBubble, { backgroundColor: streakDays >= 3 ? theme.ruby : theme.surface }]}>
              <Flame size={14} color={streakDays >= 3 ? "#FFFFFF" : theme.textMuted} />
            </View>
            <Text style={[styles.cardLabel, { color: streakDays >= 3 ? theme.ruby : theme.textMuted }]}>STREAK · {streakMult.toFixed(2)}×</Text>
          </View>
          <Text style={styles.cardTitle}>{streakDays} day{streakDays === 1 ? "" : "s"}</Text>
          <Text style={styles.cardSub}>
            {tStreakNext
              ? `${tStreakNext.days - streakDays} to ${tStreakNext.label} · ${tStreakNext.multiplier}×`
              : `${sTier.label} · max tier`}
            {streakFreezes > 0 ? ` · ${streakFreezes}❄ freeze${streakFreezes === 1 ? "" : "s"}` : ""}
          </Text>
        </Pressable>

        {/* Redemption (soft tribe-loss consequence) — losers get +10% all week */}
        {tribeLossRedemptionActive ? (
          <Card
            tint={["rgba(16,185,129,0.18)", "rgba(16,185,129,0.06)"]}
            icon={<Heart size={14} color={theme.emeraldBright} />}
            label="REDEMPTION · 1.10×"
            title={`${fmtRemaining((weekEnd ?? periodEnd("week")) - now)} left`}
            sub="Bounce back from last week's derby. Every claim +10%."
            outline
            borderColor={theme.emerald + "AA"}
            onPress={() => router.push("/tribes")}
          />
        ) : null}

        {/* Tribe-win victory lap */}
        {tribeWinActive ? (
          <Card
            tint={["rgba(244,208,63,0.20)", "rgba(244,208,63,0.06)"]}
            icon={<Trophy size={14} color={theme.goldBright} />}
            label="VICTORY LAP · 1.10×"
            title={`${fmtRemaining((weekEnd ?? periodEnd("week")) - now)} left`}
            sub="Tribe took last week's derby. Carry it forward."
            outline
            borderColor={theme.goldBright + "AA"}
            onPress={() => router.push("/tribes")}
          />
        ) : null}

        {/* Comeback */}
        {comebackActive ? (
          <Card
            tint={["rgba(16,185,129,0.18)", "rgba(16,185,129,0.06)"]}
            icon={<Sparkles size={14} color={theme.emeraldBright} />}
            label="COMEBACK BOOST"
            title={`${comebackClaimsRemaining} claim${comebackClaimsRemaining === 1 ? "" : "s"} @ 1.5×`}
            sub="We've got your back. Climb back up."
            outline
            borderColor={theme.emerald + "AA"}
          />
        ) : null}

        {/* Tribe */}
        {tribe ? (
          <Pressable onPress={() => router.push("/tribes")} style={[styles.card, { backgroundColor: tribe.primary + "22", borderColor: tribe.primary + "AA" }]}>
            <View style={styles.cardHead}>
              <View style={[styles.iconBubble, { backgroundColor: tribe.primary }]}>
                <Text style={{ fontSize: 12 }}>{tribe.emoji}</Text>
              </View>
              <Text style={[styles.cardLabel, { color: tribe.accent === "#FFFFFF" ? "#FFFFFF" : tribe.accent }]}>
                {isDerbyWeek ? "DERBY WEEK · 2×" : "TRIBE DERBY"}
              </Text>
            </View>
            <Text style={styles.cardTitle}>{tribe.short} · Rank #{myTribeRank}</Text>
            <Text style={styles.cardSub}>{myTribeRow ? `${myTribeRow.coins.toLocaleString()} coins · tap to see board` : "Tap to enter"}</Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => router.push("/tribes")} style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderSoft, borderStyle: "dashed" }]}>
            <View style={styles.cardHead}>
              <View style={[styles.iconBubble, { backgroundColor: theme.surface }]}>
                <Trophy size={14} color={theme.textMuted} />
              </View>
              <Text style={[styles.cardLabel, { color: theme.textMuted }]}>FOOTBALL TRIBES</Text>
            </View>
            <Text style={styles.cardTitle}>Pick your club</Text>
            <Text style={styles.cardSub}>Compete with fans for weekly bonuses.</Text>
          </Pressable>
        )}

        {/* Predict */}
        <Pressable onPress={() => router.push("/predict")} style={[styles.card, { backgroundColor: "rgba(59,130,246,0.10)", borderColor: theme.sapphire + "AA" }]}>
          <View style={styles.cardHead}>
            <View style={[styles.iconBubble, { backgroundColor: theme.sapphire }]}>
              <Trophy size={14} color="#FFFFFF" />
            </View>
            <Text style={[styles.cardLabel, { color: theme.sapphire }]}>STRIDE PREDICT</Text>
          </View>
          <Text style={styles.cardTitle}>
            {activePrediction ? `Backed ${activePrediction.pickName.split(" ")[0]} · ${activePrediction.stake}c` : "Open market"}
          </Text>
          <Text style={styles.cardSub}>{activePrediction ? "Settles Sun midnight" : "Stake on this week's winner"}</Text>
        </Pressable>

        <View style={{ width: 4 }} />
      </ScrollView>
    </View>
  );
}

function Card({
  tint,
  icon,
  label,
  title,
  sub,
  onPress,
  pulse,
  outline,
  light,
  borderColor,
}: {
  tint: [string, string];
  icon: React.ReactNode;
  label: string;
  title: string;
  sub: string;
  onPress?: () => void;
  pulse?: Animated.Value;
  outline?: boolean;
  light?: boolean;
  borderColor?: string;
}) {
  const C: any = onPress ? Pressable : View;
  return (
    <C onPress={onPress} style={[styles.card, outline && { borderColor: borderColor ?? theme.gold + "AA" }]}>
      <LinearGradient
        colors={tint}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {pulse ? (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: "#FFFFFF",
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.08] }),
            },
          ]}
        />
      ) : null}
      <View style={styles.cardHead}>
        <View style={[styles.iconBubble, { backgroundColor: outline ? theme.surface : "rgba(255,255,255,0.85)" }]}>
          {icon}
        </View>
        <Text style={[styles.cardLabel, outline ? { color: theme.goldBright } : { color: light ? "#FFE9B0" : "#1A0A00" }]}>
          {label}
        </Text>
      </View>
      <Text style={[styles.cardTitle, !outline && { color: light ? "#FFE9B0" : "#0A0500" }]}>{title}</Text>
      <Text style={[styles.cardSub, !outline && { color: light ? "rgba(255,233,176,0.85)" : "rgba(10,5,0,0.75)" }]}>
        {sub}
      </Text>
    </C>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 8 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerText: {
    color: theme.text,
    fontSize: 11,
    fontWeight: "900" as const,
    letterSpacing: 1.8,
    flex: 1,
  },
  liveDotWrap: { flexDirection: "row", alignItems: "center", gap: 5 },
  liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: theme.ruby },
  liveText: { color: theme.ruby, fontSize: 9, fontWeight: "900" as const, letterSpacing: 1.4 },
  card: {
    width: 200,
    padding: 12,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.borderSoft,
    overflow: "hidden",
    backgroundColor: theme.bgCard,
    gap: 6,
  },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBubble: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardLabel: { fontSize: 9, fontWeight: "900" as const, letterSpacing: 1.4 },
  cardTitle: { color: theme.text, fontSize: 14, fontWeight: "900" as const },
  cardSub: { color: theme.textMuted, fontSize: 11, fontWeight: "600" as const, lineHeight: 14 },
  hotRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 2 },
  hotPill: {
    color: theme.ruby,
    fontSize: 9,
    fontWeight: "900" as const,
    letterSpacing: 0.6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "rgba(239,68,68,0.18)",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.ruby + "55",
    maxWidth: 90,
  },
});
