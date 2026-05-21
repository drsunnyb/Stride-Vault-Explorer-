/**
 * Notifications inbox — the unified surface for friend requests,
 * stake-challenge invites, friend-joined receipts, and system alerts.
 * Actionable rows (friend requests + challenge invites) expose Accept /
 * Decline buttons that wire through to the existing friend + challenge
 * mutations in GameProvider.
 */
import { LinearGradient } from "expo-linear-gradient";
import { Stack, router } from "expo-router";
import {
  Bell,
  Check,
  ChevronLeft,
  Crown,
  Inbox,
  MapPin,
  Sword,
  UserPlus,
  X,
} from "lucide-react-native";
import React, { useCallback, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ALL_KNOWN_USERS } from "@/constants/friends";
import { theme } from "@/constants/theme";
import { useGame } from "@/providers/GameProvider";
import type { InboxNotification, NotificationKind } from "@/types/game";

function timeAgo(ms: number, now: number): string {
  const diff = Math.max(0, now - ms);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function iconFor(kind: NotificationKind) {
  switch (kind) {
    case "friend-request":
      return { Icon: UserPlus, tint: theme.emeraldBright, bg: "rgba(16,185,129,0.16)" };
    case "friend-joined":
      return { Icon: Check, tint: theme.emeraldBright, bg: "rgba(16,185,129,0.12)" };
    case "challenge-invite":
      return { Icon: Sword, tint: theme.goldBright, bg: "rgba(244,208,63,0.16)" };
    case "challenge-won":
      return { Icon: Crown, tint: theme.goldBright, bg: "rgba(244,208,63,0.20)" };
    case "challenge-lost":
      return { Icon: Sword, tint: theme.textMuted, bg: "rgba(154,163,184,0.10)" };
    case "city-live":
      return { Icon: MapPin, tint: theme.sapphire, bg: "rgba(99,127,255,0.16)" };
    default:
      return { Icon: Bell, tint: theme.text, bg: theme.surface };
  }
}

export default function NotificationsScreen() {
  const {
    notifications,
    now,
    addFriend,
    acceptChallenge,
    declineChallenge,
    markNotificationRead,
    markAllNotificationsRead,
    resolveNotification,
  } = useGame();

  const sorted = useMemo<InboxNotification[]>(
    () => [...notifications].sort((a, b) => b.createdAt - a.createdAt),
    [notifications]
  );

  const handleAccept = useCallback(
    async (n: InboxNotification) => {
      if (n.kind === "friend-request" && n.fromUsername) {
        // Make sure the user is in the directory so addFriend resolves.
        const known = ALL_KNOWN_USERS.some(
          (u) => u.username.toLowerCase() === n.fromUsername!.toLowerCase()
        );
        if (known) {
          await addFriend({ username: n.fromUsername });
        }
        await resolveNotification(n.id, "accepted");
        return;
      }
      if (n.kind === "challenge-invite" && n.challengeId) {
        await acceptChallenge(n.challengeId);
        await resolveNotification(n.id, "accepted");
        return;
      }
      await resolveNotification(n.id, "accepted");
    },
    [addFriend, acceptChallenge, resolveNotification]
  );

  const handleDecline = useCallback(
    async (n: InboxNotification) => {
      if (n.kind === "challenge-invite" && n.challengeId) {
        await declineChallenge(n.challengeId);
      }
      await resolveNotification(n.id, "declined");
    },
    [declineChallenge, resolveNotification]
  );

  const hasPending = sorted.some((n) => n.actionable && !n.resolution);

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={["top"]} style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <ChevronLeft size={20} color={theme.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>NOTIFICATIONS</Text>
          <Text style={styles.subtitle}>
            {hasPending ? `${sorted.filter((n) => n.actionable && !n.resolution).length} pending` : "All caught up"}
          </Text>
        </View>
        <Pressable
          onPress={markAllNotificationsRead}
          style={styles.markRead}
          hitSlop={8}
        >
          <Text style={styles.markReadText}>MARK READ</Text>
        </Pressable>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60, paddingTop: 6, gap: 10 }}
        showsVerticalScrollIndicator={false}
      >
        {sorted.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Inbox size={28} color={theme.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>Inbox is quiet</Text>
            <Text style={styles.emptySub}>
              Friend requests, challenge invites, and city alerts will land here.
            </Text>
          </View>
        ) : (
          sorted.map((n) => (
            <NotificationCard
              key={n.id}
              notification={n}
              now={now}
              onPress={() => markNotificationRead(n.id)}
              onAccept={() => handleAccept(n)}
              onDecline={() => handleDecline(n)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function NotificationCard({
  notification: n,
  now,
  onPress,
  onAccept,
  onDecline,
}: {
  notification: InboxNotification;
  now: number;
  onPress: () => void;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const { Icon, tint, bg } = iconFor(n.kind);
  const actionable = n.actionable && !n.resolution;
  const initial = (n.fromName ?? n.title).charAt(0).toUpperCase();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        !n.read && styles.cardUnread,
        pressed && { transform: [{ scale: 0.995 }] },
      ]}
    >
      {!n.read && <View style={[styles.unreadDot, { backgroundColor: tint }]} />}

      <View style={[styles.avatar, { borderColor: tint + "AA" }]}>
        <LinearGradient
          colors={[bg, "transparent"]}
          style={StyleSheet.absoluteFill}
        />
        {n.fromName ? (
          <Text style={[styles.avatarInitial, { color: tint }]}>{initial}</Text>
        ) : (
          <Icon size={20} color={tint} />
        )}
        <View style={[styles.kindBadge, { backgroundColor: tint }]}>
          <Icon size={9} color="#06070D" />
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {n.title}
        </Text>
        <Text style={styles.cardBody} numberOfLines={2}>{n.body}</Text>
        <Text style={styles.cardTime}>{timeAgo(n.createdAt, now)}</Text>

        {actionable ? (
          <View style={styles.actionRow}>
            <Pressable
              onPress={onDecline}
              style={({ pressed }) => [styles.declineBtn, pressed && { opacity: 0.7 }]}
              hitSlop={6}
            >
              <X size={12} color={theme.textMuted} />
              <Text style={styles.declineText}>DECLINE</Text>
            </Pressable>
            <Pressable
              onPress={onAccept}
              style={({ pressed }) => [
                styles.acceptBtn,
                { backgroundColor: tint },
                pressed && { transform: [{ scale: 0.98 }] },
              ]}
              hitSlop={6}
            >
              <Check size={12} color="#06070D" />
              <Text style={styles.acceptText}>ACCEPT</Text>
            </Pressable>
          </View>
        ) : n.resolution ? (
          <View
            style={[
              styles.resolvedChip,
              {
                borderColor:
                  n.resolution === "accepted"
                    ? theme.emerald + "77"
                    : theme.border,
              },
            ]}
          >
            <Text
              style={[
                styles.resolvedText,
                {
                  color:
                    n.resolution === "accepted"
                      ? theme.emeraldBright
                      : theme.textDim,
                },
              ]}
            >
              {n.resolution === "accepted" ? "ACCEPTED" : "DECLINED"}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderSoft,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.bgCard,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: theme.text,
    fontSize: 14,
    fontWeight: "900" as const,
    letterSpacing: 2,
  },
  subtitle: { color: theme.textDim, fontSize: 11, fontWeight: "700" as const, marginTop: 2 },
  markRead: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: theme.bgCard,
    borderWidth: 1,
    borderColor: theme.border,
  },
  markReadText: { color: theme.textMuted, fontSize: 10, fontWeight: "900" as const, letterSpacing: 1.2 },
  empty: {
    marginTop: 64,
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 30,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.bgCard,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { color: theme.text, fontSize: 15, fontWeight: "900" as const, letterSpacing: 0.5 },
  emptySub: { color: theme.textDim, fontSize: 12, textAlign: "center" as const, lineHeight: 18 },
  card: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.bgCard,
    borderWidth: 1,
    borderColor: theme.borderSoft,
    overflow: "hidden",
  },
  cardUnread: { backgroundColor: "rgba(255,255,255,0.03)", borderColor: theme.border },
  unreadDot: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    backgroundColor: theme.surface,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarInitial: { fontSize: 17, fontWeight: "900" as const },
  kindBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: theme.bgCard,
  },
  cardTitle: { color: theme.text, fontSize: 14, fontWeight: "900" as const, lineHeight: 18 },
  cardBody: { color: theme.textMuted, fontSize: 12, fontWeight: "600" as const, marginTop: 4, lineHeight: 16 },
  cardTime: { color: theme.textDim, fontSize: 10, fontWeight: "700" as const, marginTop: 6, letterSpacing: 0.6 },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  declineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  declineText: { color: theme.textMuted, fontSize: 10, fontWeight: "900" as const, letterSpacing: 1.2 },
  acceptBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  acceptText: { color: "#06070D", fontSize: 10, fontWeight: "900" as const, letterSpacing: 1.2 },
  resolvedChip: {
    alignSelf: "flex-start" as const,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: theme.surface,
    marginTop: 10,
  },
  resolvedText: { fontSize: 9, fontWeight: "900" as const, letterSpacing: 1.2 },
});
