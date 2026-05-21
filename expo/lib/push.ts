import { Platform } from "react-native";

import { upsertDeviceToken } from "@/lib/backend";

/**
 * Push registration + delivery hooks for Expo. Runs on top of
 * `expo-notifications` which is included in Expo Go for local notifications
 * — remote push requires a development build but the registration call is
 * harmless either way (returns `null` if unsupported).
 *
 * Foreground deliveries are routed back into the app via `onForegroundPush`
 * so even users who tap-dismiss a banner still see the entry in the in-app
 * inbox.
 */

let cachedToken: string | null = null;

async function loadModule() {
  if (Platform.OS === "web") return null;
  try {
    return await import("expo-notifications");
  } catch (e) {
    console.log("[push] expo-notifications load failed", e);
    return null;
  }
}

/**
 * Register for remote push, upsert the token to Supabase keyed on the
 * supplied user context. Safe to call repeatedly — Supabase upserts on the
 * token primary key so a second call just refreshes `home_city_id` / `plus`
 * when those change.
 */
export async function registerPush(meta: {
  authId?: string;
  username?: string;
  homeCityId?: string;
  plus?: boolean;
  locale?: string;
}): Promise<string | null> {
  const Notifications = await loadModule();
  if (!Notifications) return null;
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) {
      // Don't auto-prompt here — the onboarding screen owns the prompt
      // so we just bail until the user opts in.
      return null;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Stride",
        importance: 4, // HIGH
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#F4D03F",
      });
    }

    if (!cachedToken) {
      const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
      const tokenRes = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );
      cachedToken = tokenRes.data;
    }

    if (cachedToken) {
      await upsertDeviceToken({
        token: cachedToken,
        platform: "expo",
        authId: meta.authId,
        username: meta.username,
        homeCityId: meta.homeCityId,
        plus: meta.plus,
        locale: meta.locale,
      });
    }
    return cachedToken;
  } catch (e) {
    console.log("[push] registerPush failed", e);
    return null;
  }
}

/**
 * Subscribe to incoming remote pushes while the app is foregrounded. The
 * callback receives the notification payload so the caller can mirror it
 * into the in-app inbox.
 */
export async function onForegroundPush(
  cb: (n: { title: string; body: string; data: Record<string, unknown> }) => void
): Promise<() => void> {
  const Notifications = await loadModule();
  if (!Notifications) return () => {};
  const sub = Notifications.addNotificationReceivedListener((event) => {
    const content = event.request.content;
    cb({
      title: content.title ?? "",
      body: content.body ?? "",
      data: (content.data as Record<string, unknown>) ?? {},
    });
  });
  return () => sub.remove();
}
