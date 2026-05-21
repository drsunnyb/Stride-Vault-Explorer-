import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { getBrand } from "@/constants/rewards";
import { theme } from "@/constants/theme";
import type { VaultBrand } from "@/types/game";

interface Props {
  /** undefined → Stride coin (gold). */
  brand?: VaultBrand;
  size?: number;
}

/**
 * Round coin token used in wallet cards and reward rows.
 * Stride = gold "S"; Nike = orange swoosh; Apple = silver glyph.
 */
export function CoinIcon({ brand, size = 36 }: Props) {
  if (!brand) {
    return (
      <View style={[styles.coin, { width: size, height: size, borderRadius: size / 2 }]}>
        <LinearGradient
          colors={[theme.goldBright, theme.gold, "#7A5C00"]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.innerRing, { width: size - 8, height: size - 8, borderRadius: (size - 8) / 2 }]} />
        <Text style={[styles.glyph, { fontSize: size * 0.5, color: "#1A1300" }]}>S</Text>
      </View>
    );
  }

  const meta = getBrand(brand);
  if (!meta) return null;
  const glyphColor = meta.invertedText ? "#0E1117" : "#FFF";
  const glyph = meta.mark || meta.short.charAt(0);
  return (
    <View style={[styles.coin, { width: size, height: size, borderRadius: size / 2 }]}>
      <LinearGradient
        colors={[meta.colorBright, meta.color, meta.colorDim]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.innerRing, { width: size - 8, height: size - 8, borderRadius: (size - 8) / 2, borderColor: meta.colorBright }]} />
      <Text style={[styles.glyph, { fontSize: size * 0.5, color: glyphColor }]}>
        {glyph}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  coin: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  innerRing: {
    position: "absolute",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.35)",
  },
  glyph: {
    fontWeight: "900" as const,
    includeFontPadding: false,
  },
});
