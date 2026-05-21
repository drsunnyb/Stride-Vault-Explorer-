/**
 * Lightweight analytics service. Records product events to:
 *  - the local logger (always)
 *  - Supabase `events` table (when configured, fire-and-forget)
 *
 * No third-party SDK. Designed so we can swap the sink for PostHog / Mixpanel
 * later without touching call sites.
 *
 * Minimal Supabase schema (optional — events go to the logger either way):
 *   create table events (
 *     id bigserial primary key,
 *     ts timestamptz default now(),
 *     anon_id text,
 *     name text not null,
 *     props jsonb,
 *     platform text
 *   );
 */
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { createLogger } from "@/lib/logger";

const log = createLogger("Analytics");
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const ANON_ID_KEY = "stride.anon.id";

/** Canonical event names. Add new ones here so they stay typo-free at call sites. */
export type EventName =
  | "app_open"
  | "screen_view"
  | "onboarding_started"
  | "onboarding_completed"
  | "vault_claimed"
  | "vault_claim_blocked"
  | "reward_redeemed"
  | "raffle_entered"
  | "share_sent"
  | "friend_added"
  | "challenge_created"
  | "challenge_settled"
  | "plus_paywall_viewed"
  | "plus_subscribed"
  | "plus_cancelled"
  | "notifications_enabled"
  | "notifications_denied"
  | "ladder_prize_claimed"
  | "prediction_placed"
  | "tribe_selected"
  | "error";

type EventProps = Record<string, string | number | boolean | null | undefined>;

let anonIdCache: string | null = null;

async function getAnonId(): Promise<string> {
  if (anonIdCache) return anonIdCache;
  try {
    const existing = await AsyncStorage.getItem(ANON_ID_KEY);
    if (existing) {
      anonIdCache = existing;
      return existing;
    }
    const fresh = `a_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    await AsyncStorage.setItem(ANON_ID_KEY, fresh);
    anonIdCache = fresh;
    return fresh;
  } catch {
    return "a_unknown";
  }
}

async function postToSupabase(name: EventName, props: EventProps, anonId: string): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/events`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        name,
        props,
        anon_id: anonId,
        platform: Platform.OS,
      }),
    });
  } catch (e) {
    // Fail-silent — analytics must never break the app.
    log.debug("supabase post failed", { name, e: String(e) });
  }
}

/**
 * Record a product event. Non-blocking, never throws.
 * Usage: `track("vault_claimed", { vaultId: v.id, coins })`.
 */
export function track(name: EventName, props: EventProps = {}): void {
  log.info(`event ${name}`, props);
  // Async, non-blocking. Don't await — we never want analytics to gate UI.
  getAnonId()
    .then((id) => postToSupabase(name, props, id))
    .catch(() => {});
}

/** Convenience helper for screen tracking. */
export function trackScreen(name: string): void {
  track("screen_view", { name });
}
