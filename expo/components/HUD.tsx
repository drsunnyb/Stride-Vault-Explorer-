import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Coins, Crown, Flame, Footprints } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { StrideStatusBadge } from "@/components/StrideStatusBadge";
import { getStrideStatus } from "@/constants/status";
import { theme } from "@/constants/theme";

interface Props {
  level: number;
  xp: number;
  xpNeeded: number;
  xpProgress: number;
  coins: number;
  streakDays: number;
  steps: number;
  stepsToday: number;
  dailyStepGoal: number;
  vaultsClaimed: number;
  claimsToday: number;
  dailyClaimHardCap: number;
  plusActive: boolean;
}

export function HUD({
  level,
  xp,
  xpNeeded,
  xpProgress,
  coins,
  streakDays,
  steps,
  stepsToday,
  dailyStepGoal,
  vaultsClaimed,
  claimsToday,
  dailyClaimHardCap,
  plusActive,
}: Props) {
  const { current: status } = getStrideStatus(vaultsClaimed);
  const stepPct = Math.min(1, stepsToday / dailyStepGoal);
  const goalHit = stepsToday >= dailyStepGoal;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.levelChip}>
          <LinearGradient
            colors={[theme.gold, theme.goldBright]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.levelGrad}
          >
            <Text style={styles.levelText}>{level}</Text>
          </LinearGradient>
        </View>

        <View style={styles.xpCol}>
          <View style={styles.xpHeader}>
            <View style={styles.xpLabelRow}>
              <Text style={styles.xpLabel}>LEVEL {level}</Text>
              {plusActive ? (
                <View style={styles.plusBadge}>
                  <Crown size={9} color="#1A0A00" />
                  <Text style={styles.plusBadgeText}>PLUS</Text>
                </View>
              ) : (
                <Pressable
                  hitSlop={6}
                  onPress={() => router.push("/plus")}
                  style={styles.plusCta}
                >
                  <Crown size={9} color={theme.goldBright} />
                  <Text style={styles.plusCtaText}>UPGRADE</Text>
                </Pressable>
              )}
            </View>
            <StrideStatusBadge status={status} size="sm" />
          </View>
          <View style={styles.xpHeader}>
            <Text style={styles.xpValue}>{xp} / {xpNeeded} XP</Text>
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

      {/* Daily step progress — visible the moment you open the app */}
      <View style={styles.stepCard}>
        <View style={styles.stepHead}>
          <View style={styles.stepHeadLeft}>
            <Footprints size={14} color={goalHit ? theme.goldBright : theme.emeraldBright} />
            <Text style={styles.stepHeadLabel}>
              DAILY STEPS {goalHit ? "· BONUS LOCKED IN" : ""}
            </Text>
          </View>
          <Text style={[styles.stepHeadVal, goalHit && { color: theme.goldBright }]}>
            {stepsToday.toLocaleString()}<Text style={styles.stepGoal}> / {dailyStepGoal.toLocaleString()}</Text>
          </Text>
        </View>
        <View style={styles.stepBar}>
          <LinearGradient
            colors={goalHit ? [theme.gold, theme.goldBright] : [theme.emerald, theme.emeraldBright]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.stepFill, { width: `${Math.max(3, stepPct * 100)}%` }]}
          />
        </View>
      </View>

      {/* Daily claim ladder — shows diminishing-returns progress */}
      <ClaimLadder claimsToday={claimsToday} hardCap={dailyClaimHardCap} />

      <View style={styles.statsRow}>
        <Stat icon={<Coins size={14} color={theme.gold} />} value={coins.toLocaleString()} label="COINS" />
        <View style={styles.statDivider} />
        <Stat icon={<Flame size={14} color={theme.ruby} />} value={`${streakDays}d`} label="STREAK" />
        <View style={styles.statDivider} />
        <Stat icon={<Footprints size={14} color={theme.emeraldBright} />} value={steps.toLocaleString()} label="LIFETIME" />
      </View>
    </View>
  );
}

