import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, Plus, Trash2 } from "lucide-react";

import { getSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ConfigRow } from "@/lib/types";

const KNOWN: { key: string; label: string; hint: string }[] = [
  { key: "steps_per_city_vote", label: "Steps per city vote", hint: "How many steps mint 1 vote toward home city" },
  { key: "share_city_vote_bonus", label: "Vote bonus / share", hint: "Bonus votes for each share" },
  { key: "referral_city_vote_bonus", label: "Vote bonus / referral", hint: "Votes credited when a referred friend signs up" },
  { key: "default_exchange_rate", label: "Default exchange rate", hint: "Stride coins → brand coin (when not overridden)" },
  { key: "claim_radius_meters", label: "Claim radius (meters)", hint: "How close a player must be to claim a vault" },
  { key: "plus_monthly_price_gbp", label: "Plus monthly price (£)", hint: "Stride+ monthly subscription price" },
  { key: "plus_yearly_price_gbp", label: "Plus yearly price (£)", hint: "Stride+ annual subscription price" },
  { key: "plus_trial_days", label: "Plus trial days", hint: "Free-trial length for new Plus subscribers" },
];

export function ConfigPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["config"],
    queryFn: async (): Promise<ConfigRow[]> => {
      const supa = getSupabase();
      const { data, error } = await supa.from("app_config").select("*").order("key");
      if (error) throw error;
      return (data ?? []) as ConfigRow[];
    },
  });

  const [edits, setEdits] = useState<Record<string, string>>({});
  const [newKey, setNewKey] = useState<string>("");
  const [newValue, setNewValue] = useState<string>("");

  const upsert = useMutation({
    mutationFn: async (rows: { key: string; value: unknown }[]) => {
      const supa = getSupabase();
      const payload = rows.map((r) => ({ key: r.key, value: r.value, updated_at: new Date().toISOString() }));
      const { error } = await supa.from("app_config").upsert(payload, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Config updated — live in apps");
      qc.invalidateQueries({ queryKey: ["config"] });
      setEdits({});
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (key: string) => {
      const supa = getSupabase();
      const { error } = await supa.from("app_config").delete().eq("key", key);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Config key deleted");
      qc.invalidateQueries({ queryKey: ["config"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const parseValue = (raw: string): unknown => {
    const trimmed = raw.trim();
    if (trimmed === "") return null;
    try { return JSON.parse(trimmed); } catch { return trimmed; }
  };

  const stringifyValue = (v: unknown): string => {
    if (typeof v === "string") return v;
    return JSON.stringify(v);
  };

  const rows = data ?? [];
  const dirty = Object.keys(edits).length > 0;

  const knownEntries = KNOWN.map((k) => {
    const row = rows.find((r) => r.key === k.key);
    return { ...k, value: row?.value };
  });
  const customRows = rows.filter((r) => !KNOWN.some((k) => k.key === r.key));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-zinc-500 text-sm">
          Global tunables. Numeric keys are stored as JSON; you can also enter strings, booleans, or objects.
        </p>
        {dirty && (
          <Button
            onClick={() =>
              upsert.mutate(
                Object.entries(edits).map(([key, raw]) => ({ key, value: parseValue(raw) }))
              )
            }
            disabled={upsert.isPending}
            className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold"
          >
            <Save className="size-4 mr-1.5" />
            {upsert.isPending ? "Saving…" : `Save ${Object.keys(edits).length} change(s)`}
          </Button>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-900 bg-zinc-950/30 divide-y divide-zinc-900">
        {isLoading && <div className="p-6 text-zinc-600">Loading…</div>}
        {knownEntries.map((k) => (
          <div key={k.key} className="p-5 grid grid-cols-12 gap-4 items-center">
            <div className="col-span-5">
              <div className="font-semibold text-sm">{k.label}</div>
              <div className="text-xs text-zinc-500 mt-0.5">{k.hint}</div>
              <code className="text-[10px] text-zinc-600 font-mono">{k.key}</code>
            </div>
            <div className="col-span-7">
              <Input
                value={edits[k.key] ?? stringifyValue(k.value)}
                onChange={(e) => setEdits({ ...edits, [k.key]: e.target.value })}
                placeholder="value (number, string, or JSON)"
                className="bg-zinc-950 border-zinc-800 font-mono"
              />
            </div>
          </div>
        ))}

        {customRows.map((r) => (
          <div key={r.key} className="p-5 grid grid-cols-12 gap-4 items-center">
            <div className="col-span-5">
              <div className="font-semibold text-sm">{r.key}</div>
              <div className="text-xs text-zinc-500 mt-0.5">Custom key</div>
            </div>
            <div className="col-span-6">
              <Input
                value={edits[r.key] ?? stringifyValue(r.value)}
                onChange={(e) => setEdits({ ...edits, [r.key]: e.target.value })}
                className="bg-zinc-950 border-zinc-800 font-mono"
              />
            </div>
            <div className="col-span-1 text-right">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => confirm(`Delete ${r.key}?`) && remove.mutate(r.key)}
                className="text-zinc-500 hover:text-red-400"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-zinc-900 bg-zinc-950/30 p-5">
        <div className="font-semibold text-sm mb-3 flex items-center gap-2">
          <Plus className="size-4" />
          Add custom key
        </div>
        <div className="grid grid-cols-12 gap-3 items-start">
          <Input
            placeholder="key (e.g. max_daily_shares)"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            className="col-span-5 bg-zinc-950 border-zinc-800 font-mono"
          />
          <Textarea
            placeholder="value (3, &quot;hello&quot;, true, {&quot;k&quot;:1}…)"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            className="col-span-6 bg-zinc-950 border-zinc-800 font-mono min-h-[40px]"
            rows={1}
          />
          <Button
            onClick={() => {
              if (!newKey.trim()) return;
              upsert.mutate([{ key: newKey.trim(), value: parseValue(newValue) }]);
              setNewKey("");
              setNewValue("");
            }}
            className="col-span-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold"
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
