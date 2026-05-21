import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { getSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { DataTable } from "@/components/DataTable";
import { RowEditor, Field } from "@/components/RowEditor";
import type { BrandRow } from "@/lib/types";

const EMPTY: BrandRow = {
  id: "",
  name: "",
  short: "",
  coin_name: "",
  color: "#FA5400",
  color_bright: "#FF7A2C",
  color_dim: "#8A2D00",
  tagline: "",
  mark: "",
  inverted_text: false,
  exchange_rate: 5,
  daily_cap: 200,
  active: true,
  sort_order: 0,
};

async function listBrands(): Promise<BrandRow[]> {
  const supa = getSupabase();
  const { data, error } = await supa.from("brands").select("*").order("sort_order");
  if (error) throw error;
  return (data ?? []) as BrandRow[];
}

export function BrandsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["brands"], queryFn: listBrands });

  const [editing, setEditing] = useState<BrandRow | null>(null);
  const [isNew, setIsNew] = useState<boolean>(false);

  const save = useMutation({
    mutationFn: async (row: BrandRow) => {
      const supa = getSupabase();
      const payload = { ...row, updated_at: new Date().toISOString() };
      const { error } = await supa.from("brands").upsert(payload, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Brand saved — live in apps");
      qc.invalidateQueries({ queryKey: ["brands"] });
      qc.invalidateQueries({ queryKey: ["dashboard-counts"] });
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const supa = getSupabase();
      const { error } = await supa.from("brands").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Brand deleted");
      qc.invalidateQueries({ queryKey: ["brands"] });
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-zinc-500 text-sm">
            Partner brands appear in the wallet, vaults, and rewards catalogue. Edit colours, exchange rate, and daily cap.
          </p>
        </div>
        <Button
          onClick={() => {
            setIsNew(true);
            setEditing({ ...EMPTY, sort_order: (data?.length ?? 0) * 10 });
          }}
          className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold"
        >
          <Plus className="size-4 mr-1" /> New brand
        </Button>
      </div>

      <DataTable
        rows={data}
        loading={isLoading}
        rowKey={(r) => r.id}
        empty="No brands yet — add Nike, Apple, or your own."
        onRowClick={(r) => {
          setIsNew(false);
          setEditing(r);
        }}
        columns={[
          {
            key: "name",
            header: "Brand",
            render: (r) => (
              <div className="flex items-center gap-3">
                <span
                  className="size-7 rounded-full flex items-center justify-center text-xs font-black"
                  style={{ background: r.color, color: r.inverted_text ? "#000" : "#fff" }}
                >
                  {r.mark || r.short.charAt(0)}
                </span>
                <div>
                  <div className="font-semibold">{r.name}</div>
                  <div className="text-xs text-zinc-500">{r.short}</div>
                </div>
              </div>
            ),
          },
          { key: "coin_name", header: "Coin", render: (r) => r.coin_name },
          {
            key: "exchange_rate",
            header: "Rate (Stride→Brand)",
            align: "right",
            render: (r) => <span className="font-mono">{r.exchange_rate}:1</span>,
          },
          { key: "daily_cap", header: "Daily cap", align: "right", render: (r) => r.daily_cap.toLocaleString() },
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
        title={isNew ? "New brand" : editing?.name ?? ""}
        subtitle={isNew ? "Brands appear across the wallet, vaults and rewards." : "Edits go live the next time a player launches the app."}
        saving={save.isPending}
        isNew={isNew}
        onSave={() => editing && save.mutate(editing)}
        onDelete={() => editing && confirm(`Delete ${editing.name}?`) && remove.mutate(editing.id)}
      >
        {editing && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="ID (slug)" hint="Lowercase, e.g. nike. Cannot change later.">
              <Input
                disabled={!isNew}
                value={editing.id}
                onChange={(e) => setEditing({ ...editing, id: e.target.value.toLowerCase() })}
              />
            </Field>
            <Field label="Display name">
              <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </Field>
            <Field label="Short tag">
              <Input value={editing.short} onChange={(e) => setEditing({ ...editing, short: e.target.value.toUpperCase() })} />
            </Field>
            <Field label="Coin name">
              <Input value={editing.coin_name} onChange={(e) => setEditing({ ...editing, coin_name: e.target.value })} />
            </Field>
            <Field label="Color (hex)">
              <Input value={editing.color} onChange={(e) => setEditing({ ...editing, color: e.target.value })} />
            </Field>
            <Field label="Bright color (hex)">
              <Input value={editing.color_bright} onChange={(e) => setEditing({ ...editing, color_bright: e.target.value })} />
            </Field>
            <Field label="Dim color (hex)">
              <Input value={editing.color_dim} onChange={(e) => setEditing({ ...editing, color_dim: e.target.value })} />
            </Field>
            <Field label="Mark (glyph)">
              <Input value={editing.mark ?? ""} onChange={(e) => setEditing({ ...editing, mark: e.target.value })} />
            </Field>
            <Field label="Exchange rate" hint="Stride coins needed per 1 brand coin">
              <Input
                type="number"
                value={editing.exchange_rate}
                onChange={(e) => setEditing({ ...editing, exchange_rate: parseInt(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Daily cap" hint="Max brand coins minted per user per day">
              <Input
                type="number"
                value={editing.daily_cap}
                onChange={(e) => setEditing({ ...editing, daily_cap: parseInt(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Tagline" hint="Shown on the wallet card">
              <Textarea
                value={editing.tagline ?? ""}
                onChange={(e) => setEditing({ ...editing, tagline: e.target.value })}
                rows={2}
              />
            </Field>
            <Field label="Sort order" hint="Lower = first">
              <Input
                type="number"
                value={editing.sort_order}
                onChange={(e) => setEditing({ ...editing, sort_order: parseInt(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Inverted text" hint="Light-on-dark brands (e.g. Apple silver)">
              <Switch
                checked={editing.inverted_text}
                onCheckedChange={(v) => setEditing({ ...editing, inverted_text: v })}
              />
            </Field>
            <Field label="Active" hint="Off = hidden from apps but kept in DB">
              <Switch checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} />
            </Field>
          </div>
        )}
      </RowEditor>
    </div>
  );
}
