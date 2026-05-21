import { getSupabase } from "@/lib/supabase";

/**
 * Push & broadcast engine for the admin dashboard.
 *
 * Reads device tokens from Supabase, sends a notification batch to the
 * Expo Push API, and writes a `notification_log` row so every player who
 * has the app open also sees the message in their in-app inbox (via
 * polling).
 *
 * APNs/FCM tokens are recorded but not yet delivered to natively — they
 * land in the log table so the inbox surface still fires for native iOS /
 * Android users until we add direct APNs/FCM senders.
 */

export type PushAudience = "all" | "city" | "plus" | "featured";

export interface PushSendInput {
  title: string;
  body: string;
  audience: PushAudience;
  /** City id when audience === 'city'. */
  cityId?: string;
  /** Restrict to Stride+ subscribers only (forced true when audience='plus'). */
  plusOnly?: boolean;
  /** Arbitrary payload — `kind` controls the in-app icon. */
  data?: Record<string, unknown>;
  /** Optional human label for the log row (e.g. "auto:hot-vault"). */
  sentBy?: string;
}

export interface PushResult {
  sent: number;
  ok: number;
  errors: number;
  expoTokens: number;
  apnsTokens: number;
  logId?: string;
}

interface DeviceTokenRow {
  token: string;
  platform: "expo" | "apns" | "fcm";
  home_city_id: string | null;
  plus: boolean | null;
}

interface ExpoPushTicket {
  status?: "ok" | "error";
  message?: string;
}

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";
const BATCH_SIZE = 100;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Send a push to the chosen audience.
 *
 * 1. Pulls matching device tokens from Supabase.
 * 2. Sends batches of up to 100 to the Expo Push API.
 * 3. Logs the broadcast in `notification_log` so the in-app inbox picks
 *    it up on next poll regardless of platform.
 */
export async function sendPush(input: PushSendInput): Promise<PushResult> {
  const supa = getSupabase();

  let query = supa.from("device_tokens").select("token, platform, home_city_id, plus");
  if (input.audience === "city" && input.cityId) {
    query = query.eq("home_city_id", input.cityId);
  }
  const forcePlus = input.audience === "plus" || !!input.plusOnly;
  if (forcePlus) query = query.eq("plus", true);

  const { data: rows, error } = await query;
  if (error) throw error;

  const tokens = ((rows ?? []) as DeviceTokenRow[]).filter((r) => !!r.token);
  const expoTokens = tokens
    .filter((r) => r.platform === "expo" && r.token.startsWith("ExponentPushToken"))
    .map((r) => r.token);
  const apnsTokens = tokens.filter((r) => r.platform === "apns").map((r) => r.token);

  // Send to Expo in batches of 100. Errors per-ticket are counted; the
  // entire request is wrapped in a try so a network blip never blocks
  // the log write.
  let ok = 0;
  let errors = 0;
  for (const batch of chunk(expoTokens, BATCH_SIZE)) {
    const messages = batch.map((to) => ({
      to,
      title: input.title,
      body: input.body,
      data: { ...(input.data ?? {}), audience: input.audience, cityId: input.cityId ?? null },
      sound: "default" as const,
      priority: "high" as const,
      channelId: "default",
    }));
    try {
      const res = await fetch(EXPO_PUSH_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
        },
        body: JSON.stringify(messages),
      });
      const json = (await res.json()) as { data?: ExpoPushTicket[]; errors?: unknown };
      const tickets = json.data ?? [];
      for (const t of tickets) {
        if (t.status === "ok") ok += 1;
        else errors += 1;
      }
      // If we got fewer tickets than messages, count the rest as errors.
      if (tickets.length < messages.length) {
        errors += messages.length - tickets.length;
      }
    } catch (e) {
      console.warn("[push] expo batch failed", e);
      errors += batch.length;
    }
  }

  // Write the log row last so the inbox poll sees it AFTER the push attempt.
  const { data: log, error: logErr } = await supa
    .from("notification_log")
    .insert({
      title: input.title,
      body: input.body,
      audience: input.audience,
      audience_filter: {
        cityId: input.cityId ?? null,
        plusOnly: forcePlus,
      },
      data: input.data ?? {},
      sent_count: tokens.length,
      ok_count: ok,
      error_count: errors,
      sent_by: input.sentBy ?? "admin",
    })
    .select("id")
    .single();

  if (logErr) {
    console.warn("[push] notification_log insert failed", logErr);
  }

  return {
    sent: tokens.length,
    ok,
    errors,
    expoTokens: expoTokens.length,
    apnsTokens: apnsTokens.length,
    logId: (log as { id?: string } | null)?.id,
  };
}

export interface NotificationLogEntry {
  id: string;
  title: string;
  body: string;
  audience: PushAudience;
  audience_filter: { cityId?: string | null; plusOnly?: boolean } | null;
  sent_at: string;
  sent_count: number;
  ok_count: number;
  error_count: number;
  sent_by: string | null;
}

/** Recent log rows for the admin history panel. */
export async function fetchNotificationLog(limit: number = 50): Promise<NotificationLogEntry[]> {
  const supa = getSupabase();
  const { data, error } = await supa
    .from("notification_log")
    .select("*")
    .order("sent_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as NotificationLogEntry[];
}

/** Total registered devices (used in the dashboard's reach indicator). */
export async function fetchDeviceTokenCount(): Promise<number> {
  const supa = getSupabase();
  const { count, error } = await supa
    .from("device_tokens")
    .select("token", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}
