import React from "react";
import Svg, { Path, G, Circle } from "react-native-svg";

/**
 * Stylised side-profile sneaker silhouette with a Nike-orange swoosh stripe.
 * Designed for falling-particle animations on Nike vault unlocks.
 */
export function SneakerShape({
  size = 56,
  body = "#0E1117",
  accent = "#FF6B00",
  sole = "#FFFFFF",
}: {
  size?: number;
  body?: string;
  accent?: string;
  sole?: string;
}) {
  const w = size;
  const h = size * 0.55;
  return (
    <Svg width={w} height={h} viewBox="0 0 100 55">
      {/* sole */}
      <Path
        d="M3 42 Q3 50 12 50 L92 50 Q97 50 97 44 L97 40 L3 40 Z"
        fill={sole}
      />
      {/* body */}
      <Path
        d="M6 40 L6 33 Q8 27 16 24 Q26 20 38 18 Q48 16 58 19 Q65 21 70 25 Q80 31 92 33 Q97 34 97 38 L97 42 L6 42 Z"
        fill={body}
      />
      {/* swoosh accent */}
      <Path
        d="M14 36 Q34 22 70 26 Q82 27 92 31 L88 35 Q70 30 50 32 Q30 34 18 38 Z"
        fill={accent}
      />
      {/* heel collar */}
      <Path d="M6 33 Q12 28 18 28 L18 24 Q12 26 6 30 Z" fill={body} />
      {/* laces tongue */}
      <Path d="M40 20 L60 20 L62 28 L38 28 Z" fill={sole} opacity={0.85} />
    </Svg>
  );
}

/**
 * Apple-mark silhouette with a stem leaf. Used for Apple vault unlocks.
 */
export function AppleMark({
  size = 48,
  fill = "#FFFFFF",
}: {
  size?: number;
  fill?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <G>
        <Path
          d="M55 18 C55 10 62 4 70 4 C70 12 64 18 56 19 Z"
          fill={fill}
        />
        <Path
          d="M50 24 C40 24 24 30 24 52 C24 70 38 92 50 92 C54 92 56 89 62 89 C68 89 70 92 74 92 C84 92 96 72 96 54 C96 36 84 26 74 26 C66 26 62 30 56 30 C52 30 56 24 50 24 Z"
          fill={fill}
        />
        {/* bite */}
        <Circle cx="90" cy="38" r="10" fill="#06070D" />
      </G>
    </Svg>
  );
}
