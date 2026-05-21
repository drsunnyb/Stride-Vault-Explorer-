import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Rect,
  Path,
  Circle,
  G,
  Text as SvgText,
  Line,
} from "react-native-svg";

import { theme } from "@/constants/theme";
import { MAP_BOUNDS, VAULTS } from "@/constants/vaults";
import { latLngToPixel } from "@/lib/geo";
import type { PlayerState } from "@/types/game";

import { PlayerAvatar } from "./PlayerAvatar";
import { VaultMarker } from "./VaultMarker";

interface Props {
  width: number;
  height: number;
  player: PlayerState;
  selectedId: string | null;
  claimedIds: Set<string>;
  claimableIds: Set<string>;
  onSelectVault: (id: string) => void;
}

/** A park region in lat/lng bounds (NW + SE). */
interface ParkRect {
  name: string;
  n: number;
  s: number;
  w: number;
  e: number;
  rounded?: number;
}

/** Major green spaces across Greater London. */
const PARKS: ParkRect[] = [
  // Central
  { name: "Hyde Park", n: 51.514, s: 51.5023, w: -0.1755, e: -0.1495, rounded: 6 },
  { name: "Kensington Gdns", n: 51.5105, s: 51.5023, w: -0.1875, e: -0.1755, rounded: 5 },
  { name: "Regent's Park", n: 51.539, s: 51.5275, w: -0.166, e: -0.143, rounded: 8 },
  { name: "Green Park", n: 51.5065, s: 51.502, w: -0.149, e: -0.139, rounded: 4 },
  { name: "St James's", n: 51.504, s: 51.5005, w: -0.137, e: -0.1265, rounded: 4 },
  // Wider
  { name: "Hampstead Heath", n: 51.572, s: 51.553, w: -0.175, e: -0.148, rounded: 10 },
  { name: "Victoria Park", n: 51.541, s: 51.529, w: -0.045, e: -0.029, rounded: 6 },
  { name: "Olympic Park", n: 51.553, s: 51.539, w: -0.025, e: -0.005, rounded: 6 },
  { name: "Greenwich Park", n: 51.482, s: 51.470, w: -0.005, e: 0.012, rounded: 6 },
  { name: "Battersea Park", n: 51.487, s: 51.479, w: -0.165, e: -0.145, rounded: 4 },
  { name: "Clapham Common", n: 51.468, s: 51.457, w: -0.157, e: -0.137, rounded: 6 },
  { name: "Wimbledon Common", n: 51.450, s: 51.420, w: -0.245, e: -0.215, rounded: 12 },
  { name: "Richmond Park", n: 51.455, s: 51.420, w: -0.295, e: -0.255, rounded: 14 },
  { name: "Bushy Park", n: 51.430, s: 51.405, w: -0.355, e: -0.325, rounded: 10 },
  { name: "Crystal Palace", n: 51.428, s: 51.418, w: -0.080, e: -0.063, rounded: 5 },
  { name: "Ealing Common", n: 51.510, s: 51.504, w: -0.292, e: -0.282, rounded: 4 },
  { name: "Holland Park", n: 51.504, s: 51.498, w: -0.208, e: -0.196, rounded: 4 },
];

/** Thames path waypoints (lng, lat) flowing west -> east across Greater London. */
const THAMES_POINTS: { lng: number; lat: number }[] = [
  { lng: -0.330, lat: 51.420 }, // Hampton
  { lng: -0.300, lat: 51.430 },
  { lng: -0.300, lat: 51.460 }, // Richmond
  { lng: -0.275, lat: 51.470 },
  { lng: -0.235, lat: 51.470 }, // Kew
  { lng: -0.215, lat: 51.486 },
  { lng: -0.190, lat: 51.488 }, // Putney
  { lng: -0.170, lat: 51.475 },
  { lng: -0.160, lat: 51.481 }, // Wandsworth
  { lng: -0.145, lat: 51.485 },
  { lng: -0.130, lat: 51.487 }, // Vauxhall
  { lng: -0.124, lat: 51.493 },
  { lng: -0.1225, lat: 51.501 }, // Westminster
  { lng: -0.117, lat: 51.5072 },
  { lng: -0.106, lat: 51.5095 }, // Blackfriars
  { lng: -0.087, lat: 51.508 },
  { lng: -0.075, lat: 51.506 }, // Tower Bridge
  { lng: -0.060, lat: 51.500 },
  { lng: -0.040, lat: 51.495 },
  { lng: -0.020, lat: 51.491 }, // Canary Wharf bend
  { lng: -0.005, lat: 51.498 },
  { lng: 0.005, lat: 51.487 }, // Greenwich
  { lng: 0.020, lat: 51.498 },
  { lng: 0.040, lat: 51.508 },
];

