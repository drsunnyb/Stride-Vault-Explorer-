import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Crown,
  Eye,
  Hourglass,
  Lock,
  Receipt,
  Repeat,
  Sparkles,
  Ticket,
  Trophy,
  Users,
  Zap,
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { CoinIcon } from "@/components/CoinIcon";
import { LIVE_CITY_ID, flagEmoji } from "@/constants/cities";
import { RAFFLES, formatCountdown } from "@/constants/raffles";
import { DEFAULT_BRANDS, exchangeRate, getBrand, REWARDS, type BrandMeta } from "@/constants/rewards";
import { theme } from "@/constants/theme";
import { useGame } from "@/providers/GameProvider";
import type { Raffle, Redemption, Reward, VaultBrand } from "@/types/game";

type Filter = "all" | "stride" | VaultBrand;
type Tab = "browse" | "codes" | "entries";

const EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export default function RewardsScreen() {
  const router = useRouter();
  const { player, raffles, rewards, brands, entriesForRaffle, now, exchange, isExchanging, homeCity, homeCityRank } = useGame();
  const [tab, setTab] = useState<Tab>("browse");
  const [filter, setFilter] = useState<Filter>("all");

  /**
   * Waitlist gate — players whose home city isn't London yet can browse the
   * catalogue as a preview but every CTA is locked. Their coins still mint;
   * spending unlocks the moment their city goes live. Stride+ shortens the
   * wait by boosting city votes (handled by the Memberships admin config).
   */
  const onWaitlist = !!player.homeCityId && player.homeCityId !== LIVE_CITY_ID;

  /**
   * Active brand catalogue — derived in priority order so the UI works whether
   * the partner roster is empty, single, or sprawling:
   *   1. Backend brand rows (if any) drive the canonical list & sort order.
   *   2. Otherwise we fall back to brands actually referenced by the live
   *      rewards catalogue (so a brand-less deploy renders zero brand UI).
   *   3. As a last resort we surface the default seed (Nike/Apple) so the
   *      first-run developer experience isn't an empty rewards tab.
   */
  const activeRewards = rewards.length > 0 ? rewards : REWARDS;
  const activeBrands: BrandMeta[] = useMemo(() => {
    if (brands.length > 0) return brands;
    const referenced = new Set<string>();
    for (const r of activeRewards) if (r.brand) referenced.add(r.brand);
    for (const k of Object.keys(player.brandCoins)) referenced.add(k);
    if (referenced.size > 0) {
      return Array.from(referenced)
        .map((id) => getBrand(id))
        .filter((b): b is BrandMeta => !!b);
    }
    return DEFAULT_BRANDS;
  }, [brands, activeRewards, player.brandCoins]);
  const hasBrands = activeBrands.length > 0;
  const [exchangeBrand, setExchangeBrand] = useState<VaultBrand>(
    activeBrands[0]?.id ?? ""
  );
  React.useEffect(() => {
    if (!hasBrands) return;
    if (!activeBrands.some((b) => b.id === exchangeBrand)) {
      setExchangeBrand(activeBrands[0].id);
    }
  }, [activeBrands, exchangeBrand, hasBrands]);

  const claimedCount = player.redemptions.length;
  const liveRaffles: Raffle[] = useMemo(() => {
    const list = raffles && raffles.length > 0 ? raffles : RAFFLES;
    return [...list]
      .filter((r) => r.endsAt > now)
      .sort((a, b) => a.endsAt - b.endsAt);
  }, [raffles, now]);
  const myEntryRaffles: Raffle[] = useMemo(() => {
    const list = raffles && raffles.length > 0 ? raffles : RAFFLES;
    return [...list]
      .filter((r) => entriesForRaffle(r.id) > 0)
      .sort((a, b) => {
        const aEnded = a.endsAt < now ? 1 : 0;
        const bEnded = b.endsAt < now ? 1 : 0;
        if (aEnded !== bEnded) return aEnded - bEnded;
        return a.endsAt - b.endsAt;
      });
  }, [raffles, now, entriesForRaffle]);
  const entryCount = myEntryRaffles.length;

  const filtered = useMemo<Reward[]>(() => {
    if (filter === "all") return activeRewards;
    if (filter === "stride") return activeRewards.filter((r) => !r.brand);
    return activeRewards.filter((r) => r.brand === filter);
  }, [filter, activeRewards]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 32 }}>
      {onWaitlist ? (
        <WaitlistPreviewBanner
          cityName={homeCity?.name ?? "your city"}
          countryCode={homeCity?.countryCode}
          rank={homeCityRank}
          onMembership={() => router.push("/plus")}
          onRally={() => router.push("/cities")}
        />
      ) : null}

      {/* SEGMENTED 3-WAY TAB */}
      <View style={styles.tabRow}>
        <TabButton
          active={tab === "browse"}
          onPress={() => setTab("browse")}
          icon={<Ticket size={13} color={tab === "browse" ? theme.bg : theme.textMuted} />}
          label="BROWSE"
        />
        <TabButton
          active={tab === "codes"}
          onPress={() => setTab("codes")}
          icon={<Receipt size={13} color={tab === "codes" ? theme.bg : theme.textMuted} />}
          label="CODES"
          badge={claimedCount}
        />
        <TabButton
          active={tab === "entries"}
          onPress={() => setTab("entries")}
          icon={<Trophy size={13} color={tab === "entries" ? theme.bg : theme.textMuted} />}
          label="ENTRIES"
          badge={entryCount}
        />
      </View>

      <View pointerEvents={onWaitlist ? "none" : "auto"} style={onWaitlist ? styles.previewDim : undefined}>
      {tab === "codes" ? (
        <ClaimedList
          redemptions={player.redemptions}
          onOpen={(r) => router.push(`/reward/${r.rewardId}`)}
        />
      ) : tab === "entries" ? (
        <EntriesList
          raffles={myEntryRaffles}
          now={now}
          entriesFor={entriesForRaffle}
          onOpen={(r) => router.push(`/raffle/${r.id}`)}
        />
      ) : (
        <BrowseSection
          player={player}
          filter={filter}
          setFilter={setFilter}
          exchangeBrand={exchangeBrand}
          setExchangeBrand={setExchangeBrand}
          exchange={exchange}
          isExchanging={isExchanging}
          onOpenReward={(r) => router.push(`/reward/${r.id}`)}
          onOpenRaffle={(r) => router.push(`/raffle/${r.id}`)}
          filtered={filtered}
          liveRaffles={liveRaffles}
          entriesFor={entriesForRaffle}
          now={now}
          activeBrands={activeBrands}
        />
      )}
      </View>
    </ScrollView>
  );
}

