import { MAP_BOUNDS } from "@/constants/vaults";

/** Haversine distance in meters between two lat/lng points. */
export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Human-friendly distance label. */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters < 10000 ? 2 : 1)} km`;
}

/** Convert a lat/lng to normalised 0..1 coordinates within MAP_BOUNDS. */
export function latLngToNorm(lat: number, lng: number): { x: number; y: number } {
  const x = (lng - MAP_BOUNDS.west) / (MAP_BOUNDS.east - MAP_BOUNDS.west);
  const y = 1 - (lat - MAP_BOUNDS.south) / (MAP_BOUNDS.north - MAP_BOUNDS.south);
  return { x, y };
}

/** Normalised -> pixel coords given map width/height. */
export function normToPixel(
  n: { x: number; y: number },
  width: number,
  height: number
): { x: number; y: number } {
  return { x: n.x * width, y: n.y * height };
}

/** Direct lat/lng -> pixel helper. */
export function latLngToPixel(
  lat: number,
  lng: number,
  width: number,
  height: number
): { x: number; y: number } {
  return normToPixel(latLngToNorm(lat, lng), width, height);
}
