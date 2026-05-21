import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trophy } from "lucide-react";

import { getSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/DataTable";
import { RowEditor, Field } from "@/components/RowEditor";

/**
 * Admin CRUD for `featured_challenges` — curated weekly cohort goals every
 * mobile player sees in the Friends tab (separate from P2P stake challenges).
 */
interface FeaturedChallengeRow {
  id: string;
  title: string;
  subtitle: string | null;
  metric: "steps" | "vaults" | "coins";
  duration_days: number;
  prize_pool_coins: number;
  entry_cost_coins: number;
  cohort_size: number;
  hero_emoji: string | null;
  starts_at: string;
  ends_at: string;
  plus_only: boolean;
  active: boolean;
  sort_order: number;
}

function inDays(n: number): string {
  return new Date(Date.now() + n * 86_400_000).toISOString();
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const EMPTY: FeaturedChallengeRow = {
  id: "",
  title: "",
  subtitle: "",
  metric: "steps",
  duration_days: 7,
  prize_pool_coins: 5000,
  entry_cost_coins: 0,
  cohort_size: 100,
  hero_emoji: "🏆",
  starts_at: new Date().toISOString(),
  ends_at: inDays(7),
  plus_only: false,
  active: true,
  sort_order: 0,
};

function metricLabel(m: FeaturedChallengeRow["metric"]): string {
  return m === "steps" ? "Steps" : m === "vaults" ? "Vaults" : "Coins";
}

function countdown(ms: number): string {
  if (ms <= 0) return "ENDED";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  if (d > 0) return `${d}d ${h}h`;
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

export function FeaturedChallengesPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["featured_challenges"],
    queryFn: async (): Promise<FeaturedChallengeRow[]> => {
      const supa = getSupabase();
      const { data, error } = await supa
        .from("featured_challenges")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("ends_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as FeaturedChallengeRow[];
    },
  });

  const [editing, setEditing] = useState<FeaturedChallengeRow | null>(null);
  const [isNew, setIsNew] = useState<boolean>(false);

  const save = useMutation({
    mutationFn: async (row: FeaturedChallengeRow) => {
      const supa = getSupabase();
      const { error } = await supa
        .from("featured_challenges")
        .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Challenge saved");
      qc.invalidateQueries({ queryKey: ["featured_challenges"] });
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const supa = getSupabase();
      const { error } = await supa.from("featured_challenges").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Challenge deleted");
      qc.invalidateQueries({ queryKey: ["featured_challenges"] });
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const now = Date.now();
  const totalOutlay = (data ?? []).reduce(
    (acc, r) => acc + (r.active && new Date(r.ends_at).getTime() > now ? r.prize_pool_coins : 0),
    0
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-zinc-500 text-sm max-w-2xl">
          Curated weekly challenges every player sees in the Friends tab. Different from peer-stake
          challenges — these are pushed by you with a single prize pool split across the cohort.
        </p>
        <Button
          onClick={() => {
            setIsNew(true);
            setEditing({ ...EMPTY, sort_order: (data?.length ?? 0) * 10 });
          }}
          className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold"
        >
          <Plus className="size-4 mr-1" /> New challenge
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Active challenges" value={(data ?? []).filter((r) => r.active && new Date(r.ends_at).getTime() > now).length.toString()} />
        <StatCard label="Total prize coins on the board" value={totalOutlay.toLocaleString()} accent="gold" />
        <StatCard label="Plus-only slate" value={(data ?? []).filter((r) => r.plus_only).length.toString()} />
      </div>

      <DataTable
        rows={data}
        loading={isLoading}
        rowKey={(r) => r.id}
        empty="No featured challenges yet. Create one to give every player a cohort goal this week."
        onRowClick={(r) => {
          setIsNew(false);
          setEditing(r);
        }}
        columns={[
          {
            key: "title",
            header: "Title",
            render: (r) => (
              <div className="flex items-center gap-3">
                <span className="text-2xl">{r.hero_emoji ?? "🏆"}</span>
                <div>
                  <div className="font-semibold">{r.title}</div>
                  <div className="text-xs text-zinc-500">{r.subtitle ?? "—"}</div>
                </div>
              </div>
            ),
          },
          { key: "metric", header: "Metric", render: (r) => metricLabel(r.metric) },
          {
            key: "prize_pool_coins",
            header: "Prize pool",
            align: "right",
            render: (r) => (
              <span className="font-bold text-amber-400">{r.prize_pool_coins.toLocaleString()}c</span>
            ),
          },
          { key: "entry_cost_coins", header: "Entry", align: "right", render: (r) => (r.entry_cost_coins > 0 ? `${r.entry_cost_coins}c` : "Free") },
          { key: "cohort_size", header: "Cohort", align: "right", render: (r) => r.cohort_size.toLocaleString() },
          {
            key: "ends_at",
            header: "Ends in",
            align: "right",
            render: (r) => countdown(new Date(r.ends_at).getTime() - now),
          },
          {
            key: "active",
            header: "Status",
            render: (r) => {
              const live = r.active && new Date(r.ends_at).getTime() > now;
              return live ? (
                <span className="text-xs font-bold text-emerald-400 bg-emerald-950/40 px-2 py-1 rounded">LIVE</span>
              ) : r.active ? (
                <span className="text-xs font-bold text-zinc-400 bg-zinc-900 px-2 py-1 rounded">ENDED</span>
              ) : (
                <span className="text-xs font-bold text-zinc-500 bg-zinc-900 px-2 py-1 rounded">DRAFT</span>
              );
            },
          },
        ]}
      />

      <RowEditor
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        title={isNew ? "New featured challenge" : editing?.title ?? ""}
        saving={save.isPending}
        isNew={isNew}
        onSave={() => editing && save.mutate(editing)}
        onDelete={() => editing && confirm(`Delete "${editing.title}"?`) && remove.mutate(editing.id)}
      >
        {editing && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="ID (slug)" hint="lowercase, e.g. spring-step-sprint">
              <Input disabled={!isNew} value={editing.id} onChange={(e) => setEditing({ ...editing, id: e.target.value })} />
            </Field>
            <Field label="Hero emoji">
              <Input maxLength={4} value={editing.hero_emoji ?? ""} onChange={(e) => setEditing({ ...editing, hero_emoji: e.target.value })} />
            </Field>
            <Field label="Title" hint="Shown big on the card. Keep it under 40 chars.">
              <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            </Field>
            <Field label="Subtitle">
              <Input value={editing.subtitle ?? ""} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} />
            </Field>
            <Field label="Metric" hint="Determines how leaderboards are computed.">
              <Select
                value={editing.metric}
                onValueChange={(v) => setEditing({ ...editing, metric: v as FeaturedChallengeRow["metric"] })}
              >
                <SelectTrigger className="bg-zinc-950 border-zinc-800"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800">
                  <SelectItem value="steps">Steps walked</SelectItem>
                  <SelectItem value="vaults">Vaults claimed</SelectItem>
                  <SelectItem value="coins">Coins earned</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Duration (days)">
              <Input
                type="number"
                value={editing.duration_days}
                onChange={(e) => setEditing({ ...editing, duration_days: parseInt(e.target.value) || 7 })}
              />
            </Field>
            <Field label="Prize pool (Stride Coins)" hint="Split across the top finishers — they show this prominently.">
              <Input
                type="number"
                value={editing.prize_pool_coins}
                onChange={(e) => setEditing({ ...editing, prize_pool_coins: parseInt(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Entry cost (coins, 0 = free)">
              <Input
                type="number"
                value={editing.entry_cost_coins}
                onChange={(e) => setEditing({ ...editing, entry_cost_coins: parseInt(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Cohort size" hint="Approximate number of competitors shown on the card.">
              <Input
                type="number"
                value={editing.cohort_size}
                onChange={(e) => setEditing({ ...editing, cohort_size: parseInt(e.target.value) || 100 })}
              />
            </Field>
            <Field label="Starts at">
              <Input
                type="datetime-local"
                value={toLocalInput(editing.starts_at)}
                onChange={(e) => setEditing({ ...editing, starts_at: new Date(e.target.value).toISOString() })}
              />
            </Field>
            <Field label="Ends at">
              <Input
                type="datetime-local"
                value={toLocalInput(editing.ends_at)}
                onChange={(e) => setEditing({ ...editing, ends_at: new Date(e.target.value).toISOString() })}
              />
            </Field>
            <Field label="Stride+ only">
              <Switch checked={editing.plus_only} onCheckedChange={(v) => setEditing({ ...editing, plus_only: v })} />
            </Field>
            <Field label="Active">
              <Switch checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} />
            </Field>
            <Field label="Sort order">
              <Input
                type="number"
                value={editing.sort_order}
                onChange={(e) => setEditing({ ...editing, sort_order: parseInt(e.target.value) || 0 })}
              />
            </Field>
          </div>
        )}
      </RowEditor>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  accent?: "gold" | "emerald";
}
function StatCard({ label, value, accent }: StatCardProps) {
  const color = accent === "gold" ? "text-amber-400" : accent === "emerald" ? "text-emerald-400" : "text-zinc-100";
  return (
    <div className="rounded-2xl border border-zinc-900 bg-zinc-950/60 p-5">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
        <Trophy className="size-3.5" /> {label}
      </div>
      <div className={`mt-2 text-2xl font-black ${color}`}>{value}</div>
    </div>
  );
}