function ClaimLadder({ claimsToday, hardCap }: { claimsToday: number; hardCap: number }) {
  // Three bands: 1–3 (100%), 4–6 (70%), 7–10 (40%).
  const bands = [
    { label: "100%", upTo: 3, color: theme.emeraldBright },
    { label: "70%", upTo: 6, color: theme.gold },
    { label: "40%", upTo: hardCap, color: theme.ruby },
  ];
  const tierForNext =
    claimsToday < 3 ? 0 : claimsToday < 6 ? 1 : claimsToday < hardCap ? 2 : 3;
  const capped = claimsToday >= hardCap;
  return (
    <View style={styles.ladderCard}>
      <View style={styles.ladderHead}>
        <Text style={styles.ladderLabel}>DAILY CLAIM LADDER</Text>
        <Text style={[styles.ladderVal, capped && { color: theme.ruby }]}>
          {Math.min(claimsToday, hardCap)} / {hardCap}{capped ? " · CAP" : ""}
        </Text>
      </View>
      <View style={styles.ladderBands}>
        {bands.map((b, i) => {
          const segStart = i === 0 ? 0 : bands[i - 1].upTo;
          const segLen = b.upTo - segStart;
          const filledInSeg = Math.max(0, Math.min(segLen, claimsToday - segStart));
          const pct = (filledInSeg / segLen) * 100;
          const active = tierForNext === i && !capped;
          return (
            <View key={b.label} style={styles.ladderSegWrap}>
              <View style={styles.ladderSeg}>
                <View
                  style={[
                    styles.ladderFill,
                    { width: `${pct}%`, backgroundColor: b.color },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.ladderSegLabel,
                  active && { color: b.color },
                ]}
              >
                {b.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <View style={styles.stat}>
      {icon}
      <View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "rgba(12, 15, 26, 0.78)",
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    padding: 14,
    gap: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  levelChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
  },
  levelGrad: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  levelText: {
    color: "#1A1300",
    fontWeight: "900" as const,
    fontSize: 18,
  },
  xpCol: { flex: 1, gap: 6 },
  xpHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  xpLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  xpLabel: { color: theme.textMuted, fontSize: 10, fontWeight: "700" as const, letterSpacing: 1.4 },
  plusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: theme.goldBright,
    borderRadius: 4,
  },
  plusBadgeText: { color: "#1A0A00", fontSize: 8, fontWeight: "900" as const, letterSpacing: 1.2 },
  plusCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.gold + "99",
    backgroundColor: theme.gold + "1F",
  },
  plusCtaText: { color: theme.goldBright, fontSize: 8, fontWeight: "900" as const, letterSpacing: 1.2 },
  xpValue: { color: theme.text, fontSize: 11, fontWeight: "600" as const },
  xpBar: {
    height: 6,
    backgroundColor: theme.surface,
    borderRadius: 3,
    overflow: "hidden",
  },
  xpFill: { height: "100%", borderRadius: 3 },
  stepCard: {
    paddingTop: 4,
    gap: 6,
  },
  stepHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stepHeadLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  stepHeadLabel: { color: theme.textMuted, fontSize: 10, fontWeight: "800" as const, letterSpacing: 1.2 },
  stepHeadVal: { color: theme.text, fontSize: 12, fontWeight: "900" as const },
  stepGoal: { color: theme.textDim, fontWeight: "700" as const },
  stepBar: { height: 5, borderRadius: 3, backgroundColor: theme.surface, overflow: "hidden" },
  stepFill: { height: "100%", borderRadius: 3 },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stat: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statValue: { color: theme.text, fontSize: 13, fontWeight: "800" as const },
  statLabel: { color: theme.textDim, fontSize: 9, fontWeight: "700" as const, letterSpacing: 1 },
  statDivider: { width: 1, height: 24, backgroundColor: theme.border },
  ladderCard: { gap: 6, paddingTop: 2 },
  ladderHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  ladderLabel: { color: theme.textMuted, fontSize: 10, fontWeight: "800" as const, letterSpacing: 1.2 },
  ladderVal: { color: theme.text, fontSize: 11, fontWeight: "900" as const, letterSpacing: 0.4 },
  ladderBands: { flexDirection: "row", gap: 6 },
  ladderSegWrap: { flex: 1, gap: 3 },
  ladderSeg: { height: 5, borderRadius: 3, backgroundColor: theme.surface, overflow: "hidden" },
  ladderFill: { height: "100%", borderRadius: 3 },
  ladderSegLabel: {
    color: theme.textDim,
    fontSize: 8,
    fontWeight: "800" as const,
    letterSpacing: 0.8,
    textAlign: "center",
  },
});
