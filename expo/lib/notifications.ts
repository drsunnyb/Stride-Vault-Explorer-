import { Platform } from "react-native";

/**
 * Cross-platform local notification engine for Stride Quest.
 * - Daily streak reminder (9:00 AM)
 * - Per-vault respawn alert ("Your vault is ready")
 * - Raffle ending soon
 *
 * All scheduling is local — no push server required.
 * On web, all calls are no-ops.
 */

const TAG_DAILY = "sq.daily";
const TAG_RESPAWN = "sq.respawn.";
const TAG_RAFFLE = "sq.raffle.";
const TAG_POWER = "sq.power.";
const TAG_HOT = "sq.hot";
const TAG_STREAK = "sq.streak";
const TAG_FINAL = "sq.final.";
const TAG_PREDICT = "sq.predict.";

async function loadModule() {
  if (Platform.OS === "web") return null;
  try {
    const mod = await import("expo-notifications");
    // Default behaviour: show banners while foregrounded.
    mod.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowAlert: true,
      }),
    });
    return mod;
  } catch (e) {
    console.log("[notifications] load failed", e);
    return null;
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  const Notifications = await loadModule();
  if (!Notifications) return false;
  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) return true;
    const res = await Notifications.requestPermissionsAsync();
    return res.granted;
  } catch (e) {
    console.log("[notifications] permission failed", e);
    return false;
  }
}

/** Schedule a daily 9am nudge to come back into the game. */
export async function scheduleDailyReminder(): Promise<void> {
  const Notifications = await loadModule();
  if (!Notifications) return;
  try {
    // Clear any previous instance first to avoid duplicates.
    const existing = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of existing) {
      if (n.identifier.startsWith(TAG_DAILY)) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
    await Notifications.scheduleNotificationAsync({
      identifier: TAG_DAILY,
      content: {
        title: "Your London map is waking up.",
        body: "Fresh vaults dropped overnight. Start your streak before the city does.",
        data: { kind: "daily" },
      },
      trigger: {
        type: "calendar",
        hour: 9,
        minute: 0,
        repeats: true,
      } as unknown as import("expo-notifications").NotificationTriggerInput,
    });
  } catch (e) {
    console.log("[notifications] scheduleDailyReminder failed", e);
  }
}

/** Schedule a one-off "vault is ready" reminder when a vault respawns. */
export async function scheduleVaultRespawn(
  vaultId: string,
  vaultName: string,
  respawnAt: number
): Promise<void> {
  const Notifications = await loadModule();
  if (!Notifications) return;
  const ms = respawnAt - Date.now();
  if (ms < 30_000) return; // skip if already very close
  try {
    const id = `${TAG_RESPAWN}${vaultId}`;
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: {
        title: `${vaultName} has respawned`,
        body: "Walk back to claim your next reward — coins, XP and brand drops await.",
        data: { kind: "respawn", vaultId },
      },
      trigger: {
        type: "timeInterval",
        seconds: Math.max(60, Math.round(ms / 1000)),
      } as unknown as import("expo-notifications").NotificationTriggerInput,
    });
  } catch (e) {
    console.log("[notifications] scheduleVaultRespawn failed", e);
  }
}

/** Schedule a "raffle ends in 1 hour" alert. */
export async function scheduleRaffleEndAlert(
  raffleId: string,
  title: string,
  endsAt: number
): Promise<void> {
  const Notifications = await loadModule();
  if (!Notifications) return;
  const fireAt = endsAt - 60 * 60 * 1000; // 1 hour before
  const ms = fireAt - Date.now();
  if (ms < 60_000) return;
  try {
    const id = `${TAG_RAFFLE}${raffleId}`;
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: {
        title: "Raffle closing in 1 hour",
        body: `${title} — buy more entries before the draw locks.`,
        data: { kind: "raffle", raffleId },
      },
      trigger: {
        type: "timeInterval",
        seconds: Math.max(60, Math.round(ms / 1000)),
      } as unknown as import("expo-notifications").NotificationTriggerInput,
    });
  } catch (e) {
    console.log("[notifications] scheduleRaffleEndAlert failed", e);
  }
}

