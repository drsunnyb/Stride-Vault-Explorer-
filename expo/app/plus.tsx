import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  Check,
  Clock3,
  Coins,
  Crown,
  Flame,
  Footprints,
  Sparkles,
  Ticket,
  Trophy,
  X,
  Zap,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PLUS, type PlusPlan } from "@/constants/plus";
import { theme } from "@/constants/theme";
import { useGame } from "@/providers/GameProvider";

const { width: SCREEN_W } = Dimensions.get("window");

/** Three rotating hero hooks shown at the top of the paywall. */
const HOOKS = [
  {
    icon: Coins,
    headline: "Earn more on every step",
    sub: `+${Math.round(PLUS.payoutBonus * 100)}% coins on every claim · ${Math.round(
      (PLUS.plusBrandCoinFraction - PLUS.freeBrandCoinFraction) * 100
    )}% bigger brand bonuses`,
    tint: "#F4D03F",
  },
  {
    icon: Trophy,
    headline: "Unlock exclusive raffles",
    sub: "Members-only draws · 1 free entry every week",
    tint: "#FF7A45",
  },
  {
    icon: Zap,
    headline: "Walk more, claim more",
    sub: `${PLUS.plusDailyCap} daily vaults · ${Math.round(
      (1 - PLUS.plusRespawnMultiplier) * 100
    )}% faster respawn`,
    tint: "#FFC857",
  },
] as const;

interface PerkRow {
  icon: typeof Check;
  title: string;
  sub: string;
}

const PERKS: PerkRow[] = [
  {
    icon: Coins,
    title: `+${Math.round(PLUS.payoutBonus * 100)}% coins per vault`,
    sub: "Stacks on top of your Stride Status multiplier",
  },
  {
    icon: Sparkles,
    title: `Daily cap raised to ${PLUS.plusDailyCap}`,
    sub: `Free players cap at ${PLUS.freeDailyCap} claims/day`,
  },
  {
    icon: Footprints,
    title: `${Math.round((1 - PLUS.plusRespawnMultiplier) * 100)}% faster respawn`,
    sub: "Claimed vaults reopen quicker — more loops per day",
  },
  {
    icon: Ticket,
    title: "1 free raffle entry every week",
    sub: "On any live raffle, Stride Coins entries only",
  },
  {
    icon: Trophy,
    title: "Members-only raffles",
    sub: "Exclusive draws normally locked to Platinum+ only",
  },
  {
    icon: Flame,
    title: "1 streak freeze every week",
    sub: "Miss a day without breaking your run",
  },
  {
    icon: Clock3,
    title: `${PLUS.earlyAccessHours}h early access`,
    sub: "New vaults and partner drops, before everyone else",
  },
  {
    icon: Crown,
    title: `+${PLUS.welcomeCoins.toLocaleString()} welcome bonus`,
    sub: "One-time, paid the moment you start",
  },
];

