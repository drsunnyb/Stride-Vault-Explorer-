import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronDown, Coins, Footprints, MapPin, Sword, X } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { theme } from "@/constants/theme";
import { useGame } from "@/providers/GameProvider";
import type { ChallengeMetric } from "@/types/game";

export default function NewChallengeScreen() {
  const { friend: prefillFriend } = useLocalSearchParams<{ friend?: string }>();
  const { friends, createChallenge, player, challengeRakePct, maxChallengeParticipants } = useGame();
  const spendable = Math.max(0, player.coins - (player.lockedCoins ?? 0));

  const [selected, setSelected] = useState<Set<string>>(
    () => new Set<string>(prefillFriend ? [prefillFriend] : [])
  );
  const [metric, setMetric] = useState<ChallengeMetric>("steps");
  const [stakeStr, setStakeStr] = useState<string>("250");
  const stake = useMemo(() => Math.max(0, parseInt(stakeStr.replace(/[^0-9]/g, ""), 10) || 0), [stakeStr]);

  const toggle = useCallback((id: string) => {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else if (next.size < maxChallengeParticipants - 1) next.add(id);
      return next;
    });
  }, [maxChallengeParticipants]);

  const onCreate = useCallback(async () => {
    if (selected.size === 0) {
      Alert.alert("Pick friends", "Choose at least one friend to challenge.");
      return;
    }
    if (stake <= 0) {
      Alert.alert("Set a stake", "Enter how many coins to stake.");
      return;
    }
    if (stake > spendable) {
      Alert.alert("Not enough coins", `You only have ${spendable.toLocaleString()} spendable coins.`);
      return;
    }
    const res = await createChallenge({
      friendIds: Array.from(selected),
      metric,
      stake,
    });
    if (!res.ok) {
      Alert.alert("Couldn't create challenge", "Try again.");
      return;
    }
    router.replace({ pathname: "/challenge/[id]", params: { id: res.challenge.id } });
  }, [selected, stake, metric, createChallenge, spendable]);

  const pot = stake * (selected.size + 1);
  const rake = Math.round(pot * challengeRakePct);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Sword size={18} color="#1A0A00" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>STAKE CHALLENGE</Text>
          <Text style={styles.headerSub}>Winner takes the pot · 7 days</Text>
        </View>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.closeBtn}>
          <X size={18} color={theme.textMuted} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        {/* Metric */}
        <Text style={styles.section}>METRIC</Text>
        <View style={styles.metricRow}>
          <MetricBtn label="STEPS" icon={Footprints} active={metric === "steps"} onPress={() => setMetric("steps")} />
          <MetricBtn label="VAULTS" icon={MapPin} active={metric === "vaults"} onPress={() => setMetric("vaults")} />
          <MetricBtn label="COINS" icon={Coins} active={metric === "coins"} onPress={() => setMetric("coins")} />
        </View>

        {/* Stake */}
        <Text style={styles.section}>STAKE PER PLAYER</Text>
        <View style={styles.stakeCard}>
          <View style={styles.stakeInputRow}>
            <Text style={styles.stakePrefix}>c</Text>
            <TextInput
              value={stakeStr}
              onChangeText={setStakeStr}
              keyboardType="number-pad"
              style={styles.stakeInput}
              placeholder="0"
              placeholderTextColor={theme.textDim}
            />
          </View>
          <View style={styles.quickStakes}>
            {[100, 250, 500, 1000].map((q) => (
              <Pressable key={q} style={[styles.quickStake, stake === q && styles.quickStakeActive]} onPress={() => setStakeStr(String(q))}>
                <Text style={[styles.quickStakeText, stake === q && { color: "#1A0A00" }]}>{q}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.balanceText}>You have {spendable.toLocaleString()} spendable coins</Text>
        </View>

        {/* Friends */}
        <Text style={styles.section}>INVITE FRIENDS · {selected.size}/{maxChallengeParticipants - 1}</Text>
        {friends.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Add friends first — head back to the Friends tab.</Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16, gap: 8 }}>
            {friends.map((f) => {
              const on = selected.has(f.id);
              return (
                <Pressable
                  key={f.id}
                  onPress={() => toggle(f.id)}
                  style={[styles.friendRow, on && { borderColor: theme.emerald, backgroundColor: "rgba(16,185,129,0.10)" }]}
                >
                  <View style={[styles.friendAv, on && { borderColor: theme.emeraldBright }]}>
                    <Text style={styles.friendAvLetter}>{f.displayName.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.friendName}>{f.displayName}</Text>
                    <Text style={styles.friendHandle}>@{f.username}</Text>
                  </View>
                  <View style={[styles.checkbox, on && { backgroundColor: theme.emerald, borderColor: theme.emeraldBright }]}>
                    {on ? <Text style={styles.checkboxMark}>✓</Text> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Summary */}
        <View style={styles.summaryCard}>
          <LinearGradient
            colors={["rgba(244,208,63,0.16)", "rgba(244,208,63,0.02)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.summaryLabel}>POT IF ALL ACCEPT</Text>
          <Text style={styles.summaryPot}>{pot.toLocaleString()}c</Text>
          <View style={styles.summaryBreakdown}>
            <Text style={styles.summaryLine}>
              {selected.size + 1} players × {stake.toLocaleString()}c
            </Text>
            <Text style={styles.summaryLine}>
              − {rake.toLocaleString()}c rake to Champions Pool
            </Text>
            <Text style={styles.summaryWin}>
              Winner takes {Math.max(0, pot - rake).toLocaleString()}c
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={onCreate}
          disabled={selected.size === 0 || stake <= 0 || stake > spendable}
          style={[
            styles.createBtn,
            (selected.size === 0 || stake <= 0 || stake > spendable) && { opacity: 0.4 },
          ]}
        >
          <Sword size={14} color="#1A0A00" />
          <Text style={styles.createBtnText}>LOCK {stake.toLocaleString()}c · START CHALLENGE</Text>
        </Pressable>
      </View>
    </View>
  );
}

function MetricBtn({
  label,
  icon: Icon,
  active,
  onPress,
}: {
  label: string;
  icon: typeof Footprints;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.metricBtn, active && styles.metricBtnActive]} onPress={onPress}>
      <Icon size={16} color={active ? "#1A0A00" : theme.textMuted} />
      <Text style={[styles.metricLabel, active && styles.metricLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.goldBright,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: theme.text, fontSize: 16, fontWeight: "900" as const, letterSpacing: 1.4 },
  headerSub: { color: theme.textMuted, fontSize: 11, marginTop: 2 },
  closeBtn: { padding: 8 },
  section: {
    color: theme.text,
    fontSize: 11,
    fontWeight: "900" as const,
    letterSpacing: 1.8,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 10,
  },
  metricRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16 },
  metricBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    backgroundColor: theme.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  metricBtnActive: { backgroundColor: theme.goldBright, borderColor: theme.goldBright },
  metricLabel: { color: theme.textMuted, fontSize: 11, fontWeight: "900" as const, letterSpacing: 1.2 },
  metricLabelActive: { color: "#1A0A00" },
  stakeCard: {
    marginHorizontal: 16,
    padding: 14,
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.borderSoft,
    gap: 12,
  },
  stakeInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  stakePrefix: { color: theme.goldBright, fontSize: 24, fontWeight: "900" as const },
  stakeInput: { flex: 1, color: theme.text, fontSize: 28, fontWeight: "900" as const, paddingVertical: 0 },
  quickStakes: { flexDirection: "row", gap: 6 },
  quickStake: {
    flex: 1,
    paddingVertical: 9,
    backgroundColor: theme.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
  },
  quickStakeActive: { backgroundColor: theme.goldBright, borderColor: theme.goldBright },
  quickStakeText: { color: theme.textMuted, fontSize: 12, fontWeight: "900" as const },
  balanceText: { color: theme.textDim, fontSize: 11, fontWeight: "700" as const, textAlign: "center" as const },
  emptyCard: {
    marginHorizontal: 16,
    padding: 18,
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.borderSoft,
  },
  emptyText: { color: theme.textMuted, fontSize: 12, textAlign: "center" as const },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    backgroundColor: theme.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.borderSoft,
  },
  friendAv: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.surface,
    borderWidth: 1.5,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
  },
  friendAvLetter: { color: theme.text, fontSize: 15, fontWeight: "900" as const },
  friendName: { color: theme.text, fontSize: 13, fontWeight: "800" as const },
  friendHandle: { color: theme.textDim, fontSize: 11, marginTop: 1 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxMark: { color: "#04261A", fontSize: 12, fontWeight: "900" as const },
  summaryCard: {
    marginHorizontal: 16,
    marginTop: 18,
    padding: 16,
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.gold + "66",
    overflow: "hidden",
    gap: 4,
  },
  summaryLabel: { color: theme.goldBright, fontSize: 10, fontWeight: "900" as const, letterSpacing: 1.4 },
  summaryPot: { color: theme.text, fontSize: 32, fontWeight: "900" as const, marginTop: 2 },
  summaryBreakdown: { marginTop: 8, gap: 4 },
  summaryLine: { color: theme.textMuted, fontSize: 12, fontWeight: "700" as const },
  summaryWin: { color: theme.emeraldBright, fontSize: 13, fontWeight: "900" as const, marginTop: 4 },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: theme.bg + "EE",
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 999,
    backgroundColor: theme.goldBright,
  },
  createBtnText: { color: "#1A0A00", fontSize: 12, fontWeight: "900" as const, letterSpacing: 1.4 },
});

// Suppress unused import warning — ChevronDown not used; lint will remove if strict.
void ChevronDown;