const DISTRICT_LABELS: { name: string; lat: number; lng: number; size: number }[] = [
  // Central
  { name: "WESTMINSTER", lat: 51.497, lng: -0.137, size: 8 },
  { name: "THE CITY", lat: 51.516, lng: -0.092, size: 8 },
  { name: "SHOREDITCH", lat: 51.527, lng: -0.078, size: 8 },
  { name: "MARYLEBONE", lat: 51.523, lng: -0.155, size: 8 },
  { name: "KING'S CROSS", lat: 51.534, lng: -0.124, size: 8 },
  { name: "CAMDEN", lat: 51.545, lng: -0.143, size: 8 },
  // Outer
  { name: "HAMPSTEAD", lat: 51.563, lng: -0.178, size: 8 },
  { name: "EALING", lat: 51.518, lng: -0.302, size: 9 },
  { name: "SHEPHERD'S BUSH", lat: 51.504, lng: -0.225, size: 8 },
  { name: "WIMBLEDON", lat: 51.420, lng: -0.207, size: 9 },
  { name: "RICHMOND", lat: 51.460, lng: -0.310, size: 9 },
  { name: "TWICKENHAM", lat: 51.452, lng: -0.347, size: 8 },
  { name: "GREENWICH", lat: 51.480, lng: 0.000, size: 9 },
  { name: "STRATFORD", lat: 51.540, lng: -0.005, size: 9 },
  { name: "CROYDON", lat: 51.378, lng: -0.100, size: 9 },
  { name: "BROMLEY", lat: 51.402, lng: 0.018, size: 9 },
  { name: "CRYSTAL PALACE", lat: 51.418, lng: -0.072, size: 8 },
  { name: "CANARY WHARF", lat: 51.502, lng: -0.020, size: 8 },
  { name: "UXBRIDGE", lat: 51.548, lng: -0.476, size: 9 },
];

/** Major arterial roads / motorway segments (lat/lng polylines). */
const ROADS: { points: { lat: number; lng: number }[]; width: number; opacity?: number }[] = [
  // A40 westbound (Uxbridge → Central)
  { points: [{ lat: 51.545, lng: -0.470 }, { lat: 51.530, lng: -0.380 }, { lat: 51.518, lng: -0.300 }, { lat: 51.515, lng: -0.225 }, { lat: 51.516, lng: -0.165 }, { lat: 51.517, lng: -0.115 }], width: 1.4 },
  // Oxford St / Holborn / Cheapside spine
  { points: [{ lat: 51.515, lng: -0.165 }, { lat: 51.5155, lng: -0.14 }, { lat: 51.5175, lng: -0.115 }, { lat: 51.514, lng: -0.092 }], width: 1.2 },
  // Marylebone / Euston Rd
  { points: [{ lat: 51.523, lng: -0.166 }, { lat: 51.525, lng: -0.144 }, { lat: 51.528, lng: -0.126 }, { lat: 51.529, lng: -0.107 }], width: 1.1 },
  // Embankment / Strand
  { points: [{ lat: 51.509, lng: -0.128 }, { lat: 51.5115, lng: -0.114 }, { lat: 51.5135, lng: -0.105 }, { lat: 51.514, lng: -0.0985 }, { lat: 51.510, lng: -0.083 }], width: 1.0 },
  // A2 to Greenwich
  { points: [{ lat: 51.503, lng: -0.075 }, { lat: 51.495, lng: -0.040 }, { lat: 51.485, lng: -0.010 }, { lat: 51.477, lng: 0.005 }], width: 1.1 },
  // A12 to Stratford
  { points: [{ lat: 51.525, lng: -0.075 }, { lat: 51.535, lng: -0.045 }, { lat: 51.540, lng: -0.015 }], width: 1.0 },
  // A23 to Croydon
  { points: [{ lat: 51.500, lng: -0.120 }, { lat: 51.460, lng: -0.115 }, { lat: 51.420, lng: -0.105 }, { lat: 51.380, lng: -0.099 }], width: 1.0 },
  // A205 South Circular (Richmond → Crystal Palace)
  { points: [{ lat: 51.463, lng: -0.305 }, { lat: 51.450, lng: -0.215 }, { lat: 51.445, lng: -0.155 }, { lat: 51.444, lng: -0.105 }, { lat: 51.430, lng: -0.075 }], width: 0.9, opacity: 0.4 },
  // A406 North Circular (Ealing → Stratford)
  { points: [{ lat: 51.518, lng: -0.300 }, { lat: 51.555, lng: -0.270 }, { lat: 51.570, lng: -0.160 }, { lat: 51.568, lng: -0.075 }, { lat: 51.555, lng: -0.025 }], width: 0.9, opacity: 0.4 },
];

