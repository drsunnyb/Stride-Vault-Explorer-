import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { CalendarDays, CalendarRange, Crown, Flame, Gift, Globe, Sparkles, Sparkle, Sword, Target, Ticket, Timer, Trophy } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { StrideStatusBadge } from "@/components/StrideStatusBadge";
import { formatRemaining, PERIOD_TITLES, type Period } from "@/constants/periods";
import { PRIZE_LADDERS, type PrizeTier } from "@/constants/prizes";
import { getBrand } from "@/constants/rewards";
import { getStrideStatus } from "@/constants/status";
import { theme } from "@/constants/theme";
import { useGame } from "@/providers/GameProvider";
import type { VaultBrand } from "@/types/game";

type Scope = "global" | "friends";

export default function LadderScreen() {
  const { leaderboardFor, brandLeaderboardFor, brands, myRankFor, periodEnd, now, player, claimLadderRewards, comebackActive, comebackClaimsRemaining, finalHourWeek, tribe } = useGame();
  const [period, setPeriod] = useState<Period>("week");
  const [scope, setScope] = useState<Scope>("global");
  /** undefined = Stride (all brands). Otherwise a brand id to filter the ladder by. */
  const [brandFilter, setBrandFilter] = useState<VaultBrand | undefined>(undefined);

  const activeBrandMeta = brandFilter ? getBrand(brandFilter) : null;
  const brandList = useMemo(() => (brands.length > 0 ? brands : []), [brands]);
  const accent = activeBrandMeta?.colorBright ?? theme.goldBright;
  const accentSoft = activeBrandMeta?.color ?? theme.gold;

  const board = useMemo(
    () => (brandFilter ? brandLeaderboardFor(brandFilter, period, scope) : leaderboardFor(period, scope)),
    [brandFilter, brandLeaderboardFor, leaderboardFor, period, scope]
  );
  const top3 = board.slice(0, 3);
  const rest = board.slice(3, 50);
  const me = board.find((b) => b.isYou);
  const { rank: globalRank, total: globalTotal, coins: myCoins } = myRankFor(period);

  const resetsAt = periodEnd(period);
  const remaining = formatRemaining(resetsAt, now);
  const ladder = PRIZE_LADDERS[period];

  const onClaim = async () => {
    const res = await claimLadderRewards(period);
    if (!res.ok) return;
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 120 }}>
      {/* Period tabs */}
      <View style={styles.periodTabs}>
        <PeriodTab label="WEEK" icon={CalendarDays} active={period === "week"} onPress={() => setPeriod("week")} />
        <PeriodTab label="MONTH" icon={CalendarRange} active={period === "month"} onPress={() => setPeriod("month")} />
        <PeriodTab label="YEAR" icon={Trophy} active={period === "year"} onPress={() => setPeriod("year")} />
      </View>

      {/* Title + countdown */}
      <View style={styles.titleRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{PERIOD_TITLES[period].toUpperCase()}</Text>
          <Text style={styles.subtitle}>Ranked by coins earned · live</Text>
        </View>
        <View style={styles.countdown}>
          <Timer size={12} color={theme.goldBright} />
          <Text style={styles.countdownText}>Resets in {remaining}</Text>
        </View>
      </View>

      {/* Scope toggle */}
      <View style={styles.scopeRow}>
        <ScopeBtn label="GLOBAL" active={scope === "global"} onPress={() => setScope("global")} />
        <ScopeBtn label="FRIENDS" active={scope === "friends"} onPress={() => setScope("friends")} />
        <Pressable style={[styles.challengeBtn, { backgroundColor: accent }]} onPress={() => router.push("/challenge/new")}>
          <Sword size={12} color="#1A0A00" />
          <Text style={styles.challengeBtnText}>STAKE FRIENDS</Text>
        </Pressable>
      </View>

      {/* Brand ladders — horizontal scroll. Hidden when admin has zero brands. */}
      {brandList.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.brandRow}
        >
          <BrandPill
            label="STRIDE"
            sub="All ladders"
            color={theme.goldBright}
            colorDim={theme.gold}
            active={!brandFilter}
            icon={<Globe size={13} color={!brandFilter ? "#1A0A00" : theme.goldBright} />}
            onPress={() => setBrandFilter(undefined)}
          />
          {brandList.map((b) => {
            const isActive = brandFilter === b.id;
            return (
              <BrandPill
                key={b.id}
                label={b.short}
                sub={`${b.coinName} ladder`}
                color={b.colorBright}
                colorDim={b.color}
                inverted={b.invertedText}
                active={isActive}
                mark={b.mark}
                onPress={() => setBrandFilter(b.id)}
              />
            );
          })}
        </ScrollView>
      ) : null}

      {activeBrandMeta ? (
        <View style={[styles.brandBanner, { borderColor: activeBrandMeta.color + "AA" }]}>
          <LinearGradient
            colors={[activeBrandMeta.color + "33", activeBrandMeta.color + "08"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.brandMark, { backgroundColor: activeBrandMeta.color, borderColor: activeBrandMeta.colorBright }]}>
            <Text style={[styles.brandMarkText, activeBrandMeta.invertedText && { color: "#0E1117" }]}>
              {activeBrandMeta.mark || activeBrandMeta.short.charAt(0)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.brandBannerTitle, { color: activeBrandMeta.colorBright }]} numberOfLines={1}>
              {activeBrandMeta.name.toUpperCase()} LADDER
            </Text>
            <Text style={styles.brandBannerBody} numberOfLines={2}>
              Ranked by {activeBrandMeta.coinName.toLowerCase()} earned this {period}. Walk {activeBrandMeta.name} vaults to climb.
            </Text>
          </View>
        </View>
      ) : null}

      {/* Retention shortcuts: Predict + Tribes */}
      <View style={styles.retentionRow}>
        <Pressable style={[styles.retentionBtn, { borderColor: theme.sapphire + "AA" }]} onPress={() => router.push("/predict")}>
          <Target size={13} color={theme.sapphire} />
          <Text style={[styles.retentionBtnText, { color: theme.sapphire }]}>STRIDE PREDICT</Text>
        </Pressable>
        <Pressable style={[styles.retentionBtn, { borderColor: tribe?.primary ?? theme.ruby }]} onPress={() => router.push("/tribes")}>
          <Trophy size={13} color={tribe?.primary ?? theme.ruby} />
          <Text style={[styles.retentionBtnText, { color: tribe?.primary ?? theme.ruby }]} numberOfLines={1}>
            {tribe ? `${tribe.short} TRIBE DERBY` : "PICK A TRIBE"}
          </Text>
        </Pressable>
      </View>

      {finalHourWeek ? (
        <View style={styles.finalHourCard}>
          <LinearGradient
            colors={["#EF4444", "#7A1F1F"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Timer size={16} color="#FFE9B0" />
          <View style={{ flex: 1 }}>
            <Text style={styles.finalHourTitle}>FINAL HOUR · EVERY COIN COUNTS 2×</Text>
            <Text style={styles.finalHourBody}>Resets in {remaining}. Walk one more vault and watch your rank climb.</Text>
          </View>
        </View>
      ) : null}

      {comebackActive ? (
        <View style={styles.comebackCard}>
          <LinearGradient
            colors={["rgba(16,185,129,0.20)", "rgba(16,185,129,0.04)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.comebackIcon}>
            <Flame size={16} color={theme.emeraldBright} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.comebackTitle}>WE'VE GOT YOUR BACK</Text>
            <Text style={styles.comebackBody}>
              Next {comebackClaimsRemaining} claim{comebackClaimsRemaining === 1 ? "" : "s"} pay 1.5× — catch up to the pack.
            </Text>
          </View>
        </View>
      ) : null}

      {/* Podium */}
      <View style={styles.podium}>
        {top3[1] ? <PodiumColumn rank={2} name={top3[1].name} coins={top3[1].coins} isYou={top3[1].isYou} /> : <View style={{ flex: 1 }} />}
        {top3[0] ? <PodiumColumn rank={1} name={top3[0].name} coins={top3[0].coins} isYou={top3[0].isYou} /> : <View style={{ flex: 1 }} />}
        {top3[2] ? <PodiumColumn rank={3} name={top3[2].name} coins={top3[2].coins} isYou={top3[2].isYou} /> : <View style={{ flex: 1 }} />}
      </View>

      {/* Prize preview card — Stride ladder only. Brand ladders show their own perks below. */}
      {!brandFilter ? (
      <View style={styles.prizesCard}>
        <LinearGradient
          colors={["rgba(244,208,63,0.16)", "rgba(244,208,63,0.02)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.prizesHeader}>
          <Gift size={16} color={theme.goldBright} />
          <Text style={styles.prizesTitle}>{PERIOD_TITLES[period].toUpperCase()} PRIZES</Text>
          <Text style={styles.prizesSub}>You · #{globalRank} of {globalTotal}</Text>
        </View>
        <View style={styles.prizeList}>
          {ladder.map((t) => (
            <PrizeRow key={`${t.rankFrom}-${t.rankTo}`} tier={t} highlight={globalRank >= t.rankFrom && globalRank <= t.rankTo} />
          ))}
        </View>
        {globalRank <= 50 ? (
          <Pressable onPress={onClaim} style={styles.claimPrize}>
            <Sparkle size={14} color="#1A0A00" />
            <Text style={styles.claimPrizeText}>CLAIM PROJECTED PRIZE</Text>
          </Pressable>
        ) : (
          <View style={[styles.claimPrize, { backgroundColor: theme.surface }]}>
            <Text style={[styles.claimPrizeText, { color: theme.textMuted }]}>Climb into top 50 to win</Text>
          </View>
        )}
      </View>
      ) : (
        <View style={[styles.prizesCard, { borderColor: accentSoft + "66" }]}>
          <LinearGradient
            colors={[accentSoft + "22", accentSoft + "04"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.prizesHeader}>
            <Gift size={16} color={accent} />
            <Text style={[styles.prizesTitle, { color: accent }]} numberOfLines={1}>
              {activeBrandMeta?.short} {PERIOD_TITLES[period].toUpperCase()} PERKS
            </Text>
          </View>
          <View style={styles.prizeList}>
            <BrandPerk rank="#1" label="Champion" sub={`2,000 ${activeBrandMeta?.coinName ?? "brand coins"} · in-store VIP`} accent={accent} />
            <BrandPerk rank="#2–3" label="Podium" sub={`800 ${activeBrandMeta?.coinName ?? "brand coins"} · 1.5× next ${period}`} accent={accent} />
            <BrandPerk rank="#4–10" label="Top 10" sub={`300 ${activeBrandMeta?.coinName ?? "brand coins"} · raffle entry×2`} accent={accent} />
            <BrandPerk rank="#11–50" label="Top 50" sub={`100 ${activeBrandMeta?.coinName ?? "brand coins"}`} accent={accent} />
          </View>
          <Text style={styles.brandPerkFoot}>
            Brand ladders pay in {activeBrandMeta?.name} coins — redeem at {activeBrandMeta?.name} for partner-only drops.
          </Text>
        </View>
      )}

      {/* Rank list */}
      <View style={styles.list}>
        {rest.map((row, i) => {
          const prev = i === 0 ? top3[2]?.coins ?? row.coins : rest[i - 1].coins;
          const gap = Math.max(0, prev - row.coins);
          return (
            <LadderRow
              key={row.id}
              rank={row.rank}
              name={row.name}
              coins={row.coins}
              isYou={row.isYou}
              isFriend={row.isFriend}
              gapToAbove={gap}
              accent={accent}
              coinLabel={activeBrandMeta ? activeBrandMeta.short : "COINS"}
            />
          );
        })}
      </View>

      <View style={{ height: 12 }} />

      {/* My champion badges */}
      {(player.championBadges ?? []).length > 0 ? (
        <View style={styles.badgesCard}>
          <View style={styles.badgesHeader}>
            <Sparkles size={14} color={theme.goldBright} />
            <Text style={styles.badgesTitle}>YOUR CHAMPION BADGES</Text>
          </View>
          <View style={styles.badgesRow}>
            {(player.championBadges ?? []).map((b) => (
              <View key={b} style={styles.badgeChip}>
                <Crown size={11} color={theme.goldBright} />
                <Text style={styles.badgeChipText}>{b}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Your rank — sticky-ish */}
      {me ? (
        <View style={styles.youPinWrap}>
          <View style={styles.youPin}>
            <Text style={styles.youRank}>#{me.rank}</Text>
            <View style={[styles.youAvatar]}>
              <Text style={styles.youAvatarLetter}>{me.name.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.youName}>YOU · {me.name}</Text>
              <Text style={styles.youSub}>{myCoins.toLocaleString()} coins this {period}</Text>
            </View>
            <Ticket size={14} color={theme.goldBright} />
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

// ─── pieces ──────────────────────────────────────────────────────────────────

function PeriodTab({
  label,
  icon: Icon,
  active,
  onPress,
}: {
  label: string;
  icon: typeof CalendarDays;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.periodTab, active && styles.periodTabActive]} onPress={onPress}>
      <Icon size={13} color={active ? "#1A0A00" : theme.textMuted} />
      <Text style={[styles.periodTabText, active && styles.periodTabTextActive]}>{label}</Text>
    </Pressable>
  );
}

function ScopeBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.scopeBtn, active && { borderColor: theme.emerald, backgroundColor: "rgba(16,185,129,0.10)" }]}
    >
      <Text style={[styles.scopeBtnText, active && { color: theme.emeraldBright }]}>{label}</Text>
    </Pressable>
  );
}

function PodiumColumn({ rank, name, coins, isYou }: { rank: 1 | 2 | 3; name: string; coins: number; isYou?: boolean }) {
  const shimmer = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    if (rank !== 1) return;
    const loop = Animated.loop(
      Animated.timing(shimmer, { toValue: 1, duration: 2200, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [rank, shimmer]);
  const translate = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-60, 60] });

  const colors: [string, string] =
    rank === 1
      ? [theme.gold, theme.goldBright]
      : rank === 2
        ? [theme.tier.silver, theme.tier.silverBright]
        : [theme.tier.bronze, theme.tier.bronzeBright];
  const height = rank === 1 ? 110 : rank === 2 ? 84 : 68;
  return (
    <View style={[styles.podiumCol, rank === 1 && { marginTop: 0 }]}>
      <View
        style={[
          styles.podiumAvatar,
          rank === 1 && styles.podiumAvatarTop,
          isYou && { borderColor: theme.emeraldBright },
        ]}
      >
        <Text style={styles.podiumAvatarText}>{name.charAt(0)}</Text>
        {rank === 1 ? (
          <View style={styles.crownWrap}>
            <Crown size={18} color={theme.goldBright} />
          </View>
        ) : null}
      </View>
      <Text style={styles.podiumName} numberOfLines={1}>{name.split(" ")[0]}{isYou ? " · YOU" : ""}</Text>
      <Text style={styles.podiumCoins}>{coins.toLocaleString()}c</Text>
      <View style={[styles.podiumBlock, { height }]}>
        <LinearGradient colors={colors} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
        {rank === 1 ? (
          <Animated.View pointerEvents="none" style={[styles.shimmer, { transform: [{ translateX: translate }, { rotate: "18deg" }] }]} />
        ) : null}
        <Text style={styles.podiumRank}>{rank}</Text>
      </View>
    </View>
  );
}

function PrizeRow({ tier, highlight }: { tier: PrizeTier; highlight: boolean }) {
  const rankLabel = tier.rankFrom === tier.rankTo ? `#${tier.rankFrom}` : `#${tier.rankFrom}–${tier.rankTo}`;
  return (
    <View style={[styles.prizeRow, highlight && { borderColor: theme.emerald + "AA", backgroundColor: "rgba(16,185,129,0.08)" }]}>
      <View style={[styles.prizeRank, { backgroundColor: tier.accent + "22", borderColor: tier.accent + "AA" }]}>
        <Text style={[styles.prizeRankText, { color: tier.accent }]}>{rankLabel}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.prizeLabel}>{tier.label}</Text>
        <Text style={styles.prizeSub} numberOfLines={1}>
          {tier.coins.toLocaleString()}c
          {tier.raffleEntries > 0 ? ` · ${tier.raffleEntries} raffle ${tier.raffleEntries === 1 ? "entry" : "entries"}` : ""}
          {tier.nextPeriodMultiplier > 1 ? ` · ${tier.nextPeriodMultiplier}× next ${tier.label === "Champion" ? "period" : "period"}` : ""}
        </Text>
      </View>
      {tier.badge ? (
        <View style={styles.badgePill}>
          <Crown size={10} color={theme.goldBright} />
          <Text style={styles.badgePillText}>BADGE</Text>
        </View>
      ) : null}
    </View>
  );
}

function LadderRow({
  rank,
  name,
  coins,
  isYou,
  isFriend,
  gapToAbove,
  accent,
  coinLabel,
}: {
  rank: number;
  name: string;
  coins: number;
  isYou?: boolean;
  isFriend?: boolean;
  gapToAbove: number;
  accent: string;
  coinLabel: string;
}) {
  const status = getStrideStatus(Math.min(250, Math.floor(coins / 200))).current;
  const pct = gapToAbove === 0 ? 1 : Math.min(1, coins / (coins + gapToAbove));
  return (
    <View
      style={[
        styles.row,
        isYou && { borderColor: theme.emerald, backgroundColor: "rgba(16,185,129,0.08)" },
      ]}
    >
      <Text style={[styles.rowRank, rank <= 10 && { color: accent }]}>{String(rank).padStart(2, "0")}</Text>
      <View style={[styles.avatar, isYou && { borderColor: theme.emeraldBright }, isFriend && !isYou && { borderColor: theme.sapphire + "AA" }]}>
        <Text style={styles.avatarLetter}>{name.charAt(0)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
          {isYou ? <Text style={{ color: theme.emeraldBright, fontWeight: "900" as const }}>  · YOU</Text> : null}
          {isFriend && !isYou ? <Text style={{ color: theme.sapphire, fontWeight: "800" as const }}>  · FRIEND</Text> : null}
        </Text>
        <View style={styles.subRow}>
          <StrideStatusBadge status={status} size="sm" />
          <Text style={styles.gapText}>{gapToAbove > 0 ? `${gapToAbove.toLocaleString()} to climb` : "Top spot"}</Text>
        </View>
        <View style={styles.gapBar}>
          <View style={[styles.gapFill, { width: `${Math.max(6, pct * 100)}%`, backgroundColor: accent }]} />
        </View>
      </View>
      <View style={styles.coinsCol}>
        <Text style={[styles.coinsNum, { color: accent }]}>{coins.toLocaleString()}</Text>
        <Text style={styles.coinsLabel}>{coinLabel}</Text>
      </View>
    </View>
  );
}

function BrandPill({
  label,
  sub,
  color,
  colorDim,
  active,
  icon,
  mark,
  inverted,
  onPress,
}: {
  label: string;
  sub: string;
  color: string;
  colorDim: string;
  active: boolean;
  icon?: React.ReactNode;
  mark?: string;
  inverted?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.brandPill,
        active && { borderColor: color, backgroundColor: color + "22" },
      ]}
    >
      <View style={[styles.brandPillMark, { backgroundColor: active ? color : colorDim + "55", borderColor: color }]}>
        {icon ?? (
          <Text style={[styles.brandPillMarkText, inverted && active && { color: "#0E1117" }]}>
            {mark || label.charAt(0)}
          </Text>
        )}
      </View>
      <View>
        <Text style={[styles.brandPillLabel, active && { color }]}>{label}</Text>
        <Text style={styles.brandPillSub} numberOfLines={1}>{sub}</Text>
      </View>
    </Pressable>
  );
}

function BrandPerk({ rank, label, sub, accent }: { rank: string; label: string; sub: string; accent: string }) {
  return (
    <View style={styles.prizeRow}>
      <View style={[styles.prizeRank, { backgroundColor: accent + "22", borderColor: accent + "AA" }]}>
        <Text style={[styles.prizeRankText, { color: accent }]}>{rank}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.prizeLabel}>{label}</Text>
        <Text style={styles.prizeSub} numberOfLines={1}>{sub}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  periodTabs: { flexDirection: "row", padding: 16, paddingBottom: 6, gap: 8 },
  periodTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.border,
  },
  periodTabActive: {
    backgroundColor: theme.goldBright,
    borderColor: theme.goldBright,
  },
  periodTabText: { color: theme.textMuted, fontSize: 11, fontWeight: "900" as const, letterSpacing: 1.4 },
  periodTabTextActive: { color: "#1A0A00" },
  titleRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4, gap: 10 },
  title: { color: theme.text, fontSize: 22, fontWeight: "900" as const, letterSpacing: 1 },
  subtitle: { color: theme.textMuted, fontSize: 11, marginTop: 2 },
  countdown: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(244,208,63,0.12)",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.gold + "66",
  },
  countdownText: { color: theme.goldBright, fontSize: 10, fontWeight: "900" as const, letterSpacing: 1 },
  scopeRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  scopeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.bgCard,
  },
  scopeBtnText: { color: theme.textMuted, fontSize: 10, fontWeight: "900" as const, letterSpacing: 1.2 },
  challengeBtn: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: theme.goldBright,
  },
  challengeBtnText: { color: "#1A0A00", fontSize: 10, fontWeight: "900" as const, letterSpacing: 1.2 },
  // podium
  podium: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 10,
  },
  podiumCol: { flex: 1, alignItems: "center", marginTop: 24 },
  podiumAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.bgCard,
    borderWidth: 2,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  podiumAvatarTop: { width: 70, height: 70, borderRadius: 35, borderColor: theme.gold },
  podiumAvatarText: { color: theme.text, fontSize: 22, fontWeight: "900" as const },
  crownWrap: { position: "absolute", top: -18 },
  podiumName: { color: theme.text, fontSize: 12, fontWeight: "800" as const },
  podiumCoins: { color: theme.goldBright, fontSize: 11, fontWeight: "900" as const, marginBottom: 6 },
  podiumBlock: {
    width: "100%",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  podiumRank: { color: "#0E1117", fontSize: 30, fontWeight: "900" as const },
  shimmer: {
    position: "absolute",
    top: 0,
    width: 40,
    height: 200,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  // prizes card
  prizesCard: {
    marginHorizontal: 16,
    padding: 14,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.gold + "55",
    backgroundColor: theme.bgCard,
    overflow: "hidden",
    gap: 10,
  },
  prizesHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  prizesTitle: { color: theme.goldBright, fontSize: 11, fontWeight: "900" as const, letterSpacing: 1.6, flex: 1 },
  prizesSub: { color: theme.textMuted, fontSize: 11, fontWeight: "700" as const },
  prizeList: { gap: 6 },
  prizeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 8,
    backgroundColor: theme.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "transparent",
  },
  prizeRank: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 56,
    alignItems: "center",
  },
  prizeRankText: { fontSize: 10, fontWeight: "900" as const, letterSpacing: 0.6 },
  prizeLabel: { color: theme.text, fontSize: 12, fontWeight: "800" as const },
  prizeSub: { color: theme.textMuted, fontSize: 10, marginTop: 2 },
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.gold + "AA",
    backgroundColor: "rgba(244,208,63,0.10)",
  },
  badgePillText: { color: theme.goldBright, fontSize: 8, fontWeight: "900" as const, letterSpacing: 0.8 },
  claimPrize: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: theme.goldBright,
    marginTop: 4,
  },
  claimPrizeText: { color: "#1A0A00", fontSize: 11, fontWeight: "900" as const, letterSpacing: 1.4 },
  // rows
  list: { paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.borderSoft,
  },
  rowRank: { color: theme.textDim, fontSize: 12, fontWeight: "900" as const, letterSpacing: 1, width: 26 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { color: theme.text, fontSize: 15, fontWeight: "900" as const },
  name: { color: theme.text, fontSize: 13, fontWeight: "800" as const },
  subRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  gapText: { color: theme.textDim, fontSize: 10, fontWeight: "700" as const },
  gapBar: { marginTop: 5, height: 3, backgroundColor: theme.surface, borderRadius: 2, overflow: "hidden" },
  gapFill: { height: "100%", backgroundColor: theme.goldBright, borderRadius: 2 },
  coinsCol: { alignItems: "flex-end" },
  coinsNum: { color: theme.goldBright, fontSize: 15, fontWeight: "900" as const },
  coinsLabel: { color: theme.textDim, fontSize: 8, fontWeight: "800" as const, letterSpacing: 1 },
  // badges
  badgesCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.gold + "55",
    gap: 10,
  },
  badgesHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  badgesTitle: { color: theme.goldBright, fontSize: 11, fontWeight: "900" as const, letterSpacing: 1.6 },
  badgesRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  badgeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.gold + "55",
  },
  badgeChipText: { color: theme.goldBright, fontSize: 10, fontWeight: "800" as const },
  // your-rank pinned
  youPinWrap: { paddingHorizontal: 16, marginTop: 16 },
  youPin: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.emerald,
    backgroundColor: "rgba(16,185,129,0.10)",
  },
  youRank: { color: theme.emeraldBright, fontSize: 16, fontWeight: "900" as const, letterSpacing: 0.4 },
  youAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.surface,
    borderWidth: 2,
    borderColor: theme.emeraldBright,
    alignItems: "center",
    justifyContent: "center",
  },
  youAvatarLetter: { color: theme.text, fontSize: 14, fontWeight: "900" as const },
  youName: { color: theme.text, fontSize: 13, fontWeight: "800" as const },
  youSub: { color: theme.emeraldBright, fontSize: 11, fontWeight: "700" as const, marginTop: 2 },
  retentionRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10 },
  retentionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 999, borderWidth: 1, backgroundColor: theme.bgCard },
  retentionBtnText: { fontSize: 10, fontWeight: "900" as const, letterSpacing: 1.2 },
  finalHourCard: { marginHorizontal: 16, marginTop: 6, marginBottom: 4, padding: 12, borderRadius: theme.radius.lg, overflow: "hidden", flexDirection: "row", alignItems: "center", gap: 12 },
  finalHourTitle: { color: "#FFE9B0", fontSize: 11, fontWeight: "900" as const, letterSpacing: 1.4 },
  finalHourBody: { color: "rgba(255,233,176,0.85)", fontSize: 12, fontWeight: "700" as const, marginTop: 2 },
  comebackCard: { marginHorizontal: 16, marginTop: 6, marginBottom: 4, padding: 12, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.emerald + "66", overflow: "hidden", flexDirection: "row", alignItems: "center", gap: 12 },
  comebackIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(16,185,129,0.20)", borderWidth: 1, borderColor: theme.emerald + "AA" },
  comebackTitle: { color: theme.emeraldBright, fontSize: 11, fontWeight: "900" as const, letterSpacing: 1.4 },
  comebackBody: { color: theme.text, fontSize: 12, fontWeight: "600" as const, marginTop: 2, lineHeight: 16 },
  // brand pills
  brandRow: { paddingHorizontal: 16, paddingBottom: 10, gap: 8, flexDirection: "row" },
  brandPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 6,
    paddingRight: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.bgCard,
  },
  brandPillMark: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  brandPillMarkText: { color: "#0E1117", fontSize: 12, fontWeight: "900" as const },
  brandPillLabel: { color: theme.text, fontSize: 11, fontWeight: "900" as const, letterSpacing: 1 },
  brandPillSub: { color: theme.textDim, fontSize: 9, fontWeight: "700" as const, marginTop: 1 },
  brandBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  brandMark: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  brandMarkText: { color: theme.text, fontSize: 18, fontWeight: "900" as const },
  brandBannerTitle: { fontSize: 12, fontWeight: "900" as const, letterSpacing: 1.4 },
  brandBannerBody: { color: theme.textMuted, fontSize: 11, fontWeight: "600" as const, marginTop: 3, lineHeight: 15 },
  brandPerkFoot: { color: theme.textDim, fontSize: 10, fontWeight: "600" as const, marginTop: 4, lineHeight: 14 },
});
