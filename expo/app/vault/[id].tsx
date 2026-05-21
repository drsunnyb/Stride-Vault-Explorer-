import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import {
  Check,
  Coins,
  Flame,
  Footprints,
  Lock,
  MapPin,
  Sparkles,
  Timer,
  X,
  Zap,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
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

import { CoinBurst } from "@/components/CoinBurst";
import { ShareSheet } from "@/components/ShareSheet";
import { StrideStatusBadge } from "@/components/StrideStatusBadge";
import {
  activePowerHour,
  FINAL_HOUR_MULTIPLIER,
  HOT_VAULT_MULTIPLIER,
  inFinalHour,
  streakMultiplier,
} from "@/constants/retention";
import { getStrideStatus } from "@/constants/status";
import { theme, tierColor, tierGlow, tierLabel } from "@/constants/theme";
import { CLAIM_RADIUS_METERS, VAULTS, respawnMs } from "@/constants/vaults";
import { distanceMeters, formatDistance } from "@/lib/geo";
import { useGame } from "@/providers/GameProvider";
import type { VaultBrand } from "@/types/game";

const BRAND_THEME: Record<VaultBrand, { color: string; glow: string; label: string; tagline: string }> = {
  nike: {
    color: "#FF6B00",
    glow: "#FF9F45",
    label: "NIKE PARTNER VAULT",
    tagline: "Unlock in-store for the Air Drop — vault refreshes daily.",
  },
  apple: {
    color: "#E5E7EB",
    glow: "#FFFFFF",
    label: "APPLE PARTNER VAULT",
    tagline: "Tap inside the store for the AirDrop — vault refreshes daily.",
  },
};

function formatHMS(ms: number): string {
  if (ms <= 0) return "ready";
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec.toString().padStart(2, "0")}s`;
  return `${sec}s`;
}

export default function VaultModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { player, claimVault, isClaiming, teleportTo, minStepsBetweenClaims, hotVaultIds, comebackActive, tribe, shouldShowPaywall, markPaywallShown } = useGame();
  const [burst, setBurst] = useState<boolean>(false);
  const [shareOpen, setShareOpen] = useState<boolean>(false);

  const vault = VAULTS.find((v) => v.id === id);

  // Live timer for cooldown.
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!vault) {
    return (
      <SafeAreaView style={styles.root}>
        <Text style={{ color: theme.text, padding: 24 }}>Vault not found.</Text>
      </SafeAreaView>
    );
  }

  const brandTheme = vault.brand ? BRAND_THEME[vault.brand] : undefined;
  const color = brandTheme?.color ?? tierColor(vault.tier);
  const glow = brandTheme?.glow ?? tierGlow(vault.tier);
  const status = getStrideStatus(player.claimed.length);
  const dist = distanceMeters({ lat: player.lat, lng: player.lng }, vault);

  const latestClaim = player.claimed.find((c) => c.id === vault.id);
  const cooldownMs = respawnMs(vault);
  const respawnAt = latestClaim ? latestClaim.claimedAt + cooldownMs : 0;
  const cooling = !!latestClaim && respawnAt > now;
  const cooldownRemaining = Math.max(0, respawnAt - now);
  const inRange = dist <= CLAIM_RADIUS_METERS;
  const stepsSinceLast = player.steps - player.stepsAtLastClaim;
  const stepGated =
    player.claimed.length > 0 && stepsSinceLast < minStepsBetweenClaims;
  const stepsNeeded = Math.max(0, minStepsBetweenClaims - stepsSinceLast);

  const onClaim = useCallback(async () => {
    if (cooling || !inRange || stepGated) return;
    setBurst(true);
    if (Platform.OS !== "web") {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {
        console.log("[Vault] haptics", e);
      }
    }
    await claimVault(vault);
    // Soft paywall after first vault claim — once-per-week cap.
    if (shouldShowPaywall("first_claim")) {
      await markPaywallShown();
      setTimeout(() => router.push("/plus"), 1800);
    }
  }, [cooling, inRange, stepGated, claimVault, vault, shouldShowPaywall, markPaywallShown]);

  const onWalkHere = useCallback(async () => {
    if (Platform.OS !== "web") {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {
        console.log("[Vault] haptics", e);
      }
    }
    await teleportTo(vault.lat, vault.lng);
  }, [teleportTo, vault]);

  const brandLabel = brandTheme?.label ?? null;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.header}>
          <LinearGradient
            colors={[color + "55", color + "10", "transparent"]}
            style={StyleSheet.absoluteFill}
          />
          <SafeAreaView edges={["top"]} style={{ width: "100%" }}>
            <View style={styles.headerTop}>
              <View style={styles.headerPills}>
                <View style={[styles.tierPill, { borderColor: color, backgroundColor: color + "22" }]}>
                  <Text style={[styles.tierText, { color: glow }]}>{tierLabel(vault.tier).toUpperCase()} TIER</Text>
                </View>
                {brandLabel && brandTheme && (
                  <View style={[styles.brandPill, { backgroundColor: brandTheme.glow }]}>
                    <Text style={styles.brandPillText}>{brandLabel}</Text>
                  </View>
                )}
                <StrideStatusBadge status={status.current} size="sm" />
              </View>
              <Pressable onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/'); }} style={styles.closeBtn} hitSlop={10}>
                <X size={20} color={theme.textMuted} />
              </Pressable>
            </View>

            <View style={styles.iconHero}>
              <View style={[styles.iconRing, { borderColor: color }]}>
                <View style={[styles.iconGlow, { backgroundColor: color, opacity: 0.25 }]} />
                {cooling ? (
                  <Timer size={42} color={glow} />
                ) : inRange ? (
                  <Sparkles size={42} color={glow} />
                ) : (
                  <Lock size={36} color={glow} />
                )}
              </View>
            </View>

            <Text style={styles.title}>{vault.name}</Text>
            <View style={styles.areaRow}>
              <MapPin size={12} color={theme.textMuted} />
              <Text style={styles.area}>{vault.area} · London</Text>
            </View>
          </SafeAreaView>
        </View>

        <Text style={styles.blurb}>{vault.blurb}</Text>

        {brandTheme && (
          <View style={[styles.brandBanner, { borderColor: brandTheme.color + "66", backgroundColor: brandTheme.color + "14" }]}>
            <View style={[styles.brandBannerDot, { backgroundColor: brandTheme.glow }]} />
            <Text style={styles.brandBannerText}>{brandTheme.tagline}</Text>
          </View>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Coins size={16} color={theme.gold} />
            <Text style={styles.statVal}>+{vault.reward.coins}</Text>
            <Text style={styles.statLab}>COINS</Text>
          </View>
          <View style={styles.statBox}>
            <Sparkles size={16} color={theme.emeraldBright} />
            <Text style={[styles.statVal, { color: theme.emeraldBright }]}>+{vault.reward.xp}</Text>
            <Text style={styles.statLab}>XP</Text>
          </View>
          <View style={styles.statBox}>
            <Footprints size={16} color={theme.textMuted} />
            <Text style={styles.statVal}>{cooling ? "—" : formatDistance(dist)}</Text>
            <Text style={styles.statLab}>{cooling ? "DONE" : "AWAY"}</Text>
          </View>
        </View>

        <View style={styles.rangeCard}>
          <View
            style={[
              styles.rangeDot,
              {
                backgroundColor: cooling
                  ? theme.gold
                  : inRange
                  ? theme.emeraldBright
                  : theme.textMuted,
              },
            ]}
          />
          <Text style={styles.rangeText}>
            {cooling
              ? `Respawning in ${formatHMS(cooldownRemaining)}`
              : stepGated
              ? `Walk ${stepsNeeded} more steps to claim again`
              : inRange
              ? `You're within ${CLAIM_RADIUS_METERS}m — ready to unlock`
              : `Walk ${formatDistance(dist - CLAIM_RADIUS_METERS)} closer to unlock`}
          </Text>
        </View>

        <View style={styles.respawnInfo}>
          <Timer size={12} color={theme.textDim} />
          <Text style={styles.respawnInfoText}>
            Respawns every {Math.round(cooldownMs / 3600000)}h after a claim
            {vault.brand ? ` · brand partner` : ""}
          </Text>
        </View>

        {/* Multiplier breakdown — always shows player what they'd earn right now. */}
        <MultiplierCard
          vault={vault}
          isHot={hotVaultIds.has(vault.id)}
          streakDays={player.streakDays}
          comeback={comebackActive}
          tribeBoosted={!!tribe && player.lastTribeWinWeekKey !== undefined}
        />

        <View style={styles.actions}>
          {!cooling && !inRange && (
            <Pressable onPress={onWalkHere} style={[styles.btn, styles.btnSecondary]}>
              <Footprints size={16} color={theme.textMuted} />
              <Text style={styles.btnSecondaryText}>Walk here (demo)</Text>
            </Pressable>
          )}

          <Pressable
            onPress={onClaim}
            disabled={cooling || !inRange || stepGated || isClaiming}
            style={[
              styles.btn,
              styles.btnPrimary,
              (cooling || !inRange || stepGated) && styles.btnDisabled,
            ]}
          >
            <LinearGradient
              colors={cooling || !inRange || stepGated ? [theme.surface, theme.surface] : [color, glow]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {isClaiming ? (
              <ActivityIndicator color={theme.bg} />
            ) : (
              <Text
                style={[
                  styles.btnPrimaryText,
                  (cooling || !inRange || stepGated) && { color: theme.textDim },
                ]}
              >
                {cooling
                  ? `LOCKED · ${formatHMS(cooldownRemaining)}`
                  : stepGated
                  ? `WALK ${stepsNeeded} MORE STEPS`
                  : inRange
                  ? "UNLOCK VAULT"
                  : "OUT OF RANGE"}
              </Text>
            )}
          </Pressable>

          {latestClaim && !cooling && (
            <View style={styles.lastClaimRow}>
              <Check size={12} color={theme.emeraldBright} />
              <Text style={styles.lastClaimText}>
                Last claimed {timeAgo(latestClaim.claimedAt)} · ready again
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <CoinBurst
        visible={burst}
        tier={vault.tier}
        brand={vault.brand}
        coins={vault.reward.coins}
        xp={vault.reward.xp}
        vaultName={vault.name}
        onShare={() => {
          setBurst(false);
          setShareOpen(true);
        }}
        onDone={() => {
          setBurst(false);
          if (shareOpen) return;
          if (router.canGoBack()) router.back(); else router.replace('/');
        }}
      />

      <ShareSheet
        visible={shareOpen}
        vault={vault}
        onClose={() => {
          setShareOpen(false);
          if (router.canGoBack()) router.back(); else router.replace('/');
        }}
      />
    </View>
  );
}

/** Stacked-multiplier card. Live-derived so every modifier the player can
 *  feel on the home screen also shows up here at the moment of claim. */
function MultiplierCard({
  vault,
  isHot,
  streakDays,
  comeback,
  tribeBoosted,
}: {
  vault: { reward: { coins: number } };
  isHot: boolean;
  streakDays: number;
  comeback: boolean;
  tribeBoosted: boolean;
}) {
  const ph = activePowerHour(Date.now());
  const finalHour = inFinalHour("week");
  const streakMult = streakMultiplier(streakDays);
  const parts: { label: string; mult: number; color: string }[] = [];
  if (streakMult > 1) parts.push({ label: `Streak ${streakDays}d`, mult: streakMult, color: theme.ruby });
  if (isHot) parts.push({ label: "Hot Vault", mult: HOT_VAULT_MULTIPLIER, color: theme.ruby });
  if (ph) parts.push({ label: `Power Hour ${ph.multiplier}×`, mult: ph.multiplier, color: theme.goldBright });
  if (finalHour) parts.push({ label: "Final Hour", mult: FINAL_HOUR_MULTIPLIER, color: theme.ruby });
  if (comeback) parts.push({ label: "Comeback", mult: 1.5, color: theme.emeraldBright });
  if (tribeBoosted) parts.push({ label: "Tribe win", mult: 1.1, color: theme.sapphire });
  if (parts.length === 0) return null;
  const total = parts.reduce((m, p) => m * p.mult, 1);
  const capped = Math.min(20, total);
  const projected = Math.round(vault.reward.coins * capped);
  return (
    <View style={multStyles.card}>
      <LinearGradient
        colors={["rgba(244,208,63,0.14)", "rgba(244,208,63,0.02)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={multStyles.head}>
        <Zap size={13} color={theme.goldBright} />
        <Text style={multStyles.headText}>STACKED MULTIPLIERS</Text>
        <Text style={multStyles.headTotal}>{capped.toFixed(2)}×</Text>
      </View>
      <View style={multStyles.chips}>
        {parts.map((p) => (
          <View key={p.label} style={[multStyles.chip, { borderColor: p.color + "AA", backgroundColor: p.color + "18" }]}>
            {p.label.toLowerCase().includes("hot") ? <Flame size={10} color={p.color} /> : <Sparkles size={10} color={p.color} />}
            <Text style={[multStyles.chipText, { color: p.color }]}>{p.label} · {p.mult}×</Text>
          </View>
        ))}
      </View>
      <Text style={multStyles.projected}>
        Projected payout: <Text style={{ color: theme.goldBright, fontWeight: "900" as const }}>{projected.toLocaleString()}c</Text>
        {total > 20 ? <Text style={{ color: theme.textDim }}>  · capped at 20×</Text> : null}
      </Text>
    </View>
  );
}

const multStyles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.gold + "55",
    overflow: "hidden",
    backgroundColor: theme.bgCard,
    gap: 8,
  },
  head: { flexDirection: "row", alignItems: "center", gap: 6 },
  headText: { color: theme.goldBright, fontSize: 10, fontWeight: "900" as const, letterSpacing: 1.6, flex: 1 },
  headTotal: { color: theme.goldBright, fontSize: 14, fontWeight: "900" as const, letterSpacing: 0.4 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  chipText: { fontSize: 10, fontWeight: "900" as const, letterSpacing: 0.4 },
  projected: { color: theme.text, fontSize: 12, fontWeight: "700" as const, marginTop: 2 },
});

function timeAgo(ts: number): string {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  header: {
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: "center",
    overflow: "hidden",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingTop: 8,
    gap: 8,
  },
  headerPills: { flexDirection: "row", flexWrap: "wrap", gap: 6, flex: 1 },
  tierPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
  },
  tierText: { fontSize: 10, fontWeight: "900" as const, letterSpacing: 1.4 },
  brandPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.text,
  },
  brandPillText: { color: theme.bg, fontSize: 9, fontWeight: "900" as const, letterSpacing: 1.4 },
  brandBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: theme.radius.md,
    borderWidth: 1,
  },
  brandBannerDot: { width: 8, height: 8, borderRadius: 4 },
  brandBannerText: { flex: 1, color: theme.text, fontSize: 12, fontWeight: "700" as const },
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
  iconHero: { alignItems: "center", marginTop: 24, marginBottom: 12 },
  iconRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.bgElev,
    overflow: "hidden",
  },
  iconGlow: { ...StyleSheet.absoluteFillObject, borderRadius: 60 },
  title: { color: theme.text, fontSize: 28, fontWeight: "900" as const, textAlign: "center" },
  areaRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 6 },
  area: { color: theme.textMuted, fontSize: 12, fontWeight: "600" as const },
  blurb: {
    color: theme.textMuted,
    fontSize: 14,
    lineHeight: 21,
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 18,
    textAlign: "center",
  },
  statsRow: { flexDirection: "row", paddingHorizontal: 16, gap: 8 },
  statBox: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.borderSoft,
    alignItems: "center",
    gap: 4,
  },
  statVal: { color: theme.gold, fontSize: 20, fontWeight: "900" as const, marginTop: 2 },
  statLab: { color: theme.textDim, fontSize: 9, fontWeight: "800" as const, letterSpacing: 1.4 },
  rangeCard: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.borderSoft,
  },
  rangeDot: { width: 10, height: 10, borderRadius: 5 },
  rangeText: { color: theme.text, fontSize: 13, fontWeight: "700" as const, flex: 1 },
  respawnInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  respawnInfoText: { color: theme.textDim, fontSize: 11, fontWeight: "600" as const },
  actions: { paddingHorizontal: 16, paddingTop: 14, gap: 10 },
  btn: {
    height: 56,
    borderRadius: theme.radius.lg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    overflow: "hidden",
  },
  btnPrimary: {},
  btnPrimaryText: {
    color: "#0E1117",
    fontSize: 15,
    fontWeight: "900" as const,
    letterSpacing: 1.5,
  },
  btnDisabled: {},
  btnSecondary: {
    backgroundColor: theme.bgCard,
    borderWidth: 1,
    borderColor: theme.border,
  },
  btnSecondaryText: { color: theme.text, fontSize: 14, fontWeight: "800" as const },
  lastClaimRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: 4,
  },
  lastClaimText: { color: theme.emeraldBright, fontSize: 11, fontWeight: "700" as const },
});