function WaitlistPreviewBanner({
  cityName,
  countryCode,
  rank,
  onMembership,
  onRally,
}: {
  cityName: string;
  countryCode?: string;
  rank: number;
  onMembership: () => void;
  onRally: () => void;
}) {
  return (
    <View style={styles.waitlistCard}>
      <LinearGradient
        colors={["rgba(244,208,63,0.18)", "rgba(244,208,63,0.04)", "rgba(6,7,13,0)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.waitlistTop}>
        <View style={styles.waitlistChip}>
          <Eye size={11} color={theme.goldBright} />
          <Text style={styles.waitlistChipText}>PREVIEW MODE</Text>
        </View>
        {countryCode ? <Text style={styles.waitlistFlag}>{flagEmoji(countryCode)}</Text> : null}
      </View>
      <Text style={styles.waitlistTitle}>
        Coins are minting in {cityName} — spending unlocks when your city is live.
      </Text>
      <Text style={styles.waitlistBody}>
        Browse the catalogue, see exactly what your steps will buy. Codes &
        raffles activate the moment {cityName} hits #1 on the waitlist
        {rank > 0 ? ` (currently #${rank})` : ""}.
      </Text>

      <View style={styles.waitlistRow}>
        <Pressable onPress={onMembership} style={({ pressed }) => [styles.waitlistCtaPrimary, pressed && { transform: [{ scale: 0.99 }] }]}>
          <Crown size={14} color="#1A0A00" />
          <View style={{ flex: 1 }}>
            <Text style={styles.waitlistCtaPrimaryTitle}>SKIP THE LINE WITH STRIDE+</Text>
            <Text style={styles.waitlistCtaPrimarySub}>3× city votes · 1.5× step value · weekly free votes</Text>
          </View>
        </Pressable>
        <Pressable onPress={onRally} style={({ pressed }) => [styles.waitlistCtaGhost, pressed && { transform: [{ scale: 0.99 }] }]}>
          <Zap size={13} color={theme.emeraldBright} />
          <Text style={styles.waitlistCtaGhostText}>RALLY MY CITY</Text>
        </Pressable>
      </View>

      <View style={styles.waitlistFootRow}>
        <View style={styles.waitlistFootChip}>
          <Sparkles size={10} color={theme.goldBright} />
          <Text style={styles.waitlistFootText}>Coins keep minting</Text>
        </View>
        <View style={styles.waitlistFootChip}>
          <Lock size={10} color={theme.textMuted} />
          <Text style={styles.waitlistFootText}>Spend locked until live</Text>
        </View>
      </View>
    </View>
  );
}

function TabButton({
  active,
  onPress,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onPress: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.tabBtn, active && styles.tabBtnActive]}>
      {icon}
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
      {badge && badge > 0 ? (
        <View style={[styles.tabBadge, active && { backgroundColor: theme.bg }]}>
          <Text style={[styles.tabBadgeText, active && { color: theme.goldBright }]}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

// ─── BROWSE SECTION ───
function BrowseSection({
  player,
  filter,
  setFilter,
  exchangeBrand,
  setExchangeBrand,
  exchange,
  isExchanging,
  onOpenReward,
  onOpenRaffle,
  filtered,
  liveRaffles,
  entriesFor,
  now,
  activeBrands,
}: {
  player: ReturnType<typeof useGame>["player"];
  filter: Filter;
  setFilter: (f: Filter) => void;
  exchangeBrand: VaultBrand;
  setExchangeBrand: (b: VaultBrand) => void;
  exchange: ReturnType<typeof useGame>["exchange"];
  isExchanging: boolean;
  onOpenReward: (r: Reward) => void;
  onOpenRaffle: (r: Raffle) => void;
  filtered: Reward[];
  liveRaffles: Raffle[];
  entriesFor: (id: string) => number;
  now: number;
  activeBrands: BrandMeta[];
}) {
  const exchangeAmount = 50;
  const exchangeMeta = activeBrands.find((b) => b.id === exchangeBrand) ?? activeBrands[0];
  const exchangeCost = exchangeMeta ? exchangeAmount * exchangeRate(exchangeMeta.id) : 0;
  const canExchange = !!exchangeMeta && player.coins >= exchangeCost;
  const hasBrands = activeBrands.length > 0;

  return (
    <>
      {/* HERO — Stride balance */}
      <View style={styles.heroCard}>
        <LinearGradient
          colors={["rgba(244,208,63,0.20)", "rgba(212,175,55,0.06)", "rgba(6,7,13,0)"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.heroRow}>
          <CoinIcon size={56} />
          <View style={{ flex: 1 }}>
            <Text style={styles.heroLabel}>STRIDE COINS</Text>
            <Text style={styles.heroBalance}>{player.coins.toLocaleString()}</Text>
            <Text style={styles.heroSub}>Spend on rewards · Enter raffles · Convert to brand</Text>
          </View>
        </View>
      </View>

      {/* WALLETS — brand balances. Hidden entirely when there are no brand
          partners, full-width when there's only one, horizontal scroll for many. */}
      {hasBrands ? (
        <>
          <Text style={styles.sectionTitle}>YOUR COINS</Text>
          {activeBrands.length === 1 ? (
            <View style={[styles.walletRow, { paddingHorizontal: 16 }]}>
              <BrandWalletCard
                brand={activeBrands[0].id}
                balance={player.brandCoins[activeBrands[0].id] ?? 0}
                onTap={() => setFilter(activeBrands[0].id)}
                active={filter === activeBrands[0].id}
                full
              />
            </View>
          ) : activeBrands.length <= 2 ? (
            <View style={styles.walletRow}>
              {activeBrands.map((b) => (
                <BrandWalletCard
                  key={b.id}
                  brand={b.id}
                  balance={player.brandCoins[b.id] ?? 0}
                  onTap={() => setFilter(b.id)}
                  active={filter === b.id}
                />
              ))}
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.walletScroller}
            >
              {activeBrands.map((b) => (
                <View key={b.id} style={{ width: 180 }}>
                  <BrandWalletCard
                    brand={b.id}
                    balance={player.brandCoins[b.id] ?? 0}
                    onTap={() => setFilter(b.id)}
                    active={filter === b.id}
                  />
                </View>
              ))}
            </ScrollView>
          )}
        </>
      ) : null}

      {/* LIVE RAFFLES — horizontal scroller */}
      {liveRaffles.length > 0 ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>LIVE RAFFLES</Text>
            <View style={styles.liveDot}>
              <View style={styles.liveDotInner} />
              <Text style={styles.liveDotText}>{liveRaffles.length} LIVE</Text>
            </View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.raffleScroller}
          >
            {liveRaffles.map((r) => (
              <RaffleMiniCard
                key={r.id}
                raffle={r}
                now={now}
                myEntries={entriesFor(r.id)}
                onPress={() => onOpenRaffle(r)}
              />
            ))}
          </ScrollView>
        </>
      ) : null}

      {/* EXCHANGE — dynamic per brand. Hidden if there are no partners. */}
      {hasBrands && exchangeMeta ? (
        <>
          <Text style={styles.sectionTitle}>EXCHANGE COINS</Text>
          <View style={styles.exchangeCard}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.exchangeTabs}
            >
              {activeBrands.map((b) => {
                const active = exchangeBrand === b.id;
                return (
                  <Pressable
                    key={b.id}
                    onPress={() => setExchangeBrand(b.id)}
                    style={[styles.exchangeTab, active && { borderColor: b.color, backgroundColor: b.color + "18" }]}
                  >
                    <Text style={[styles.exchangeTabText, active && { color: b.colorBright }]}>{b.short}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={styles.exchangeFlow}>
              <View style={styles.exchangeSide}>
                <CoinIcon size={42} />
                <Text style={styles.exchangeAmt}>{exchangeCost.toLocaleString()}</Text>
                <Text style={styles.exchangeLbl}>STRIDE</Text>
              </View>
              <View style={styles.exchangeArrow}>
                <Repeat size={18} color={theme.textMuted} />
                <Text style={styles.exchangeRate}>1 : {(1 / exchangeRate(exchangeMeta.id)).toFixed(2)}</Text>
              </View>
              <View style={styles.exchangeSide}>
                <CoinIcon brand={exchangeMeta.id} size={42} />
                <Text style={[styles.exchangeAmt, { color: exchangeMeta.colorBright }]}>+{exchangeAmount}</Text>
                <Text style={styles.exchangeLbl}>{exchangeMeta.short}</Text>
              </View>
            </View>
            <Pressable
              disabled={!canExchange || isExchanging}
              onPress={() => exchange({ brand: exchangeMeta.id, brandAmount: exchangeAmount })}
              style={({ pressed }) => [
                styles.exchangeBtn,
                { backgroundColor: exchangeMeta.color },
                (!canExchange || isExchanging) && { opacity: 0.4 },
                pressed && { transform: [{ scale: 0.98 }] },
              ]}
            >
              <Text style={[styles.exchangeBtnText, exchangeMeta.invertedText && { color: "#0E1117" }]}>
                {canExchange ? `EXCHANGE FOR ${exchangeMeta.short} COINS` : "NOT ENOUGH STRIDE COINS"}
              </Text>
            </Pressable>
            <Text style={styles.exchangeHelp}>
              Brand coins unlock partner-locked rewards from {activeBrands.map((b) => b.name).slice(0, 3).join(", ")}{activeBrands.length > 3 ? ` +${activeBrands.length - 3} more` : ""}.
            </Text>
          </View>
        </>
      ) : null}

      {/* INSTANT REWARDS — filter chips driven by the live brand list. Chips
          for brands collapse when there are none; STRIDE-only deploys still
          look clean. */}
      <Text style={styles.sectionTitle}>INSTANT REWARDS</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        <FilterChip label="ALL" active={filter === "all"} onPress={() => setFilter("all")} />
        <FilterChip label="STRIDE" active={filter === "stride"} color={theme.gold} onPress={() => setFilter("stride")} />
        {activeBrands.map((b) => (
          <FilterChip
            key={b.id}
            label={b.short}
            active={filter === b.id}
            color={b.color}
            onPress={() => setFilter(b.id)}
          />
        ))}
      </ScrollView>

      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        {filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ticket size={28} color={theme.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No rewards in this lane yet</Text>
            <Text style={styles.emptySub}>
              {filter === "all"
                ? "New rewards drop weekly. Check back soon — or invite a brand you'd love to see."
                : "Switch filters to see what's available right now."}
            </Text>
          </View>
        ) : (
          filtered.map((r) => (
            <RewardRow
              key={r.id}
              reward={r}
              strideBal={player.coins}
              brandBal={r.brand ? player.brandCoins[r.brand] ?? 0 : 0}
              onPress={() => onOpenReward(r)}
            />
          ))
        )}
      </View>
    </>
  );
}

// ─── RAFFLE MINI CARD (horizontal) ───
function RaffleMiniCard({
  raffle,
  now,
  myEntries,
  onPress,
}: {
  raffle: Raffle;
  now: number;
  myEntries: number;
  onPress: () => void;
}) {
  const meta = getBrand(raffle.brand);
  const accent = raffle.plusOnly ? theme.gold : (meta?.color ?? theme.gold);
  const glow = raffle.plusOnly ? theme.goldBright : (meta?.colorBright ?? theme.goldBright);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.miniCard,
        { borderColor: accent + "66" },
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
    >
      <LinearGradient
        colors={[accent + "33", "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.miniHeader}>
        {raffle.plusOnly ? (
          <View style={[styles.brandPill, { backgroundColor: theme.goldBright, flexDirection: "row", alignItems: "center", gap: 3 }]}>
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
        <View style={[styles.miniTimer, { borderColor: accent + "AA" }]}>
          <Hourglass size={9} color={glow} />
          <Text style={[styles.miniTimerText, { color: glow }]}>
            {formatCountdown(raffle.endsAt - now)}
          </Text>
        </View>
      </View>

      <Text style={styles.miniEmoji}>{raffle.emoji}</Text>
      <Text style={styles.miniTitle} numberOfLines={2}>{raffle.title}</Text>
      <Text style={styles.miniValue}>£{raffle.prizeValueGbp.toLocaleString()} value</Text>

      <View style={styles.miniFoot}>
        <View style={styles.miniCost}>
          <CoinIcon size={12} />
          <Text style={styles.miniCostText}>{raffle.entryCost}</Text>
          <Text style={styles.miniCostUnit}>/entry</Text>
        </View>
        {myEntries > 0 ? (
          <View style={[styles.miniEntries, { borderColor: accent + "AA", backgroundColor: accent + "1F" }]}>
            <Ticket size={10} color={glow} />
            <Text style={[styles.miniEntriesText, { color: glow }]}>{myEntries}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

// ─── CLAIMED CODES LIST ───
function ClaimedList({
  redemptions,
  onOpen,
}: {
  redemptions: Redemption[];
  onOpen: (r: Redemption) => void;
}) {
  const groups = useMemoGroups(redemptions);

  if (redemptions.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <View style={styles.emptyIcon}>
          <Receipt size={28} color={theme.textMuted} />
        </View>
        <Text style={styles.emptyTitle}>No claimed codes yet</Text>
        <Text style={styles.emptySub}>
          Codes you redeem from the rewards catalogue will appear here, ready to show at the till.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 18 }}>
      {groups.map((g) => (
        <View key={g.label} style={{ gap: 10 }}>
          <Text style={styles.groupLabel}>{g.label}</Text>
          {g.items.map((r) => (
            <ClaimedRow key={r.id} redemption={r} onPress={() => onOpen(r)} />
          ))}
        </View>
      ))}
    </View>
  );
}

// ─── ENTRIES LIST ───
function EntriesList({
  raffles,
  now,
  entriesFor,
  onOpen,
}: {
  raffles: Raffle[];
  now: number;
  entriesFor: (id: string) => number;
  onOpen: (r: Raffle) => void;
}) {
  if (raffles.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <View style={styles.emptyIcon}>
          <Trophy size={28} color={theme.textMuted} />
        </View>
        <Text style={styles.emptyTitle}>No raffle entries yet</Text>
        <Text style={styles.emptySub}>
          Spend Stride Coins on a live raffle to enter — more entries means better odds.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 10 }}>
      {raffles.map((r) => (
        <EntryRow
          key={r.id}
          raffle={r}
          now={now}
          myEntries={entriesFor(r.id)}
          onPress={() => onOpen(r)}
        />
      ))}
    </View>
  );
}

function EntryRow({
  raffle,
  now,
  myEntries,
  onPress,
}: {
  raffle: Raffle;
  now: number;
  myEntries: number;
  onPress: () => void;
}) {
  const ended = raffle.endsAt < now;
  const meta = getBrand(raffle.brand);
  const accent = meta?.color ?? theme.gold;
  const glow = meta?.colorBright ?? theme.goldBright;
  const totalEntries = raffle.totalEntries + myEntries;
  const myOdds =
    totalEntries > 0 && myEntries > 0
      ? `1 in ${Math.max(1, Math.round(totalEntries / Math.max(1, myEntries) / Math.max(1, raffle.winners)))}`
      : "—";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.entryRow,
        { borderColor: ended ? theme.border : accent + "55" },
        pressed && { transform: [{ scale: 0.99 }] },
      ]}
    >
      <LinearGradient
        colors={[accent + (ended ? "11" : "22"), "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.entryIcon, { borderColor: accent }]}>
        <Text style={{ fontSize: 28 }}>{raffle.emoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.entryTopRow}>
          {meta ? (
            <View style={[styles.brandPill, { backgroundColor: meta.color }]}>
              <Text style={styles.brandPillText}>{meta.short}</Text>
            </View>
          ) : (
            <View style={[styles.brandPill, { backgroundColor: theme.gold }]}>
              <Text style={[styles.brandPillText, { color: "#1A1300" }]}>STRIDE</Text>
            </View>
          )}
          <View
            style={[
              styles.miniTimer,
              { borderColor: ended ? theme.border : accent + "AA" },
            ]}
          >
            <Hourglass size={9} color={ended ? theme.textDim : glow} />
            <Text style={[styles.miniTimerText, { color: ended ? theme.textDim : glow }]}>
              {ended ? "DRAWN" : formatCountdown(raffle.endsAt - now)}
            </Text>
          </View>
        </View>
        <Text style={styles.entryTitle} numberOfLines={1}>{raffle.title}</Text>
        <View style={styles.entryStatsRow}>
          <View style={[styles.entryStat, { backgroundColor: accent + "1F", borderColor: accent + "55" }]}>
            <Ticket size={10} color={glow} />
            <Text style={[styles.entryStatText, { color: glow }]}>{myEntries} ENTRIES</Text>
          </View>
          <View style={styles.entryStat}>
            <Users size={10} color={theme.textMuted} />
            <Text style={styles.entryStatText}>{totalEntries.toLocaleString()}</Text>
          </View>
          {!ended ? (
            <Text style={styles.entryOdds}>{myOdds}</Text>
          ) : null}
        </View>
      </View>
      <ArrowRight size={16} color={theme.textDim} />
    </Pressable>
  );
}

function useMemoGroups(redemptions: Redemption[]) {
  return useMemo(() => {
    const byKey = new Map<string, Redemption[]>();
    for (const r of redemptions) {
      const d = new Date(r.redeemedAt);
      const label = d.toLocaleString("en-GB", { month: "long", year: "numeric" }).toUpperCase();
      const list = byKey.get(label) ?? [];
      list.push(r);
      byKey.set(label, list);
    }
    return Array.from(byKey.entries()).map(([label, items]) => ({ label, items }));
  }, [redemptions]);
}

function ClaimedRow({ redemption, onPress }: { redemption: Redemption; onPress: () => void }) {
  const { rewards } = useGame();
  const catalogue = rewards.length > 0 ? rewards : REWARDS;
  const reward = catalogue.find((r) => r.id === redemption.rewardId);
  const meta = getBrand(reward?.brand);
  const expiresAt = redemption.redeemedAt + EXPIRY_MS;
  const expired = Date.now() > expiresAt;
  const daysLeft = Math.max(0, Math.ceil((expiresAt - Date.now()) / (24 * 60 * 60 * 1000)));

  const dateStr = new Date(redemption.redeemedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.claimedRow,
        { borderColor: meta ? meta.color + "55" : theme.emerald + "55" },
        pressed && { transform: [{ scale: 0.99 }] },
      ]}
    >
      {meta ? (
        <LinearGradient
          colors={[meta.color + "22", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <LinearGradient
          colors={["rgba(16,185,129,0.18)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      )}

      <View style={[styles.claimedIcon, { borderColor: meta ? meta.color : theme.emerald + "88" }]}>
        <Text style={{ fontSize: 26 }}>{reward?.emoji ?? "🎟️"}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <View style={styles.claimedTopRow}>
          <View
            style={[
              styles.brandPill,
              { backgroundColor: meta ? meta.color : theme.gold },
            ]}
          >
            <Text
              style={[
                styles.brandPillText,
                !meta && { color: "#1A1300" },
              ]}
            >
              {meta ? meta.short : "STRIDE"}
            </Text>
          </View>
          <Text style={styles.claimedDate}>{dateStr}</Text>
        </View>
        <Text style={styles.claimedTitle} numberOfLines={1}>
          {reward?.title ?? "Reward"}
        </Text>

        <View style={styles.codeRow}>
          <Text style={styles.codeChip}>{redemption.code}</Text>
          {expired ? (
            <View style={[styles.statusChip, { borderColor: theme.border }]}>
              <Clock size={10} color={theme.textDim} />
              <Text style={[styles.statusChipText, { color: theme.textDim }]}>EXPIRED</Text>
            </View>
          ) : (
            <View style={[styles.statusChip, { borderColor: theme.emerald + "77" }]}>
              <CheckCircle2 size={10} color={theme.emeraldBright} />
              <Text style={[styles.statusChipText, { color: theme.emeraldBright }]}>
                {daysLeft}d LEFT
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.claimedSub} numberOfLines={1}>
          {reward?.redeemAt}
        </Text>
      </View>

      <ArrowRight size={16} color={theme.textDim} />
    </Pressable>
  );
}

function BrandWalletCard({
  brand,
  balance,
  onTap,
  active,
  full,
}: {
  brand: VaultBrand;
  balance: number;
  onTap: () => void;
  active: boolean;
  full?: boolean;
}) {
  const meta = getBrand(brand);
  if (!meta) return null;
  return (
    <Pressable
      onPress={onTap}
      style={({ pressed }) => [
        styles.walletCard,
        { borderColor: active ? meta.color : meta.color + "33" },
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
    >
      <LinearGradient
        colors={[meta.color + (active ? "33" : "1A"), "transparent"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.walletHeader}>
        <CoinIcon brand={brand} size={32} />
        <Text style={[styles.walletShort, { color: meta.colorBright }]}>{meta.short}</Text>
      </View>
      <Text style={styles.walletBalance}>{balance.toLocaleString()}</Text>
      <Text style={styles.walletTagline} numberOfLines={2}>{meta.tagline}</Text>
    </Pressable>
  );
}

function FilterChip({
  label,
  active,
  color,
  onPress,
}: {
  label: string;
  active: boolean;
  color?: string;
  onPress: () => void;
}) {
  const c = color ?? theme.text;
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        active && { borderColor: c, backgroundColor: c + "1F" },
      ]}
    >
      <Text style={[styles.chipText, active && { color: c }]}>{label}</Text>
    </Pressable>
  );
}

function RewardRow({
  reward,
  strideBal,
  brandBal,
  onPress,
}: {
  reward: Reward;
  strideBal: number;
  brandBal: number;
  onPress: () => void;
}) {
  const meta = getBrand(reward.brand);
  const isBrand = !!reward.brand;
  const canAfford = isBrand
    ? brandBal >= (reward.brandCost ?? 0)
    : strideBal >= reward.coinCost;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderColor: meta ? meta.color + "44" : theme.borderSoft },
        pressed && { transform: [{ scale: 0.99 }] },
      ]}
    >
      {meta ? (
        <LinearGradient
          colors={[meta.color + "22", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View style={[styles.rowIcon, { borderColor: meta ? meta.color : theme.border }]}>
        <Text style={{ fontSize: 26 }}>{reward.emoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.rowTitleLine}>
          {meta ? (
            <View style={[styles.brandPill, { backgroundColor: meta.color }]}>
              <Text style={styles.brandPillText}>{meta.short}</Text>
            </View>
          ) : (
            <View style={[styles.brandPill, { backgroundColor: theme.gold }]}>
              <Text style={[styles.brandPillText, { color: "#1A1300" }]}>STRIDE</Text>
            </View>
          )}
          <Text style={styles.rowBadge}>{reward.badge}</Text>
        </View>
        <Text style={styles.rowTitle} numberOfLines={1}>{reward.title}</Text>
        <Text style={styles.rowSub} numberOfLines={1}>{reward.subtitle}</Text>
        <View style={styles.rowCostLine}>
          <CoinIcon brand={reward.brand} size={14} />
          <Text style={[styles.rowCost, !canAfford && { color: theme.textDim }]}>
            {isBrand ? reward.brandCost?.toLocaleString() : reward.coinCost.toLocaleString()}
          </Text>
          {reward.inStoreOnly ? (
            <View style={styles.inStoreTag}>
              <Lock size={9} color={theme.textMuted} />
              <Text style={styles.inStoreText}>IN-STORE</Text>
            </View>
          ) : null}
        </View>
      </View>
      <ArrowRight size={16} color={theme.textDim} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  tabRow: {
    flexDirection: "row",
    gap: 4,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 4,
    borderRadius: 999,
    backgroundColor: theme.bgCard,
    borderWidth: 1,
    borderColor: theme.borderSoft,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 10,
    borderRadius: 999,
  },
  tabBtnActive: { backgroundColor: theme.gold },
  tabText: { color: theme.textMuted, fontSize: 10, fontWeight: "900" as const, letterSpacing: 1.2 },
  tabTextActive: { color: theme.bg },
  tabBadge: {
    minWidth: 18,
    paddingHorizontal: 5,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBadgeText: { color: theme.bg, fontSize: 10, fontWeight: "900" as const },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: 16,
  },
  liveDot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.emerald + "66",
    backgroundColor: theme.emerald + "1A",
  },
  liveDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.emeraldBright,
  },
  liveDotText: {
    color: theme.emeraldBright,
    fontSize: 9,
    fontWeight: "900" as const,
    letterSpacing: 1.2,
  },
  raffleScroller: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 4,
  },
  miniCard: {
    width: 200,
    padding: 12,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.bgCard,
    borderWidth: 1,
    overflow: "hidden",
    gap: 6,
  },
  miniHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  miniTimer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    backgroundColor: theme.surface,
  },
  miniTimerText: { fontSize: 9, fontWeight: "900" as const, letterSpacing: 1 },
  miniEmoji: { fontSize: 36, textAlign: "center" as const, marginVertical: 4 },
  miniTitle: { color: theme.text, fontSize: 13, fontWeight: "800" as const, minHeight: 32 },
  miniValue: { color: theme.goldBright, fontSize: 11, fontWeight: "800" as const },
  miniFoot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: theme.borderSoft,
  },
  miniCost: { flexDirection: "row", alignItems: "center", gap: 4 },
  miniCostText: { color: theme.text, fontSize: 13, fontWeight: "900" as const },
  miniCostUnit: { color: theme.textDim, fontSize: 10, fontWeight: "700" as const },
  miniEntries: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  miniEntriesText: { fontSize: 11, fontWeight: "900" as const },
  emptyCard: {
    marginHorizontal: 16,
    marginTop: 24,
    padding: 28,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.bgCard,
    borderWidth: 1,
    borderColor: theme.borderSoft,
    alignItems: "center",
    gap: 10,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { color: theme.text, fontSize: 14, fontWeight: "800" as const },
  emptySub: {
    color: theme.textDim,
    fontSize: 12,
    textAlign: "center" as const,
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  groupLabel: {
    color: theme.textMuted,
    fontSize: 10,
    fontWeight: "900" as const,
    letterSpacing: 1.8,
  },
  claimedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.bgCard,
    borderWidth: 1,
    overflow: "hidden",
  },
  claimedIcon: {
    width: 52,
    height: 52,
    borderRadius: theme.radius.md,
    backgroundColor: theme.surface,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  claimedTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  claimedDate: { color: theme.textDim, fontSize: 10, fontWeight: "800" as const, letterSpacing: 0.6 },
  claimedTitle: { color: theme.text, fontSize: 14, fontWeight: "800" as const, marginTop: 4 },
  claimedSub: { color: theme.textDim, fontSize: 11, marginTop: 4 },
  codeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  codeChip: {
    color: theme.text,
    fontSize: 13,
    fontWeight: "900" as const,
    letterSpacing: 2.4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: theme.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.border,
    fontVariant: ["tabular-nums"],
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: theme.surface,
    borderWidth: 1,
  },
  statusChipText: { fontSize: 9, fontWeight: "900" as const, letterSpacing: 1 },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.bgCard,
    borderWidth: 1,
    overflow: "hidden",
  },
  entryIcon: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.md,
    backgroundColor: theme.surface,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  entryTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  entryTitle: { color: theme.text, fontSize: 14, fontWeight: "800" as const, marginTop: 6 },
  entryStatsRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6, flexWrap: "wrap" as const },
  entryStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  entryStatText: { color: theme.textMuted, fontSize: 10, fontWeight: "900" as const, letterSpacing: 0.8 },
  entryOdds: { color: theme.emeraldBright, fontSize: 10, fontWeight: "900" as const, letterSpacing: 0.6 },
  heroCard: {
    margin: 16,
    padding: 18,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.bgElev,
    borderWidth: 1,
    borderColor: theme.gold + "55",
    overflow: "hidden",
  },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  heroLabel: { color: theme.textMuted, fontSize: 10, fontWeight: "800" as const, letterSpacing: 1.6 },
  heroBalance: { color: theme.goldBright, fontSize: 36, fontWeight: "900" as const, marginTop: 2 },
  heroSub: { color: theme.textDim, fontSize: 11, fontWeight: "600" as const, marginTop: 2 },
  sectionTitle: {
    color: theme.text,
    fontSize: 13,
    fontWeight: "900" as const,
    letterSpacing: 2,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 10,
  },
  walletRow: { flexDirection: "row", paddingHorizontal: 16, gap: 10 },
  walletScroller: { paddingHorizontal: 16, gap: 10, paddingBottom: 4 },
  walletCard: {
    flex: 1,
    padding: 14,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.bgCard,
    borderWidth: 1,
    overflow: "hidden",
    minHeight: 110,
  },
  walletHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  walletShort: { fontSize: 11, fontWeight: "900" as const, letterSpacing: 1.4 },
  walletBalance: { color: theme.text, fontSize: 26, fontWeight: "900" as const, marginTop: 8 },
  walletTagline: { color: theme.textDim, fontSize: 10, fontWeight: "600" as const, marginTop: 4 },
  exchangeCard: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.bgCard,
    borderWidth: 1,
    borderColor: theme.borderSoft,
    gap: 14,
  },
  exchangeTabs: { flexDirection: "row", gap: 8, paddingRight: 8 },
  exchangeTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  exchangeTabText: { color: theme.textMuted, fontSize: 10, fontWeight: "900" as const, letterSpacing: 1.2 },
  exchangeFlow: { flexDirection: "row", alignItems: "center", gap: 8 },
  exchangeSide: { flex: 1, alignItems: "center", gap: 4 },
  exchangeAmt: { color: theme.text, fontSize: 16, fontWeight: "900" as const, marginTop: 4 },
  exchangeLbl: { color: theme.textDim, fontSize: 9, fontWeight: "800" as const, letterSpacing: 1.4 },
  exchangeArrow: { alignItems: "center", gap: 4, width: 60 },
  exchangeRate: { color: theme.textMuted, fontSize: 9, fontWeight: "800" as const, letterSpacing: 1 },
  exchangeBtn: {
    paddingVertical: 14,
    borderRadius: theme.radius.md,
    alignItems: "center",
  },
  exchangeBtnText: { color: "#FFF", fontSize: 12, fontWeight: "900" as const, letterSpacing: 1.4 },
  exchangeHelp: { color: theme.textDim, fontSize: 10, fontWeight: "600" as const, textAlign: "center" as const },
  filterRow: { paddingHorizontal: 16, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.bgCard,
  },
  chipText: { color: theme.textMuted, fontSize: 11, fontWeight: "900" as const, letterSpacing: 1.4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.bgCard,
    borderWidth: 1,
    overflow: "hidden",
  },
  rowIcon: {
    width: 52,
    height: 52,
    borderRadius: theme.radius.md,
    backgroundColor: theme.surface,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitleLine: { flexDirection: "row", alignItems: "center", gap: 6 },
  brandPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  brandPillText: { color: "#FFF", fontSize: 8, fontWeight: "900" as const, letterSpacing: 1.2 },
  rowBadge: { color: theme.textMuted, fontSize: 9, fontWeight: "900" as const, letterSpacing: 1.2 },
  rowTitle: { color: theme.text, fontSize: 14, fontWeight: "800" as const, marginTop: 4 },
  rowSub: { color: theme.textDim, fontSize: 11, marginTop: 1 },
  rowCostLine: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  rowCost: { color: theme.text, fontSize: 13, fontWeight: "900" as const },
  inStoreTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.borderSoft,
  },
  inStoreText: { color: theme.textMuted, fontSize: 8, fontWeight: "900" as const, letterSpacing: 1 },
  // Waitlist preview banner
  waitlistCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 18,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.bgElev,
    borderWidth: 1,
    borderColor: theme.gold + "66",
    overflow: "hidden",
    gap: 12,
  },
  waitlistTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  waitlistChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(244,208,63,0.16)",
    borderWidth: 1,
    borderColor: theme.gold + "66",
  },
  waitlistChipText: { color: theme.goldBright, fontSize: 10, fontWeight: "900" as const, letterSpacing: 1.4 },
  waitlistFlag: { fontSize: 26 },
  waitlistTitle: { color: theme.text, fontSize: 16, fontWeight: "900" as const, lineHeight: 22 },
  waitlistBody: { color: theme.textMuted, fontSize: 12, fontWeight: "600" as const, lineHeight: 18 },
  waitlistRow: { gap: 10 },
  waitlistCtaPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.goldBright,
  },
  waitlistCtaPrimaryTitle: { color: "#1A0A00", fontSize: 12, fontWeight: "900" as const, letterSpacing: 1.2 },
  waitlistCtaPrimarySub: { color: "#3A2400", fontSize: 11, fontWeight: "700" as const, marginTop: 2 },
  waitlistCtaGhost: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 11,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.emerald + "77",
    backgroundColor: theme.emerald + "14",
  },
  waitlistCtaGhostText: { color: theme.emeraldBright, fontSize: 11, fontWeight: "900" as const, letterSpacing: 1.4 },
  waitlistFootRow: { flexDirection: "row", gap: 8 },
  waitlistFootChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: theme.borderSoft,
  },
  waitlistFootText: { color: theme.textMuted, fontSize: 10, fontWeight: "800" as const, letterSpacing: 0.6 },
  previewDim: { opacity: 0.55 },
});
