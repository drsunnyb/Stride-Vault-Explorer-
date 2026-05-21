import { Platform } from "react-native";

/**
 * Thin wrapper around expo-sensors Pedometer that:
 * - No-ops on web (Pedometer isn't supported there).
 * - Always resolves so callers don't need platform branches.
 */
export interface PedometerSubscription {
  remove: () => void;
}

export async function isPedometerAvailable(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const { Pedometer } = await import("expo-sensors");
    return await Pedometer.isAvailableAsync();
  } catch (e) {
    console.log("[pedometer] availability check failed", e);
    return false;
  }
}

export async function requestPedometerPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const { Pedometer } = await import("expo-sensors");
    const res = await Pedometer.requestPermissionsAsync();
    return res.granted;
  } catch (e) {
    console.log("[pedometer] permission request failed", e);
    return false;
  }
}

/** Steps recorded between two dates. iOS-only API. */
export async function getStepCountBetween(start: Date, end: Date): Promise<number> {
  if (Platform.OS !== "ios") return 0;
  try {
    const { Pedometer } = await import("expo-sensors");
    const result = await Pedometer.getStepCountAsync(start, end);
    return result?.steps ?? 0;
  } catch (e) {
    console.log("[pedometer] getStepCountBetween failed", e);
    return 0;
  }
}

/**
 * Subscribe to live pedometer updates.
 * The callback receives the cumulative step count since the subscription started.
 */
export async function watchSteps(
  cb: (steps: number) => void
): Promise<PedometerSubscription | null> {
  if (Platform.OS === "web") return null;
  try {
    const { Pedometer } = await import("expo-sensors");
    const sub = Pedometer.watchStepCount((result) => cb(result.steps));
    return { remove: () => sub.remove() };
  } catch (e) {
    console.log("[pedometer] watchSteps failed", e);
    return null;
  }
}
