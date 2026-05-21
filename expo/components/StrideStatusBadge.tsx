import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";
import type { StrideStatus } from "@/constants/status";

type Size = "sm" | "md" | "lg";

interface Props {
  status: StrideStatus;
  size?: Size;
  /** Show "STATUS" label above the tier name (lg only). */
  showCaption?: boolean;
}

/**
 * Stride Status pill — a colored chip with the tier name. Used in the HUD,
 * leaderboard rows, and vault-unlock screen so a player's tier follows them
 * everywhere.
 */
export function StrideStatusBadge({ status, size = "md", showCaption }: Props) {
  const dims = SIZES[size];
  return (
    <View style={[styles.wrap, { paddingVertical: dims.padY, paddingHorizontal: dims.padX, borderRadius: dims.radius }]}>
      <LinearGradient
        colors={[status.color + "33", status.color + "11"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: dims.radius }]}
      />
      <View style={[styles.border, { borderRadius: dims.radius, borderColor: status.color + "AA" }]} pointerEvents="none" />
      <View
        style={[
          styles.dot,
          {
            width: dims.dot,
            height: dims.dot,
            borderRadius: dims.dot / 2,
            backgroundColor: status.glow,
            shadowColor: status.glow,
          },
        ]}
      />
      <View>
        {showCaption && size === "lg" && (
          <Text style={[styles.caption, { color: status.glow }]}>STRIDE STATUS</Text>
        )}
        <Text style={[styles.label, { color: status.glow, fontSize: dims.font, letterSpacing: dims.spacing }]}>
          {status.label.toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

const SIZES: Record<Size, { padY: number; padX: number; radius: number; dot: number; font: number; spacing: number }> = {
  sm: { padY: 2, padX: 6, radius: 999, dot: 6, font: 9, spacing: 0.8 },
  md: { padY: 4, padX: 8, radius: 999, dot: 7, font: 10, spacing: 1.2 },
  lg: { padY: 8, padX: 14, radius: 14, dot: 10, font: 13, spacing: 1.6 },
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    overflow: "hidden",
  },
  border: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
  },
  dot: {
    shadowOpacity: 0.85,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  caption: {
    fontSize: 9,
    fontWeight: "800" as const,
    letterSpacing: 1.6,
    marginBottom: 2,
  },
  label: {
    fontWeight: "900" as const,
  },
});
