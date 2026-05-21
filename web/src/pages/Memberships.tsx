import { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, X, Crown, Sparkles } from "lucide-react";

import { getSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Field } from "@/components/RowEditor";
import type { ConfigRow } from "@/lib/types";

/**
 * Memberships — controls the paid "Stride+ for waitlist players" perks.
 *
 * Stored as one JSON-valued row in `app_config`:
 *
 *   waitlist_membership = {
 *     enabled: boolean,
 *     monthly_gbp: number,
 *     annual_gbp: number,
 *     trial_days: number,
 *     vote_multiplier: number,        // boosts city votes from steps
 *     step_value_multiplier: number,  // boosts coins per step / vault payouts
 *     weekly_free_votes: number,
 *     headline: string,
 *     benefits: string[],
 *   }
 *
 * The live mobile apps read this row on launch + every 60s and apply the
 * multipliers when a player is on the waitlist (i.e. their home city != live).
 */

interface WaitlistMembership {
  enabled: boolean;
  monthly_gbp: number;
  annual_gbp: number;
  trial_days: number;
  vote_multiplier: number;
  step_value_multiplier: number;
  weekly_free_votes: number;
  headline: string;
  benefits: string[];
}

const KEY = "waitlist_membership";

const DEFAULTS: WaitlistMembership = {
  enabled: true,
  monthly_gbp: 4.99,
  annual_gbp: 39,
  trial_days: 7,
  vote_multiplier: 3,
  step_value_multiplier: 1.5,
  weekly_free_votes: 25,
  headline: "Get to #1 faster. Unlock your city sooner.",
  benefits: [
    "3× city votes from every step",
    "1.5× coin payout everywhere — even before your city launches",
    "+25 free votes every week",
    "Early access to your city's vaults the moment it goes live",
    "Plus all standard Stride+ perks",
  ],
};