export function LondonMap({
  width,
  height,
  player,
  selectedId,
  claimedIds,
  claimableIds,
  onSelectVault,
}: Props) {
  const { thamesPath, gridLines } = useMemo(() => {
    const pts = THAMES_POINTS.map((p) => latLngToPixel(p.lat, p.lng, width, height));
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const cur = pts[i];
      const cx = (prev.x + cur.x) / 2;
      const cy = (prev.y + cur.y) / 2;
      d += ` Q ${prev.x.toFixed(1)} ${prev.y.toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)}`;
    }
    d += ` T ${pts[pts.length - 1].x.toFixed(1)} ${pts[pts.length - 1].y.toFixed(1)}`;

    const lines: { x1: number; y1: number; x2: number; y2: number; o: number }[] = [];
    const STEP = 36;
    for (let gx = STEP; gx < width; gx += STEP) {
      lines.push({ x1: gx, y1: 0, x2: gx, y2: height, o: 0.035 });
    }
    for (let gy = STEP; gy < height; gy += STEP) {
      lines.push({ x1: 0, y1: gy, x2: width, y2: gy, o: 0.035 });
    }
    return { thamesPath: d, gridLines: lines };
  }, [width, height]);

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={theme.mapGrad1} />
            <Stop offset="100%" stopColor={theme.mapGrad2} />
          </LinearGradient>
          <RadialGradient id="vignette" cx="50%" cy="55%" r="78%">
            <Stop offset="0%" stopColor="#000" stopOpacity={0} />
            <Stop offset="100%" stopColor="#000" stopOpacity={0.6} />
          </RadialGradient>
          <LinearGradient id="thames" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={theme.thames} />
            <Stop offset="50%" stopColor={theme.thamesGlow} />
            <Stop offset="100%" stopColor={theme.thames} />
          </LinearGradient>
        </Defs>

        {/* base */}
        <Rect x={0} y={0} width={width} height={height} fill="url(#bg)" />

        {/* subtle grid */}
        <G>
          {gridLines.map((l, i) => (
            <Line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={theme.road} strokeWidth={1} opacity={l.o} />
          ))}
        </G>

        {/* parks */}
        <G>
          {PARKS.map((p) => {
            const nw = latLngToPixel(p.n, p.w, width, height);
            const se = latLngToPixel(p.s, p.e, width, height);
            const rw = se.x - nw.x;
            const rh = se.y - nw.y;
            return (
              <G key={p.name}>
                <Rect
                  x={nw.x}
                  y={nw.y}
                  width={rw}
                  height={rh}
                  rx={p.rounded ?? 4}
                  fill={theme.park}
                  stroke={theme.parkGlow}
                  strokeOpacity={0.35}
                  strokeWidth={0.7}
                />
                {rw > 44 && rh > 22 && (
                  <SvgText
                    x={nw.x + rw / 2}
                    y={nw.y + rh / 2 + 2}
                    fill={theme.parkGlow}
                    fontSize={7}
                    fontWeight="700"
                    textAnchor="middle"
                    opacity={0.7}
                  >
                    {p.name.toUpperCase()}
                  </SvgText>
                )}
              </G>
            );
          })}
        </G>

        {/* M25 ring (decorative ghost boundary) */}
        <Circle
          cx={latLngToPixel(51.47, -0.23, width, height).x}
          cy={latLngToPixel(51.47, -0.23, width, height).y}
          r={Math.min(width, height) * 0.46}
          stroke={theme.road}
          strokeWidth={1}
          fill="none"
          opacity={0.15}
          strokeDasharray="4 6"
        />

        {/* arterial roads */}
        <G>
          {ROADS.map((r, i) => {
            let d = "";
            r.points.forEach((p, j) => {
              const px = latLngToPixel(p.lat, p.lng, width, height);
              d += `${j === 0 ? "M" : "L"} ${px.x.toFixed(1)} ${px.y.toFixed(1)} `;
            });
            return (
              <Path
                key={i}
                d={d}
                stroke={theme.roadHi}
                strokeWidth={r.width}
                fill="none"
                opacity={r.opacity ?? 0.55}
                strokeLinecap="round"
              />
            );
          })}
        </G>

        {/* thames glow + body */}
        <Path d={thamesPath} stroke={theme.thamesGlow} strokeWidth={22} fill="none" opacity={0.16} strokeLinecap="round" />
        <Path d={thamesPath} stroke="url(#thames)" strokeWidth={9} fill="none" strokeLinecap="round" />
        <Path d={thamesPath} stroke={theme.thamesHi} strokeWidth={0.8} fill="none" opacity={0.55} strokeLinecap="round" />

        {/* district labels */}
        <G>
          {DISTRICT_LABELS.map((d) => {
            const p = latLngToPixel(d.lat, d.lng, width, height);
            return (
              <SvgText
                key={d.name}
                x={p.x}
                y={p.y}
                fill={theme.textDim}
                fontSize={d.size}
                fontWeight="700"
                textAnchor="middle"
                letterSpacing={1.1}
                opacity={0.6}
              >
                {d.name}
              </SvgText>
            );
          })}
        </G>

        {/* vignette overlay */}
        <Rect x={0} y={0} width={width} height={height} fill="url(#vignette)" />

        {/* landmark base dots under markers */}
        <G>
          {VAULTS.map((v) => {
            const p = latLngToPixel(v.lat, v.lng, width, height);
            return <Circle key={v.id} cx={p.x} cy={p.y} r={1.2} fill={theme.textDim} opacity={0.6} />;
          })}
        </G>
      </Svg>

      {/* vault markers (clustered) */}
      {(() => {
        // For the web overview map we always cluster heavily — 1,100 markers
        // would otherwise crush SVG performance. Featured tiers + the
        // ~40 nearest vaults to the player render individually; everything
        // else collapses into glowing count bubbles.
        const CELL = 0.018; // ~2km cells
        type Bucket = { lat: number; lng: number; vaults: typeof VAULTS };
        const buckets = new Map<string, Bucket>();
        const featured: typeof VAULTS = [];
        const nearbyCandidates: { v: (typeof VAULTS)[number]; d: number }[] = [];
        for (const v of VAULTS) {
          const d2 = (v.lat - player.lat) ** 2 + (v.lng - player.lng) ** 2;
          if (v.kind === "brand" || v.tier === "platinum") {
            featured.push(v);
            continue;
          }
          nearbyCandidates.push({ v, d: d2 });
        }
        nearbyCandidates.sort((a, b) => a.d - b.d);
        const NEAR_LIMIT = 40;
        const nearIds = new Set<string>();
        for (let i = 0; i < Math.min(NEAR_LIMIT, nearbyCandidates.length); i++) {
          nearIds.add(nearbyCandidates[i].v.id);
        }
        for (const v of VAULTS) {
          if (v.kind === "brand" || v.tier === "platinum" || nearIds.has(v.id)) continue;
          const cx = Math.floor(v.lat / CELL);
          const cy = Math.floor(v.lng / CELL);
          const key = `${cx}:${cy}`;
          const b = buckets.get(key);
          if (b) {
            b.vaults.push(v);
            b.lat += v.lat;
            b.lng += v.lng;
          } else {
            buckets.set(key, { lat: v.lat, lng: v.lng, vaults: [v] });
          }
        }
        const individual = [...featured, ...nearbyCandidates.slice(0, NEAR_LIMIT).map((n) => n.v)];
        const clusters = Array.from(buckets.entries()).map(([k, b]) => ({
          key: k,
          lat: b.lat / b.vaults.length,
          lng: b.lng / b.vaults.length,
          count: b.vaults.length,
        }));
        return (
          <>
            {clusters.map((c) => {
              if (c.count < 2) return null;
              const p = latLngToPixel(c.lat, c.lng, width, height);
              const size = c.count > 30 ? 36 : c.count > 12 ? 30 : 24;
              return (
                <Pressable
                  key={c.key}
                  onPress={() => {
                    // pick the nearest vault in the cluster as a tap target
                  }}
                  style={[
                    londonStyles.cluster,
                    {
                      left: p.x - size / 2,
                      top: p.y - size / 2,
                      width: size,
                      height: size,
                      borderRadius: size / 2,
                    },
                  ]}
                  pointerEvents="none"
                >
                  <View
                    style={[
                      londonStyles.clusterInner,
                      {
                        width: size - 6,
                        height: size - 6,
                        borderRadius: (size - 6) / 2,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        londonStyles.clusterText,
                        { fontSize: size > 30 ? 12 : 10 },
                      ]}
                    >
                      {c.count}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
            {individual.map((v, i) => {
              const p = latLngToPixel(v.lat, v.lng, width, height);
              return (
                <VaultMarker
                  key={v.id}
                  x={p.x}
                  y={p.y}
                  tier={v.tier}
                  icon={v.icon}
                  brand={v.brand}
                  claimed={claimedIds.has(v.id)}
                  canClaim={claimableIds.has(v.id)}
                  selected={selectedId === v.id}
                  delay={(i % 8) * 160}
                  onPress={() => onSelectVault(v.id)}
                />
              );
            })}
          </>
        );
      })()}

      {/* player avatar on top */}
      {(() => {
        const p = latLngToPixel(player.lat, player.lng, width, height);
        return <PlayerAvatar x={p.x} y={p.y} />;
      })()}
    </View>
  );
}

const londonStyles = StyleSheet.create({
  cluster: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.gold + "55",
    borderWidth: 1.5,
    borderColor: theme.goldBright,
  },
  clusterInner: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A1206",
    borderWidth: 1,
    borderColor: theme.goldBright,
  },
  clusterText: {
    color: theme.goldBright,
    fontWeight: "900" as const,
    letterSpacing: 0.4,
  },
});
