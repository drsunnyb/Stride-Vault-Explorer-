import { LinearGradient } from "expo-linear-gradient";
import { Lock, Trophy } from "lucide-react-native";
import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { theme, tierColor, tierGlow, tierLabel, type Tier } from "@/constants/theme";
import { VAULTS } from "@/constants/vaults";
import { useGame } from "@/providers/GameProvider";

const TIERS: Tier[] = ["bronze", "silver", "gold", "platinum"];

export default function InventoryScreen() {
  const { player } = useGame();
  const claimedSet = useMemo(() => new Set(player.claimed.map((c) => c.id)), [player.claimed]);

  const tierStats = TIERS.map((t) => {
    const total = VAULTS.filter((v) => v.tier === t).length;
    const owned = VAULTS.filter((v) => v.tier === t && claimedSet.has(v.id)).length;
    return { tier: t, owned, total };
  });

  const totalCoins = player.claimed.reduce((s, c) => s + c.coins, 0);
  const totalXp = player.claimed.reduce((s, c) => s + c.xp, 0);

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={styles.heroCard}>
        <LinearGradient
          colors={["rgba(212,175,55,0.18)", "rgba(16,185,129,0.10)", "rgba(6,7,13,0)"]}
          style={StyleSheet.absoluteFill}
        />
        <Trophy size={22} color={theme.goldBright} />
        <Text style={styles.heroTitle}>{player.claimed.length} / {VAULTS.length}</Text>
        <Text style={styles.heroLabel}>VAULTS CLAIMED</Text>
        <View style={styles.heroStats}>
          <View>
            <Text style={styles.heroStatValue}>{totalCoins.toLocaleString()}</Text>
            <Text style={styles.heroStatLabel}>COINS EARNED</Text>
          </View>
          <View style={styles.heroDivider} />
          <View>
            <Text style={[styles.heroStatValue, { color: theme.emeraldBright }]}>{totalXp.toLocaleString()}</Text>
            <Text style={styles.heroStatLabel}>XP GAINED</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>TIER PROGRESS</Text>
      <View style={styles.tierRow}>
        {tierStats.map((t) => {
          const color = tierColor(t.tier);
          const glow = tierGlow(t.tier);
          const pct = t.total > 0 ? t.owned / t.total : 0;
          return (
            <View key={t.tier} style={[styles.tierCard, { borderColor: color + "55" }]}>
              <View style={[styles.tierBadge, { backgroundColor: color + "22", borderColor: color }]}>
                <Text style={[styles.tierBadgeText, { color: glow }]}>{t.owned}</Text>
              </View>
              <Text style={[styles.tierName, { color: glow }]}>{tierLabel(t.tier).toUpperCase()}</Text>
              <View style={styles.tierBar}>
                <View style={[styles.tierBarFill, { backgroundColor: color, width: `${pct * 100}%` }]} />
              </View>
              <Text style={styles.tierCount}>{t.owned} of {t.total}</Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>COLLECTION</Text>
      <View style={styles.grid}>
        {VAULTS.map((v) => {
          const claimed = claimedSet.has(v.id);
          const color = tierColor(v.tier);
          const glow = tierGlow(v.tier);
          return (
            <View
              key={v.id}
              style={[
                styles.gridCard,
                { borderColor: claimed ? color + "55" : theme.borderSoft, opacity: claimed ? 1 : 0.55 },
              ]}
            >
              {claimed ? (
                <LinearGradient
                  colors={[color + "33", "transparent"]}
                  style={StyleSheet.absoluteFill}
                />
              ) : null}
              <View style={[styles.gridIcon, { borderColor: claimed ? color : theme.border }]}>
                {claimed ? (
                  <Text style={[styles.gridIconLetter, { color: glow }]}>{v.name.charAt(0)}</Text>
                ) : (
                  <Lock size={14} color={theme.textDim} />
                )}
              </View>
              <Text style={styles.gridName} numberOfLines={1}>
                {v.name}
              </Text>
              <Text style={[styles.gridTier, { color: glow }]}>{tierLabel(v.tier).toUpperCase()}</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  heroCard: {
    margin: 16,
    padding: 22,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.bgElev,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    overflow: "hidden",
    gap: 4,
  },
  heroTitle: { color: theme.goldBright, fontSize: 36, fontWeight: "900" as const, marginTop: 6 },
  heroLabel: { color: theme.textMuted, fontSize: 11, fontWeight: "800" as const, letterSpacing: 1.6, marginBottom: 14 },
  heroStats: { flexDirection: "row", alignItems: "center", gap: 22 },
  heroStatValue: { color: theme.gold, fontSize: 20, fontWeight: "900" as const, textAlign: "center" },
  heroStatLabel: { color: theme.textDim, fontSize: 9, fontWeight: "800" as const, letterSpacing: 1.2, textAlign: "center", marginTop: 2 },
  heroDivider: { width: 1, height: 32, backgroundColor: theme.border },
  sectionTitle: {
    color: theme.text,
    fontSize: 13,
    fontWeight: "900" as const,
    letterSpacing: 2,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
  },
  tierRow: { flexDirection: "row", paddingHorizontal: 16, gap: 8 },
  tierCard: {
    flex: 1,
    padding: 10,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.bgCard,
    borderWidth: 1,
    alignItems: "center",
    gap: 6,
  },
  tierBadge: { width: 34, height: 34, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  tierBadgeText: { fontSize: 15, fontWeight: "900" as const },
  tierName: { fontSize: 9, fontWeight: "900" as const, letterSpacing: 1 },
  tierBar: { width: "100%", height: 3, backgroundColor: theme.surface, borderRadius: 2, overflow: "hidden" },
  tierBarFill: { height: "100%", borderRadius: 2 },
  tierCount: { color: theme.textDim, fontSize: 10, fontWeight: "700" as const },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  gridCard: {
    width: "33.33%",
    padding: 4,
  },
  gridIcon: {
    aspectRatio: 1,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.bgCard,
    marginBottom: 6,
  },
  gridIconLetter: { fontSize: 22, fontWeight: "900" as const },
  gridName: { color: theme.text, fontSize: 11, fontWeight: "700" as const, textAlign: "center" },
  gridTier: { fontSize: 8, fontWeight: "900" as const, letterSpacing: 1, textAlign: "center", marginTop: 2 },
});
