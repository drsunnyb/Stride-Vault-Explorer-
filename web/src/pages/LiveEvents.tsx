import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Flame, Zap, Save, X, Plus, Clock, Bell } from "lucide-react";

import { getSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Field } from "@/components/RowEditor";
import { sendPush } from "@/lib/push";
import type { ConfigRow } from "@/lib/types";

/**
 * Live Events — admin can push a "Hot Vaults" or "Power Hour" override that
 * supersedes the apps' deterministic schedule until the chosen end time.
 *
 * Both are stored as JSON-valued rows in `app_config` so no schema migration
 * is needed. The mobile apps already read this table; we just teach them the
 * two new keys.
 *
 *  - `live_hot_vaults` = { vaultIds: string[], multiplier: number, endsAt: ms, note?: string }
 *  - `live_power_hour` = { multiplier: number, startsAt: ms, endsAt: ms, note?: string }
 */

interface HotVaultsOverride {
  vaultIds: string[];
  multiplier: number;
  endsAt: number;
  note?: string;
}

interface PowerHourOverride {
  multiplier: number;
  startsAt: number;
  endsAt: number;
  note?: string;
}

const KEY_HOT = "live_hot_vaults";
const KEY_POWER = "live_power_hour";

function toIsoLocal(ms: number | undefined): string {
  if (!ms) return "";
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromIsoLocal(s: string): number {
  if (!s) return 0;
  return new Date(s).getTime();
}

function humanRemaining(toMs: number): string {
  const diff = toMs - Date.now();
  if (diff <= 0) return "ended";
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m}m left`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m left`;
  return `${Math.floor(h / 24)}d ${h % 24}h left`;
}

