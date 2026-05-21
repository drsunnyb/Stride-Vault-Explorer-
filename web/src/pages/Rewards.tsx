import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { getSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/DataTable";
import { RowEditor, Field } from "@/components/RowEditor";
import type { RewardRow, BrandRow } from "@/lib/types";

const EMPTY: RewardRow = {
  id: "",
  brand: null,
  title: "",
  subtitle: "",
  badge: "",
  coin_cost: 0,
  brand_cost: null,
  redeem_at: "",
  emoji: "🎁",
  value_gbp: null,
  in_store_only: false,
  active: true,
  sort_order: 0,
};

export function RewardsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["rewards"],
    queryFn: async (): Promise<RewardRow[]> => {
      const supa = getSupabase();
      const { data, error } = await supa.from("rewards").select("*").order("sort_order");
      if (error) throw error;
      return (data ?? []) as RewardRow[];
    },
  });
  const { data: brands } = useQuery({
    queryKey: ["brands"],
    queryFn: async (): Promise<BrandRow[]> => {
      const supa = getSupabase();
      const { data } = await supa.from("brands").select("*").order("sort_order");
      return (data ?? []) as BrandRow[];
    },
  });

  const [editing, setEditing] = useState<RewardRow | null>(null);
  const [isNew, setIsNew] = useState<boolean>(false);

  const save = useMutation({
    mutationFn: async (row: RewardRow) => {
      const supa = getSupabase();
      const { error } = await supa.from("rewards").upsert(
        { ...row, updated_at: new Date().toISOString() },
        { onConflict: "id" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reward saved — live in apps");
      qc.invalidateQueries({ queryKey: ["rewards"] });
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const supa = getSupabase();
      const { error } = await supa.from("rewards").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reward deleted");
      qc.invalidateQueries({ queryKey: ["rewards"] });
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-zinc-500 text-sm">
          Rewards are what players buy with coins. Universal rewards use Stride Coins; brand rewards use that brand's coins.
        </p>
        <Button
          onClick={() => {
            setIsNew(true);
            setEditing({ ...EMPTY, sort_order: (data?.length ?? 0) * 10 });
          }}
          className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold"
        >
          <Plus className="size-4 mr-1" /> New reward
        </Button>
      </div>

      <DataTable
        rows={data}
        loading={isLoading}
        rowKey={(r) => r.id}
        empty="No rewards yet."
        onRowClick={(r) => {
          setIsNew(false);
          setEditing(r);
        }}
        columns={[
          {
            key: "title",
            header: "Reward",
            render: (r) => (
              <div className="flex items-center gap-3">
                <span className="text-2xl">{r.emoji}</span>
                <div>
                  <div className="font-semibold">{r.title}</div>
                  <div className="text-xs text-zinc-500 truncate max-w-md">{r.subtitle}</div>
                </div>
              </div>
            ),
          },
          {
            key: "brand",
            header: "Brand",
            render: (r) => (r.brand ? <span className="text-xs font-bold uppercase">{r.brand}</span> : <span className="text-zinc-600">—</span>),
          },
          {
            key: "cost",
            header: "Cost",
            align: "right",
            render: (r) => (
              <span className="font-mono">
                {r.brand_cost != null ? `${r.brand_cost} ${r.brand}` : `${r.coin_cost} 🟡`}
              </span>
            ),
          },
          { key: "value_gbp", header: "£ value", align: "right", render: (r) => (r.value_gbp ? `£${r.value_gbp}` : "—") },
          {
            key: "active",
            header: "Status",
            render: (r) =>
              r.active ? (
                <span className="text-xs font-bold text-emerald-400 bg-emerald-950/40 px-2 py-1 rounded">LIVE</span>
              ) : (
                <span className="text-xs font-bold text-zinc-500 bg-zinc-900 px-2 py-1 rounded">HIDDEN</span>
              ),
          },
        ]}
      />

      <RowEditor
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        title={isNew ? "New reward" : editing?.title ?? ""}
        saving={save.isPending}
        isNew={isNew}
        onSave={() => editing && save.mutate(editing)}
        onDelete={() => editing && confirm(`Delete "${editing.title}"?`) && remove.mutate(editing.id)}
      >
        {editing && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="ID (slug)">
              <Input disabled={!isNew} value={editing.id} onChange={(e) => setEditing({ ...editing, id: e.target.value })} />
            </Field>
            <Field label="Title">
              <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            </Field>
            <Field label="Subtitle">
              <Input value={editing.subtitle ?? ""} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} />
            </Field>
            <Field label="Badge" hint="e.g. £5 OFF, FREE, VIP">
              <Input value={editing.badge ?? ""} onChange={(e) => setEditing({ ...editing, badge: e.target.value })} />
            </Field>
            <Field label="Emoji">
              <Input value={editing.emoji ?? ""} onChange={(e) => setEditing({ ...editing, emoji: e.target.value })} />
            </Field>
            <Field label="Brand" hint="Leave blank for universal Stride reward">
              <Select
                value={editing.brand ?? "__none__"}
                onValueChange={(v) => setEditing({ ...editing, brand: v === "__none__" ? null : v })}
              >
                <SelectTrigger className="bg-zinc-950 border-zinc-800">
                  <SelectValue placeholder="Universal" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800">
                  <SelectItem value="__none__">Universal (Stride coins)</SelectItem>
                  {brands?.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Stride coin cost" hint="0 if brand-locked">
              <Input
                type="number"
                value={editing.coin_cost}
                onChange={(e) => setEditing({ ...editing, coin_cost: parseInt(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Brand coin cost">
              <Input
                type="number"
                value={editing.brand_cost ?? 0}
                onChange={(e) => setEditing({ ...editing, brand_cost: e.target.value ? parseInt(e.target.value) : null })}
              />
            </Field>
            <Field label="Value (£)">
              <Input
                type="number"
                value={editing.value_gbp ?? ""}
                onChange={(e) => setEditing({ ...editing, value_gbp: e.target.value ? parseInt(e.target.value) : null })}
              />
            </Field>
            <Field label="Redeem at" hint="Online · Niketown London / etc.">
              <Input value={editing.redeem_at ?? ""} onChange={(e) => setEditing({ ...editing, redeem_at: e.target.value })} />
            </Field>
            <Field label="Sort order">
              <Input
                type="number"
                value={editing.sort_order}
                onChange={(e) => setEditing({ ...editing, sort_order: parseInt(e.target.value) || 0 })}
              />
            </Field>
            <Field label="In-store only">
              <Switch
                checked={editing.in_store_only}
                onCheckedChange={(v) => setEditing({ ...editing, in_store_only: v })}
              />
            </Field>
            <Field label="Active">
              <Switch checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} />
            </Field>
            <div className="col-span-2">
              <Field label="Marketing notes (subtitle)">
                <Textarea
                  value={editing.subtitle ?? ""}
                  onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })}
                  rows={2}
                />
              </Field>
            </div>
          </div>
        )}
      </RowEditor>
    </div>
  );
}