export default function PlusScreen() {
  const { player, plusActive, subscribePlus, isSubscribing, cancelPlus, markPlusOnboardingSeen } =
    useGame();
  const [plan, setPlan] = useState<PlusPlan>("annual");
  const [hookIdx, setHookIdx] = useState<number>(0);

  // Rotate hooks every 3s.
  useEffect(() => {
    const t = setInterval(() => setHookIdx((i) => (i + 1) % HOOKS.length), 3000);
    return () => clearInterval(t);
  }, []);

  // Mark onboarding seen as soon as paywall is mounted.
  useEffect(() => {
    markPlusOnboardingSeen().catch(() => {});
  }, [markPlusOnboardingSeen]);

  // Sweeping shimmer across the header gradient.
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 2600,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  // Cross-fade for the rotating hero.
  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [hookIdx, fade]);

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  }, []);

  const onSubscribe = useCallback(async () => {
    if (isSubscribing) return;
    if (Platform.OS !== "web") {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {
        console.log("[Plus] haptics", e);
      }
    }
    await subscribePlus({ plan });
    close();
  }, [isSubscribing, subscribePlus, plan, close]);

  const onCancel = useCallback(async () => {
    if (Platform.OS !== "web") {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {
        console.log("[Plus] haptics", e);
      }
    }
    await cancelPlus();
  }, [cancelPlus]);

  const renewalLabel = useMemo(() => {
    const r = player.plus?.renewsAt;
    if (!r) return "";
    return new Date(r).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }, [player.plus?.renewsAt]);

  const hook = HOOKS[hookIdx];
  const HookIcon = hook.icon;

  return (
    <View style={styles.root}>
      {/* Header — animated gradient + shimmer */}
      <View style={styles.header}>
        <LinearGradient
          colors={["#FFC857", "#FF7A45", "#1A0A00"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.shimmer,
            {
              transform: [
                {
                  translateX: shimmer.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-SCREEN_W, SCREEN_W],
                  }),
                },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={["transparent", "rgba(255,255,255,0.55)", "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <SafeAreaView edges={["top"]} style={{ width: "100%" }}>
          <View style={styles.headerTopRow}>
            <View style={styles.brandPill}>
              <Crown size={12} color="#1A0A00" />
              <Text style={styles.brandPillText}>STRIDE+</Text>
            </View>
            <Pressable onPress={close} hitSlop={12} style={styles.closeBtn}>
              <X size={18} color="#1A0A00" />
            </Pressable>
          </View>

          <Animated.View style={[styles.hookWrap, { opacity: fade }]}>
            <View style={[styles.hookIcon, { backgroundColor: hook.tint + "33" }]}>
              <HookIcon size={26} color="#1A0A00" />
            </View>
            <Text style={styles.hookHeadline}>{hook.headline}</Text>
            <Text style={styles.hookSub}>{hook.sub}</Text>

            <View style={styles.hookDots}>
              {HOOKS.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.hookDot,
                    i === hookIdx && styles.hookDotActive,
                  ]}
                />
              ))}
            </View>
          </Animated.View>
        </SafeAreaView>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 180 }}
        showsVerticalScrollIndicator={false}
      >
        {/* If already subscribed, show "you're in" panel + manage row. */}
        {plusActive ? (
          <View style={styles.activeCard}>
            <LinearGradient
              colors={[theme.gold + "33", "transparent"]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.activeIcon}>
              <Crown size={22} color="#1A0A00" />
            </View>
            <Text style={styles.activeTitle}>You're a Stride+ member</Text>
            <Text style={styles.activeSub}>
              {player.plus?.plan === "annual" ? "Annual plan" : "Monthly plan"} · renews {renewalLabel}
            </Text>
            <Pressable onPress={onCancel} style={styles.manageBtn}>
              <Text style={styles.manageBtnText}>CANCEL MEMBERSHIP</Text>
            </Pressable>
          </View>
        ) : null}

        <Text style={styles.section}>WHAT YOU GET</Text>
        <View style={styles.perkList}>
          {PERKS.map((p) => {
            const Icon = p.icon;
            return (
              <View key={p.title} style={styles.perkRow}>
                <View style={styles.perkBullet}>
                  <Check size={12} color={theme.goldBright} strokeWidth={3} />
                </View>
                <View style={styles.perkIcon}>
                  <Icon size={16} color={theme.goldBright} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.perkTitle}>{p.title}</Text>
                  <Text style={styles.perkSub}>{p.sub}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {!plusActive && (
          <>
            <Text style={styles.section}>CHOOSE A PLAN</Text>
            <View style={styles.planRow}>
              <PlanCard
                active={plan === "annual"}
                onPress={() => setPlan("annual")}
                title="ANNUAL"
                priceMain={`£${PLUS.annualGbp}`}
                pricePer={`£${(PLUS.annualGbp / 12).toFixed(2)} / mo`}
                badge={`SAVE ${PLUS.annualSavingsPct}%`}
                highlight
              />
              <PlanCard
                active={plan === "monthly"}
                onPress={() => setPlan("monthly")}
                title="MONTHLY"
                priceMain={`£${PLUS.monthlyGbp}`}
                pricePer="per month"
              />
            </View>
          </>
        )}

        <Text style={styles.fineprint}>
          Renews automatically. Cancel anytime. No refunds for partial periods. Plus perks apply
          immediately on subscribe — welcome bonus paid once per account.
        </Text>
      </ScrollView>

      {!plusActive && (
        <View style={styles.ctaBar}>
          <LinearGradient
            colors={["rgba(6,7,13,0)", "rgba(6,7,13,0.95)"]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <Pressable
            disabled={isSubscribing}
            onPress={onSubscribe}
            style={({ pressed }) => [
              styles.cta,
              isSubscribing && { opacity: 0.6 },
              pressed && { transform: [{ scale: 0.99 }] },
            ]}
          >
            <LinearGradient
              colors={["#FFC857", "#FF7A45"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {isSubscribing ? (
              <ActivityIndicator color="#1A0A00" />
            ) : (
              <>
                <Crown size={16} color="#1A0A00" />
                <Text style={styles.ctaText}>
                  START STRIDE+ · {plan === "annual" ? `£${PLUS.annualGbp}/yr` : `£${PLUS.monthlyGbp}/mo`}
                </Text>
              </>
            )}
          </Pressable>
          <View style={styles.legalRow}>
            <Pressable hitSlop={8}><Text style={styles.legalLink}>Restore</Text></Pressable>
            <Text style={styles.legalDot}>·</Text>
            <Pressable hitSlop={8}><Text style={styles.legalLink}>Terms</Text></Pressable>
            <Text style={styles.legalDot}>·</Text>
            <Pressable hitSlop={8}><Text style={styles.legalLink}>Privacy</Text></Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

function PlanCard({
  active,
  onPress,
  title,
  priceMain,
  pricePer,
  badge,
  highlight,
}: {
  active: boolean;
  onPress: () => void;
  title: string;
  priceMain: string;
  pricePer: string;
  badge?: string;
  highlight?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.planCard,
        active && styles.planCardActive,
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
    >
      {highlight ? (
        <LinearGradient
          colors={[theme.gold + "26", "transparent"]}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {badge ? (
        <View style={styles.planBadge}>
          <Text style={styles.planBadgeText}>{badge}</Text>
        </View>
      ) : null}
      <Text style={[styles.planTitle, active && { color: theme.goldBright }]}>{title}</Text>
      <Text style={styles.planPrice}>{priceMain}</Text>
      <Text style={styles.planPer}>{pricePer}</Text>
      <View
        style={[
          styles.planRadio,
          active && { borderColor: theme.goldBright, backgroundColor: theme.goldBright },
        ]}
      >
        {active ? <Check size={12} color="#1A0A00" strokeWidth={3} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    overflow: "hidden",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  shimmer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: SCREEN_W * 0.6,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
  },
  brandPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 999,
  },
  brandPillText: {
    color: "#1A0A00",
    fontSize: 11,
    fontWeight: "900" as const,
    letterSpacing: 1.6,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  hookWrap: {
    alignItems: "center",
    paddingTop: 28,
    paddingBottom: 8,
    gap: 10,
  },
  hookIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  hookHeadline: {
    color: "#0A0500",
    fontSize: 26,
    fontWeight: "900" as const,
    textAlign: "center" as const,
    letterSpacing: -0.4,
    paddingHorizontal: 16,
  },
  hookSub: {
    color: "rgba(26,10,0,0.78)",
    fontSize: 13,
    fontWeight: "700" as const,
    textAlign: "center" as const,
    paddingHorizontal: 24,
  },
  hookDots: {
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
  },
  hookDot: {
    width: 18,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(26,10,0,0.25)",
  },
  hookDotActive: {
    backgroundColor: "#1A0A00",
    width: 28,
  },

  section: {
    color: theme.text,
    fontSize: 12,
    fontWeight: "900" as const,
    letterSpacing: 2,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 12,
  },
  perkList: { paddingHorizontal: 16, gap: 6 },
  perkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.borderSoft,
  },
  perkBullet: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.goldBright + "22",
    borderWidth: 1,
    borderColor: theme.gold + "88",
    alignItems: "center",
    justifyContent: "center",
  },
  perkIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.surface,
  },
  perkTitle: { color: theme.text, fontSize: 14, fontWeight: "800" as const },
  perkSub: { color: theme.textDim, fontSize: 11, marginTop: 2 },

  planRow: { flexDirection: "row", paddingHorizontal: 16, gap: 10 },
  planCard: {
    flex: 1,
    padding: 16,
    borderRadius: theme.radius.lg,
    borderWidth: 2,
    borderColor: theme.borderSoft,
    backgroundColor: theme.bgCard,
    overflow: "hidden",
    minHeight: 120,
  },
  planCardActive: { borderColor: theme.gold },
  planBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: theme.gold,
    borderRadius: 4,
  },
  planBadgeText: { color: "#1A0A00", fontSize: 9, fontWeight: "900" as const, letterSpacing: 1.2 },
  planTitle: { color: theme.textMuted, fontSize: 11, fontWeight: "900" as const, letterSpacing: 1.6 },
  planPrice: { color: theme.text, fontSize: 28, fontWeight: "900" as const, marginTop: 6 },
  planPer: { color: theme.textDim, fontSize: 11, fontWeight: "700" as const, marginTop: 2 },
  planRadio: {
    position: "absolute",
    bottom: 12,
    right: 12,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
  },

  fineprint: {
    color: theme.textDim,
    fontSize: 11,
    fontWeight: "500" as const,
    paddingHorizontal: 20,
    paddingTop: 18,
    lineHeight: 16,
    textAlign: "center" as const,
  },

  ctaBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: Platform.OS === "ios" ? 28 : 18,
    gap: 8,
  },
  cta: {
    height: 56,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaText: {
    color: "#1A0A00",
    fontSize: 14,
    fontWeight: "900" as const,
    letterSpacing: 1.4,
  },
  legalRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingTop: 4,
  },
  legalLink: { color: theme.textMuted, fontSize: 11, fontWeight: "700" as const },
  legalDot: { color: theme.textDim, fontSize: 11 },

  activeCard: {
    marginHorizontal: 16,
    marginTop: 18,
    padding: 18,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.gold + "88",
    backgroundColor: theme.bgCard,
    overflow: "hidden",
    alignItems: "center",
    gap: 6,
  },
  activeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.goldBright,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  activeTitle: { color: theme.text, fontSize: 16, fontWeight: "900" as const },
  activeSub: { color: theme.textMuted, fontSize: 12, fontWeight: "600" as const, marginBottom: 8 },
  manageBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: theme.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
  },
  manageBtnText: { color: theme.textMuted, fontSize: 11, fontWeight: "900" as const, letterSpacing: 1.4 },
});