export function LiveEventsPage() {
  const qc = useQueryClient();

  const { data: rows, isLoading } = useQuery({
    queryKey: ["app_config", "live"],
    queryFn: async (): Promise<ConfigRow[]> => {
      const supa = getSupabase();
      const { data, error } = await supa
        .from("app_config")
        .select("*")
        .in("key", [KEY_HOT, KEY_POWER]);
      if (error) throw error;
      return (data ?? []) as ConfigRow[];
    },
    refetchInterval: 30_000,
  });

  const liveHot = useMemo<HotVaultsOverride | null>(() => {
    const r = rows?.find((x) => x.key === KEY_HOT);
    return (r?.value as HotVaultsOverride | undefined) ?? null;
  }, [rows]);

  const livePower = useMemo<PowerHourOverride | null>(() => {
    const r = rows?.find((x) => x.key === KEY_POWER);
    return (r?.value as PowerHourOverride | undefined) ?? null;
  }, [rows]);

  const upsert = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      const supa = getSupabase();
      const { error } = await supa
        .from("app_config")
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(`${vars.key} updated — live`);
      qc.invalidateQueries({ queryKey: ["app_config", "live"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clear = useMutation({
    mutationFn: async (key: string) => {
      const supa = getSupabase();
      const { error } = await supa.from("app_config").delete().eq("key", key);
      if (error) throw error;
    },
    onSuccess: (_d, key) => {
      toast.success(`${key} cleared — back to default schedule`);
      qc.invalidateQueries({ queryKey: ["app_config", "live"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <p className="text-zinc-500 text-sm">
        Override the apps' deterministic schedule with a live drop. Players see your overrides immediately on next sync
        (~30s). Clearing a key returns the apps to their automatic schedule.
      </p>

      <HotVaultsCard
        liveHot={liveHot}
        loading={isLoading}
        saving={upsert.isPending}
        onSave={(v) => upsert.mutate({ key: KEY_HOT, value: v })}
        onClear={() => clear.mutate(KEY_HOT)}
      />

      <PowerHourCard
        livePower={livePower}
        loading={isLoading}
        saving={upsert.isPending}
        onSave={(v) => upsert.mutate({ key: KEY_POWER, value: v })}
        onClear={() => clear.mutate(KEY_POWER)}
      />
    </div>
  );
}

// ── Hot Vaults card ─────────────────────────────────────────────────────────

function HotVaultsCard({
  liveHot,
  loading,
  saving,
  onSave,
  onClear,
}: {
  liveHot: HotVaultsOverride | null;
  loading: boolean;
  saving: boolean;
  onSave: (v: HotVaultsOverride) => void;
  onClear: () => void;
}) {
  const [vaultIdsText, setVaultIdsText] = useState<string>("");
  const [multiplier, setMultiplier] = useState<number>(5);
  const [endsAtLocal, setEndsAtLocal] = useState<string>(() => {
    // Default to "tonight 6am local" (next hot-vault rollover).
    const t = new Date();
    t.setHours(t.getHours() + 24);
    return toIsoLocal(t.getTime());
  });
  const [note, setNote] = useState<string>("");
  const [notify, setNotify] = useState<boolean>(true);

  useEffect(() => {
    if (liveHot) {
      setVaultIdsText(liveHot.vaultIds.join("\n"));
      setMultiplier(liveHot.multiplier);
      setEndsAtLocal(toIsoLocal(liveHot.endsAt));
      setNote(liveHot.note ?? "");
    }
  }, [liveHot]);

  const active = !!liveHot && liveHot.endsAt > Date.now();

  return (
    <div className="rounded-2xl border border-zinc-900 bg-zinc-950/40 overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-900 flex items-center gap-3">
        <Flame className={`size-5 ${active ? "text-orange-400" : "text-zinc-600"}`} />
        <div className="flex-1">
          <div className="font-bold">Hot Vaults override</div>
          <div className="text-xs text-zinc-500">
            Pinned vault IDs become Hot until the end time. Stacks the chosen multiplier on every claim there.
          </div>
        </div>
        {active && (
          <span className="text-xs font-bold text-orange-300 bg-orange-950/40 px-2 py-1 rounded">
            LIVE · {humanRemaining(liveHot!.endsAt)}
          </span>
        )}
      </div>

      <div className="p-5 grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Field
            label="Vault IDs"
            hint="One per line. Use the exact vault slug (e.g. big-ben, tower-bridge, nike-town-london, proc-hackney-0)."
          >
            <textarea
              value={vaultIdsText}
              onChange={(e) => setVaultIdsText(e.target.value)}
              rows={5}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-sm font-mono text-zinc-100 focus:outline-none focus:border-emerald-500"
              placeholder="big-ben&#10;tower-bridge&#10;nike-town-london"
            />
          </Field>
        </div>

        <Field label="Multiplier" hint="Coin payout multiplier applied on a hot-vault claim (default 5×)">
          <Input
            type="number"
            min={1}
            max={20}
            step={0.5}
            value={multiplier}
            onChange={(e) => setMultiplier(parseFloat(e.target.value) || 5)}
          />
        </Field>

        <Field label="Ends at" hint="Local time. Override stops applying after this moment.">
          <Input type="datetime-local" value={endsAtLocal} onChange={(e) => setEndsAtLocal(e.target.value)} />
        </Field>

        <div className="col-span-2">
          <Field label="Internal note (optional)" hint="Why was this pushed? Helps the team audit overrides.">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Black Friday Nike drop" />
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="Notify everyone" hint="Sends a push + inbox alert to every registered device when you save.">
            <div className="flex items-center gap-3">
              <Switch checked={notify} onCheckedChange={setNotify} />
              <Bell className={`size-4 ${notify ? "text-orange-400" : "text-zinc-600"}`} />
              <span className="text-xs text-zinc-500">
                {notify ? `“🔥 ${multiplier}× Hot Vaults are live” will hit every player's home screen.` : "Stays silent — only visible to players who open the app."}
              </span>
            </div>
          </Field>
        </div>
      </div>

      <div className="px-5 py-4 border-t border-zinc-900 flex items-center gap-2 bg-zinc-950/60">
        {active && (
          <Button
            variant="ghost"
            className="text-red-400 hover:text-red-300 hover:bg-red-950/30"
            onClick={() => confirm("Clear the hot-vaults override?") && onClear()}
          >
            <X className="size-4 mr-1.5" /> Clear override
          </Button>
        )}
        <div className="ml-auto" />
        <Button
          onClick={async () => {
            const vaultIds = vaultIdsText
              .split(/\r?\n|,/)
              .map((s) => s.trim())
              .filter(Boolean);
            const endsAt = fromIsoLocal(endsAtLocal);
            if (vaultIds.length === 0) return toast.error("Add at least one vault ID");
            if (!endsAt || endsAt < Date.now()) return toast.error("End time must be in the future");
            onSave({ vaultIds, multiplier, endsAt, note: note.trim() || undefined });
            if (notify) {
              try {
                const res = await sendPush({
                  title: `🔥 ${vaultIds.length} Hot Vaults are live`,
                  body: `Every claim pays ${multiplier}× until ${new Date(endsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} — get walking.`,
                  audience: "all",
                  data: { kind: "hot", vaultIds, multiplier, endsAt },
                  sentBy: "auto:hot-vault",
                });
                toast.message(`Push fired · ${res.ok}/${res.expoTokens} delivered`);
              } catch (e) {
                toast.error(`Push failed: ${(e as Error).message}`);
              }
            }
          }}
          disabled={loading || saving}
          className="bg-orange-500 hover:bg-orange-400 text-zinc-950 font-bold"
        >
          <Save className="size-4 mr-1.5" />
          {saving ? "Saving…" : active ? "Update override" : "Push hot vaults"}
        </Button>
      </div>
    </div>
  );
}

// ── Power Hour card ─────────────────────────────────────────────────────────

function PowerHourCard({
  livePower,
  loading,
  saving,
  onSave,
  onClear,
}: {
  livePower: PowerHourOverride | null;
  loading: boolean;
  saving: boolean;
  onSave: (v: PowerHourOverride) => void;
  onClear: () => void;
}) {
  const [multiplier, setMultiplier] = useState<number>(3);
  const [startsAtLocal, setStartsAtLocal] = useState<string>(() => toIsoLocal(Date.now()));
  const [endsAtLocal, setEndsAtLocal] = useState<string>(() => toIsoLocal(Date.now() + 60 * 60_000));
  const [note, setNote] = useState<string>("");
  const [startNow, setStartNow] = useState<boolean>(true);
  const [notify, setNotify] = useState<boolean>(true);

  useEffect(() => {
    if (livePower) {
      setMultiplier(livePower.multiplier);
      setStartsAtLocal(toIsoLocal(livePower.startsAt));
      setEndsAtLocal(toIsoLocal(livePower.endsAt));
      setNote(livePower.note ?? "");
      setStartNow(false);
    }
  }, [livePower]);

  const active = !!livePower && livePower.endsAt > Date.now();
  const upcoming = !!livePower && livePower.startsAt > Date.now();

  return (
    <div className="rounded-2xl border border-zinc-900 bg-zinc-950/40 overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-900 flex items-center gap-3">
        <Zap className={`size-5 ${active ? "text-amber-400" : "text-zinc-600"}`} />
        <div className="flex-1">
          <div className="font-bold">Power Hour override</div>
          <div className="text-xs text-zinc-500">
            Boost every vault claim with a global multiplier until the end time. Stacks on tier + streak.
          </div>
        </div>
        {active && (
          <span className="text-xs font-bold text-amber-300 bg-amber-950/40 px-2 py-1 rounded">
            LIVE · {livePower!.multiplier}× · {humanRemaining(livePower!.endsAt)}
          </span>
        )}
        {!active && upcoming && (
          <span className="text-xs font-bold text-sky-300 bg-sky-950/40 px-2 py-1 rounded flex items-center gap-1">
            <Clock className="size-3" /> SCHEDULED
          </span>
        )}
      </div>

      <div className="p-5 grid grid-cols-2 gap-4">
        <Field label="Multiplier" hint="2× / 3× / up to 5×. Stacks with streak + tier multipliers.">
          <Input
            type="number"
            min={1.5}
            max={5}
            step={0.5}
            value={multiplier}
            onChange={(e) => setMultiplier(parseFloat(e.target.value) || 3)}
          />
        </Field>

        <Field label="Start now" hint="Off to schedule for a future time.">
          <Switch checked={startNow} onCheckedChange={setStartNow} />
        </Field>

        {!startNow && (
          <Field label="Starts at" hint="Local time">
            <Input type="datetime-local" value={startsAtLocal} onChange={(e) => setStartsAtLocal(e.target.value)} />
          </Field>
        )}

        <Field label="Ends at" hint="Override stops here.">
          <Input type="datetime-local" value={endsAtLocal} onChange={(e) => setEndsAtLocal(e.target.value)} />
        </Field>

        <div className="col-span-2">
          <Field label="Internal note (optional)">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Sunday rally push" />
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="Notify everyone" hint="Sends a push + inbox alert to every registered device when you save.">
            <div className="flex items-center gap-3">
              <Switch checked={notify} onCheckedChange={setNotify} />
              <Bell className={`size-4 ${notify ? "text-amber-400" : "text-zinc-600"}`} />
            </div>
          </Field>
        </div>
      </div>

      <div className="px-5 py-4 border-t border-zinc-900 flex items-center gap-2 bg-zinc-950/60">
        {(active || upcoming) && (
          <Button
            variant="ghost"
            className="text-red-400 hover:text-red-300 hover:bg-red-950/30"
            onClick={() => confirm("Clear the power-hour override?") && onClear()}
          >
            <X className="size-4 mr-1.5" /> Clear override
          </Button>
        )}
        <div className="ml-auto" />
        <Button
          onClick={async () => {
            const startsAt = startNow ? Date.now() : fromIsoLocal(startsAtLocal);
            const endsAt = fromIsoLocal(endsAtLocal);
            if (!endsAt || endsAt <= startsAt) return toast.error("End time must be after start");
            if (endsAt < Date.now()) return toast.error("End time must be in the future");
            onSave({ multiplier, startsAt, endsAt, note: note.trim() || undefined });
            if (notify) {
              const lead = startNow ? "is live now" : `starts ${new Date(startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
              try {
                const res = await sendPush({
                  title: `⚡ Power Hour ${lead}`,
                  body: `Every vault pays ${multiplier}× until ${new Date(endsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`,
                  audience: "all",
                  data: { kind: "power", startsAt, endsAt, multiplier },
                  sentBy: "auto:power-hour",
                });
                toast.message(`Push fired · ${res.ok}/${res.expoTokens} delivered`);
              } catch (e) {
                toast.error(`Push failed: ${(e as Error).message}`);
              }
            }
          }}
          disabled={loading || saving}
          className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold"
        >
          <Plus className="size-4 mr-1.5" />
          {saving ? "Saving…" : active || upcoming ? "Update power hour" : "Start power hour"}
        </Button>
      </div>
    </div>
  );
}
