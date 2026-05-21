import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Check, Gift, Sparkles, Trophy, X } from "lucide-react-native";
import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TRIBE_CATEGORY_META, type TribeCategory, tribeWinReward, tribesForCity } from "@/constants/retention";
import { theme } from "@/constants/theme";
import { useGame } from "@/providers/GameProvider";

export default function TribesScreen() {
  const { tribe, pickTribe, tribeBoard, derbyTribes, claimTribeBonus, player, homeCity } = useGame();
  // Only show tribes scoped to the player's home city (+ shared global crews).
  // Avoids e.g. Manchester users seeing Arsenal/Chelsea.
  const visibleTribes = React.useMemo(() => tribesForCity(player.homeCityId), [player.homeCityId]);
  const visibleIds = React.useMemo(() => new Set(visibleTribes.map((t) => t.id)), [visibleTribes]);

  const onPick = async (id: string) => {
    await pickTribe(id);
  };

  const onClaim = async () => {
    const res = await claimTribeBonus();
    if (!res.ok) {
      Alert.alert(
        "No bonus yet",
        res.reason === "didnt-win"
          ? "Your tribe didn't top last week's derby. Walk harder next week."
          : res.reason === "already"
          ? "You already claimed this week's tribe bonus."
          : "Pick a tribe first."
      );
      return;
    }
    const r = res.reward;
    const parts = [`+${r.coins} coins`];
    if (r.brandId && r.brandCoins) parts.push(`+${r.brandCoins} ${r.brandId} coins`);
    if (r.perk) parts.push(r.perk.label);
    Alert.alert("Tribe bonus paid", parts.join(" · "));
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={["top"]} style={styles.header}>
        <View style={styles.headerRow}>
          <View style={[styles.iconBubble, { backgroundColor: theme.ruby }]}>
            <Trophy size={18} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>TRIBE DERBY</Text>
            <Text style={styles.sub}>
              Your coins count toward your club's weekly total. Winners share a bonus.
            </Text>
          </View>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.close}>
            <X size={20} color={theme.textMuted} />
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ paddingBottom: 64 }}>
        {derbyTribes ? (
          <View style={styles.derbyCard}>
            <LinearGradient
              colors={["rgba(239,68,68,0.18)", "rgba(239,68,68,0.04)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Sparkles size={14} color={theme.ruby} />
            <View style={{ flex: 1 }}>
              <Text style={styles.derbyTitle}>DERBY WEEK</Text>
              <Text style={styles.derbyBody}>
                {TRIBES.find((t) => t.id === derbyTribes[0])?.name} vs {TRIBES.find((t) => t.id === derbyTribes[1])?.name}
                {" "}— doubled stakes for both fanbases this week.
              </Text>
            </View>
          </View>
        ) : null}

        {tribe ? (
          <Pressable onPress={onClaim} style={styles.claimCard}>
            <LinearGradient
              colors={[tribe.primary + "CC", tribe.primary + "55"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Gift size={18} color="#FFFFFF" />
            <View style={{ flex: 1 }}>
              <Text style={styles.claimTitle}>CLAIM LAST WEEK'S TRIBE BONUS</Text>
              <Text style={styles.claimSub}>{tribeWinReward(tribe).headline}</Text>
            </View>
          </Pressable>
        ) : null}

        <Text style={styles.sectionTitle}>LIVE STANDINGS</Text>
        <View style={{ paddingHorizontal: 16, gap: 8 }}>
          {tribeBoard.filter((row) => visibleIds.has(row.tribe.id)).map((row, i) => {
            const isMine = row.tribe.id === tribe?.id;
            const inDerby = !!derbyTribes && (derbyTribes.includes(row.tribe.id));
            return (
              <Pressable
                key={row.tribe.id}
                onPress={() => onPick(row.tribe.id)}
                style={[
                  styles.tribeRow,
                  isMine && { borderColor: row.tribe.primary, backgroundColor: row.tribe.primary + "1A" },
                ]}
              >
                <Text style={[styles.tribeRank, i === 0 && { color: theme.goldBright }]}>
                  #{i + 1}
                </Text>
                <View style={[styles.tribeBadge, { backgroundColor: row.tribe.primary }]}>
                  <Text style={styles.tribeBadgeEmoji}>{row.tribe.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tribeName} numberOfLines={1}>
                    {row.tribe.name}
                    {inDerby ? <Text style={{ color: theme.ruby, fontWeight: "900" as const }}>  · DERBY</Text> : null}
                    {isMine ? <Text style={{ color: theme.emeraldBright, fontWeight: "900" as const }}>  · YOUR TRIBE</Text> : null}
                  </Text>
                  <Text style={styles.tribeArea} numberOfLines={1}>{row.tribe.area}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.tribeCoins}>{row.coins.toLocaleString()}</Text>
                  <Text style={styles.tribeCoinsLabel}>COINS · WK</Text>
                </View>
                {isMine ? (
                  <View style={styles.checkBubble}>
                    <Check size={11} color="#0E1117" />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>PICK YOUR TRIBE</Text>
        {(Object.keys(TRIBE_CATEGORY_META) as TribeCategory[]).map((cat) => {
          const list = visibleTribes.filter((t) => t.category === cat);
          if (list.length === 0) return null;
          const meta = TRIBE_CATEGORY_META[cat];
          return (
            <View key={cat} style={{ marginTop: 14 }}>
              <View style={styles.catHeader}>
                <Text style={styles.catTitle}>{meta.title}</Text>
                <Text style={styles.catCaption} numberOfLines={1}>{meta.caption}</Text>
              </View>
              <View style={styles.gridWrap}>
                {list.map((t) => {
                  const isMine = t.id === tribe?.id;
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => onPick(t.id)}
                      style={[
                        styles.tribeChip,
                        { borderColor: t.primary + "AA" },
                        isMine && { backgroundColor: t.primary, borderColor: t.primary },
                      ]}
                    >
                      <Text style={styles.tribeChipEmoji}>{t.emoji}</Text>
                      <Text style={[styles.tribeChipText, isMine && { color: "#FFFFFF" }]} numberOfLines={1}>
                        {t.short}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
        <Text style={styles.helpText}>
          You can change tribes once a week. Your past coins stay where they were earned.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.borderSoft },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 4 },
  iconBubble: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  title: { color: theme.text, fontSize: 16, fontWeight: "900" as const, letterSpacing: 1.6 },
  sub: { color: theme.textMuted, fontSize: 11, marginTop: 2 },
  close: { width: 34, height: 34, borderRadius: 17, backgroundColor: theme.bgCard, borderWidth: 1, borderColor: theme.border, alignItems: "center", justifyContent: "center" },
  derbyCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.ruby + "66",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    overflow: "hidden",
  },
  derbyTitle: { color: theme.ruby, fontSize: 10, fontWeight: "900" as const, letterSpacing: 1.6 },
  derbyBody: { color: theme.text, fontSize: 12, fontWeight: "600" as const, marginTop: 4, lineHeight: 16 },
  claimCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  claimTitle: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" as const, letterSpacing: 1.4 },
  claimSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2, fontWeight: "700" as const },
  sectionTitle: { color: theme.text, fontSize: 12, fontWeight: "900" as const, letterSpacing: 1.6, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10 },
  tribeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.borderSoft,
  },
  tribeRank: { color: theme.textMuted, fontSize: 12, fontWeight: "900" as const, width: 28 },
  tribeBadge: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  tribeBadgeEmoji: { fontSize: 14 },
  tribeName: { color: theme.text, fontSize: 13, fontWeight: "800" as const },
  tribeArea: { color: theme.textDim, fontSize: 10, marginTop: 2 },
  tribeCoins: { color: theme.goldBright, fontSize: 14, fontWeight: "900" as const },
  tribeCoinsLabel: { color: theme.textDim, fontSize: 8, fontWeight: "800" as const, letterSpacing: 1.2 },
  checkBubble: { width: 18, height: 18, borderRadius: 9, backgroundColor: theme.emeraldBright, alignItems: "center", justifyContent: "center" },
  gridWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16 },
  tribeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1.5,
    backgroundColor: theme.bgCard,
  },
  tribeChipEmoji: { fontSize: 14 },
  tribeChipText: { color: theme.text, fontSize: 12, fontWeight: "900" as const, letterSpacing: 0.8 },
  helpText: { color: theme.textDim, fontSize: 11, paddingHorizontal: 16, paddingTop: 12, lineHeight: 16 },
  catHeader: { paddingHorizontal: 16, paddingBottom: 8, flexDirection: "row", alignItems: "baseline", gap: 8 },
  catTitle: { color: theme.text, fontSize: 11, fontWeight: "900" as const, letterSpacing: 1.4 },
  catCaption: { color: theme.textMuted, fontSize: 11, fontWeight: "500" as const, flex: 1 },
});
