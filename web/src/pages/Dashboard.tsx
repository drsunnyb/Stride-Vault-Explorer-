import { useQuery } from "@tanstack/react-query";
import { Tag, Gift, Ticket, Globe2, Users, TrendingUp, Coins, Flame, AlertTriangle } from "lucide-react";

import { getSupabase } from "@/lib/supabase";

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

interface RaffleRow {
  id: string;
  title: string;
  prize_value_gbp: number | null;
  entry_cost: number;
  total_entries: number | null;
  ends_at: string;
  active: boolean;
}

interface ConfigRow { key: string; value: unknown }

function toNum(v: unknown, fb: number): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") { const n = Number(v); return Number.isFinite(n) ? n : fb; }
  return fb;
}

interface EconomyData {
  raffles: RaffleRow[];
  configMap: Record<string, unknown>;
  playerCount: number;
}

async function fetchEconomy(): Promise<EconomyData> {
  const supa = getSupabase();
  const [rafflesRes, configRes, playersRes] = await Promise.all([
    supa.from("raffles").select("id,title,prize_value_gbp,entry_cost,total_entries,ends_at,active").eq("active", true),
    supa.from("app_config").select("key,value"),
    supa.from("profiles").select("*", { count: "exact", head: true }),
  ]);
  const configMap: Record<string, unknown> = {};
  for (const r of (configRes.data ?? []) as ConfigRow[]) configMap[r.key] = r.value;
  return {
    raffles: (rafflesRes.data ?? []) as RaffleRow[],
    configMap,
    playerCount: playersRes.count ?? 0,
  };
}

