/**
 * Auth provider — Rork Auth (Google + Apple) plus a local email/password
 * fallback so the email path works even without a backend identity store.
 *
 * Persisted to AsyncStorage. Refresh attempts call the Rork auth endpoint.
 */
import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

const AUTH_URL = process.env.EXPO_PUBLIC_RORK_AUTH_URL ?? "";
const APP_KEY = process.env.EXPO_PUBLIC_RORK_APP_KEY ?? "";
const PROJECT_ID = process.env.EXPO_PUBLIC_PROJECT_ID ?? "";

const KEY_ACCESS = "stridequest.auth.access";
const KEY_REFRESH = "stridequest.auth.refresh";
const KEY_USER = "stridequest.auth.user";
const KEY_EMAILS = "stridequest.auth.local.emails";

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  provider: "google" | "apple" | "email";
}

interface StoredEmailAccount {
  id: string;
  email: string;
  passwordHash: string;
  name?: string;
  createdAt: number;
}

WebBrowser.maybeCompleteAuthSession();

// ── tiny base64url helpers (RN-safe) ─────────────────────────────────────────
function bytesToB64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  // btoa exists on RN via JSC/Hermes polyfills + on web.
  const b64 = typeof btoa === "function" ? btoa(bin) : Buffer.from(bin).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  const g = (globalThis as unknown as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto;
  if (g?.getRandomValues) {
    g.getRandomValues(out);
  } else {
    for (let i = 0; i < n; i++) out[i] = Math.floor(Math.random() * 256);
  }
  return out;
}

async function sha256B64Url(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const cryptoObj = (globalThis as unknown as { crypto?: { subtle?: { digest: (a: string, b: ArrayBuffer) => Promise<ArrayBuffer> } } }).crypto;
  if (cryptoObj?.subtle?.digest) {
    const hash = await cryptoObj.subtle.digest("SHA-256", data.buffer as ArrayBuffer);
    return bytesToB64Url(new Uint8Array(hash));
  }
  // Fallback: plain verifier (Rork auth still validates server-side).
  return bytesToB64Url(data);
}

function generateCodeVerifier(): string {
  return bytesToB64Url(randomBytes(32));
}

/** Decode a JWT payload safely (no crypto verification). */
function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json = typeof atob === "function" ? atob(pad) : Buffer.from(pad, "base64").toString("binary");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function userFromToken(token: string): AuthUser | null {
  const payload = decodeJwt(token);
  if (!payload) return null;
  const exp = typeof payload.exp === "number" ? payload.exp : 0;
  if (exp && exp * 1000 < Date.now()) return null;
  return {
    id: String(payload.sub ?? ""),
    email: String(payload.email ?? ""),
    name: payload.name ? String(payload.name) : undefined,
    picture: payload.picture ? String(payload.picture) : undefined,
    provider: (payload.provider as AuthUser["provider"]) ?? "google",
  };
}

// ── local email/password (mock) ──────────────────────────────────────────────
async function hashPassword(password: string): Promise<string> {
  return sha256B64Url("stride::" + password);
}

async function loadLocalAccounts(): Promise<StoredEmailAccount[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_EMAILS);
    return raw ? (JSON.parse(raw) as StoredEmailAccount[]) : [];
  } catch {
    return [];
  }
}

