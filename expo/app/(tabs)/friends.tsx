import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Copy, Share2, Sword, Sparkles, Trophy, UserPlus, UserX, Users } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { StrideStatusBadge } from "@/components/StrideStatusBadge";
import { periodKey, pseudoPeriodCoins } from "@/constants/friends";
import { formatRemaining, periodStart } from "@/constants/periods";
import { getStrideStatus } from "@/constants/status";
import { theme } from "@/constants/theme";
import { useGame } from "@/providers/GameProvider";
import type { StakeChallenge } from "@/types/game";

export default function FriendsScreen() {
  const { player, friends, challenges, featuredChallenges, now, addFriend, removeFriend } = useGame();
  const [query, setQuery] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);

  const inviteLink = `stride.app/i/${(player.username || "stride").toLowerCase().replace(/\s+/g, "")}`;

  const weekKey = useMemo(() => periodKey(periodStart("week", now), "week"), [now]);

  const onAdd = useCallback(async () => {
    if (!query.trim() || busy) return;
    setBusy(true);
    const res = await addFriend({ username: query });
    setBusy(false);
    if (!res.ok) {
      const msg =
        res.reason === "already-added"
          ? "You're already friends."
          : res.reason === "not-found"
            ? "No user with that username."
            : "Enter a username.";
      Alert.alert("Add friend", msg);
      return;
    }
    setQuery("");
  }, [addFriend, query, busy]);

  const liveChallenges = challenges.filter((c) => c.status === "live");
  const settledChallenges = challenges.filter((c) => c.status === "settled" || c.status === "cancelled");

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 60 }}>
      {/* Invite hero */}
      <View style={styles.heroCard}>
        <LinearGradient
          colors={["rgba(16,185,129,0.16)", "rgba(16,185,129,0.02)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.heroIcon}>
          <Users size={20} color={theme.emeraldBright} />
        </View>
        <Text style={styles.heroTitle}>Walk together, earn more</Text>
        <Text style={styles.heroSub}>
          You + a friend each get <Text style={{ color: theme.emeraldBright, fontWeight: "900" as const }}>+500c</Text> when they join via your link.
        </Text>
        <View style={styles.linkBox}>
          <Text style={styles.linkText} numberOfLines={1}>{inviteLink}</Text>
          <Pressable
            onPress={() => Alert.alert("Invite link", "Copied to clipboard")}
            style={styles.copyBtn}
          >
            <Copy size={13} color={theme.emeraldBright} />
            <Text style={styles.copyBtnText}>COPY</Text>
          </Pressable>
        </View>
        <Pressable onPress={() => router.push("/profile")} style={styles.shareBtn}>
          <Share2 size={14} color="#04261A" />
          <Text style={styles.shareBtnText}>SHARE INVITE</Text>
        </Pressable>
      </View>

      {/* Search */}
      <Text style={styles.section}>FIND A FRIEND</Text>
      <View style={styles.searchRow}>
        <View style={styles.searchInputWrap}>
          <Text style={styles.searchPrefix}>@</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="username"
            placeholderTextColor={theme.textDim}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={onAdd}
            returnKeyType="search"
          />
        </View>
        <Pressable style={[styles.addBtn, busy && { opacity: 0.5 }]} onPress={onAdd} disabled={busy}>
          <UserPlus size={14} color="#1A0A00" />
          <Text style={styles.addBtnText}>ADD</Text>
        </Pressable>
      </View>
      <Text style={styles.searchHint}>Try @kai.mercer, @sable, @junopark, @rune, @novavance…</Text>

      {/* Featured challenges (admin-curated) */}
      {featuredChallenges && featuredChallenges.length > 0 ? (
        <>
          <Text style={styles.section}>FEATURED THIS WEEK</Text>
          <View style={{ gap: 10, paddingHorizontal: 16 }}>
            {featuredChallenges
              .filter((c) => c.endsAt > now)
              .slice(0, 4)
              .map((c) => (
                <FeaturedCard key={c.id} challenge={c} now={now} />
              ))}
          </View>
        </>
      ) : null}

      {/* Stake CTA */}
      <Pressable style={styles.stakeCta} onPress={() => router.push("/challenge/new")}>
        <View style={styles.stakeIcon}>
          <Sword size={18} color="#1A0A00" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.stakeTitle}>WEEKLY STAKE CHALLENGE</Text>
          <Text style={styles.stakeSub}>Pick friends · winner takes the pot · 2% rake</Text>
        </View>
        <Text style={styles.stakeAction}>START →</Text>
      </Pressable>

      {/* Live challenges */}
      {liveChallenges.length > 0 ? (
        <>
          <Text style={styles.section}>LIVE CHALLENGES</Text>
          <View style={{ gap: 10, paddingHorizontal: 16 }}>
            {liveChallenges.map((c) => (
              <ChallengeTicket key={c.id} challenge={c} now={now} />
            ))}
          </View>
        </>
      ) : null}

      {/* Friends */}
      <Text style={styles.section}>YOUR FRIENDS · {friends.length}</Text>
      {friends.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No friends yet — share your link or add by username above.</Text>
        </View>
      ) : (
        <View style={{ gap: 8, paddingHorizontal: 16 }}>
          {friends.map((f) => {
            const wkCoins = pseudoPeriodCoins(f.id, weekKey);
            const status = getStrideStatus(Math.min(250, Math.floor(wkCoins / 200))).current;
            return (
              <View key={f.id} style={styles.friendRow}>
                <View style={styles.friendAvatar}>
                  <Text style={styles.friendAvatarLetter}>{f.displayName.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.friendName}>{f.displayName}</Text>
                  <View style={styles.friendSubRow}>
                    <StrideStatusBadge status={status} size="sm" />
                    <Text style={styles.friendSub}>{wkCoins.toLocaleString()}c this week</Text>
                  </View>
                </View>
                <Pressable
                  style={styles.friendChallengeBtn}
                  onPress={() => router.push({ pathname: "/challenge/new", params: { friend: f.id } })}
                >
                  <Sword size={12} color="#1A0A00" />
                  <Text style={styles.friendChallengeText}>CHALLENGE</Text>
                </Pressable>
                <Pressable
                  style={styles.friendRemove}
                  hitSlop={8}
                  onPress={() =>
                    Alert.alert("Remove friend", `Remove ${f.displayName}?`, [
                      { text: "Cancel", style: "cancel" },
                      { text: "Remove", style: "destructive", onPress: () => removeFriend(f.id) },
                    ])
                  }
                >
                  <UserX size={14} color={theme.textDim} />
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      {/* Past challenges */}
      {settledChallenges.length > 0 ? (
        <>
          <Text style={styles.section}>PAST CHALLENGES</Text>
          <View style={{ gap: 10, paddingHorizontal: 16 }}>
            {settledChallenges.slice(0, 5).map((c) => (
              <ChallengeTicket key={c.id} challenge={c} now={now} />
            ))}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

function FeaturedCard({
  challenge,
  now,
}: {
  challenge: import("@/lib/backend").FeaturedChallenge;
  now: number;
}) {
  const remaining = challenge.endsAt - now;
  const metricLabel =
    challenge.metric === "steps" ? "STEPS" : challenge.metric === "vaults" ? "VAULTS" : "COINS";
  return (
    <View style={featuredStyles.card}>
      <LinearGradient
        colors={["rgba(16,185,129,0.20)", "rgba(244,208,63,0.04)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={featuredStyles.headerRow}>
        <Text style={featuredStyles.emoji}>{challenge.heroEmoji}</Text>
        <View style={{ flex: 1 }}>
          <View style={featuredStyles.chipRow}>
            <View style={featuredStyles.featuredChip}>
              <Sparkles size={9} color={theme.emeraldBright} />
              <Text style={featuredStyles.featuredChipText}>FEATURED</Text>
            </View>
            <View style={featuredStyles.metricChip}>
              <Text style={featuredStyles.metricChipText}>{metricLabel}</Text>
            </View>
            {challenge.plusOnly ? (
              <View style={featuredStyles.plusChip}>
                <Text style={featuredStyles.plusChipText}>STRIDE+</Text>
              </View>
            ) : null}
          </View>
          <Text style={featuredStyles.title} numberOfLines={1}>
            {challenge.title}
          </Text>
          {challenge.subtitle ? (
            <Text style={featuredStyles.subtitle} numberOfLines={2}>
              {challenge.subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={featuredStyles.statsRow}>
        <View>
          <Text style={featuredStyles.statLabel}>PRIZE POOL</Text>
          <Text style={featuredStyles.statValue}>{challenge.prizePoolCoins.toLocaleString()}c</Text>
        </View>
        <View>
          <Text style={featuredStyles.statLabel}>COHORT</Text>
          <Text style={featuredStyles.statValueDim}>{challenge.cohortSize.toLocaleString()}</Text>
        </View>
        <View>
          <Text style={featuredStyles.statLabel}>ENDS IN</Text>
          <Text style={featuredStyles.statValueDim}>{formatRemaining(challenge.endsAt, now)}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <Text style={featuredStyles.cta}>
          {challenge.entryCostCoins > 0 ? `${challenge.entryCostCoins}c TO JOIN →` : "FREE →"}
        </Text>
      </View>
      <View pointerEvents="none" style={{ opacity: 0 }}>
        <Text>{remaining}</Text>
      </View>
    </View>
  );
}

function ChallengeTicket({ challenge, now }: { challenge: StakeChallenge; now: number }) {
  const joined = challenge.participants.filter((p) => p.state !== "out");
  const pot = challenge.stake * joined.length;
  const live = challenge.status === "live";
  const leader = useMemo(() => {
    const cands = joined.filter((p) => p.state === "in");
    if (cands.length === 0) return undefined;
    return cands.reduce((m, p) => (p.current - p.baseline > m.current - m.baseline ? p : m), cands[0]);
  }, [joined]);
  const metricLabel = challenge.metric === "steps" ? "STEPS" : challenge.metric === "vaults" ? "VAULTS" : "COINS";

  return (
    <Pressable
      style={[styles.ticket, !live && { opacity: 0.7 }]}
      onPress={() => router.push({ pathname: "/challenge/[id]", params: { id: challenge.id } })}
    >
      <LinearGradient
        colors={live ? ["rgba(244,208,63,0.16)", "rgba(244,208,63,0.02)"] : ["rgba(154,163,184,0.10)", "rgba(154,163,184,0.02)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.ticketHeader}>
        <View style={styles.ticketMetric}>
          <Trophy size={11} color={live ? theme.goldBright : theme.textMuted} />
          <Text style={[styles.ticketMetricText, !live && { color: theme.textMuted }]}>{metricLabel}</Text>
        </View>
        <Text style={styles.ticketTitle} numberOfLines={1}>{challenge.title}</Text>
      </View>
      <View style={styles.ticketBody}>
        <View>
          <Text style={styles.ticketPotLabel}>POT</Text>
          <Text style={styles.ticketPot}>{pot.toLocaleString()}c</Text>
        </View>
        <View style={styles.ticketAvatars}>
          {joined.slice(0, 4).map((p, i) => (
            <View key={p.playerId} style={[styles.ticketAv, { marginLeft: i === 0 ? 0 : -10 }]}>
              <Text style={styles.ticketAvLetter}>{p.displayName.charAt(0)}</Text>
            </View>
          ))}
          {joined.length > 4 ? <Text style={styles.ticketMore}>+{joined.length - 4}</Text> : null}
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.ticketCountdownLabel}>
            {live ? "ENDS IN" : challenge.status === "settled" ? "SETTLED" : "CANCELLED"}
          </Text>
          <Text style={styles.ticketCountdown}>
            {live
              ? formatRemaining(challenge.endsAt, now)
              : challenge.status === "settled"
                ? `${challenge.payout?.toLocaleString() ?? 0}c`
                : "—"}
          </Text>
        </View>
      </View>
      {leader ? (
        <Text style={styles.ticketLeader} numberOfLines={1}>
          {challenge.status === "settled" ? "🏆 Won by " : "Leader: "}
          <Text style={{ color: theme.text, fontWeight: "900" as const }}>{leader.displayName}</Text>
        </Text>
      ) : null}
    </Pressable>
  );
}

const featuredStyles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.bgCard,
    borderWidth: 1,
    borderColor: theme.emerald + "66",
    overflow: "hidden",
    gap: 12,
  },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  emoji: { fontSize: 32 },
  chipRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  featuredChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: "rgba(16,185,129,0.15)",
    borderRadius: 4,
  },
  featuredChipText: {
    color: theme.emeraldBright,
    fontSize: 8,
    fontWeight: "900" as const,
    letterSpacing: 1.2,
  },
  metricChip: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: theme.surface,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.border,
  },
  metricChipText: { color: theme.textMuted, fontSize: 8, fontWeight: "900" as const, letterSpacing: 1 },
  plusChip: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: theme.gold + "22",
    borderRadius: 4,
  },
  plusChipText: { color: theme.goldBright, fontSize: 8, fontWeight: "900" as const, letterSpacing: 1 },
  title: { color: theme.text, fontSize: 15, fontWeight: "900" as const },
  subtitle: { color: theme.textMuted, fontSize: 11, marginTop: 2 },
  statsRow: { flexDirection: "row", alignItems: "flex-end", gap: 14 },
  statLabel: { color: theme.textDim, fontSize: 8, fontWeight: "900" as const, letterSpacing: 1 },
  statValue: { color: theme.goldBright, fontSize: 18, fontWeight: "900" as const, marginTop: 2 },
  statValueDim: { color: theme.text, fontSize: 13, fontWeight: "800" as const, marginTop: 2 },
  cta: { color: theme.emeraldBright, fontSize: 11, fontWeight: "900" as const, letterSpacing: 1 },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  heroCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 0,
    padding: 18,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.bgCard,
    borderWidth: 1,
    borderColor: theme.emerald + "66",
    overflow: "hidden",
    gap: 8,
  },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(16,185,129,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  heroTitle: { color: theme.text, fontSize: 18, fontWeight: "900" as const, letterSpacing: 0.3 },
  heroSub: { color: theme.textMuted, fontSize: 12, marginBottom: 8 },
  linkBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: theme.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
  },
  linkText: { color: theme.text, fontSize: 12, fontWeight: "700" as const, flex: 1 },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(16,185,129,0.10)",
    borderRadius: 8,
  },
  copyBtnText: { color: theme.emeraldBright, fontSize: 10, fontWeight: "900" as const, letterSpacing: 1 },
  shareBtn: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    backgroundColor: theme.emeraldBright,
    borderRadius: 999,
  },
  shareBtnText: { color: "#04261A", fontSize: 11, fontWeight: "900" as const, letterSpacing: 1.4 },
  section: {
    color: theme.text,
    fontSize: 11,
    fontWeight: "900" as const,
    letterSpacing: 1.8,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
  },
  searchRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 8 },
  searchInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 12,
    height: 44,
  },
  searchPrefix: { color: theme.textDim, fontSize: 16, fontWeight: "800" as const, marginRight: 4 },
  searchInput: { flex: 1, color: theme.text, fontSize: 14, fontWeight: "700" as const, paddingVertical: 0 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.goldBright,
  },
  addBtnText: { color: "#1A0A00", fontSize: 11, fontWeight: "900" as const, letterSpacing: 1.2 },
  searchHint: { paddingHorizontal: 16, paddingTop: 8, color: theme.textDim, fontSize: 11 },
  stakeCta: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.gold + "88",
  },
  stakeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.goldBright,
    alignItems: "center",
    justifyContent: "center",
  },
  stakeTitle: { color: theme.goldBright, fontSize: 11, fontWeight: "900" as const, letterSpacing: 1.4 },
  stakeSub: { color: theme.textMuted, fontSize: 11, marginTop: 2 },
  stakeAction: { color: theme.text, fontSize: 12, fontWeight: "900" as const, letterSpacing: 1 },
  emptyCard: {
    marginHorizontal: 16,
    padding: 18,
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.borderSoft,
  },
  emptyText: { color: theme.textMuted, fontSize: 12, fontWeight: "600" as const, textAlign: "center" as const },
  // friend row
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.borderSoft,
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.sapphire + "AA",
    alignItems: "center",
    justifyContent: "center",
  },
  friendAvatarLetter: { color: theme.text, fontSize: 16, fontWeight: "900" as const },
  friendName: { color: theme.text, fontSize: 13, fontWeight: "800" as const },
  friendSubRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  friendSub: { color: theme.textMuted, fontSize: 11 },
  friendChallengeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: theme.goldBright,
    borderRadius: 999,
  },
  friendChallengeText: { color: "#1A0A00", fontSize: 10, fontWeight: "900" as const, letterSpacing: 1 },
  friendRemove: { padding: 6 },
  // ticket
  ticket: {
    padding: 12,
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.gold + "66",
    overflow: "hidden",
    gap: 8,
  },
  ticketHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  ticketMetric: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
    backgroundColor: theme.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.gold + "55",
  },
  ticketMetricText: { color: theme.goldBright, fontSize: 9, fontWeight: "900" as const, letterSpacing: 1 },
  ticketTitle: { color: theme.text, fontSize: 13, fontWeight: "900" as const, flex: 1 },
  ticketBody: { flexDirection: "row", alignItems: "center", gap: 16 },
  ticketPotLabel: { color: theme.textDim, fontSize: 8, fontWeight: "900" as const, letterSpacing: 1 },
  ticketPot: { color: theme.goldBright, fontSize: 20, fontWeight: "900" as const, marginTop: 2 },
  ticketAvatars: { flex: 1, flexDirection: "row", alignItems: "center" },
  ticketAv: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.surface,
    borderWidth: 2,
    borderColor: theme.bgCard,
    alignItems: "center",
    justifyContent: "center",
  },
  ticketAvLetter: { color: theme.text, fontSize: 11, fontWeight: "900" as const },
  ticketMore: { color: theme.textMuted, fontSize: 11, fontWeight: "800" as const, marginLeft: 6 },
  ticketCountdownLabel: { color: theme.textDim, fontSize: 8, fontWeight: "900" as const, letterSpacing: 1 },
  ticketCountdown: { color: theme.text, fontSize: 13, fontWeight: "900" as const, marginTop: 2 },
  ticketLeader: { color: theme.textMuted, fontSize: 11, fontWeight: "700" as const },
});
