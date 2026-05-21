import { useState } from "react";
import { setServiceKey, SUPABASE_PROJECT_URL } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Lock, ExternalLink, Mail } from "lucide-react";

interface Props { onAuthed: () => void }

/**
 * Hard-coded admin allowlist. Add a teammate by appending their email here
 * (lowercase) and redeploying. The service-role key still never leaves the
 * browser — this email gate is a lightweight "who is allowed to even try".
 */
const ADMIN_EMAILS: readonly string[] = [
  "dr.sb1@me.com",
];

const EMAIL_STORAGE_KEY = "stride.admin.email";

export function LoginScreen({ onAuthed }: Props) {
  const [email, setEmail] = useState<string>(() => localStorage.getItem(EMAIL_STORAGE_KEY) ?? "");
  const [emailOk, setEmailOk] = useState<boolean>(() => {
    const saved = localStorage.getItem(EMAIL_STORAGE_KEY) ?? "";
    return ADMIN_EMAILS.includes(saved.trim().toLowerCase());
  });
  const [key, setKey] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const submitEmail = () => {
    const normalized = email.trim().toLowerCase();
    if (!ADMIN_EMAILS.includes(normalized)) {
      setError("This email is not on the admin allowlist.");
      return;
    }
    localStorage.setItem(EMAIL_STORAGE_KEY, normalized);
    setError("");
    setEmailOk(true);
    onAuthed();
  };

  const submit = async () => {
    if (!key.trim()) {
      setError("Paste your Supabase service role key");
      return;
    }
    setBusy(true);
    setError("");
    try {
      // Sanity check the key against the brands table.
      const res = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/brands?select=id&limit=1`, {
        headers: {
          apikey: key.trim(),
          Authorization: `Bearer ${key.trim()}`,
        },
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Supabase rejected the key (${res.status}). ${body.slice(0, 120)}`);
      }
      setServiceKey(key.trim());
      onAuthed();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not verify key");
    } finally {
      setBusy(false);
    }
  };

  // Auto-advance if email was already saved from a previous session.
  if (emailOk) {
    onAuthed();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-emerald-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="size-10 rounded-xl bg-emerald-500 flex items-center justify-center text-zinc-950 font-black text-xl">S</div>
          <div>
            <div className="text-white font-black text-xl tracking-tight">Stride Admin</div>
            <div className="text-emerald-400 text-xs font-bold tracking-widest uppercase">Live economy console</div>
          </div>
        </div>

        <div className="bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center gap-2 text-emerald-400 mb-4">
            {emailOk ? <ShieldCheck className="size-4" /> : <Mail className="size-4" />}
            <h1 className="text-white text-lg font-bold">
              {emailOk ? "Sign in to the console" : "Admin sign-in"}
            </h1>
          </div>
          {!emailOk ? (
            <>
              <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
                Enter your admin email. Only allowlisted emails can continue.
              </p>
              <div className="space-y-3">
                <div>
                  <Label className="text-zinc-300 text-xs font-bold uppercase tracking-wider">Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submitEmail()}
                    placeholder="you@example.com"
                    className="bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 mt-1.5"
                    autoFocus
                  />
                </div>
                {error && (
                  <div className="text-red-400 text-xs bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">{error}</div>
                )}
                <Button
                  onClick={submitEmail}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold h-11"
                >
                  Continue
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-zinc-400 text-sm mb-2 leading-relaxed">
                Signed in as <strong className="text-white">{email}</strong>.
              </p>
              <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
                Paste your Supabase <strong className="text-white">service_role</strong> key. It stays in this browser only — never sent anywhere else. Editing any catalogue row writes directly to the live database.
              </p>
              <div className="space-y-3">
                <div>
                  <Label className="text-zinc-300 text-xs font-bold uppercase tracking-wider">Service role key</Label>
                  <Input
                    type="password"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submit()}
                    placeholder="eyJ..."
                    className="bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 font-mono mt-1.5"
                    autoFocus
                  />
                </div>
                {error && (
                  <div className="text-red-400 text-xs bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">{error}</div>
                )}
                <Button
                  onClick={submit}
                  disabled={busy}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold h-11"
                >
                  {busy ? "Verifying…" : "Unlock console"}
                  <Lock className="size-4 ml-2" />
                </Button>
                <button
                  type="button"
                  onClick={() => { localStorage.removeItem(EMAIL_STORAGE_KEY); setEmailOk(false); setError(""); }}
                  className="w-full text-xs text-zinc-500 hover:text-zinc-300 mt-1"
                >
                  Use a different email
                </button>
              </div>
            </>
          )}
          <a
            href="https://supabase.com/dashboard/project/_/settings/api"
            target="_blank"
            rel="noreferrer"
            className="mt-5 text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1.5"
          >
            Where do I find my service key? <ExternalLink className="size-3" />
          </a>
        </div>

        <div className="text-center mt-6 text-xs text-zinc-600">
          Project: <code className="text-zinc-400">{SUPABASE_PROJECT_URL.replace("https://", "").split(".")[0]}</code>
        </div>
      </div>
    </div>
  );
}