async function saveLocalAccounts(list: StoredEmailAccount[]): Promise<void> {
  await AsyncStorage.setItem(KEY_EMAILS, JSON.stringify(list));
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const verifierRef = useRef<string | null>(null);

  const persistUser = useCallback(async (u: AuthUser | null) => {
    if (u) await AsyncStorage.setItem(KEY_USER, JSON.stringify(u));
    else await AsyncStorage.removeItem(KEY_USER);
    setUser(u);
  }, []);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (!AUTH_URL || !APP_KEY) return false;
    const stored = await AsyncStorage.getItem(KEY_REFRESH);
    if (!stored) return false;
    try {
      const res = await fetch(`${AUTH_URL}/oauth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app_key: APP_KEY, refresh_token: stored }),
      });
      if (!res.ok) return false;
      const json = (await res.json()) as { access_token?: string };
      if (!json.access_token) return false;
      await AsyncStorage.setItem(KEY_ACCESS, json.access_token);
      const u = userFromToken(json.access_token);
      if (u) await persistUser(u);
      return !!u;
    } catch (e) {
      console.log("[auth] refresh failed", e);
      return false;
    }
  }, [persistUser]);

  // Bootstrap on mount.
  useEffect(() => {
    (async () => {
      try {
        const cached = await AsyncStorage.getItem(KEY_USER);
        if (cached) {
          const parsed = JSON.parse(cached) as AuthUser;
          setUser(parsed);
        }
        const access = await AsyncStorage.getItem(KEY_ACCESS);
        if (access) {
          const u = userFromToken(access);
          if (u) {
            setUser(u);
          } else {
            await refreshToken();
          }
        }
      } catch (e) {
        console.log("[auth] bootstrap failed", e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [refreshToken]);

  // ── exchange + deep link ───────────────────────────────────────────────────
  const exchangeCode = useCallback(
    async (code: string) => {
      const verifier = verifierRef.current;
      if (!verifier || !AUTH_URL || !APP_KEY) return;
      verifierRef.current = null;
      const res = await fetch(`${AUTH_URL}/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app_key: APP_KEY, code, code_verifier: verifier }),
      });
      if (!res.ok) {
        const body: { error?: string } = await res.json().catch(() => ({}));
        setError(body.error ?? `Sign-in failed (${res.status})`);
        return;
      }
      const json = (await res.json()) as {
        access_token?: string;
        refresh_token?: string;
        user?: AuthUser;
      };
      if (json.access_token) await AsyncStorage.setItem(KEY_ACCESS, json.access_token);
      if (json.refresh_token) await AsyncStorage.setItem(KEY_REFRESH, json.refresh_token);
      const u = json.user ?? (json.access_token ? userFromToken(json.access_token) : null);
      if (u) await persistUser(u);
    },
    [persistUser]
  );

  useEffect(() => {
    const sub = Linking.addEventListener("url", async (event) => {
      try {
        const url = new URL(event.url);
        if (url.pathname === "/auth/callback") {
          const code = url.searchParams.get("code");
          if (code) await exchangeCode(code);
        }
      } catch (e) {
        console.log("[auth] deep link", e);
      }
    });
    return () => sub.remove();
  }, [exchangeCode]);

  // ── OAuth sign-in ──────────────────────────────────────────────────────────
  const signIn = useCallback(
    async (provider: "google" | "apple"): Promise<{ ok: boolean }> => {
      setError(null);
      if (!AUTH_URL || !APP_KEY) {
        setError("Sign-in is not configured.");
        return { ok: false };
      }
      setIsSigningIn(true);
      try {
        const verifier = generateCodeVerifier();
        const challenge = await sha256B64Url(verifier);
        verifierRef.current = verifier;
        const isWeb = Platform.OS === "web";
        const res = await fetch(`${AUTH_URL}/oauth/initiate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            app_key: APP_KEY,
            provider,
            code_challenge: challenge,
            target: "rn",
            env: isWeb ? "preview" : "native",
            app_path: "expo",
          }),
        });
        if (!res.ok) {
          const body: { error?: string } = await res.json().catch(() => ({}));
          setError(body.error ?? `Sign-in failed (${res.status})`);
          return { ok: false };
        }
        const { auth_url } = (await res.json()) as { auth_url: string };
        const callback = `rork-${PROJECT_ID}://auth/callback`;
        const result = await WebBrowser.openAuthSessionAsync(auth_url, callback);
        if (result.type === "success") {
          const url = new URL(result.url);
          const code = url.searchParams.get("code");
          if (code) {
            await exchangeCode(code);
            return { ok: true };
          }
        }
        return { ok: false };
      } catch (e) {
        console.log("[auth] signIn failed", e);
        setError(e instanceof Error ? e.message : "Sign-in failed");
        return { ok: false };
      } finally {
        setIsSigningIn(false);
      }
    },
    [exchangeCode]
  );

  // ── Email / password (local) ───────────────────────────────────────────────
  const signUpEmail = useCallback(
    async (email: string, password: string, name?: string): Promise<{ ok: boolean; reason?: string }> => {
      setError(null);
      const e = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return { ok: false, reason: "Invalid email" };
      if (password.length < 6) return { ok: false, reason: "Password must be 6+ characters" };
      setIsSigningIn(true);
      try {
        const accounts = await loadLocalAccounts();
        if (accounts.some((a) => a.email === e)) return { ok: false, reason: "Email already in use" };
        const acc: StoredEmailAccount = {
          id: `local_${Date.now().toString(36)}`,
          email: e,
          passwordHash: await hashPassword(password),
          name,
          createdAt: Date.now(),
        };
        await saveLocalAccounts([...accounts, acc]);
        await persistUser({ id: acc.id, email: acc.email, name: acc.name, provider: "email" });
        return { ok: true };
      } finally {
        setIsSigningIn(false);
      }
    },
    [persistUser]
  );

  const signInEmail = useCallback(
    async (email: string, password: string): Promise<{ ok: boolean; reason?: string }> => {
      setError(null);
      const e = email.trim().toLowerCase();
      setIsSigningIn(true);
      try {
        const accounts = await loadLocalAccounts();
        const found = accounts.find((a) => a.email === e);
        if (!found) return { ok: false, reason: "No account with that email" };
        const hash = await hashPassword(password);
        if (found.passwordHash !== hash) return { ok: false, reason: "Wrong password" };
        await persistUser({ id: found.id, email: found.email, name: found.name, provider: "email" });
        return { ok: true };
      } finally {
        setIsSigningIn(false);
      }
    },
    [persistUser]
  );

  const signOut = useCallback(async () => {
    await AsyncStorage.multiRemove([KEY_ACCESS, KEY_REFRESH, KEY_USER]);
    setUser(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    user,
    isAuthed: !!user,
    isLoading,
    isSigningIn,
    error,
    signIn,
    signUpEmail,
    signInEmail,
    signOut,
    clearError,
  };
});
