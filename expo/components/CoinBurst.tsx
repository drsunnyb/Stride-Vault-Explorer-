import { LinearGradient } from "expo-linear-gradient";
import { Coins, Share2, Sparkles } from "lucide-react-native";
import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Dimensions, Easing, Pressable, StyleSheet, Text, View } from "react-native";

import { AppleMark, SneakerShape } from "@/components/BrandShapes";
import { theme, tierColor, tierGlow, type Tier } from "@/constants/theme";
import type { VaultBrand } from "@/types/game";

interface Props {
  visible: boolean;
  tier: Tier;
  brand?: VaultBrand;
  coins: number;
  xp: number;
  vaultName: string;
  onDone: () => void;
  onShare?: () => void;
}

const NUM_COINS = 22;
const NUM_SPARKS = 16;
const NUM_RAIN = 22;
const RINGS = 3;

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const BRAND_PALETTE: Record<VaultBrand, { color: string; glow: string; accent: string; label: string; copy: string }> = {
  nike: {
    color: "#FF6B00",
    glow: "#FFB266",
    accent: "#FFFFFF",
    label: "NIKE DROP UNLOCKED",
    copy: "Air Drop secured",
  },
  apple: {
    color: "#E5E7EB",
    glow: "#FFFFFF",
    accent: "#0E1117",
    label: "APPLE DROP UNLOCKED",
    copy: "AirDrop secured",
  },
};

/**
 * Cinematic vault unlock sequence:
 *  1. Vault doors split apart, revealing a beam of light
 *  2. Multi-ring shockwave radiates outward
 *  3. Coins + sparks burst in all directions
 *  4. Brand vaults: a torrential rain of branded items (sneakers / apples)
 *     falls across the whole screen with parallax + rotation.
 *  5. Reward card pops in with stats + optional share CTA
 */
