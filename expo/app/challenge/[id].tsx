import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { Check, Crown, Timer, Trophy, X } from "lucide-react-native";
import React, { useMemo } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { formatRemaining } from "@/constants/periods";
import { theme } from "@/constants/theme";
import { useGame } from "@/providers/GameProvider";
import type { ChallengeParticipant } from "@/types/game";

export default function ChallengeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { challenges, now, acceptChallenge, declineChallenge, player } = useGame();
  const challenge = useMemo(() => challenges.find((c) => c.id === id), [challenges, id]);

  if (!challenge) {
    return (
      <View style={[styles.root, { padding: 24 }]}>
        <Text style={{ color: theme.text }}>Challenge not found.</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: theme.goldBright, fontWeight: "900" as const }}>← Back</Text>
        </Pressable>
      </View>
    );
  }

  const joined = challenge.participants.filter((p) => p.state !== "out");
  const pot = challenge.stake * joined.filter((p) => p.state === "in").length;
  const metricLabel = challenge.metric === "steps" ? "STEPS" : challenge.metric === "vaults" ? "VAULTS" : "COINS";
  const live = challenge.status === "live";
  const ended = !live;
  const settled = challenge.status === "settled";
  const you = challenge.participants.find((p) => p.playerId === "you");
  const canAccept = live && you?.state === "invited" && challenge.inviteExpiresAt > now;
  const maxDelta = Math.max(1, ...joined.map((p) => p.current - p.baseline));

  const winnerId = settled ? challenge.winnerId : undefined;

  const onAccept = async () => {
    const res = await acceptChallenge(challenge.id);
    if (!res.ok) {
      Alert.alert("Couldn't join", "You may not have enough spendable coins.");
    }
  };

  const onDecline = async () => {
    await declineChallenge(challenge.id);
    router.back();
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.closeBtn}>
          <X size={18} color={theme.textMuted} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: canAccept ? 140 : 40 }}>
        <View style={styles.heroCard}>
          <LinearGradient
            colors={settled ? ["rgba(244,208,63,0.22)", "rgba(244,208,63,0.04)"] : ["rgba(244,208,63,0.16)", "rgba(244,208,63,0.02)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.metricBadge}>
            <Trophy size={11} color={theme.goldBright} />
            <Text style={styles.metricBadgeText}>{metricLabel} · 7 DAYS</Text>
          </View>
          <Text style={styles.title}>{challenge.title}</Text>
          <View style={styles.statRow}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>POT</Text>
              <Text style={styles.statValue}>{pot.toLocaleString()}c</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>STAKE</Text>
              <Text style={styles.statValue}>{challenge.stake.toLocaleString()}c</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>{live ? "ENDS IN" : "STATUS"}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                {live ? <Timer size={12} color={theme.goldBright} /> : null}
                <Text style={styles.statValue}>
                  {live
                    ? formatRemaining(challenge.endsAt, now)
                    : settled
                      ? "WON"
                      : "CANCEL"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.section}>STANDINGS</Text>
        <View style={{ gap: 8, paddingHorizontal: 16 }}>
          {[...joined]
            .sort((a, b) => b.current - b.baseline - (a.current - a.baseline))
            .map((p, i) => (
              <ParticipantRow
                key={p.playerId}
                rank={i + 1}
                participant={p}
                maxDelta={maxDelta}
                isWinner={p.playerId === winnerId}
              />
            ))}
        </View>

        {settled && winnerId === "you" ? (
          <View style={styles.payoutCard}>
            <Crown size={22} color={theme.goldBright} />
            <Text style={styles.payoutTitle}>YOU WON · +{(challenge.payout ?? 0).toLocaleString()}c</Text>
            <Text style={styles.payoutSub}>Coins already deposited to your wallet.</Text>
          </View>
        ) : null}

        {ended && challenge.status === "cancelled" ? (
          <View style={[styles.payoutCard, { borderColor: theme.textDim + "AA" }]}>
            <Text style={[styles.payoutTitle, { color: theme.text }]}>CHALLENGE CANCELLED</Text>
            <Text style={styles.payoutSub}>Not enough players joined. Your stake was refunded.</Text>
          </View>
        ) : null}
      </ScrollView>

      {canAccept ? (
        <View style={styles.footer}>
          <Pressable style={styles.declineBtn} onPress={onDecline}>
            <Text style={styles.declineText}>DECLINE</Text>
          </Pressable>
          <Pressable
            style={[
              styles.acceptBtn,
              challenge.stake > Math.max(0, player.coins - (player.lockedCoins ?? 0)) && { opacity: 0.4 },
            ]}
            onPress={onAccept}
          >
            <Check size={14} color="#1A0A00" />
            <Text style={styles.acceptText}>LOCK {challenge.stake.toLocaleString()}c · JOIN</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function ParticipantRow({
  rank,
  participant,
  maxDelta,
  isWinner,
}: {
  rank: number;
  participant: ChallengeParticipant;
  maxDelta: number;
  isWinner: boolean;
}) {
  const delta = participant.current - participant.baseline;
  const pct = Math.max(0, Math.min(1, delta / maxDelta));
  const invited = participant.state === "invited";
  const out = participant.state === "out";
  return (
    <View
      style={[
        styles.row,
        isWinner && { borderColor: theme.goldBright, backgroundColor: "rgba(244,208,63,0.10)" },
        participant.playerId === "you" && !isWinner && { borderColor: theme.emerald + "AA" },
      ]}
    >
      <Text style={[styles.rowRank, rank === 1 && { color: theme.goldBright }]}>{String(rank).padStart(2, "0")}</Text>
      <View style={[styles.av, isWinner && { borderColor: theme.goldBright }]}>
        <Text style={styles.avLetter}>{participant.displayName.charAt(0)}</Text>
        {isWinner ? (
          <View style={styles.winCrown}>
            <Crown size={11} color={theme.goldBright} />
          </View>
        ) : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName}>
          {participant.displayName}
          {participant.playerId === "you" ? <Text style={{ color: theme.emeraldBright }}>  · YOU</Text> : null}
        </Text>
        <Text style={styles.rowSub}>
          {invited ? "Invite pending" : out ? "Declined" : `+${delta.toLocaleString()}`}
        </Text>
        <View style={styles.bar}>
          <View
            style={[
              styles.fill,
              {
                width: `${Math.max(2, pct * 100)}%`,
                backgroundColor: isWinner ? theme.goldBright : participant.playerId === "you" ? theme.emeraldBright : theme.sapphire,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  header: { flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 12, paddingTop: 16 },
  closeBtn: { padding: 8 },
  heroCard: {
    marginHorizontal: 16,
    marginTop: 4,
    padding: 18,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.gold + "66",
    backgroundColor: theme.bgCard,
    overflow: "hidden",
    gap: 12,
  },
  metricBadge: {
    flexDirection: "row",
    alignSelf: "flex-start",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.gold + "AA",
  },
  metricBadgeText: { color: theme.goldBright, fontSize: 9, fontWeight: "900" as const, letterSpacing: 1.2 },
  title: { color: theme.text, fontSize: 22, fontWeight: "900" as const, letterSpacing: 0.4 },
  statRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  stat: { flex: 1, padding: 10, backgroundColor: theme.surface, borderRadius: 10, gap: 4 },
  statLabel: { color: theme.textDim, fontSize: 9, fontWeight: "900" as const, letterSpacing: 1 },
  statValue: { color: theme.text, fontSize: 14, fontWeight: "900" as const },
  section: {
    color: theme.text,
    fontSize: 11,
    fontWeight: "900" as const,
    letterSpacing: 1.8,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.borderSoft,
  },
  rowRank: { width: 22, color: theme.textDim, fontSize: 12, fontWeight: "900" as const },
  av: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.surface,
    borderWidth: 1.5,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
  },
  avLetter: { color: theme.text, fontSize: 14, fontWeight: "900" as const },
  winCrown: { position: "absolute", top: -10 },
  rowName: { color: theme.text, fontSize: 13, fontWeight: "800" as const },
  rowSub: { color: theme.textMuted, fontSize: 11, marginTop: 2 },
  bar: { marginTop: 6, height: 4, backgroundColor: theme.surface, borderRadius: 2, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 2 },
  payoutCard: {
    marginHorizontal: 16,
    marginTop: 20,
    padding: 18,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.gold + "AA",
    backgroundColor: "rgba(244,208,63,0.08)",
    alignItems: "center",
    gap: 6,
  },
  payoutTitle: { color: theme.goldBright, fontSize: 14, fontWeight: "900" as const, letterSpacing: 1.4 },
  payoutSub: { color: theme.textMuted, fontSize: 11, textAlign: "center" as const },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: 10,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: theme.bg + "EE",
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  declineBtn: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.bgCard,
  },
  declineText: { color: theme.textMuted, fontSize: 11, fontWeight: "900" as const, letterSpacing: 1.2 },
  acceptBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 999,
    backgroundColor: theme.goldBright,
  },
  acceptText: { color: "#1A0A00", fontSize: 12, fontWeight: "900" as const, letterSpacing: 1.2 },
});
