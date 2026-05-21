import { ChevronRight, MapPin, Lock, Check, Timer } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme, tierColor, tierGlow, tierLabel } from "@/constants/theme";
import { formatDistance } from "@/lib/geo";
import type { Vault, VaultKind } from "@/types/game";

const KIND_LABEL: Record<VaultKind, string> = {
  landmark: "ICON",
  mega: "MEGA",
  mini: "MINI",
  seasonal: "DROP",
  tube: "TUBE",
  brand: "BRAND",
};

const KIND_COLOR: Record<VaultKind, string> = {
  landmark: theme.goldBright,
  mega: theme.tier.platinumBright,
  mini: theme.emeraldBright,
  seasonal: theme.ruby,
  tube: theme.sapphire,
  brand: "#F472B6",
};

interface Props {
  vault: Vault;
  distance: number;
  claimed: boolean;
  canClaim: boolean;
  /** Timestamp (ms) when this vault will respawn — 0 if never claimed. */
  respawnAt: number;
  onPress: () => void;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "ready";
  const s = Math.ceil(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.ceil(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
}

export function VaultListCard({ vault, distance, claimed, canClaim, respawnAt, onPress }: Props) {
  const color = tierColor(vault.tier);
  const glow = tierGlow(vault.tier);

  // Live ticker for respawn countdown.
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    if (!claimed) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [claimed]);

  const remainingMs = Math.max(0, respawnAt - now);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: claimed ? theme.borderSoft : color + "55",
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: color + "22", borderColor: color }]}>
        {claimed ? (
          <Check size={18} color={theme.textDim} />
        ) : canClaim ? (
          <View style={[styles.ready, { backgroundColor: glow }]} />
        ) : (
          <Lock size={14} color={glow} />
        )}
      </View>

      <View style={{ flex: 1 }}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, claimed && { color: theme.textMuted }]} numberOfLines={1}>
            {vault.name}
          </Text>
          <Text style={[styles.tier, { color: glow }]}>{tierLabel(vault.tier)}</Text>
        </View>
        <View style={styles.meta}>
          <View
            style={[
              styles.kindPill,
              { borderColor: KIND_COLOR[vault.kind] + "66", backgroundColor: KIND_COLOR[vault.kind] + "18" },
            ]}
          >
            <Text style={[styles.kindText, { color: KIND_COLOR[vault.kind] }]}>{KIND_LABEL[vault.kind]}</Text>
          </View>
          {vault.brand && (
            <View style={styles.brandPill}>
              <Text style={styles.brandText}>
                {vault.brand === "nike" ? "NIKE" : vault.brand === "apple" ? "APPLE" : ""}
              </Text>
            </View>
          )}
          <MapPin size={10} color={theme.textDim} />
          <Text style={styles.area} numberOfLines={1}>
            {vault.area}
          </Text>
          <View style={styles.dot} />
          {claimed ? (
            <View style={styles.timerRow}>
              <Timer size={10} color={theme.textMuted} />
              <Text style={styles.timerText}>{formatCountdown(remainingMs)}</Text>
            </View>
          ) : (
            <Text style={[styles.distance, canClaim && { color: theme.emeraldBright, fontWeight: "800" as const }]}>
              {canClaim ? "In range" : formatDistance(distance)}
            </Text>
          )}
        </View>
      </View>

      <ChevronRight size={18} color={theme.textDim} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  ready: { width: 10, height: 10, borderRadius: 5 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  title: { color: theme.text, fontSize: 15, fontWeight: "800" as const, flex: 1 },
  tier: { fontSize: 10, fontWeight: "900" as const, letterSpacing: 1.3 },
  meta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  kindPill: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  kindText: { fontSize: 8, fontWeight: "900" as const, letterSpacing: 0.8 },
  brandPill: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: theme.text,
  },
  brandText: { color: theme.bg, fontSize: 8, fontWeight: "900" as const, letterSpacing: 0.8 },
  area: { color: theme.textMuted, fontSize: 12 },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: theme.textDim },
  distance: { color: theme.textMuted, fontSize: 12 },
  timerRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  timerText: { color: theme.textMuted, fontSize: 12, fontWeight: "700" as const },
});
