import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Stride Admin uses the **service role key** to bypass RLS and edit the live
 * catalogue. The key is entered by the operator on first load and persisted
 * to localStorage. It never leaves the browser.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
  ?? "https://hibrseuowgebcwtdwubk.supabase.co";

/**
 * Public publishable (anon) key — safe to embed in the bundle. RLS still
 * applies, so for now writes from the admin browser go through this key and
 * succeed only on tables/policies that permit it. We'll swap to a server
 * edge function with service-role later.
 */
const PUBLISHABLE_KEY = "sb_publishable_dJ5aF14zyljXGUjrIe-aAg_mMFsvwbx";

const STORAGE_KEY = "stride.admin.service_key";

let client: SupabaseClient | null = null;

export function getServiceKey(): string {
  return localStorage.getItem(STORAGE_KEY) ?? PUBLISHABLE_KEY;
}

export function setServiceKey(key: string): void {
  localStorage.setItem(STORAGE_KEY, key.trim());
  client = null;
}

export function clearServiceKey(): void {
  localStorage.removeItem(STORAGE_KEY);
  client = null;
}

export function getSupabase(): SupabaseClient {
  if (client) return client;
  const key = getServiceKey();
  client = createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

export function hasServiceKey(): boolean {
  return true;
}

export const SUPABASE_PROJECT_URL = SUPABASE_URL;