export function DashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ["dashboard-counts"], queryFn: fetchCounts });
  const econQ = useQuery({ queryKey: ["dashboard-economy"], queryFn: fetchEconomy, refetchInterval: 60_000 });
  const econ = econQ.data;

  // ── Economy preview math ────────────────────────────────────────────────
  // Best-guess weekly economy projection so the founder can see if the burn
  // loop is balanced. Assumes ~30% of registered players are weekly-active
  // and averages 5 claims/day × ~150 coins (post-multiplier) per claim.
  const players = econ?.playerCount ?? 0;
  const wau = Math.max(1, Math.round(players * 0.3));
  const avgCoinsPerClaim = 150;
  const avgClaimsPerDay = 5;
  const dailyCapFree = toNum(econ?.configMap.daily_coin_cap_free, 3000);
  const dailyCapPlus = toNum(econ?.configMap.daily_coin_cap_plus, 5000);
  // Weighted weekly mint per player, clamped at the daily cap × 7.
  const dailyMint = Math.min(dailyCapFree, avgCoinsPerClaim * avgClaimsPerDay);
  const weeklyMint = dailyMint * 7 * wau;

  const now = Date.now();
  const weekHorizon = now + 7 * 86400_000;
  const rafflesEndingThisWeek = (econ?.raffles ?? []).filter(
    (r) => new Date(r.ends_at).getTime() <= weekHorizon
  );
  const weeklyBurn = rafflesEndingThisWeek.reduce(
    (sum, r) => sum + r.entry_cost * (r.total_entries ?? 0),
    0
  );
  const weeklyOutlayGbp = rafflesEndingThisWeek.reduce(
    (sum, r) => sum + (r.prize_value_gbp ?? 0),
    0
  );

  const balance = weeklyBurn === 0 || weeklyMint === 0 ? 0 : weeklyBurn / weeklyMint;
  const balancePct = Math.min(150, Math.round(balance * 100));
  const balanceTone =
    balance >= 0.8 ? "emerald" : balance >= 0.4 ? "amber" : "red";
  const balanceLabel =
    balance >= 0.8 ? "Healthy burn" : balance >= 0.4 ? "Under-burning" : "Coins piling up";

  const outlayTone =
    weeklyOutlayGbp <= 500 ? "amber" : weeklyOutlayGbp <= 1500 ? "emerald" : "red";

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

      {/* ── Economy preview ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-amber-900/40 bg-gradient-to-br from-amber-950/30 via-zinc-950/30 to-zinc-950/30 p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-amber-400 font-bold uppercase tracking-wider text-xs">
              <Flame className="size-4" /> Economy preview · next 7 days
            </div>
            <p className="text-zinc-500 text-xs mt-1.5 max-w-2xl">
              Projection assumes ~30% of players are weekly active and average 5 claims/day. Tune the underlying
              caps under <code className="text-zinc-400">Config → Tokenomics</code>.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-5">
          <EcoStat
            icon={Coins}
            label="Est. coins minted"
            value={`${(weeklyMint / 1000).toFixed(1)}k`}
            sub={`${wau.toLocaleString()} WAU × ${dailyMint.toLocaleString()}c/day × 7`}
            tone="emerald"
          />
          <EcoStat
            icon={Ticket}
            label="Coins burned (raffles)"
            value={`${(weeklyBurn / 1000).toFixed(1)}k`}
            sub={`${rafflesEndingThisWeek.length} raffle(s) ending this week`}
            tone="amber"
          />
          <EcoStat
            icon={TrendingUp}
            label="Burn / mint ratio"
            value={`${balancePct}%`}
            sub={balanceLabel}
            tone={balanceTone as "emerald" | "amber" | "red"}
          />
          <EcoStat
            icon={AlertTriangle}
            label="£ outlay this week"
            value={`£${weeklyOutlayGbp.toLocaleString()}`}
            sub={outlayTone === "emerald" ? "Inside £500–£1,500 target" : outlayTone === "amber" ? "Below £500 target" : "Above £1,500 target"}
            tone={outlayTone as "emerald" | "amber" | "red"}
          />
        </div>

        <div className="mt-5 rounded-xl border border-zinc-900 bg-zinc-950/40 p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Current tunables</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <Tunable label="Daily cap (free)" v={`${dailyCapFree.toLocaleString()}c`} />
            <Tunable label="Daily cap (Plus)" v={`${dailyCapPlus.toLocaleString()}c`} />
            <Tunable label="Max stacked ×" v={`${toNum(econ?.configMap.max_total_multiplier, 10)}×`} />
            <Tunable label="Hot vault ×" v={`${toNum(econ?.configMap.hot_vault_multiplier, 3)}×`} />
            <Tunable label="Final hour ×" v={`${toNum(econ?.configMap.final_hour_multiplier, 2)}×`} />
            <Tunable label="Share reward" v={`${toNum(econ?.configMap.share_reward_coins, 30)}c`} />
            <Tunable label="Referral bonus" v={`${toNum(econ?.configMap.referral_bonus_coins, 500)}c`} />
            <Tunable label="Stake rake" v={`${(toNum(econ?.configMap.challenge_rake_pct, 0.02) * 100).toFixed(1)}%`} />
          </div>
        </div>
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

interface EcoStatProps {
  icon: typeof Coins;
  label: string;
  value: string;
  sub: string;
  tone: "emerald" | "amber" | "red";
}

function EcoStat({ icon: Icon, label, value, sub, tone }: EcoStatProps) {
  const valueClass =
    tone === "emerald" ? "text-emerald-400" : tone === "amber" ? "text-amber-400" : "text-red-400";
  const border =
    tone === "emerald" ? "border-emerald-900/40" : tone === "amber" ? "border-amber-900/40" : "border-red-900/40";
  return (
    <div className={`rounded-xl border ${border} bg-zinc-950/50 p-4`}>
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
        <Icon className="size-3" /> {label}
      </div>
      <div className={`text-2xl font-black mt-1.5 ${valueClass}`}>{value}</div>
      <div className="text-[11px] text-zinc-500 mt-1">{sub}</div>
    </div>
  );
}

function Tunable({ label, v }: { label: string; v: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-600">{label}</div>
      <div className="font-bold text-zinc-200">{v}</div>
    </div>
  );
}
