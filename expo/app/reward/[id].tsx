import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Check, Copy, MapPin, ShieldCheck, Sparkles } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { CoinIcon } from "@/components/CoinIcon";
import { exchangeRate, getBrand, REWARDS } from "@/constants/rewards";
import { theme } from "@/constants/theme";
import { useGame } from "@/providers/GameProvider";
import type { VaultBrand } from "@/types/game";

export default function RewardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { player, redeem, exchange, isRedeeming } = useGame();

  const reward = useMemo(() => REWARDS.find((r) => r.id === id), [id]);
  const [code, setCode] = useState<string | null>(null);

  if (!reward) {
    return (
      <View style={[styles.root, { alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ color: theme.textMuted }}>Reward not found</Text>
      </View>
    );
  }

  const brand = reward.brand;
  const meta = getBrand(brand);
  const isBrand = !!brand;
  const brandBal = brand ? player.brandCoins[brand] ?? 0 : 0;
  const strideBal = player.coins;

  const brandCost = reward.brandCost ?? 0;
  const strideCost = reward.coinCost;

  const canPayBrand = isBrand && brand && brandBal >= brandCost;
  const canPayStride = !isBrand && strideBal >= strideCost;

  // If brand reward but no brand coins, suggest exchange
  const exchangeNeeded = isBrand && !canPayBrand ? Math.max(0, brandCost - brandBal) : 0;
  const exchangeCost = brand ? exchangeNeeded * exchangeRate(brand) : 0;
  const canExchangeIn = isBrand && exchangeNeeded > 0 && strideBal >= exchangeCost;

  const onRedeem = async () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    const payWith: "stride" | VaultBrand = isBrand && brand ? brand : "stride";
    const before = player.redemptions.length;
    await redeem({ rewardId: reward.id, payWith });
    // The new redemption is the first item now; pull its code.
    // We can't rely on closure of player; refetch is implicit. We display from updated state via effect:
    setTimeout(() => {
      const fresh = player.redemptions[0];
      if (player.redemptions.length > before && fresh) setCode(fresh.code);
    }, 0);
  };

  // Pull latest code after redeem (player state is reactive)
  React.useEffect(() => {
    const latest = player.redemptions.find((r) => r.rewardId === reward.id);
    if (latest && !code) setCode(latest.code);
  }, [player.redemptions, reward.id, code]);

  const heroColor = meta?.color ?? theme.gold;
  const heroGlow = meta?.colorBright ?? theme.goldBright;

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Hero */}
      <View style={[styles.hero, { borderColor: heroColor + "55" }]}>
        <LinearGradient
          colors={[heroColor + "55", heroColor + "10", "transparent"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.heroTop}>
          <Pressable onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/(tabs)/rewards'); }} hitSlop={10} style={styles.backBtn}>
            <ArrowLeft size={20} color={theme.text} />
          </Pressable>
          <View style={[styles.brandPill, { backgroundColor: heroColor }]}>
            <Text style={[styles.brandPillText, meta?.invertedText && { color: "#0E1117" }]}>
              {meta ? meta.short : "STRIDE"}
            </Text>
          </View>
        </View>

        <View style={styles.heroEmoji}>
          <Text style={{ fontSize: 64 }}>{reward.emoji}</Text>
        </View>

        <Text style={styles.heroBadge}>{reward.badge}</Text>
        <Text style={styles.heroTitle}>{reward.title}</Text>
        <Text style={styles.heroSub}>{reward.subtitle}</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Status banner */}
        {code ? (
          <View style={[styles.codeCard, { borderColor: theme.emerald + "88" }]}>
            <LinearGradient
              colors={["rgba(16,185,129,0.18)", "rgba(16,185,129,0.04)"]}
              style={StyleSheet.absoluteFill}
            />
            <Check size={18} color={theme.emeraldBright} />
            <Text style={styles.codeLabel}>REDEEMED · YOUR CODE</Text>
            <Text style={styles.codeValue}>{code}</Text>
            <Text style={styles.codeHint}>Show this at {reward.redeemAt}</Text>
            <Pressable
              style={styles.copyBtn}
              onPress={() => {
                if (Platform.OS !== "web") {
                  Haptics.selectionAsync().catch(() => {});
                }
              }}
            >
              <Copy size={12} color={theme.text} />
              <Text style={styles.copyBtnText}>COPY CODE</Text>
            </Pressable>
          </View>
        ) : (
          <View
            style={[
              styles.statusCard,
              {
                borderColor:
                  isBrand && canPayBrand
                    ? theme.emerald + "88"
                    : !isBrand && canPayStride
                    ? theme.emerald + "88"
                    : theme.border,
              },
            ]}
          >
            {isBrand && canPayBrand ? (
              <>
                <LinearGradient
                  colors={["rgba(16,185,129,0.16)", "transparent"]}
                  style={StyleSheet.absoluteFill}
                />
                <Check size={16} color={theme.emeraldBright} />
                <Text style={styles.statusText}>
                  You can claim this offer · {brandBal.toLocaleString()} {meta?.coinName}
                </Text>
              </>
            ) : !isBrand && canPayStride ? (
              <>
                <LinearGradient
                  colors={["rgba(16,185,129,0.16)", "transparent"]}
                  style={StyleSheet.absoluteFill}
                />
                <Check size={16} color={theme.emeraldBright} />
                <Text style={styles.statusText}>
                  You can claim this · {strideBal.toLocaleString()} Stride Coins
                </Text>
              </>
            ) : isBrand ? (
              <>
                <Sparkles size={16} color={heroGlow} />
                <Text style={styles.statusText}>
                  Need {exchangeNeeded.toLocaleString()} more {meta?.coinName}
                </Text>
              </>
            ) : (
              <>
                <Sparkles size={16} color={theme.gold} />
                <Text style={styles.statusText}>Earn more coins to unlock</Text>
              </>
            )}
          </View>
        )}

        {/* What you get */}
        <Text style={styles.sectionTitle}>WHAT YOU GET</Text>
        <View style={styles.bulletCard}>
          {(reward.valueGbp ? [`Worth approx. £${reward.valueGbp}`] : []).concat([
            `Redeem at ${reward.redeemAt}`,
            reward.inStoreOnly ? "Visit in-store to claim" : "Valid online and in-store",
            "Single-use code · expires in 30 days",
          ]).map((b, i) => (
            <View key={i} style={styles.bulletRow}>
              <View style={[styles.bulletDot, { backgroundColor: heroGlow }]} />
              <Text style={styles.bulletText}>{b}</Text>
            </View>
          ))}
        </View>

        {/* Where */}
        <Text style={styles.sectionTitle}>WHERE TO REDEEM</Text>
        <View style={styles.bulletCard}>
          <View style={styles.bulletRow}>
            <MapPin size={14} color={heroGlow} />
            <Text style={styles.bulletText}>{reward.redeemAt}</Text>
          </View>
          <View style={styles.bulletRow}>
            <ShieldCheck size={14} color={theme.emeraldBright} />
            <Text style={styles.bulletText}>Stride Quest verified partner</Text>
          </View>
        </View>

        {/* Exchange shortcut if needed */}
        {isBrand && brand && !canPayBrand && exchangeNeeded > 0 ? (
          <Pressable
            disabled={!canExchangeIn}
            onPress={async () => {
              await exchange({ brand, brandAmount: exchangeNeeded });
              if (Platform.OS !== "web") {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
              }
            }}
            style={({ pressed }) => [
              styles.exchangeShortcut,
              !canExchangeIn && { opacity: 0.5 },
              pressed && { transform: [{ scale: 0.99 }] },
            ]}
          >
            <CoinIcon size={28} />
            <View style={{ flex: 1 }}>
              <Text style={styles.exchangeShortcutTitle}>
                Convert {exchangeCost.toLocaleString()} Stride → {exchangeNeeded.toLocaleString()} {meta?.short} Coins
              </Text>
              <Text style={styles.exchangeShortcutSub}>
                {canExchangeIn ? "Tap to top up your brand wallet" : "Not enough Stride Coins"}
              </Text>
            </View>
            <CoinIcon brand={brand} size={28} />
          </Pressable>
        ) : null}
      </ScrollView>

      {/* Bottom CTA */}
      {!code ? (
        <View style={styles.ctaBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.ctaCost}>COST</Text>
            <View style={styles.ctaCostLine}>
              <CoinIcon brand={brand} size={18} />
              <Text style={styles.ctaCostValue}>
                {isBrand ? brandCost.toLocaleString() : strideCost.toLocaleString()}
              </Text>
              <Text style={styles.ctaCostUnit}>{meta ? meta.short : "STRIDE"}</Text>
            </View>
          </View>
          <Pressable
            disabled={(isBrand ? !canPayBrand : !canPayStride) || isRedeeming}
            onPress={onRedeem}
            style={({ pressed }) => [
              styles.ctaBtn,
              { backgroundColor: heroColor },
              ((isBrand ? !canPayBrand : !canPayStride) || isRedeeming) && { opacity: 0.4 },
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
          >
            <Text style={[styles.ctaBtnText, meta?.invertedText && { color: "#0E1117" }]}>
              SLIDE TO CLAIM REWARD
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  hero: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    overflow: "hidden",
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
  },
  brandPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4 },
  brandPillText: { color: "#FFF", fontSize: 10, fontWeight: "900" as const, letterSpacing: 1.4 },
  heroEmoji: {
    alignSelf: "center",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  heroBadge: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "900" as const,
    letterSpacing: 1.8,
    textAlign: "center" as const,
    opacity: 0.9,
  },
  heroTitle: {
    color: theme.text,
    fontSize: 24,
    fontWeight: "900" as const,
    textAlign: "center" as const,
    marginTop: 6,
  },
  heroSub: {
    color: theme.textMuted,
    fontSize: 12,
    fontWeight: "600" as const,
    textAlign: "center" as const,
    marginTop: 6,
    paddingHorizontal: 8,
  },
  statusCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.bgCard,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    overflow: "hidden",
  },
  statusText: { color: theme.text, fontSize: 12, fontWeight: "700" as const, flex: 1 },
  codeCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 18,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.bgCard,
    borderWidth: 1,
    alignItems: "center",
    gap: 6,
    overflow: "hidden",
  },
  codeLabel: { color: theme.emeraldBright, fontSize: 10, fontWeight: "900" as const, letterSpacing: 1.6, marginTop: 6 },
  codeValue: { color: theme.text, fontSize: 28, fontWeight: "900" as const, letterSpacing: 6, marginVertical: 4 },
  codeHint: { color: theme.textMuted, fontSize: 11 },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
    marginTop: 6,
  },
  copyBtnText: { color: theme.text, fontSize: 10, fontWeight: "900" as const, letterSpacing: 1.4 },
  sectionTitle: {
    color: theme.text,
    fontSize: 12,
    fontWeight: "900" as const,
    letterSpacing: 2,
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 10,
  },
  bulletCard: {
    marginHorizontal: 16,
    padding: 14,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.bgCard,
    borderWidth: 1,
    borderColor: theme.borderSoft,
    gap: 10,
  },
  bulletRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  bulletDot: { width: 6, height: 6, borderRadius: 3 },
  bulletText: { color: theme.textMuted, fontSize: 12, flex: 1 },
  exchangeShortcut: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.bgCard,
    borderWidth: 1,
    borderColor: theme.gold + "55",
  },
  exchangeShortcutTitle: { color: theme.text, fontSize: 12, fontWeight: "800" as const },
  exchangeShortcutSub: { color: theme.textDim, fontSize: 10, marginTop: 2 },
  ctaBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 30 : 16,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: theme.bgElev,
  },
  ctaCost: { color: theme.textDim, fontSize: 9, fontWeight: "900" as const, letterSpacing: 1.4 },
  ctaCostLine: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  ctaCostValue: { color: theme.text, fontSize: 18, fontWeight: "900" as const },
  ctaCostUnit: { color: theme.textDim, fontSize: 10, fontWeight: "800" as const, letterSpacing: 1 },
  ctaBtn: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: theme.radius.md,
  },
  ctaBtnText: { color: "#FFF", fontSize: 12, fontWeight: "900" as const, letterSpacing: 1.4 },
});