/** Schedule a 30-min-ahead heads-up before a Power Hour starts. */
export async function schedulePowerHourAlert(startsAt: number, multiplier: number): Promise<void> {
  const Notifications = await loadModule();
  if (!Notifications) return;
  const fireAt = startsAt - 30 * 60_000;
  const ms = fireAt - Date.now();
  if (ms < 60_000) return;
  try {
    const id = `${TAG_POWER}${startsAt}`;
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: {
        title: `⚡ Power Hour in 30 min · ${multiplier}×`,
        body: "Drop everything — every vault pays double for one hour.",
        data: { kind: "power", startsAt },
      },
      trigger: { type: "timeInterval", seconds: Math.max(60, Math.round(ms / 1000)) } as unknown as import("expo-notifications").NotificationTriggerInput,
    });
  } catch (e) {
    console.log("[notifications] schedulePowerHourAlert failed", e);
  }
}

/** Daily 6am push: “new Hot Vaults dropped”. */
export async function scheduleHotVaultDrop(): Promise<void> {
  const Notifications = await loadModule();
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(TAG_HOT).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: TAG_HOT,
      content: {
        title: "🌶️ 5 new Hot Vaults are live",
        body: "First to walk wins 5× coins. Pick yours before the city does.",
        data: { kind: "hot" },
      },
      trigger: { type: "calendar", hour: 6, minute: 0, repeats: true } as unknown as import("expo-notifications").NotificationTriggerInput,
    });
  } catch (e) {
    console.log("[notifications] scheduleHotVaultDrop failed", e);
  }
}

/** 10pm nudge if the user hasn't claimed today and risks breaking their streak. */
export async function scheduleStreakWarning(): Promise<void> {
  const Notifications = await loadModule();
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(TAG_STREAK).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: TAG_STREAK,
      content: {
        title: "🔥 Don't break your streak",
        body: "Two hours left to claim a vault and keep your run alive.",
        data: { kind: "streak" },
      },
      trigger: { type: "calendar", hour: 22, minute: 0, repeats: true } as unknown as import("expo-notifications").NotificationTriggerInput,
    });
  } catch (e) {
    console.log("[notifications] scheduleStreakWarning failed", e);
  }
}

/** Final-Hour push, one hour before the weekly ladder closes. */
export async function scheduleFinalHourAlert(periodEndsAt: number, periodLabel: string): Promise<void> {
  const Notifications = await loadModule();
  if (!Notifications) return;
  const fireAt = periodEndsAt - 60 * 60_000;
  const ms = fireAt - Date.now();
  if (ms < 60_000) return;
  try {
    const id = `${TAG_FINAL}${periodEndsAt}`;
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: {
        title: `⏰ Final Hour · ${periodLabel}`,
        body: "Every coin counts double for the next 60 minutes. Climb.",
        data: { kind: "final", periodLabel },
      },
      trigger: { type: "timeInterval", seconds: Math.max(60, Math.round(ms / 1000)) } as unknown as import("expo-notifications").NotificationTriggerInput,
    });
  } catch (e) {
    console.log("[notifications] scheduleFinalHourAlert failed", e);
  }
}

export async function cancelAllStrideNotifications(): Promise<void> {
  const Notifications = await loadModule();
  if (!Notifications) return;
  try {
    const existing = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of existing) {
      if (
        n.identifier.startsWith(TAG_DAILY) ||
        n.identifier.startsWith(TAG_RESPAWN) ||
        n.identifier.startsWith(TAG_RAFFLE) ||
        n.identifier.startsWith(TAG_POWER) ||
        n.identifier === TAG_HOT ||
        n.identifier === TAG_STREAK ||
        n.identifier.startsWith(TAG_FINAL) ||
        n.identifier.startsWith(TAG_PREDICT)
      ) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
  } catch (e) {
    console.log("[notifications] cancelAll failed", e);
  }
}
