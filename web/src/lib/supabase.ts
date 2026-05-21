import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Stride Admin uses the **service role key** to bypass RLS and edit the live
 * catalogue. The key is entered by the operator on first load and persisted
 * to localStorage. It never leaves the browser.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
  ?? "https://hibrseuowgebcwtdwubk.supabase.co";

const STORAGE_KEY = "stride.admin.service_key";

let client: SupabaseClient | null = null;

export function getServiceKey(): string {
  return localStorage.getItem(STORAGE_KEY) ?? "";
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
  if (!key) throw new Error("Service key not set");
  client = createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

export function hasServiceKey(): boolean {
  return getServiceKey().length > 0;
}

export const SUPABASE_PROJECT_URL = SUPABASE_URL;
