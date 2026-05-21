import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import {
  Crown,
  Hourglass,
  Lock,
  Minus,
  Plus,
  Sparkles,
  Ticket,
  Trophy,
  Users,
  X,
} from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CoinIcon } from "@/components/CoinIcon";
import { findRaffle, formatCountdown } from "@/constants/raffles";
import { getBrand } from "@/constants/rewards";
import { theme } from "@/constants/theme";
import { useGame } from "@/providers/GameProvider";
import type { VaultBrand } from "@/types/game";

export default function RaffleModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    player,
    raffles,
    enterRaffle,
    isEnteringRaffle,
    entriesForRaffle,
    strideStatus,
    plusActive,
    now,
  } = useGame();

  const raffle = useMemo(
    () => raffles.find((r) => r.id === id) ?? findRaffle(String(id)),
    [raffles, id]
  );

  const [qty, setQty] = useState<number>(1);
  const [payWith, setPayWith] = useState<"stride" | VaultBrand>("stride");

  if (!raffle) {
    return (
      <SafeAreaView style={styles.root}>
        <Text style={{ color: theme.text, padding: 24 }}>Raffle not found.</Text>
      </SafeAreaView>
    );
  }

  const ended = raffle.endsAt < now;
  const meta = getBrand(raffle.brand);
  const accent = raffle.plusOnly ? theme.gold : (meta?.color ?? theme.gold);
  const glow = raffle.plusOnly ? theme.goldBright : (meta?.colorBright ?? theme.goldBright);
  const plusLocked = !!raffle.plusOnly && !plusActive;

  const owned = entriesForRaffle(raffle.id);
  const remaining = Math.max(0, raffle.maxEntriesPerUser - owned);
  const totalEntries = raffle.totalEntries + owned;

  const discount = strideStatus.current.raffleDiscount;
  const strideUnit = Math.max(1, Math.round(raffle.entryCost * (1 - discount)));
  const unitCost =
    payWith === "stride"
      ? strideUnit
      : raffle.brandEntryCost ?? raffle.entryCost;
  const cost = unitCost * qty;
  const balance =
    payWith === "stride"
      ? player.coins
      : raffle.brand
      ? player.brandCoins[raffle.brand] ?? 0
      : 0;
  const canAfford = balance >= cost;
  const validQty = qty > 0 && qty <= remaining;

  const odds = useMemo(() => {
    const my = owned + qty;
    if (my <= 0) return "—";
    const pool = totalEntries + qty;
    return `1 in ${Math.max(1, Math.round(pool / my / Math.max(1, raffle.winners)))}`;
  }, [owned, qty, totalEntries, raffle.winners]);

  const onBuy = useCallback(async () => {
    if (plusLocked) {
      router.push("/plus");
      return;
    }
    if (ended || !validQty || !canAfford || isEnteringRaffle) return;
    if (Platform.OS !== "web") {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (e) {
        console.log("[Raffle] haptics", e);
      }
    }
    await enterRaffle({ raffleId: raffle.id, entries: qty, payWith });
    if (Platform.OS !== "web") {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {
        console.log("[Raffle] haptics success", e);
      }
    }
    setQty(1);
  }, [plusLocked, ended, validQty, canAfford, isEnteringRaffle, enterRaffle, raffle.id, qty, payWith]);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          <LinearGradient
            colors={[accent + "55", accent + "10", "transparent"]}
            style={StyleSheet.absoluteFill}
          />
          <SafeAreaView edges={["top"]} style={{ width: "100%" }}>
            <View style={styles.topRow}>
              <View style={styles.pillRow}>
                {raffle.plusOnly ? (
                  <View style={[styles.brandPill, { backgroundColor: theme.goldBright, flexDirection: "row", alignItems: "center", gap: 4 }]}>
                    <Crown size={9} color="#1A0A00" />
                    <Text style={[styles.brandPillText, { color: "#1A0A00" }]}>PLUS</Text>
                  </View>
                ) : meta ? (
                  <View style={[styles.brandPill, { backgroundColor: meta.color }]}>
                    <Text style={styles.brandPillText}>{meta.short}</Text>
                  </View>
                ) : (
                  <View style={[styles.brandPill, { backgroundColor: theme.gold }]}>
                    <Text style={[styles.brandPillText, { color: "#1A1300" }]}>STRIDE</Text>
                  </View>
                )}
                <View style={[styles.timerPill, { borderColor: ended ? theme.border : accent + "AA" }]}>
                  <Hourglass size={10} color={ended ? theme.textDim : glow} />
                  <Text style={[styles.timerText, { color: ended ? theme.textDim : glow }]}>
                    {ended ? "DRAWN" : `ENDS IN ${formatCountdown(raffle.endsAt - now)}`}
                  </Text>
                </View>
              </View>
              <Pressable onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/(tabs)/raffles'); }} style={styles.closeBtn} hitSlop={10}>
                <X size={20} color={theme.textMuted} />
              </Pressable>
            </View>

            <View style={styles.prizeHero}>
              <View style={[styles.prizeRing, { borderColor: accent }]}>
                <Text style={{ fontSize: 60 }}>{raffle.emoji}</Text>
              </View>
              <Text style={styles.title}>{raffle.title}</Text>
              <Text style={styles.prizeText}>{raffle.prize}</Text>
              <Text style={[styles.value, { color: glow }]}>£{raffle.prizeValueGbp.toLocaleString()}</Text>
            </View>
          </SafeAreaView>
        </View>

        <View style={styles.statRow}>
          <Stat
            icon={<Trophy size={14} color={glow} />}
            value={raffle.winners.toString()}
            label="WINNERS"
          />
          <Stat
            icon={<Users size={14} color={theme.textMuted} />}
            value={totalEntries.toLocaleString()}
            label="TOTAL ENTRIES"
          />
          <Stat
            icon={<Ticket size={14} color={theme.emeraldBright} />}
            value={owned.toString()}
            label="YOUR ENTRIES"
          />
        </View>

        {/* PAY-WITH SELECTOR */}
        {raffle.brand && raffle.brandEntryCost ? (
          <View style={styles.payRow}>
            <PayPill
              active={payWith === "stride"}
              label="STRIDE COINS"
              cost={strideUnit}
              originalCost={discount > 0 ? raffle.entryCost : undefined}
              brand={undefined}
              onPress={() => setPayWith("stride")}
            />
            <PayPill
              active={payWith === raffle.brand}
              label={`${meta?.short ?? ""} COINS`}
              cost={raffle.brandEntryCost}
              brand={raffle.brand}
              onPress={() => raffle.brand && setPayWith(raffle.brand)}
            />
          </View>
        ) : null}

        {/* QUANTITY STEPPER */}
        <Text style={styles.section}>BUY ENTRIES</Text>
        <View style={styles.qtyCard}>
          <Pressable
            onPress={() => setQty((q) => Math.max(1, q - 1))}
            style={({ pressed }) => [styles.qtyBtn, pressed && { opacity: 0.6 }]}
          >
            <Minus size={18} color={theme.text} />
          </Pressable>
          <View style={styles.qtyMid}>
            <Text style={styles.qtyValue}>{qty}</Text>
            <Text style={styles.qtyLabel}>ENTRIES</Text>
          </View>
          <Pressable
            onPress={() => setQty((q) => Math.min(remaining, q + 1))}
            style={({ pressed }) => [styles.qtyBtn, pressed && { opacity: 0.6 }]}
          >
            <Plus size={18} color={theme.text} />
          </Pressable>
        </View>

        <View style={styles.quickRow}>
          {[1, 5, 10, 25].map((n) => (
            <Pressable
              key={n}
              onPress={() => setQty(Math.min(remaining, n))}
              style={({ pressed }) => [
                styles.quickBtn,
                qty === n && { borderColor: accent, backgroundColor: accent + "1F" },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[styles.quickText, qty === n && { color: glow }]}>{n}×</Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => setQty(remaining)}
            style={({ pressed }) => [
              styles.quickBtn,
              qty === remaining && remaining > 0 && { borderColor: accent, backgroundColor: accent + "1F" },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.quickText, qty === remaining && remaining > 0 && { color: glow }]}>
              MAX
            </Text>
          </Pressable>
        </View>

        {/* SUMMARY */}
        <View style={styles.summary}>
          <View style={styles.sumRow}>
            <Text style={styles.sumLabel}>Cost</Text>
            <View style={styles.sumValRow}>
              <CoinIcon size={14} brand={payWith === "stride" ? undefined : (payWith as VaultBrand)} />
              <Text style={[styles.sumVal, !canAfford && { color: theme.ruby }]}>
                {cost.toLocaleString()}
              </Text>
            </View>
          </View>
          <View style={styles.sumRow}>
            <Text style={styles.sumLabel}>Balance after</Text>
            <Text style={[styles.sumVal, { color: theme.textMuted }]}>
              {Math.max(0, balance - cost).toLocaleString()}
            </Text>
          </View>
          <View style={styles.sumRow}>
            <Text style={styles.sumLabel}>Your odds</Text>
            <Text style={[styles.sumVal, { color: glow }]}>{odds}</Text>
          </View>
          <Text style={styles.cap}>
            Cap: {owned + qty}/{raffle.maxEntriesPerUser} entries per player
          </Text>
        </View>

        {/* CTA */}
        <Pressable
          disabled={!plusLocked && (ended || !validQty || !canAfford || isEnteringRaffle)}
          onPress={onBuy}
          style={({ pressed }) => [
            styles.cta,
            !plusLocked && (ended || !validQty || !canAfford) && { opacity: 0.4 },
            pressed && { transform: [{ scale: 0.99 }] },
          ]}
        >
          <LinearGradient
            colors={[accent, glow]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {isEnteringRaffle ? (
            <ActivityIndicator color={theme.bg} />
          ) : plusLocked ? (
            <>
              <Lock size={16} color={theme.bg} />
              <Text style={styles.ctaText}>STRIDE+ ONLY · UPGRADE TO ENTER</Text>
            </>
          ) : (
            <>
              <Sparkles size={16} color={theme.bg} />
              <Text style={styles.ctaText}>
                {ended
                  ? "DRAW CLOSED"
                  : !canAfford
                  ? "NOT ENOUGH COINS"
                  : `BUY ${qty} ENTRY${qty === 1 ? "" : "S"}`}
              </Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <View style={styles.stat}>
      {icon}
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function PayPill({
  active,
  label,
  cost,
  originalCost,
  brand,
  onPress,
}: {
  active: boolean;
  label: string;
  cost: number;
  originalCost?: number;
  brand?: VaultBrand;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.payPill,
        active && { borderColor: theme.gold, backgroundColor: theme.gold + "1F" },
        pressed && { opacity: 0.8 },
      ]}
    >
      <CoinIcon size={18} brand={brand} />
      <View>
        <Text style={[styles.payLabel, active && { color: theme.goldBright }]}>{label}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          {originalCost && originalCost !== cost ? (
            <Text style={[styles.payCost, { textDecorationLine: "line-through" }]}>
              {originalCost}
            </Text>
          ) : null}
          <Text style={[styles.payCost, originalCost && originalCost !== cost && { color: theme.emeraldBright }]}>
            {cost} per entry
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  header: { paddingHorizontal: 20, paddingBottom: 24, overflow: "hidden" },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 8 },
  pillRow: { flexDirection: "row", gap: 6, alignItems: "center" },
  brandPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  brandPillText: { color: "#FFF", fontSize: 9, fontWeight: "900" as const, letterSpacing: 1.2 },
  timerPill: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: theme.surface,
  },
  timerText: { fontSize: 10, fontWeight: "900" as const, letterSpacing: 1 },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.bgCard,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
  },
  prizeHero: { alignItems: "center", marginTop: 18 },
  prizeRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    backgroundColor: theme.bgElev,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: { color: theme.text, fontSize: 22, fontWeight: "900" as const, textAlign: "center" as const },
  prizeText: { color: theme.textMuted, fontSize: 13, fontWeight: "600" as const, marginTop: 4, textAlign: "center" as const, paddingHorizontal: 12 },
  value: { fontSize: 18, fontWeight: "900" as const, marginTop: 6, letterSpacing: 1 },
  statRow: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginTop: 6 },
  stat: {
    flex: 1,
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.borderSoft,
    paddingVertical: 12,
    alignItems: "center",
    gap: 4,
  },
  statValue: { color: theme.text, fontSize: 16, fontWeight: "900" as const, marginTop: 2 },
  statLabel: { color: theme.textDim, fontSize: 9, fontWeight: "800" as const, letterSpacing: 1.2 },
  payRow: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginTop: 16 },
  payPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.bgCard,
  },
  payLabel: { color: theme.text, fontSize: 11, fontWeight: "900" as const, letterSpacing: 1.2 },
  payCost: { color: theme.textDim, fontSize: 10, fontWeight: "700" as const, marginTop: 1 },
  section: {
    color: theme.text,
    fontSize: 12,
    fontWeight: "900" as const,
    letterSpacing: 2,
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 10,
  },
  qtyCard: {
    marginHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.borderSoft,
    gap: 12,
  },
  qtyBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyMid: { flex: 1, alignItems: "center" },
  qtyValue: { color: theme.text, fontSize: 36, fontWeight: "900" as const, lineHeight: 40 },
  qtyLabel: { color: theme.textDim, fontSize: 10, fontWeight: "800" as const, letterSpacing: 1.4, marginTop: 2 },
  quickRow: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginTop: 10 },
  quickBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    backgroundColor: theme.bgCard,
  },
  quickText: { color: theme.text, fontSize: 12, fontWeight: "900" as const, letterSpacing: 1 },
  summary: {
    marginHorizontal: 16,
    marginTop: 18,
    padding: 14,
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.borderSoft,
    gap: 8,
  },
  sumRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sumLabel: { color: theme.textMuted, fontSize: 12, fontWeight: "700" as const },
  sumVal: { color: theme.text, fontSize: 14, fontWeight: "900" as const },
  sumValRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  cap: { color: theme.textDim, fontSize: 10, marginTop: 4, fontWeight: "600" as const, textAlign: "center" as const },
  cta: {
    marginHorizontal: 16,
    marginTop: 16,
    height: 56,
    borderRadius: theme.radius.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    overflow: "hidden",
  },
  ctaText: { color: theme.bg, fontSize: 14, fontWeight: "900" as const, letterSpacing: 1.5 },
});