export function MembershipsPage() {
  const qc = useQueryClient();

  const { data: rows, isLoading } = useQuery({
    queryKey: ["app_config", "membership"],
    queryFn: async (): Promise<ConfigRow[]> => {
      const supa = getSupabase();
      const { data, error } = await supa.from("app_config").select("*").eq("key", KEY);
      if (error) throw error;
      return (data ?? []) as ConfigRow[];
    },
  });

  const live = useMemo<WaitlistMembership | null>(() => {
    const r = rows?.find((x) => x.key === KEY);
    return (r?.value as WaitlistMembership | undefined) ?? null;
  }, [rows]);

  const [draft, setDraft] = useState<WaitlistMembership>(DEFAULTS);
  const [benefitsText, setBenefitsText] = useState<string>(DEFAULTS.benefits.join("\n"));

  useEffect(() => {
    if (live) {
      setDraft({ ...DEFAULTS, ...live });
      setBenefitsText((live.benefits ?? DEFAULTS.benefits).join("\n"));
    }
  }, [live]);

  const save = useMutation({
    mutationFn: async (value: WaitlistMembership) => {
      const supa = getSupabase();
      const { error } = await supa
        .from("app_config")
        .upsert({ key: KEY, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Membership perks saved — live in apps");
      qc.invalidateQueries({ queryKey: ["app_config", "membership"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clear = useMutation({
    mutationFn: async () => {
      const supa = getSupabase();
      const { error } = await supa.from("app_config").delete().eq("key", KEY);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reset — apps fall back to default perks");
      qc.invalidateQueries({ queryKey: ["app_config", "membership"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <p className="text-zinc-500 text-sm">
        Memberships unlock for players whose home city is on the waitlist. They keep walking and minting votes, but
        Stride+ lets them rally harder so their city launches sooner. Pricing and multipliers below go live in the apps
        within ~60s.
      </p>

      <div className="rounded-2xl border border-zinc-900 bg-zinc-950/40 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-900 flex items-center gap-3">
          <Crown className={`size-5 ${draft.enabled ? "text-amber-400" : "text-zinc-600"}`} />
          <div className="flex-1">
            <div className="font-bold">Stride+ for waitlist cities</div>
            <div className="text-xs text-zinc-500">Pricing, perks & multipliers</div>
          </div>
          {live && draft.enabled && (
            <span className="text-xs font-bold text-emerald-300 bg-emerald-950/40 px-2 py-1 rounded">LIVE</span>
          )}
        </div>

        <div className="p-5 grid grid-cols-2 gap-4">
          <Field label="Enabled" hint="Off hides the paywall in waitlist cities entirely.">
            <Switch checked={draft.enabled} onCheckedChange={(v) => setDraft({ ...draft, enabled: v })} />
          </Field>

          <Field label="Trial days" hint="Free-trial length before first charge">
            <Input
              type="number"
              min={0}
              max={30}
              value={draft.trial_days}
              onChange={(e) => setDraft({ ...draft, trial_days: parseInt(e.target.value) || 0 })}
            />
          </Field>

          <Field label="Monthly price (£)" hint="Shown on the paywall + used as StoreKit display price">
            <Input
              type="number"
              step="0.01"
              min={0}
              value={draft.monthly_gbp}
              onChange={(e) => setDraft({ ...draft, monthly_gbp: parseFloat(e.target.value) || 0 })}
            />
          </Field>

          <Field label="Annual price (£)">
            <Input
              type="number"
              step="0.01"
              min={0}
              value={draft.annual_gbp}
              onChange={(e) => setDraft({ ...draft, annual_gbp: parseFloat(e.target.value) || 0 })}
            />
          </Field>

          <Field label="Vote multiplier" hint="City votes minted per step are multiplied by this for members">
            <Input
              type="number"
              min={1}
              max={10}
              step="0.1"
              value={draft.vote_multiplier}
              onChange={(e) => setDraft({ ...draft, vote_multiplier: parseFloat(e.target.value) || 1 })}
            />
          </Field>

          <Field label="Step value multiplier" hint="Coin payout on every claim is multiplied by this">
            <Input
              type="number"
              min={1}
              max={5}
              step="0.05"
              value={draft.step_value_multiplier}
              onChange={(e) => setDraft({ ...draft, step_value_multiplier: parseFloat(e.target.value) || 1 })}
            />
          </Field>

          <Field label="Weekly free votes" hint="Auto-deposited each Monday">
            <Input
              type="number"
              min={0}
              max={500}
              value={draft.weekly_free_votes}
              onChange={(e) => setDraft({ ...draft, weekly_free_votes: parseInt(e.target.value) || 0 })}
            />
          </Field>

          <div className="col-span-2">
            <Field label="Paywall headline">
              <Input value={draft.headline} onChange={(e) => setDraft({ ...draft, headline: e.target.value })} />
            </Field>
          </div>

          <div className="col-span-2">
            <Field label="Benefits" hint="One per line — shown as checkmarked list on the paywall.">
              <textarea
                value={benefitsText}
                onChange={(e) => setBenefitsText(e.target.value)}
                rows={6}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-sm font-mono text-zinc-100 focus:outline-none focus:border-emerald-500"
              />
            </Field>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-zinc-900 flex items-center gap-2 bg-zinc-950/60">
          {live && (
            <Button
              variant="ghost"
              className="text-red-400 hover:text-red-300 hover:bg-red-950/30"
              onClick={() => confirm("Reset to defaults? Apps fall back to built-in pricing.") && clear.mutate()}
            >
              <X className="size-4 mr-1.5" /> Reset
            </Button>
          )}
          <div className="ml-auto" />
          <Button
            onClick={() => {
              const benefits = benefitsText
                .split(/\r?\n/)
                .map((s) => s.trim())
                .filter(Boolean);
              save.mutate({ ...draft, benefits });
            }}
            disabled={isLoading || save.isPending}
            className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold"
          >
            <Save className="size-4 mr-1.5" />
            {save.isPending ? "Saving…" : live ? "Update membership" : "Publish membership"}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-900/40 bg-amber-950/10 p-5 text-sm">
        <div className="flex items-center gap-2 font-bold text-amber-300">
          <Sparkles className="size-4" />
          How it appears in the apps
        </div>
        <ul className="mt-2 text-zinc-400 space-y-1 list-disc list-inside">
          <li>Players outside London see the paywall on the Map tab + Profile.</li>
          <li>Monthly / annual options with the prices set above (annual savings auto-calculated).</li>
          <li>Vote and coin multipliers apply automatically while the subscription is active.</li>
          <li>Disabling the switch above instantly hides the paywall everywhere.</li>
        </ul>
      </div>
    </div>
  );
}