export function CoinBurst({ visible, tier, brand, coins, xp, vaultName, onDone, onShare }: Props) {
  const fade = useRef(new Animated.Value(0)).current;
  const beam = useRef(new Animated.Value(0)).current;
  const doorL = useRef(new Animated.Value(0)).current;
  const doorR = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.85)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const shareScale = useRef(new Animated.Value(0)).current;
  const sharedRef = useRef<boolean>(false);

  const ringAnims = useMemo(
    () => Array.from({ length: RINGS }, () => new Animated.Value(0)),
    []
  );
  const coinAnims = useMemo(
    () => Array.from({ length: NUM_COINS }, () => new Animated.Value(0)),
    []
  );
  const sparkAnims = useMemo(
    () => Array.from({ length: NUM_SPARKS }, () => new Animated.Value(0)),
    []
  );
  const rainAnims = useMemo(
    () => Array.from({ length: NUM_RAIN }, () => new Animated.Value(0)),
    []
  );

  // Pre-randomized rain offsets so each particle is unique but stable.
  const rainConfig = useMemo(() => {
    return rainAnims.map((_, i) => {
      const seed = (i * 9301 + 49297) % 233280;
      const r = seed / 233280;
      const r2 = ((i * 2 + 7) * 9301 + 49297) % 233280 / 233280;
      const r3 = ((i * 3 + 11) * 9301 + 49297) % 233280 / 233280;
      return {
        x: r * SCREEN_W,
        size: 36 + r2 * 44,
        delay: r3 * 900,
        sway: (r - 0.5) * 80,
        rotateFrom: (r2 - 0.5) * 80,
        rotateTo: (r2 - 0.5) * 360 + 540,
        duration: 1500 + r3 * 900,
      };
    });
  }, [rainAnims]);

  useEffect(() => {
    if (!visible) return;
    fade.setValue(0);
    beam.setValue(0);
    doorL.setValue(0);
    doorR.setValue(0);
    cardScale.setValue(0.85);
    flash.setValue(0);
    shareScale.setValue(0);
    sharedRef.current = false;
    ringAnims.forEach((v) => v.setValue(0));
    coinAnims.forEach((v) => v.setValue(0));
    sparkAnims.forEach((v) => v.setValue(0));
    rainAnims.forEach((v) => v.setValue(0));

    const dwell = brand ? 2400 : 1100;

    Animated.sequence([
      Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }),
      // Doors split + beam ignites
      Animated.parallel([
        Animated.timing(doorL, {
          toValue: 1,
          duration: 520,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(doorR, {
          toValue: 1,
          duration: 520,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(180),
          Animated.timing(beam, {
            toValue: 1,
            duration: 420,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(360),
          Animated.timing(flash, {
            toValue: 1,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.timing(flash, {
            toValue: 0,
            duration: 320,
            useNativeDriver: true,
          }),
        ]),
      ]),
      // Shockwave + burst
      Animated.parallel([
        ...ringAnims.map((v, i) =>
          Animated.sequence([
            Animated.delay(i * 140),
            Animated.timing(v, {
              toValue: 1,
              duration: 900,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ])
        ),
        Animated.stagger(
          14,
          coinAnims.map((v) =>
            Animated.timing(v, {
              toValue: 1,
              duration: 1100,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            })
          )
        ),
        Animated.stagger(
          22,
          sparkAnims.map((v) =>
            Animated.timing(v, {
              toValue: 1,
              duration: 900,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            })
          )
        ),
        // Brand rain — fires in parallel with burst, longer total duration.
        ...rainAnims.map((v, i) => {
          const cfg = rainConfig[i];
          return Animated.sequence([
            Animated.delay(cfg.delay),
            Animated.timing(v, {
              toValue: 1,
              duration: cfg.duration,
              easing: Easing.in(Easing.quad),
              useNativeDriver: true,
            }),
          ]);
        }),
        Animated.spring(cardScale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 5,
          tension: 70,
          delay: 220,
        }),
        Animated.sequence([
          Animated.delay(900),
          Animated.spring(shareScale, {
            toValue: 1,
            friction: 6,
            tension: 80,
            useNativeDriver: true,
          }),
        ]),
      ]),
      Animated.delay(dwell),
      Animated.timing(fade, { toValue: 0, duration: 320, useNativeDriver: true }),
    ]).start(() => onDone());
  }, [visible, brand, fade, beam, doorL, doorR, cardScale, flash, shareScale, ringAnims, coinAnims, sparkAnims, rainAnims, rainConfig, onDone]);

  if (!visible) return null;

  const palette = brand ? BRAND_PALETTE[brand] : null;
  const color = palette?.color ?? tierColor(tier);
  const glow = palette?.glow ?? tierGlow(tier);

  const doorLX = doorL.interpolate({ inputRange: [0, 1], outputRange: [0, -SCREEN_W * 0.6] });
  const doorRX = doorR.interpolate({ inputRange: [0, 1], outputRange: [0, SCREEN_W * 0.6] });
  const beamScale = beam.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const beamOpacity = beam.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 0.5] });

  return (
    <Animated.View pointerEvents={onShare ? "box-none" : "none"} style={[styles.overlay, { opacity: fade }]}>
      <Animated.View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={["rgba(6,7,13,0.92)", "rgba(6,7,13,0.7)", "rgba(6,7,13,0.96)"]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Light beam (vertical) */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.beam,
          {
            opacity: beamOpacity,
            transform: [{ scaleY: beamScale }],
          },
        ]}
      >
        <LinearGradient
          colors={[
            "transparent",
            glow + "00",
            glow + "AA",
            "#FFFFFF",
            glow + "AA",
            glow + "00",
            "transparent",
          ]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
      </Animated.View>

      {/* Vault doors split */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.doorLeft,
          {
            backgroundColor: theme.bgElev,
            borderRightColor: color,
            transform: [{ translateX: doorLX }],
          },
        ]}
      >
        <LinearGradient
          colors={[color + "44", theme.bgElev, "#000"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        <View style={[styles.doorBolt, { borderColor: glow, right: 12 }]} />
        <View style={[styles.doorBolt, { borderColor: glow, right: 12, top: undefined, bottom: 36 }]} />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.doorRight,
          {
            backgroundColor: theme.bgElev,
            borderLeftColor: color,
            transform: [{ translateX: doorRX }],
          },
        ]}
      >
        <LinearGradient
          colors={[color + "44", theme.bgElev, "#000"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={[styles.doorBolt, { borderColor: glow, left: 12 }]} />
        <View style={[styles.doorBolt, { borderColor: glow, left: 12, top: undefined, bottom: 36 }]} />
      </Animated.View>

      {/* Flash */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "#FFFFFF", opacity: flash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.7] }) },
        ]}
      />

      {/* Multi-ring shockwave (brand-tinted) */}
      {ringAnims.map((v, i) => {
        const scale = v.interpolate({ inputRange: [0, 1], outputRange: [0.15, 4 + i * 0.6] });
        const opacity = v.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.7, 0.3, 0] });
        return (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={[
              styles.ring,
              {
                borderColor: i === 0 ? glow : color,
                borderWidth: i === 0 ? 2.5 : 1.4,
                opacity,
                transform: [{ scale }],
              },
            ]}
          />
        );
      })}

      {/* Coin particles */}
      {coinAnims.map((v, i) => {
        const angle = (i / NUM_COINS) * Math.PI * 2;
        const dist = 180 + (i % 5) * 28;
        const tx = v.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * dist] });
        const ty = v.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(angle) * dist] });
        const op = v.interpolate({ inputRange: [0, 0.55, 1], outputRange: [1, 1, 0] });
        const rot = v.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "720deg"] });
        return (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={[
              styles.coin,
              { opacity: op, transform: [{ translateX: tx }, { translateY: ty }, { rotate: rot }] },
            ]}
          >
            <LinearGradient
              colors={
                brand === "nike"
                  ? ["#FFD7A8", "#FF6B00", "#A03C00"]
                  : brand === "apple"
                  ? ["#FFFFFF", "#E5E7EB", "#8A93A6"]
                  : [theme.goldBright, theme.gold, theme.goldDim]
              }
              style={styles.coinGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          </Animated.View>
        );
      })}

      {/* Sparkle dust */}
      {sparkAnims.map((v, i) => {
        const angle = ((i + 0.5) / NUM_SPARKS) * Math.PI * 2;
        const dist = 90 + (i % 4) * 40;
        const tx = v.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * dist] });
        const ty = v.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(angle) * dist] });
        const op = v.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 0] });
        const scale = v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.4] });
        return (
          <Animated.View
            key={`s${i}`}
            pointerEvents="none"
            style={[
              styles.spark,
              {
                backgroundColor: glow,
                opacity: op,
                transform: [{ translateX: tx }, { translateY: ty }, { scale }],
              },
            ]}
          />
        );
      })}

      {/* Branded rain — sneakers (Nike) or apples (Apple) falling top→bottom */}
      {brand &&
        rainAnims.map((v, i) => {
          const cfg = rainConfig[i];
          const ty = v.interpolate({
            inputRange: [0, 1],
            outputRange: [-cfg.size - 40, SCREEN_H + cfg.size + 40],
          });
          const tx = v.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [cfg.x, cfg.x + cfg.sway, cfg.x],
          });
          const rot = v.interpolate({
            inputRange: [0, 1],
            outputRange: [`${cfg.rotateFrom}deg`, `${cfg.rotateTo}deg`],
          });
          const op = v.interpolate({
            inputRange: [0, 0.1, 0.9, 1],
            outputRange: [0, 1, 1, 0],
          });
          return (
            <Animated.View
              key={`rain${i}`}
              pointerEvents="none"
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                opacity: op,
                transform: [{ translateX: tx }, { translateY: ty }, { rotate: rot }],
              }}
            >
              {brand === "nike" ? (
                <SneakerShape
                  size={cfg.size}
                  body={i % 3 === 0 ? "#FF6B00" : "#0E1117"}
                  accent={i % 3 === 0 ? "#FFFFFF" : "#FF6B00"}
                  sole="#F5F7FB"
                />
              ) : (
                <AppleMark size={cfg.size * 0.7} fill={i % 3 === 0 ? "#FFFFFF" : "#E5E7EB"} />
              )}
            </Animated.View>
          );
        })}

      {/* Center reward card */}
      <Animated.View pointerEvents="none" style={[styles.card, { transform: [{ scale: cardScale }], borderColor: color }]}>
        <LinearGradient
          colors={[color + "33", "transparent"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        {brand === "nike" ? (
          <SneakerShape size={48} body="#0E1117" accent="#FF6B00" sole="#FFFFFF" />
        ) : brand === "apple" ? (
          <AppleMark size={32} fill="#FFFFFF" />
        ) : (
          <Sparkles size={20} color={glow} />
        )}
        <Text style={[styles.cardLabel, palette && { color: palette.glow }]}>
          {palette?.label ?? "VAULT UNLOCKED"}
        </Text>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {vaultName}
        </Text>
        {palette && <Text style={styles.cardCopy}>{palette.copy}</Text>}
        <View style={styles.cardRow}>
          <View style={styles.cardStat}>
            <Coins size={16} color={theme.gold} />
            <Text style={styles.cardStatValue}>+{coins}</Text>
            <Text style={styles.cardStatLabel}>COINS</Text>
          </View>
          <View style={styles.cardDivider} />
          <View style={styles.cardStat}>
            <Sparkles size={16} color={theme.emeraldBright} />
            <Text style={[styles.cardStatValue, { color: theme.emeraldBright }]}>+{xp}</Text>
            <Text style={styles.cardStatLabel}>XP</Text>
          </View>
        </View>
      </Animated.View>

      {/* Share CTA — appears 0.9s into the burst, interactive */}
      {onShare && (
        <Animated.View
          style={[
            styles.shareWrap,
            { transform: [{ scale: shareScale }], opacity: shareScale },
          ]}
        >
          <Pressable
            onPress={() => {
              if (sharedRef.current) return;
              sharedRef.current = true;
              onShare();
            }}
            style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.85 }]}
          >
            <LinearGradient
              colors={[color, glow]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Share2 size={16} color="#0E1117" />
            <Text style={styles.shareBtnText}>SHARE THE DROP · +50</Text>
          </Pressable>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const DOOR_W = SCREEN_W * 0.55;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  beam: {
    position: "absolute",
    width: 90,
    height: SCREEN_H,
    overflow: "hidden",
  },
  doorLeft: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: DOOR_W,
    borderRightWidth: 2,
    overflow: "hidden",
  },
  doorRight: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: DOOR_W,
    borderLeftWidth: 2,
    overflow: "hidden",
  },
  doorBolt: {
    position: "absolute",
    top: 36,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  ring: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  coin: { position: "absolute", width: 18, height: 18 },
  coinGrad: { flex: 1, borderRadius: 9 },
  spark: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  card: {
    minWidth: 280,
    paddingVertical: 22,
    paddingHorizontal: 28,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.bgElev,
    borderWidth: 1.5,
    alignItems: "center",
    gap: 6,
    overflow: "hidden",
  },
  cardLabel: { color: theme.textMuted, fontSize: 11, fontWeight: "800" as const, letterSpacing: 2 },
  cardTitle: { color: theme.text, fontSize: 22, fontWeight: "900" as const, marginBottom: 6, textAlign: "center" },
  cardCopy: { color: theme.textMuted, fontSize: 12, fontWeight: "700" as const, marginBottom: 4 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 18, marginTop: 4 },
  cardStat: { alignItems: "center", gap: 4 },
  cardStatValue: { color: theme.gold, fontSize: 22, fontWeight: "900" as const },
  cardStatLabel: { color: theme.textDim, fontSize: 9, fontWeight: "700" as const, letterSpacing: 1.4 },
  cardDivider: { width: 1, height: 36, backgroundColor: theme.border },
  shareWrap: {
    position: "absolute",
    bottom: 80,
    alignSelf: "center",
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: theme.radius.pill,
    overflow: "hidden",
  },
  shareBtnText: {
    color: "#0E1117",
    fontSize: 13,
    fontWeight: "900" as const,
    letterSpacing: 1.4,
  },
});
