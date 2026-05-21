import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Flame, Plus, Trophy } from "lucide-react";

import { getSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/DataTable";
import { RowEditor, Field } from "@/components/RowEditor";
import type { RaffleRow, BrandRow } from "@/lib/types";

const WEEK_MS = 7 * 86_400_000;
/** Outlay band (£/week) the founder is comfortable absorbing on raffle prizes. */
const BUDGET_TARGET_LOW = 500;
const BUDGET_TARGET_HIGH = 1500;

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
  entry_cost: 500,
  brand_entry_cost: null,
  max_entries_per_user: 15,
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

/** Pick `n` weighted winners — each ticket the player owns adds one entry to the pool. */
function drawWinners(entries: { userId: string; tickets: number }[], n: number): string[] {
  const pool: string[] = [];
  for (const e of entries) for (let i = 0; i < e.tickets; i++) pool.push(e.userId);
  const winners: string[] = [];
  const picked = new Set<string>();
  for (let i = 0; i < n && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    const w = pool[idx];
    if (!picked.has(w)) {
      picked.add(w);
      winners.push(w);
    }
    // Remove every entry from that user so we don't pick them twice.
    for (let k = pool.length - 1; k >= 0; k--) if (pool[k] === w) pool.splice(k, 1);
  }
  return winners;
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

  /** Drawing winners: pulls all entries for the raffle, picks weighted winners,
   *  stores them on the row + marks `active = false` so it stops showing live. */
  const draw = useMutation({
    mutationFn: async (raffle: RaffleRow) => {
      const supa = getSupabase();
      const { data: entries, error } = await supa
        .from("raffle_entries")
        .select("user_id, entries")
        .eq("raffle_id", raffle.id);
      if (error) throw error;
      const rows = (entries ?? []) as { user_id: string; entries: number }[];
      const aggregated = new Map<string, number>();
      for (const r of rows) aggregated.set(r.user_id, (aggregated.get(r.user_id) ?? 0) + r.entries);
      const pool = Array.from(aggregated, ([userId, tickets]) => ({ userId, tickets }));
      const winners = drawWinners(pool, raffle.winners);
      const { error: upErr } = await supa
        .from("raffles")
        .update({
          active: false,
          winners_user_ids: winners,
          drawn_at: new Date().toISOString(),
        })
        .eq("id", raffle.id);
      if (upErr) throw upErr;
      return { raffle, winners, totalEntries: pool.reduce((s, p) => s + p.tickets, 0) };
    },
    onSuccess: ({ raffle, winners, totalEntries }) => {
      if (winners.length === 0) {
        toast.warning(`"${raffle.title}" had no entries — marked drawn with no winner.`);
      } else {
        toast.success(`Drew ${winners.length} winner${winners.length === 1 ? "" : "s"} from ${totalEntries} entries.`);
      }
      qc.invalidateQueries({ queryKey: ["raffles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Budget meter — total £ of prizes ending in the next 7 days ────────────
  const budget = useMemo(() => {
    if (!data) return { gbp: 0, count: 0, coinSink: 0 };
    const cutoff = Date.now() + WEEK_MS;
    let gbp = 0;
    let count = 0;
    let coinSink = 0;
    for (const r of data) {
      if (!r.active) continue;
      const endsAt = new Date(r.ends_at).getTime();
      if (endsAt < Date.now() || endsAt > cutoff) continue;
      gbp += (r.prize_value_gbp ?? 0) * (r.winners ?? 1);
      coinSink += (r.entry_cost ?? 0) * (r.total_entries ?? 0);
      count += 1;
    }
    return { gbp, count, coinSink };
  }, [data]);

  const budgetState: "under" | "in" | "over" =
    budget.gbp < BUDGET_TARGET_LOW ? "under" :
    budget.gbp > BUDGET_TARGET_HIGH ? "over" : "in";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-zinc-500 text-sm max-w-2xl">
          Live prize draws — the only place players can burn coins in v3. Set the prize, ticket cost,
          end date and winner count. The mobile apps refetch within ~60s.
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

      {/* WEEKLY BUDGET METER */}
      <div className="grid grid-cols-3 gap-3">
        <BudgetCard
          label="£ OUTLAY · NEXT 7 DAYS"
          value={`£${budget.gbp.toLocaleString()}`}
          sub={`${budget.count} live raffle${budget.count === 1 ? "" : "s"} · target £${BUDGET_TARGET_LOW}–£${BUDGET_TARGET_HIGH}`}
          state={budgetState}
        />
        <BudgetCard
          label="COIN SINK FORECAST"
          value={`${budget.coinSink.toLocaleString()} c`}
          sub="entries × cost across live raffles"
          icon={<Flame className="size-4 text-amber-400" />}
        />
        <BudgetCard
          label="STATUS"
          value={
            budgetState === "in" ? "On target" :
            budgetState === "under" ? "Below band" : "Over band"
          }
          sub={
            budgetState === "in" ? "Prize pool sized for the burn." :
            budgetState === "under" ? "Add more or bigger raffles." :
            "Trim prizes or lift entry costs."
          }
          state={budgetState}
        />
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
          {
            key: "prize_value_gbp",
            header: "Prize £",
            align: "right",
            render: (r) => <span className="font-mono">£{r.prize_value_gbp.toLocaleString()}</span>,
          },
          { key: "entry_cost", header: "Ticket", align: "right", render: (r) => <span className="font-mono">{r.entry_cost}</span> },
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
            render: (r) => {
              const ended = new Date(r.ends_at).getTime() <= Date.now();
              if (!r.active && ended) {
                return (
                  <span className="text-xs font-bold text-sky-400 bg-sky-950/40 px-2 py-1 rounded">DRAWN</span>
                );
              }
              if (!r.active) {
                return <span className="text-xs font-bold text-zinc-500 bg-zinc-900 px-2 py-1 rounded">HIDDEN</span>;
              }
              return ended
                ? <span className="text-xs font-bold text-amber-400 bg-amber-950/40 px-2 py-1 rounded">READY TO DRAW</span>
                : <span className="text-xs font-bold text-emerald-400 bg-emerald-950/40 px-2 py-1 rounded">LIVE</span>;
            },
          },
          {
            key: "_draw" as keyof RaffleRow,
            header: "",
            render: (r) => {
              const ended = new Date(r.ends_at).getTime() <= Date.now();
              if (!ended || !r.active) return <span className="text-zinc-700 text-xs">—</span>;
              return (
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40 text-amber-300 font-bold"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Draw ${r.winners} winner${r.winners === 1 ? "" : "s"} for "${r.title}"?`)) {
                      draw.mutate(r);
                    }
                  }}
                  disabled={draw.isPending}
                >
                  <Trophy className="size-3.5 mr-1" /> Draw now
                </Button>
              );
            },
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
            <Field label="Prize value (£)" hint="Drives the weekly budget meter">
              <Input
                type="number"
                value={editing.prize_value_gbp}
                onChange={(e) => setEditing({ ...editing, prize_value_gbp: parseInt(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Emoji">
              <Input value={editing.emoji} onChange={(e) => setEditing({ ...editing, emoji: e.target.value })} />
            </Field>
            <Field label="Brand" hint="Optional — for branding only, doesn't affect payment">
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
            <Field label="Ticket cost (Stride coins)" hint="v3: brand-coin entries are off">
              <Input
                type="number"
                value={editing.entry_cost}
                onChange={(e) => setEditing({ ...editing, entry_cost: parseInt(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Max tickets / user" hint="Prevents whales sweeping a draw">
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
            <Field label="Active" hint="Toggle off to archive without losing entries">
              <Switch checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} />
            </Field>
          </div>
        )}
      </RowEditor>
    </div>
  );
}

function BudgetCard({
  label,
  value,
  sub,
  state,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  state?: "under" | "in" | "over";
  icon?: React.ReactNode;
}) {
  const accent =
    state === "in" ? "border-emerald-500/40 bg-emerald-950/20" :
    state === "over" ? "border-rose-500/40 bg-rose-950/20" :
    state === "under" ? "border-amber-500/40 bg-amber-950/20" :
    "border-zinc-800 bg-zinc-900/40";
  const tagIcon =
    state === "in" ? <CheckCircle2 className="size-4 text-emerald-400" /> :
    state === "over" ? <AlertTriangle className="size-4 text-rose-400" /> :
    state === "under" ? <AlertTriangle className="size-4 text-amber-400" /> :
    icon ?? null;

  return (
    <div className={`rounded-lg border px-4 py-3 ${accent}`}>
      <div className="flex items-center gap-2 text-[10px] font-black tracking-[0.15em] text-zinc-400">
        {tagIcon}
        <span>{label}</span>
      </div>
      <div className="text-2xl font-black text-zinc-100 mt-1">{value}</div>
      <div className="text-xs text-zinc-500 mt-0.5">{sub}</div>
    </div>
  );
}
