import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Coins, Swords } from "lucide-react";

import { getSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/DataTable";

/**
 * Read-only mirror of peer-stake challenges pushed by mobile clients. Lets the
 * founder see total pot exposure, settle stuck challenges, and refund a bad
 * actor. Mobile is still the source of truth for participants & metric values.
 */
interface StakeChallengeRow {
  id: string;
  title: string;
  created_by: string;
  created_by_username: string | null;
  home_city: string | null;
  stake: number;
  metric: "steps" | "vaults" | "coins";
  status: "pending" | "live" | "settled" | "cancelled";
  participants: Participant[];
  created_at: string;
  starts_at: string;
  ends_at: string;
  winner_id: string | null;
  payout: number | null;
  updated_at: string | null;
}

interface Participant {
  playerId: string;
  displayName: string;
  state: "invited" | "in" | "joined" | "out";
  baseline: number;
  current: number;
}

function statusChip(s: StakeChallengeRow["status"]): { label: string; cls: string } {
  switch (s) {
    case "live": return { label: "LIVE", cls: "text-emerald-400 bg-emerald-950/40" };
    case "settled": return { label: "SETTLED", cls: "text-zinc-400 bg-zinc-900" };
    case "cancelled": return { label: "CANCELLED", cls: "text-red-400 bg-red-950/30" };
    default: return { label: "PENDING", cls: "text-amber-400 bg-amber-950/30" };
  }
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

export function StakeChallengesPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "live" | "settled" | "cancelled">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["stake_challenges"],
    queryFn: async (): Promise<StakeChallengeRow[]> => {
      const supa = getSupabase();
      const { data, error } = await supa
        .from("stake_challenges")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as StakeChallengeRow[];
    },
    refetchInterval: 30_000,
  });

  const rows = useMemo(() => {
    if (!data) return [];
    if (filter === "all") return data;
    return data.filter((r) => r.status === filter);
  }, [data, filter]);

  const stats = useMemo(() => {
    const live = (data ?? []).filter((r) => r.status === "live");
    const settled = (data ?? []).filter((r) => r.status === "settled");
    const totalPotLive = live.reduce((acc, r) => {
      const joined = (r.participants ?? []).filter((p) => p.state === "in" || p.state === "joined").length;
      return acc + r.stake * joined;
    }, 0);
    const totalPaidOut = settled.reduce((acc, r) => acc + (r.payout ?? 0), 0);
    return { liveCount: live.length, settledCount: settled.length, totalPotLive, totalPaidOut };
  }, [data]);

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const supa = getSupabase();
      const { error } = await supa
        .from("stake_challenges")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Challenge cancelled. Mobile clients refund participants on next sync.");
      qc.invalidateQueries({ queryKey: ["stake_challenges"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const now = Date.now();

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <p className="text-zinc-500 text-sm max-w-2xl">
          Live mirror of every peer-stake challenge pushed by mobile clients. Read-only — settlements
          happen on-device — but you can force-cancel a stuck challenge to refund participants on next sync.
        </p>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="w-40 bg-zinc-950 border-zinc-800"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-zinc-950 border-zinc-800">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="live">Live</SelectItem>
              <SelectItem value="settled">Settled</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Swords} label="Live challenges" value={stats.liveCount.toLocaleString()} />
        <StatCard icon={Coins} label="Locked in live pots" value={`${stats.totalPotLive.toLocaleString()}c`} accent="emerald" />
        <StatCard icon={Coins} label="Lifetime paid out" value={`${stats.totalPaidOut.toLocaleString()}c`} accent="gold" />
        <StatCard icon={AlertTriangle} label="Settled" value={stats.settledCount.toLocaleString()} />
      </div>

      <DataTable
        rows={rows}
        loading={isLoading}
        rowKey={(r) => r.id}
        empty="No stake challenges synced yet. Mobile clients push on create / accept / settle."
        columns={[
          {
            key: "title",
            header: "Challenge",
            render: (r) => (
              <div>
                <div className="font-semibold">{r.title}</div>
                <div className="text-xs text-zinc-500">
                  by @{r.created_by_username ?? r.created_by} · {r.home_city ?? "—"} · {r.metric}
                </div>
              </div>
            ),
          },
          {
            key: "participants",
            header: "Players",
            render: (r) => {
              const joined = (r.participants ?? []).filter((p) => p.state === "in" || p.state === "joined");
              const invited = (r.participants ?? []).filter((p) => p.state === "invited");
              return (
                <div className="text-xs">
                  <span className="text-emerald-400 font-bold">{joined.length}</span> joined
                  {invited.length > 0 ? <> · <span className="text-zinc-500">{invited.length} invited</span></> : null}
                </div>
              );
            },
          },
          {
            key: "stake",
            header: "Pot",
            align: "right",
            render: (r) => {
              const joined = (r.participants ?? []).filter((p) => p.state === "in" || p.state === "joined").length;
              return (
                <div className="text-right">
                  <div className="font-bold text-amber-400">{(r.stake * joined).toLocaleString()}c</div>
                  <div className="text-[10px] text-zinc-500">{r.stake.toLocaleString()}c × {joined}</div>
                </div>
              );
            },
          },
          {
            key: "ends_at",
            header: "Ends in",
            align: "right",
            render: (r) =>
              r.status === "live"
                ? countdown(new Date(r.ends_at).getTime() - now)
                : r.winner_id
                ? `🏆 ${r.winner_id}`
                : "—",
          },
          {
            key: "status",
            header: "Status",
            render: (r) => {
              const c = statusChip(r.status);
              return <span className={`text-xs font-bold px-2 py-1 rounded ${c.cls}`}>{c.label}</span>;
            },
          },
          {
            key: "id",
            header: "",
            align: "right",
            render: (r) =>
              r.status === "live" ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-400 hover:text-red-300 hover:bg-red-950/30"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Cancel "${r.title}" and refund participants on next sync?`)) {
                      cancel.mutate(r.id);
                    }
                  }}
                >
                  Cancel
                </Button>
              ) : null,
          },
        ]}
      />
    </div>
  );
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: "emerald" | "gold";
}
function StatCard({ icon: Icon, label, value, accent }: StatCardProps) {
  const color = accent === "gold" ? "text-amber-400" : accent === "emerald" ? "text-emerald-400" : "text-zinc-100";
  return (
    <div className="rounded-2xl border border-zinc-900 bg-zinc-950/60 p-5">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
        <Icon className="size-3.5" /> {label}
      </div>
      <div className={`mt-2 text-2xl font-black ${color}`}>{value}</div>
    </div>
  );
}
