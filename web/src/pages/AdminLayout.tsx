import { Outlet, NavLink, useLocation } from "react-router-dom";
import { clearServiceKey } from "@/lib/supabase";
import { LayoutDashboard, Tag, Gift, Ticket, Globe2, Settings, LogOut, Flame, Crown, Trophy, Swords, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props { onSignOut: () => void }

const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/brands", label: "Brands", icon: Tag },
  { to: "/rewards", label: "Rewards", icon: Gift },
  { to: "/raffles", label: "Raffles", icon: Ticket },
  { to: "/cities", label: "Cities", icon: Globe2 },
  { to: "/live", label: "Live Events", icon: Flame },
  { to: "/memberships", label: "Memberships", icon: Crown },
  { to: "/featured-challenges", label: "Featured Challenges", icon: Trophy },
  { to: "/stake-challenges", label: "Stake Challenges", icon: Swords },
  { to: "/push", label: "Push & Inbox", icon: Bell },
  { to: "/config", label: "Config", icon: Settings },
];

export function AdminLayout({ onSignOut }: Props) {
  const location = useLocation();
  const title = NAV.find((n) => n.to === location.pathname)?.label ?? "Stride Admin";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex">
      <aside className="w-60 border-r border-zinc-900 bg-zinc-950 flex flex-col">
        <div className="px-5 py-6 flex items-center gap-2">
          <div className="size-9 rounded-lg bg-emerald-500 flex items-center justify-center text-zinc-950 font-black">S</div>
          <div>
            <div className="font-bold text-sm">Stride Admin</div>
            <div className="text-emerald-400 text-[10px] font-bold tracking-widest uppercase">Live console</div>
          </div>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-emerald-500/10 text-emerald-300"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                )
              }
            >
              <n.icon className="size-4" />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={() => {
            clearServiceKey();
            onSignOut();
          }}
          className="m-3 flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-zinc-500 hover:text-red-400 hover:bg-red-950/20 transition-colors"
        >
          <LogOut className="size-3.5" />
          Sign out (clears key)
        </button>
      </aside>

      <main className="flex-1 overflow-auto">
        <header className="border-b border-zinc-900 px-8 h-16 flex items-center sticky top-0 bg-zinc-950/80 backdrop-blur z-10">
          <h1 className="text-xl font-bold">{title}</h1>
          <div className="ml-auto flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-zinc-500">Connected to live database</span>
          </div>
        </header>
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
