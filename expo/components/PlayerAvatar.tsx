import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Stop, Path } from "react-native-svg";

import { theme } from "@/constants/theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  x: number;
  y: number;
}

export function PlayerAvatar({ x, y }: Props) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 2200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const SIZE = 140;
  const HALF = SIZE / 2;

  const pulseR = pulse.interpolate({ inputRange: [0, 1], outputRange: [12, 20] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });

  return (
    <View
      pointerEvents="none"
      style={[styles.wrap, { left: x - HALF, top: y - HALF, width: SIZE, height: SIZE }]}
    >
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <Defs>
          <RadialGradient id="player-glow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={theme.emeraldBright} stopOpacity={0.55} />
            <Stop offset="60%" stopColor={theme.emerald} stopOpacity={0.18} />
            <Stop offset="100%" stopColor={theme.emerald} stopOpacity={0} />
          </RadialGradient>
        </Defs>

        {/* expanding radar ring */}
        <AnimatedCircle
          cx={HALF}
          cy={HALF}
          r={pulseR as unknown as number}
          fill="none"
          stroke={theme.emeraldBright}
          strokeWidth={1.4}
          opacity={pulseOpacity}
        />

        {/* soft glow */}
        <Circle cx={HALF} cy={HALF} r={HALF - 4} fill="url(#player-glow)" />

        {/* fixed sweep ticks */}
        <Circle cx={HALF} cy={HALF} r={42} fill="none" stroke={theme.emerald} strokeWidth={0.6} opacity={0.4} strokeDasharray="3 6" />
        <Circle cx={HALF} cy={HALF} r={26} fill="none" stroke={theme.emerald} strokeWidth={0.6} opacity={0.5} />

        {/* core */}
        <Circle cx={HALF} cy={HALF} r={11} fill={theme.bg} stroke={theme.emeraldBright} strokeWidth={2} />
        <Circle cx={HALF} cy={HALF} r={5.5} fill={theme.emeraldBright} />

        {/* north indicator */}
        <Path
          d={`M${HALF} ${HALF - 16} L${HALF - 4} ${HALF - 9} L${HALF + 4} ${HALF - 9} Z`}
          fill={theme.emeraldBright}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
});
