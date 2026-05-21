import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { getSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/DataTable";
import { RowEditor, Field } from "@/components/RowEditor";
import type { RaffleRow, BrandRow } from "@/lib/types";

function inDays(n: number): string {
  return new Date(Date.now() + n * 86_400_000).toISOString();
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const EMPTY: RaffleRow = {
  id: "",
  title: "",
  prize: "",
  prize_value_gbp: 0,
  emoji: "🎁",
  entry_cost: 100,
  brand_entry_cost: null,
  max_entries_per_user: 50,
  winners: 1,
  ends_at: inDays(7),
  total_entries: 0,
  brand: null,
  plus_only: false,
  active: true,
  sort_order: 0,
};

function countdown(ms: number): string {
  if (ms <= 0) return "ENDED";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  if (d > 0) return `${d}d ${h}h`;
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

export function RafflesPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["raffles"],
    queryFn: async (): Promise<RaffleRow[]> => {
      const supa = getSupabase();
      const { data, error } = await supa.from("raffles").select("*").order("sort_order");
      if (error) throw error;
      return (data ?? []) as RaffleRow[];
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

  const [editing, setEditing] = useState<RaffleRow | null>(null);
  const [isNew, setIsNew] = useState<boolean>(false);

  const save = useMutation({
    mutationFn: async (row: RaffleRow) => {
      const supa = getSupabase();
      const { error } = await supa.from("raffles").upsert(
        { ...row, updated_at: new Date().toISOString() },
        { onConflict: "id" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Raffle saved");
      qc.invalidateQueries({ queryKey: ["raffles"] });
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const supa = getSupabase();
      const { error } = await supa.from("raffles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Raffle deleted");
      qc.invalidateQueries({ queryKey: ["raffles"] });
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-zinc-500 text-sm">
          Live prize draws. Set the prize, entry cost, end date, and winner count. Total entries grow as players enter.
        </p>
        <Button
          onClick={() => {
            setIsNew(true);
            setEditing({ ...EMPTY, sort_order: (data?.length ?? 0) * 10 });
          }}
          className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold"
        >
          <Plus className="size-4 mr-1" /> New raffle
        </Button>
      </div>

      <DataTable
        rows={data}
        loading={isLoading}
        rowKey={(r) => r.id}
        empty="No raffles scheduled."
        onRowClick={(r) => {
          setIsNew(false);
          setEditing(r);
        }}
        columns={[
          {
            key: "title",
            header: "Raffle",
            render: (r) => (
              <div className="flex items-center gap-3">
                <span className="text-2xl">{r.emoji}</span>
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    {r.title}
                    {r.plus_only && (
                      <span className="text-[10px] font-bold bg-amber-500 text-zinc-950 px-1.5 py-0.5 rounded">PLUS</span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-500 truncate max-w-md">{r.prize}</div>
                </div>
              </div>
            ),
          },
          { key: "entry_cost", header: "Entry", align: "right", render: (r) => <span className="font-mono">{r.entry_cost}</span> },
          {
            key: "winners",
            header: "Winners",
            align: "right",
            render: (r) => `${r.winners}×`,
          },
          { key: "total_entries", header: "Entries", align: "right", render: (r) => r.total_entries.toLocaleString() },
          {
            key: "ends_at",
            header: "Ends",
            render: (r) => {
              const ms = new Date(r.ends_at).getTime() - Date.now();
              return (
                <span className={ms <= 0 ? "text-zinc-600" : ms < 86400_000 ? "text-amber-400 font-bold" : "text-zinc-300"}>
                  {countdown(ms)}
                </span>
              );
            },
          },
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
        title={isNew ? "New raffle" : editing?.title ?? ""}
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
            <Field label="Prize description">
              <Input value={editing.prize} onChange={(e) => setEditing({ ...editing, prize: e.target.value })} />
            </Field>
            <Field label="Prize value (£)">
              <Input
                type="number"
                value={editing.prize_value_gbp}
                onChange={(e) => setEditing({ ...editing, prize_value_gbp: parseInt(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Emoji">
              <Input value={editing.emoji} onChange={(e) => setEditing({ ...editing, emoji: e.target.value })} />
            </Field>
            <Field label="Brand" hint="Optional">
              <Select
                value={editing.brand ?? "__none__"}
                onValueChange={(v) => setEditing({ ...editing, brand: v === "__none__" ? null : v })}
              >
                <SelectTrigger className="bg-zinc-950 border-zinc-800">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800">
                  <SelectItem value="__none__">None</SelectItem>
                  {brands?.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Entry cost (Stride coins)">
              <Input
                type="number"
                value={editing.entry_cost}
                onChange={(e) => setEditing({ ...editing, entry_cost: parseInt(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Brand entry cost" hint="Optional alt-pay">
              <Input
                type="number"
                value={editing.brand_entry_cost ?? 0}
                onChange={(e) =>
                  setEditing({ ...editing, brand_entry_cost: e.target.value ? parseInt(e.target.value) : null })
                }
              />
            </Field>
            <Field label="Max entries / user">
              <Input
                type="number"
                value={editing.max_entries_per_user}
                onChange={(e) => setEditing({ ...editing, max_entries_per_user: parseInt(e.target.value) || 1 })}
              />
            </Field>
            <Field label="Winners">
              <Input
                type="number"
                value={editing.winners}
                onChange={(e) => setEditing({ ...editing, winners: parseInt(e.target.value) || 1 })}
              />
            </Field>
            <Field label="Ends at">
              <Input
                type="datetime-local"
                value={toLocalInput(editing.ends_at)}
                onChange={(e) =>
                  setEditing({ ...editing, ends_at: new Date(e.target.value).toISOString() })
                }
              />
            </Field>
            <Field label="Sort order">
              <Input
                type="number"
                value={editing.sort_order}
                onChange={(e) => setEditing({ ...editing, sort_order: parseInt(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Plus only" hint="Stride+ subscribers only">
              <Switch checked={editing.plus_only} onCheckedChange={(v) => setEditing({ ...editing, plus_only: v })} />
            </Field>
            <Field label="Active">
              <Switch checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} />
            </Field>
          </div>
        )}
      </RowEditor>
    </div>
  );
}
