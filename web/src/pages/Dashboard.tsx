import { useQuery } from "@tanstack/react-query";
import { getSupabase } from "@/lib/supabase";
import { Tag, Gift, Ticket, Globe2, Users, TrendingUp } from "lucide-react";

interface Stat { label: string; value: number; icon: typeof Tag; tone: string }

async function fetchCounts(): Promise<Stat[]> {
  const supa = getSupabase();
  const tables = ["brands", "rewards", "raffles", "cities", "profiles", "redemptions"] as const;
  const counts = await Promise.all(
    tables.map(async (t) => {
      const { count } = await supa.from(t).select("*", { count: "exact", head: true });
      return count ?? 0;
    })
  );
  return [
    { label: "Brands", value: counts[0], icon: Tag, tone: "text-orange-400" },
    { label: "Rewards", value: counts[1], icon: Gift, tone: "text-fuchsia-400" },
    { label: "Raffles", value: counts[2], icon: Ticket, tone: "text-amber-400" },
    { label: "Cities", value: counts[3], icon: Globe2, tone: "text-sky-400" },
    { label: "Players", value: counts[4], icon: Users, tone: "text-emerald-400" },
    { label: "Redemptions", value: counts[5], icon: TrendingUp, tone: "text-lime-400" },
  ];
}

export function DashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ["dashboard-counts"], queryFn: fetchCounts });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Live economy</h2>
        <p className="text-zinc-500 text-sm mt-1">
          Everything you change here goes straight to the players' apps. Pick a section in the sidebar to start editing.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {(data ?? Array(6).fill(null)).map((s, i) => (
          <div
            key={i}
            className="rounded-2xl border border-zinc-900 bg-zinc-950/50 p-5 hover:border-zinc-700 transition-colors"
          >
            {s ? (
              <>
                <s.icon className={`size-5 ${s.tone}`} />
                <div className="text-3xl font-black mt-3">{s.value.toLocaleString()}</div>
                <div className="text-zinc-500 text-xs uppercase tracking-wider font-semibold mt-1">{s.label}</div>
              </>
            ) : (
              <div className="animate-pulse">
                <div className="size-5 rounded bg-zinc-800" />
                <div className="h-8 w-20 rounded bg-zinc-800 mt-3" />
                <div className="h-3 w-16 rounded bg-zinc-800 mt-2" />
              </div>
            )}
          </div>
        ))}
      </div>

      {isLoading ? null : (
        <div className="rounded-2xl border border-emerald-900/50 bg-emerald-950/20 p-5 text-sm">
          <div className="font-bold text-emerald-300">Live database connected</div>
          <p className="text-zinc-400 mt-1.5">
            All edits write to Supabase immediately and propagate to every Stride app on next launch (or live refresh).
            Use the sections on the left to manage brands, rewards, raffles, cities, and global tunables.
          </p>
        </div>
      )}
    </div>
  );
}
