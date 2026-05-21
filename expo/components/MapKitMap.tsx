import * as Haptics from "expo-haptics";
import { Minus, Plus } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT, type Region } from "react-native-maps";

/**
 * Android-specific fix: react-native-maps caches the first snapshot of a
 * custom marker view as a bitmap. If `tracksViewChanges={false}` is set on
 * the initial render, Android grabs the snapshot *before* layout completes
 * and the pin renders empty / clipped. We keep tracking on for ~250ms (long
 * enough for a couple of frames after measure), then switch it off so we
 * don't burn battery re-snapshotting on every region change.
 */
function useAndroidMarkerTracking(deps: unknown[] = []): boolean {
  const [tracking, setTracking] = useState<boolean>(Platform.OS === "android");
  useEffect(() => {
    if (Platform.OS !== "android") return;
    setTracking(true);
    const t = setTimeout(() => setTracking(false), 280);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return tracking;
}

import { theme, tierColor, tierGlow } from "@/constants/theme";
import { VAULTS } from "@/constants/vaults";
import type { PlayerState, Vault } from "@/types/game";

import { GMAPS_DARK_STYLE } from "./mapStyle";

interface Props {
  player: PlayerState;
  claimedIds: Set<string>;
  claimableIds: Set<string>;
  onSelectVault: (id: string) => void;
}

/**
 * Zoom ladder — delta values from very tight (block-level) to wide (whole region).
 * Index 0 = closest, index N-1 = widest. Default starts at index 1 (~600m) so a
 * player sees themselves plus the 1–2 nearest vaults.
 */
const ZOOM_LEVELS: number[] = [
  0.003, // ~300m  — street level
  0.006, // ~650m  — DEFAULT — 1-2 nearest vaults
  0.012, // ~1.3km — neighbourhood
  0.025, // ~2.7km — borough
  0.05,  // ~5.5km — district
  0.1,   // ~11km  — central London
  0.2,   // ~22km  — Greater London
];
const DEFAULT_ZOOM_INDEX = 1;

/** Hard cap on individual markers rendered at once for performance. */
const MAX_INDIVIDUAL_MARKERS = 90;
/** Above this latitudeDelta we always cluster. */
const CLUSTER_DELTA_THRESHOLD = 0.012;

interface Cluster {
  key: string;
  lat: number;
  lng: number;
  vaults: Vault[];
}

/** Grid-cell cluster the visible vaults. */
function clusterVaults(vaults: Vault[], cellDeg: number): Cluster[] {
  const cells = new Map<string, Cluster>();
  for (const v of vaults) {
    const cx = Math.floor(v.lat / cellDeg);
    const cy = Math.floor(v.lng / cellDeg);
    const key = `${cx}:${cy}`;
    const c = cells.get(key);
    if (c) {
      c.vaults.push(v);
      c.lat += v.lat;
      c.lng += v.lng;
    } else {
      cells.set(key, { key, lat: v.lat, lng: v.lng, vaults: [v] });
    }
  }
  return Array.from(cells.values()).map((c) => ({
    ...c,
    lat: c.lat / c.vaults.length,
    lng: c.lng / c.vaults.length,
  }));
}

/**
 * Real-world map with native zoom/pan via Apple Maps (iOS) / Google Maps (Android).
 * Custom-rendered markers per vault with brand + tier styling, plus viewport
 * culling + grid clustering to stay fast across 1,100 vaults.
 */
export function MapKitMap({ player, claimedIds, claimableIds, onSelectVault }: Props) {
  const mapRef = useRef<MapView | null>(null);
  const [zoomIdx, setZoomIdx] = useState<number>(DEFAULT_ZOOM_INDEX);
  const [region, setRegion] = useState<Region>(() => ({
    latitude: player.lat,
    longitude: player.lng,
    latitudeDelta: ZOOM_LEVELS[DEFAULT_ZOOM_INDEX],
    longitudeDelta: ZOOM_LEVELS[DEFAULT_ZOOM_INDEX],
  }));

  useEffect(() => {
    const t = setTimeout(() => {
      mapRef.current?.animateToRegion(
        {
          latitude: player.lat,
          longitude: player.lng,
          latitudeDelta: ZOOM_LEVELS[DEFAULT_ZOOM_INDEX],
          longitudeDelta: ZOOM_LEVELS[DEFAULT_ZOOM_INDEX],
        },
        0
      );
    }, 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyZoom = useCallback(
    (idx: number) => {
      const clamped = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, idx));
      setZoomIdx(clamped);
      const d = ZOOM_LEVELS[clamped];
      mapRef.current?.animateToRegion(
        { latitude: player.lat, longitude: player.lng, latitudeDelta: d, longitudeDelta: d },
        320
      );
      if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    },
    [player.lat, player.lng]
  );

  const recenter = useCallback(() => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    const d = ZOOM_LEVELS[zoomIdx];
    mapRef.current?.animateToRegion(
      { latitude: player.lat, longitude: player.lng, latitudeDelta: d, longitudeDelta: d },
      450
    );
  }, [player.lat, player.lng, zoomIdx]);

  const handlePress = useCallback(
    (id: string) => {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
      onSelectVault(id);
    },
    [onSelectVault]
  );

  const initialRegion: Region = useMemo(
    () => ({
      latitude: player.lat,
      longitude: player.lng,
      latitudeDelta: ZOOM_LEVELS[DEFAULT_ZOOM_INDEX],
      longitudeDelta: ZOOM_LEVELS[DEFAULT_ZOOM_INDEX],
    }),
    // initial only
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleRegionChange = useCallback((r: Region) => {
    setRegion(r);
    const d = r.latitudeDelta;
    let nearest = 0;
    let best = Infinity;
    for (let i = 0; i < ZOOM_LEVELS.length; i++) {
      const diff = Math.abs(Math.log(ZOOM_LEVELS[i]) - Math.log(d));
      if (diff < best) {
        best = diff;
        nearest = i;
      }
    }
    setZoomIdx(nearest);
  }, []);

  // Viewport-cull then optionally cluster.
  const { individualMarkers, clusters } = useMemo(() => {
    const padLat = region.latitudeDelta * 0.6;
    const padLng = region.longitudeDelta * 0.6;
    const minLat = region.latitude - region.latitudeDelta / 2 - padLat;
    const maxLat = region.latitude + region.latitudeDelta / 2 + padLat;
    const minLng = region.longitude - region.longitudeDelta / 2 - padLng;
    const maxLng = region.longitude + region.longitudeDelta / 2 + padLng;

    const visible: Vault[] = [];
    for (const v of VAULTS) {
      if (v.lat < minLat || v.lat > maxLat) continue;
      if (v.lng < minLng || v.lng > maxLng) continue;
      visible.push(v);
    }

    // Brand + platinum vaults always rendered individually if visible.
    const featured: Vault[] = [];
    const fillers: Vault[] = [];
    for (const v of visible) {
      if (v.kind === "brand" || v.tier === "platinum") featured.push(v);
      else fillers.push(v);
    }

    const shouldCluster =
      region.latitudeDelta > CLUSTER_DELTA_THRESHOLD ||
      fillers.length > MAX_INDIVIDUAL_MARKERS;

    if (!shouldCluster) {
      return { individualMarkers: visible, clusters: [] as Cluster[] };
    }

    // Cluster cell scales with the current latitudeDelta so clusters always
    // look ~the same on screen across zoom levels.
    const cellDeg = Math.max(0.004, region.latitudeDelta * 0.1);
    const grouped = clusterVaults(fillers, cellDeg);
    const singletons: Vault[] = [];
    const clusterList: Cluster[] = [];
    for (const g of grouped) {
      if (g.vaults.length === 1) singletons.push(g.vaults[0]);
      else clusterList.push(g);
    }
    return {
      individualMarkers: [...featured, ...singletons],
      clusters: clusterList,
    };
  }, [region]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        userInterfaceStyle="dark"
        customMapStyle={Platform.OS === "android" ? GMAPS_DARK_STYLE : undefined}
        showsCompass={false}
        showsPointsOfInterest={false}
        showsBuildings={false}
        showsTraffic={false}
        showsScale={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        rotateEnabled
        pitchEnabled
        loadingEnabled
        loadingBackgroundColor={theme.bg}
        loadingIndicatorColor={theme.emeraldBright}
        onRegionChangeComplete={handleRegionChange}
      >
        {/* Player avatar */}
        <PlayerMarker lat={player.lat} lng={player.lng} />

        {individualMarkers.map((v) => (
          <VaultPin
            key={v.id}
            vault={v}
            claimed={claimedIds.has(v.id)}
            canClaim={claimableIds.has(v.id)}
            onPress={() => handlePress(v.id)}
          />
        ))}

        {clusters.map((c) => (
          <ClusterMarker
            key={c.key}
            lat={c.lat}
            lng={c.lng}
            count={c.vaults.length}
            brandHint={clusterBrandHint(c.vaults)}
            onPress={() => applyZoom(zoomIdx - 1)}
          />
        ))}
      </MapView>

      {/* Zoom slider */}
      <View style={styles.zoomWrap} pointerEvents="box-none">
        <Pressable
          onPress={() => applyZoom(zoomIdx - 1)}
          style={[styles.zoomBtn, zoomIdx === 0 && styles.zoomBtnDisabled]}
          hitSlop={8}
        >
          <Plus size={16} color={zoomIdx === 0 ? theme.textDim : theme.text} strokeWidth={3} />
        </Pressable>

        <View style={styles.zoomTrack}>
          {ZOOM_LEVELS.map((_, i) => {
            const active = i === zoomIdx;
            return (
              <Pressable
                key={i}
                onPress={() => applyZoom(i)}
                style={styles.zoomTickHit}
                hitSlop={4}
              >
                <View style={[styles.zoomTick, active && styles.zoomTickActive]} />
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={() => applyZoom(zoomIdx + 1)}
          style={[
            styles.zoomBtn,
            zoomIdx === ZOOM_LEVELS.length - 1 && styles.zoomBtnDisabled,
          ]}
          hitSlop={8}
        >
          <Minus
            size={16}
            color={zoomIdx === ZOOM_LEVELS.length - 1 ? theme.textDim : theme.text}
            strokeWidth={3}
          />
        </Pressable>
      </View>

      <Pressable onPress={recenter} style={styles.recenterBtn} hitSlop={10}>
        <View style={styles.recenterDot} />
        <Text style={styles.recenterLabel}>RECENTER</Text>
      </Pressable>
    </View>
  );
}

const NIKE_ORANGE = "#FA5400";
const NIKE_ORANGE_HI = "#FF7A33";
const APPLE_SILVER = "#E8EDF5";

function clusterBrandHint(vaults: Vault[]): "nike" | "apple" | "lulu" | null {
  for (const v of vaults) {
    if (v.brand === "nike" || v.brand === "apple" || v.brand === "lulu") return v.brand;
  }
  return null;
}

function PlayerMarker({ lat, lng }: { lat: number; lng: number }) {
  const tracking = useAndroidMarkerTracking([lat, lng]);
  return (
    <Marker
      coordinate={{ latitude: lat, longitude: lng }}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracking}
    >
      <View style={styles.playerWrap}>
        <View style={styles.playerHalo} />
        <View style={styles.playerCore}>
          <View style={styles.playerDot} />
        </View>
      </View>
    </Marker>
  );
}

function ClusterMarker({
  lat,
  lng,
  count,
  brandHint,
  onPress,
}: {
  lat: number;
  lng: number;
  count: number;
  brandHint: "nike" | "apple" | "lulu" | null;
  onPress: () => void;
}) {
  // Re-snapshot when the count or brand hint changes (clusters merge/split as
  // the user pans). Android needs a fresh bitmap each time.
  const tracking = useAndroidMarkerTracking([count, brandHint]);
  return (
    <Marker
      coordinate={{ latitude: lat, longitude: lng }}
      anchor={{ x: 0.5, y: 0.5 }}
      onPress={onPress}
      tracksViewChanges={tracking}
    >
      <ClusterBubble count={count} brandHint={brandHint} />
    </Marker>
  );
}

function ClusterBubble({
  count,
  brandHint,
}: {
  count: number;
  brandHint: "nike" | "apple" | "lulu" | null;
}) {
  const size = count > 50 ? 56 : count > 15 ? 48 : 40;
  const brandTint =
    brandHint === "nike"
      ? NIKE_ORANGE
      : brandHint === "apple"
      ? APPLE_SILVER
      : brandHint === "lulu"
      ? "#C2185B"
      : null;
  return (
    <View
      style={[
        styles.cluster,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: (brandTint ?? theme.gold) + "55",
          borderColor: brandTint ?? theme.goldBright,
        },
      ]}
    >
      <View
        style={[
          styles.clusterInner,
          {
            width: size - 8,
            height: size - 8,
            borderRadius: (size - 8) / 2,
            borderColor: brandTint ?? theme.goldBright,
          },
        ]}
      >
        <Text
          style={[
            styles.clusterText,
            { fontSize: size > 50 ? 16 : 13, color: brandTint ?? theme.goldBright },
          ]}
        >
          {count}
        </Text>
        {brandTint ? (
          <Text style={styles.clusterBrandLabel}>
            {brandHint === "nike" ? "NIKE" : brandHint === "apple" ? "APPLE" : "LULU"}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function VaultPin({
  vault,
  claimed,
  canClaim,
  onPress,
}: {
  vault: Vault;
  claimed: boolean;
  canClaim: boolean;
  onPress: () => void;
}) {
  const isNike = vault.kind === "brand" && vault.brand === "nike";
  const isApple = vault.kind === "brand" && vault.brand === "apple";
  const color = isNike ? NIKE_ORANGE : isApple ? APPLE_SILVER : tierColor(vault.tier);
  const glow = isNike ? NIKE_ORANGE_HI : isApple ? "#FFFFFF" : tierGlow(vault.tier);
  const isBrand = vault.kind === "brand";

  // Track view changes for a brief window so Android snapshots the fully
  // laid-out pin (halos, brand tag, ready ring). Re-runs when claimed/canClaim
  // flip so the bitmap stays in sync.
  const tracking = useAndroidMarkerTracking([claimed, canClaim]);

  return (
    <Marker
      coordinate={{ latitude: vault.lat, longitude: vault.lng }}
      anchor={{ x: 0.5, y: 0.5 }}
      onPress={onPress}
      tracksViewChanges={tracking}
    >
      <View style={styles.pinWrap}>
        {isBrand && !claimed && (
          <>
            <View
              style={[
                styles.brandHaloOuter,
                { backgroundColor: (isNike ? NIKE_ORANGE : APPLE_SILVER) + "22" },
              ]}
            />
            <View
              style={[
                styles.brandHaloInner,
                { borderColor: (isNike ? NIKE_ORANGE_HI : APPLE_SILVER) + "BB" },
              ]}
            />
          </>
        )}

        {canClaim && (
          <View style={[styles.pinReadyRing, { borderColor: theme.emeraldBright }]} />
        )}

        <View
          style={[
            styles.pin,
            isBrand && styles.pinBrand,
            {
              backgroundColor: claimed ? theme.surface : color,
              borderColor: claimed ? theme.border : glow,
              opacity: claimed ? 0.55 : 1,
            },
            isNike && !claimed && styles.pinNikeShadow,
          ]}
        >
          {isApple ? (
            <Text style={[styles.pinLogo, { color: claimed ? theme.textDim : "#0E1117" }]}>
              {"\uF8FF"}
            </Text>
          ) : isNike ? (
            <NikeSwoosh dim={claimed} />
          ) : (
            <View
              style={[
                styles.pinInner,
                { backgroundColor: claimed ? "transparent" : "#0E1117" + "AA" },
              ]}
            />
          )}
        </View>

        {isBrand && !claimed && (
          <View
            style={[
              styles.brandTag,
              isNike
                ? { backgroundColor: NIKE_ORANGE, borderColor: NIKE_ORANGE_HI }
                : { backgroundColor: "#0E1117", borderColor: APPLE_SILVER },
            ]}
          >
            <Text
              style={[
                styles.brandTagText,
                isNike ? { color: "#FFFFFF" } : { color: APPLE_SILVER },
              ]}
            >
              {isNike ? "NIKE" : "APPLE"}
            </Text>
          </View>
        )}

        {canClaim && <View style={styles.pinReadyDot} />}
      </View>
    </Marker>
  );
}

function NikeSwoosh({ dim }: { dim: boolean }) {
  const c = dim ? theme.textDim : "#0E1117";
  return (
    <View style={styles.swooshWrap}>
      <View style={[styles.swooshBar1, { backgroundColor: c }]} />
      <View style={[styles.swooshBar2, { backgroundColor: c }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  playerWrap: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  playerHalo: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.emerald + "33",
    borderWidth: 1,
    borderColor: theme.emerald + "88",
  },
  playerCore: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.bg,
    borderWidth: 2,
    borderColor: theme.emeraldBright,
    alignItems: "center",
    justifyContent: "center",
  },
  playerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.emeraldBright },
  pinWrap: { width: 56, height: 64, alignItems: "center", justifyContent: "center" },
  pinReadyRing: {
    position: "absolute",
    top: 4,
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    opacity: 0.7,
  },
  brandHaloOuter: {
    position: "absolute",
    top: 4,
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  brandHaloInner: {
    position: "absolute",
    top: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
  },
  pin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  pinBrand: { width: 34, height: 34, borderRadius: 17, borderWidth: 2.5 },
  pinNikeShadow: {
    ...Platform.select({
      ios: {
        shadowColor: NIKE_ORANGE,
        shadowOpacity: 0.9,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 0 },
      },
      android: { elevation: 8 },
    }),
  },
  pinInner: { width: 8, height: 8, borderRadius: 4 },
  pinLogo: { fontSize: 18, fontWeight: "900" as const, lineHeight: 20 },
  swooshWrap: { width: 20, height: 14, alignItems: "center", justifyContent: "center" },
  swooshBar1: {
    position: "absolute",
    left: 0,
    bottom: 3,
    width: 16,
    height: 3,
    borderRadius: 2,
    transform: [{ rotate: "-18deg" }],
  },
  swooshBar2: {
    position: "absolute",
    right: 1,
    top: 1,
    width: 8,
    height: 3,
    borderRadius: 2,
    transform: [{ rotate: "-30deg" }],
  },
  brandTag: {
    marginTop: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  brandTagText: { fontSize: 8, fontWeight: "900" as const, letterSpacing: 0.8 },
  pinReadyDot: {
    position: "absolute",
    top: 6,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.emeraldBright,
    borderWidth: 1,
    borderColor: theme.bg,
  },
  // cluster bubble
  cluster: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.gold + "55",
    borderWidth: 2,
    borderColor: theme.goldBright,
    ...Platform.select({
      ios: {
        shadowColor: theme.gold,
        shadowOpacity: 0.7,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 0 },
      },
      android: { elevation: 6 },
    }),
  },
  clusterInner: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A1206",
    borderWidth: 1,
    borderColor: theme.goldBright,
  },
  clusterText: { color: theme.goldBright, fontWeight: "900" as const, letterSpacing: 0.5 },
  clusterBrandLabel: {
    color: theme.text,
    fontSize: 7,
    fontWeight: "900" as const,
    letterSpacing: 1,
    marginTop: 1,
    opacity: 0.85,
  },
  // zoom slider
  zoomWrap: {
    position: "absolute",
    right: 14,
    top: 60,
    width: 40,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 22,
    backgroundColor: "rgba(12, 15, 26, 0.92)",
    borderWidth: 1,
    borderColor: theme.border,
    gap: 6,
  },
  zoomBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.surface,
  },
  zoomBtnDisabled: { opacity: 0.4 },
  zoomTrack: { width: 24, alignItems: "center", paddingVertical: 4, gap: 4 },
  zoomTickHit: { width: 24, height: 12, alignItems: "center", justifyContent: "center" },
  zoomTick: { width: 14, height: 2, borderRadius: 1, backgroundColor: theme.border },
  zoomTickActive: { width: 20, height: 3, backgroundColor: theme.emeraldBright },
  recenterBtn: {
    position: "absolute",
    right: 14,
    bottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: "rgba(12, 15, 26, 0.92)",
    borderWidth: 1,
    borderColor: theme.border,
  },
  recenterDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.emeraldBright },
  recenterLabel: {
    color: theme.text,
    fontSize: 11,
    fontWeight: "900" as const,
    letterSpacing: 1.2,
  },
});
