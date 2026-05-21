import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ChevronDown, Coins, Crown, History, Target, Trophy, X } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { formatRemaining } from "@/constants/periods";
import { PREDICT_MAX_STAKE, PREDICT_MIN_STAKE } from "@/constants/retention";
import { theme } from "@/constants/theme";
import { useGame } from "@/providers/GameProvider";

const STAKE_PRESETS = [50, 100, 250, 500];

export default function PredictScreen() {
  const {
    leaderboardFor,
    placePrediction,
    predictions,
    predictionHistory,
    predictionMarketId,
    predictionMarketEndsAt,
    now,
    spendableCoins,
  } = useGame();
  const board = useMemo(() => leaderboardFor("week", "global").slice(0, 20), [leaderboardFor]);
  const friendsBoard = useMemo(() => leaderboardFor("week", "friends"), [leaderboardFor]);
  const active = predictions.find((p) => p.marketId === predictionMarketId);
  const [pickId, setPickId] = useState<string | null>(active?.pickPlayerId ?? null);
  const [stake, setStake] = useState<number>(active?.stake ?? 100);
  const [scope, setScope] = useState<"global" | "friends">("global");
  const list = scope === "friends" ? friendsBoard : board;
  const pick = list.find((b) => b.id === pickId) ?? list[0];

  const onPlace = async () => {
    if (!pick) return;
    if (stake > spendableCoins) {
      Alert.alert("Not enough coins", `You have ${spendableCoins.toLocaleString()} spendable.`);
      return;
    }
    const res = await placePrediction({ pickPlayerId: pick.id, pickName: pick.name, stake });
    if (res.ok) {
      Alert.alert("Pick locked", `${stake} coins on ${pick.name}. Settles when the week closes.`);
    }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={["top"]} style={styles.header}>
        <View style={styles.headerRow}>
          <View style={[styles.iconBubble, { backgroundColor: theme.sapphire }]}>
            <Target size={18} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>STRIDE PREDICT</Text>
            <Text style={styles.sub}>
              Closes in {formatRemaining(predictionMarketEndsAt, now)} · pot pays 4.75× winning stake
            </Text>
          </View>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.close}>
            <X size={20} color={theme.textMuted} />
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ paddingBottom: 200 }}>
        {active ? (
          <View style={styles.activeCard}>
            <LinearGradient
              colors={["rgba(59,130,246,0.22)", "rgba(59,130,246,0.04)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Crown size={14} color={theme.sapphire} />
            <View style={{ flex: 1 }}>
              <Text style={styles.activeTitle}>Pick locked · {active.stake}c on {active.pickName}</Text>
              <Text style={styles.activeSub}>Adjust below — re-locking refunds the old stake.</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.scopeRow}>
          <ScopeBtn label="GLOBAL TOP 20" active={scope === "global"} onPress={() => setScope("global")} />
          <ScopeBtn label="FRIENDS" active={scope === "friends"} onPress={() => setScope("friends")} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>WHO TOPS THE WEEKLY LADDER?</Text>
          <View style={{ gap: 8 }}>
            {list.map((row, i) => {
              const isPick = pick?.id === row.id;
              return (
                <Pressable
                  key={row.id}
                  onPress={() => setPickId(row.id)}
                  style={[styles.contender, isPick && styles.contenderActive]}
                >
                  <Text style={[styles.rank, i < 3 && { color: theme.goldBright }]}>
                    #{String(i + 1).padStart(2, "0")}
                  </Text>
                  <View style={[styles.avatar, isPick && { borderColor: theme.sapphire }]}>
                    <Text style={styles.avatarLetter}>{row.name.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.contenderName} numberOfLines={1}>
                      {row.name}{row.isYou ? "  · YOU" : ""}{row.isFriend ? "  · FRIEND" : ""}
                    </Text>
                    <Text style={styles.contenderCoins}>{row.coins.toLocaleString()} coins this week</Text>
                  </View>
                  {isPick ? <Trophy size={14} color={theme.sapphire} /> : <ChevronDown size={14} color={theme.textDim} style={{ opacity: 0 }} />}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>YOUR STAKE</Text>
          <View style={styles.stakeRow}>
            {STAKE_PRESETS.map((s) => (
              <Pressable
                key={s}
                onPress={() => setStake(s)}
                style={[styles.stakeChip, stake === s && styles.stakeChipActive]}
              >
                <Text style={[styles.stakeChipText, stake === s && { color: "#0A0500" }]}>{s}c</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.stakeHelp}>
            Stake between {PREDICT_MIN_STAKE} and {PREDICT_MAX_STAKE} coins. Spendable: {spendableCoins.toLocaleString()}c.
          </Text>
        </View>

        {predictionHistory.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.historyHead}>
              <History size={13} color={theme.textMuted} />
              <Text style={styles.sectionTitle}>HISTORY</Text>
            </View>
            <View style={{ gap: 6 }}>
              {predictionHistory.slice(0, 6).map((h) => (
                <View key={`${h.marketId}-${h.placedAt}`} style={styles.historyRow}>
                  <View style={[styles.historyDot, { backgroundColor: h.result === "won" ? theme.emeraldBright : theme.textDim }]} />
                  <Text style={styles.historyText}>
                    <Text style={{ color: theme.text, fontWeight: "800" as const }}>{h.pickName}</Text>
                    <Text style={{ color: theme.textDim }}> · {h.stake}c → </Text>
                    <Text style={{ color: h.result === "won" ? theme.emeraldBright : theme.textMuted, fontWeight: "900" as const }}>
                      {h.result === "won" ? `+${h.payout}c` : "lost"}
                    </Text>
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <SafeAreaView edges={["bottom"]} style={styles.footer}>
        <Pressable
          onPress={onPlace}
          disabled={!pick}
          style={[styles.placeBtn, !pick && { opacity: 0.5 }]}
        >
          <LinearGradient
            colors={[theme.sapphire, "#60A5FA"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <Coins size={16} color="#FFFFFF" />
          <Text style={styles.placeText}>
            {active ? `RE-LOCK ${stake}c ON ${pick?.name.toUpperCase()}` : `LOCK ${stake}c ON ${pick?.name.toUpperCase()}`}
          </Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

function ScopeBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.scopeBtn, active && { borderColor: theme.sapphire, backgroundColor: "rgba(59,130,246,0.10)" }]}
    >
      <Text style={[styles.scopeBtnText, active && { color: theme.sapphire }]}>{label}</Text>
    </Pressable>
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
  activeCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.sapphire + "AA",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    overflow: "hidden",
  },
  activeTitle: { color: theme.text, fontSize: 13, fontWeight: "900" as const },
  activeSub: { color: theme.textMuted, fontSize: 11, marginTop: 2 },
  scopeRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  scopeBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.bgCard },
  scopeBtnText: { color: theme.textMuted, fontSize: 10, fontWeight: "900" as const, letterSpacing: 1.2 },
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionTitle: { color: theme.text, fontSize: 12, fontWeight: "900" as const, letterSpacing: 1.6, paddingBottom: 10 },
  contender: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.borderSoft,
  },
  contenderActive: { borderColor: theme.sapphire, backgroundColor: "rgba(59,130,246,0.10)" },
  rank: { color: theme.textDim, fontSize: 12, fontWeight: "900" as const, width: 30, letterSpacing: 0.4 },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, alignItems: "center", justifyContent: "center" },
  avatarLetter: { color: theme.text, fontSize: 14, fontWeight: "900" as const },
  contenderName: { color: theme.text, fontSize: 13, fontWeight: "800" as const },
  contenderCoins: { color: theme.textMuted, fontSize: 11, marginTop: 2 },
  stakeRow: { flexDirection: "row", gap: 8 },
  stakeChip: { flex: 1, paddingVertical: 12, borderRadius: 999, backgroundColor: theme.bgCard, borderWidth: 1, borderColor: theme.border, alignItems: "center" },
  stakeChipActive: { backgroundColor: theme.goldBright, borderColor: theme.goldBright },
  stakeChipText: { color: theme.text, fontSize: 13, fontWeight: "900" as const, letterSpacing: 0.6 },
  stakeHelp: { color: theme.textDim, fontSize: 11, paddingTop: 8 },
  historyHead: { flexDirection: "row", alignItems: "center", gap: 6, paddingBottom: 4 },
  historyRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, backgroundColor: theme.bgCard, borderRadius: 10, borderWidth: 1, borderColor: theme.borderSoft },
  historyDot: { width: 8, height: 8, borderRadius: 4 },
  historyText: { fontSize: 12, flex: 1 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: theme.bg,
    borderTopWidth: 1,
    borderTopColor: theme.borderSoft,
    ...Platform.select({ ios: {}, android: { paddingBottom: 12 } }),
  },
  placeBtn: {
    height: 54,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  placeText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" as const, letterSpacing: 1.2 },
});
