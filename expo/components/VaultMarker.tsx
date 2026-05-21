import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Stop, G, Path } from "react-native-svg";

import { theme, tierColor, tierGlow, type Tier } from "@/constants/theme";
import type { VaultBrand, VaultIcon } from "@/types/game";

/** Brand accent colors used for sponsored vaults on the map. */
const BRAND_ACCENT: Record<VaultBrand, { ring: string; glow: string; label: string }> = {
  nike: { ring: "#FF6B00", glow: "#FF9F45", label: "NIKE" },
  apple: { ring: "#E5E7EB", glow: "#FFFFFF", label: "APPLE" },
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  x: number;
  y: number;
  tier: Tier;
  icon: VaultIcon;
  claimed: boolean;
  canClaim: boolean;
  selected: boolean;
  delay?: number;
  /** When set, the marker shows a brand-colored outer ring + wordmark. */
  brand?: VaultBrand;
  onPress: () => void;
}

/** Inline SVG path for each vault icon (24x24 viewBox, centered). */
function IconPath({ name, color }: { name: VaultIcon; color: string }) {
  switch (name) {
    case "clock":
      return (
        <>
          <Circle cx={12} cy={12} r={7.5} stroke={color} strokeWidth={1.6} fill="none" />
          <Path d="M12 7 V12 L15 14" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
        </>
      );
    case "castle":
      return (
        <Path
          d="M5 18 V11 L7 11 V8 L9 8 V11 L11 11 V8 L13 8 V11 L15 11 V8 L17 8 V11 L19 11 V18 Z"
          stroke={color}
          strokeWidth={1.4}
          fill="none"
          strokeLinejoin="round"
        />
      );
    case "wheel":
      return (
        <>
          <Circle cx={12} cy={12} r={7} stroke={color} strokeWidth={1.4} fill="none" />
          <Circle cx={12} cy={12} r={1.5} fill={color} />
          <Path d="M12 5 V19 M5 12 H19 M7 7 L17 17 M17 7 L7 17" stroke={color} strokeWidth={1.1} />
        </>
      );
    case "crown":
      return (
        <Path
          d="M4 16 L6 8 L9 12 L12 7 L15 12 L18 8 L20 16 Z M4 18 H20"
          stroke={color}
          strokeWidth={1.4}
          fill="none"
          strokeLinejoin="round"
        />
      );
    case "lion":
      return (
        <>
          <Circle cx={12} cy={12} r={6} stroke={color} strokeWidth={1.4} fill="none" />
          <Path d="M12 6 L10 3 M12 6 L14 3 M9 11 q0 -1 1 -1 M15 11 q0 -1 -1 -1 M10 15 q2 1.5 4 0" stroke={color} strokeWidth={1.3} fill="none" strokeLinecap="round" />
        </>
      );
    case "theater":
      return (
        <>
          <Path d="M6 6 L10 16 L14 16 L18 6 Z" stroke={color} strokeWidth={1.4} fill="none" />
          <Path d="M9 10 q1 -1 2 0 M13 10 q1 -1 2 0" stroke={color} strokeWidth={1.2} />
        </>
      );
    case "church":
      return (
        <Path
          d="M12 3 V8 M10 5 H14 M6 19 V11 L12 8 L18 11 V19 Z M12 19 V14"
          stroke={color}
          strokeWidth={1.4}
          fill="none"
          strokeLinejoin="round"
        />
      );
    case "book":
      return (
        <Path
          d="M5 5 H11 Q12 5 12 6 V19 Q12 18 11 18 H5 Z M19 5 H13 Q12 5 12 6 V19 Q12 18 13 18 H19 Z"
          stroke={color}
          strokeWidth={1.4}
          fill="none"
          strokeLinejoin="round"
        />
      );
    case "spray":
      return (
        <>
          <Path d="M9 8 H15 V19 H9 Z M11 6 H13 V8 H11 Z" stroke={color} strokeWidth={1.4} fill="none" />
          <Circle cx={6} cy={6} r={0.8} fill={color} />
          <Circle cx={4} cy={9} r={0.8} fill={color} />
          <Circle cx={6} cy={11} r={0.8} fill={color} />
        </>
      );
    case "tree":
      return (
        <>
          <Path d="M12 4 L7 12 H10 L6 18 H18 L14 12 H17 Z" stroke={color} strokeWidth={1.4} fill="none" strokeLinejoin="round" />
          <Path d="M12 18 V21" stroke={color} strokeWidth={1.4} />
        </>
      );
    case "tower":
      return (
        <Path
          d="M10 4 H14 V8 L16 10 V20 H8 V10 L10 8 Z M11 13 H13 M11 16 H13"
          stroke={color}
          strokeWidth={1.4}
          fill="none"
          strokeLinejoin="round"
        />
      );
    case "train":
      return (
        <>
          <Path d="M6 6 H18 V14 Q18 16 16 16 H8 Q6 16 6 14 Z" stroke={color} strokeWidth={1.4} fill="none" />
          <Path d="M6 10 H18 M8 18 L7 20 M16 18 L17 20" stroke={color} strokeWidth={1.3} />
          <Circle cx={9} cy={13} r={0.8} fill={color} />
          <Circle cx={15} cy={13} r={0.8} fill={color} />
        </>
      );
    case "shopping":
      return (
        <>
          <Path d="M7 9 H17 L16 19 H8 Z" stroke={color} strokeWidth={1.4} fill="none" strokeLinejoin="round" />
          <Path d="M9 9 Q9 5 12 5 Q15 5 15 9" stroke={color} strokeWidth={1.4} fill="none" />
        </>
      );
    case "market":
      return (
        <>
          <Path d="M5 9 L7 5 H17 L19 9 Z" stroke={color} strokeWidth={1.3} fill="none" strokeLinejoin="round" />
          <Path d="M6 9 V19 H18 V9 M9 19 V13 H15 V19" stroke={color} strokeWidth={1.3} fill="none" strokeLinejoin="round" />
        </>
      );
    case "stadium":
      return (
        <>
          <Path d="M4 12 Q12 6 20 12 Q12 18 4 12 Z" stroke={color} strokeWidth={1.4} fill="none" />
          <Circle cx={12} cy={12} r={2.4} stroke={color} strokeWidth={1.2} fill="none" />
        </>
      );
    case "leaf":
      return (
        <Path
          d="M5 19 Q5 9 13 5 Q19 5 19 11 Q19 18 9 19 Q9 14 13 11"
          stroke={color}
          strokeWidth={1.4}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case "museum":
      return (
        <>
          <Path d="M4 10 L12 5 L20 10 Z" stroke={color} strokeWidth={1.4} fill="none" strokeLinejoin="round" />
          <Path d="M6 11 V18 M10 11 V18 M14 11 V18 M18 11 V18 M4 19 H20" stroke={color} strokeWidth={1.3} />
        </>
      );
    case "ship":
      return (
        <>
          <Path d="M4 16 H20 L18 19 H6 Z" stroke={color} strokeWidth={1.4} fill="none" strokeLinejoin="round" />
          <Path d="M12 4 V14 M8 8 H16 M6 14 H18" stroke={color} strokeWidth={1.3} />
        </>
      );
    case "tube":
      return (
        <>
          <Circle cx={12} cy={12} r={7} stroke={color} strokeWidth={1.6} fill="none" />
          <Path d="M4 12 H20" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
        </>
      );
    case "star":
      return (
        <Path
          d="M12 4 L14.4 9.5 L20 10.2 L15.8 14 L17 19.5 L12 16.8 L7 19.5 L8.2 14 L4 10.2 L9.6 9.5 Z"
          stroke={color}
          strokeWidth={1.3}
          fill="none"
          strokeLinejoin="round"
        />
      );
  }
}

export function VaultMarker({
  x,
  y,
  tier,
  icon,
  claimed,
  canClaim,
  selected,
  delay = 0,
  brand,
  onPress,
}: Props) {
  const brandAccent = brand ? BRAND_ACCENT[brand] : undefined;
  const pulse = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1800,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, delay]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [float]);

  const color = tierColor(tier);
  const glow = tierGlow(tier);

  const SIZE = 44;
  const HALF = SIZE / 2;

  const pulseR = pulse.interpolate({ inputRange: [0, 1], outputRange: [8, 20.8] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });
  const floatY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -3] });

  const gradId = useMemo(() => `vault-grad-${Math.random().toString(36).slice(2, 8)}`, []);

  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={[
        styles.container,
        {
          left: x - HALF,
          top: y - HALF,
          width: SIZE,
          height: SIZE,
        },
      ]}
    >
      <Animated.View style={{ transform: [{ translateY: floatY }] }}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <Defs>
            <RadialGradient id={gradId} cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={glow} stopOpacity={0.9} />
              <Stop offset="60%" stopColor={color} stopOpacity={0.5} />
              <Stop offset="100%" stopColor={color} stopOpacity={0} />
            </RadialGradient>
          </Defs>

          {/* radar pulse */}
          {!claimed && (
            <AnimatedCircle
              cx={HALF}
              cy={HALF}
              r={pulseR as unknown as number}
              fill="none"
              stroke={color}
              strokeWidth={1.2}
              opacity={pulseOpacity}
            />
          )}

          {/* outer halo */}
          <Circle cx={HALF} cy={HALF} r={HALF - 2} fill={`url(#${gradId})`} opacity={claimed ? 0.25 : 0.95} />

          {/* brand accent ring */}
          {brandAccent && (
            <Circle
              cx={HALF}
              cy={HALF}
              r={HALF - 3.5}
              fill="none"
              stroke={claimed ? theme.textDim : brandAccent.ring}
              strokeWidth={1.6}
              opacity={claimed ? 0.4 : 0.95}
            />
          )}

          {/* core disc */}
          <Circle
            cx={HALF}
            cy={HALF}
            r={11}
            fill={theme.bgElev}
            stroke={claimed ? theme.textDim : color}
            strokeWidth={selected ? 2.2 : 1.4}
          />

          {/* inner ring tier accent */}
          <Circle
            cx={HALF}
            cy={HALF}
            r={8.5}
            fill="none"
            stroke={claimed ? theme.textDim : glow}
            strokeWidth={0.7}
            opacity={0.5}
          />

          {/* icon */}
          <G transform={`translate(${HALF - 9} ${HALF - 9}) scale(0.75)`}>
            <IconPath name={icon} color={claimed ? theme.textDim : glow} />
          </G>
        </Svg>

        {canClaim && (
          <View pointerEvents="none" style={styles.claimDotWrap}>
            <View style={[styles.claimDot, { backgroundColor: theme.emeraldBright }]} />
          </View>
        )}

        {brandAccent && !claimed && (
          <View pointerEvents="none" style={styles.brandTagWrap}>
            <View style={[styles.brandTag, { backgroundColor: brandAccent.ring }]}>
              <View style={styles.brandTagInner}>
                <View style={[styles.brandTagDot, { backgroundColor: brandAccent.glow }]} />
              </View>
            </View>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  claimDotWrap: {
    position: "absolute",
    top: 4,
    right: 4,
  },
  claimDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    shadowColor: "#34D399",
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  brandTagWrap: {
    position: "absolute",
    bottom: -2,
    left: "50%",
    marginLeft: -7,
  },
  brandTag: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.2,
    borderColor: "#0E1117",
  },
  brandTagInner: { alignItems: "center", justifyContent: "center" },
  brandTagDot: { width: 5, height: 5, borderRadius: 2.5 },
});
