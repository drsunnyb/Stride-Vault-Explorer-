import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bell, Send, MapPin, Crown, Users, Sparkles, History } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Field } from "@/components/RowEditor";
import { DataTable } from "@/components/DataTable";
import { getSupabase } from "@/lib/supabase";
import {
  fetchDeviceTokenCount,
  fetchNotificationLog,
  sendPush,
  type PushAudience,
} from "@/lib/push";

interface CityRow {
  id: string;
  name: string;
  status: "live" | "waitlist";
}

/**
 * Push & broadcasts console. Compose a notification, target by city or
 * Stride+ status, send to Expo Push + log the broadcast so the in-app
 * inbox surfaces it regardless of platform.
 */
export function PushPage() {
  const qc = useQueryClient();
  const [title, setTitle] = useState<string>("");
  const [body, setBody] = useState<string>("");
  const [audience, setAudience] = useState<PushAudience>("all");
  const [cityId, setCityId] = useState<string>("");
  const [plusOnly, setPlusOnly] = useState<boolean>(false);
  const [kind, setKind] = useState<string>("system");
  const [sending, setSending] = useState<boolean>(false);

  const { data: cities } = useQuery({
    queryKey: ["cities", "push"],
    queryFn: async (): Promise<CityRow[]> => {
      const { data, error } = await getSupabase()
        .from("cities")
        .select("id, name, status")
        .order("status", { ascending: false })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CityRow[];
    },
  });

  const { data: tokenCount } = useQuery({
    queryKey: ["device_token_count"],
    queryFn: fetchDeviceTokenCount,
    refetchInterval: 60_000,
  });

  const { data: log, isLoading: logLoading } = useQuery({
    queryKey: ["notification_log"],
    queryFn: () => fetchNotificationLog(50),
    refetchInterval: 30_000,
  });

  const handleSend = async (): Promise<void> => {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and body are required");
      return;
    }
    if (audience === "city" && !cityId) {
      toast.error("Pick a city to target");
      return;
    }
    setSending(true);
    try {
      const res = await sendPush({
        title: title.trim(),
        body: body.trim(),
        audience,
        cityId: audience === "city" ? cityId : undefined,
        plusOnly,
        data: { kind },
        sentBy: "admin:manual",
      });
      toast.success(
        `Push sent — ${res.ok}/${res.expoTokens} delivered · ${res.sent} total reached`
      );
      setTitle("");
      setBody("");
      qc.invalidateQueries({ queryKey: ["notification_log"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  const audienceHint = useMemo(() => {
    switch (audience) {
      case "all":
        return "Every registered device.";
      case "city":
        return "Only users whose home city matches the pick below.";
      case "plus":
        return "Only Stride+ subscribers.";
      case "featured":
        return "Logged as a featured-challenge alert.";
      default:
        return "";
    }
  }, [audience]);

  return (
    <div className="space-y-6">
      <p className="text-zinc-500 text-sm max-w-2xl">
        Send a push to registered devices and post it to the in-app inbox in one shot. City and Plus targeting are
        honoured server-side. Devices without push permission still see the message in their inbox on next poll (~60s).
      </p>

      {/* Reach panel */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Registered devices" value={(tokenCount ?? 0).toLocaleString()} icon={<Bell className="size-3.5" />} />
        <StatCard label="Pushes (last 50)" value={(log?.length ?? 0).toString()} icon={<History className="size-3.5" />} />
        <StatCard
          label="Delivered (last 50)"
          value={(log ?? []).reduce((s, r) => s + (r.ok_count ?? 0), 0).toLocaleString()}
          accent="emerald"
          icon={<Send className="size-3.5" />}
        />
        <StatCard
          label="Errors (last 50)"
          value={(log ?? []).reduce((s, r) => s + (r.error_count ?? 0), 0).toLocaleString()}
          accent={
            (log ?? []).reduce((s, r) => s + (r.error_count ?? 0), 0) > 0 ? "amber" : undefined
          }
          icon={<Sparkles className="size-3.5" />}
        />
      </div>

      {/* Composer */}
      <div className="rounded-2xl border border-zinc-900 bg-zinc-950/40 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-900 flex items-center gap-3">
          <Bell className="size-5 text-amber-300" />
          <div className="flex-1">
            <div className="font-bold">Compose broadcast</div>
            <div className="text-xs text-zinc-500">
              Goes to Expo Push and `notification_log` (in-app inbox) in one transaction.
            </div>
          </div>
        </div>

        <div className="p-5 grid grid-cols-2 gap-4">
          <Field label="Title" hint="Max ~60 chars — appears as the banner heading.">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="🔥 Hot Vaults are live" maxLength={80} />
          </Field>
          <Field label="Body" hint="Max ~150 chars — the rest is clipped by the OS.">
            <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="5 vaults paying 3× until 9pm — get walking." maxLength={180} />
          </Field>

          <Field label="Audience" hint={audienceHint}>
            <Select value={audience} onValueChange={(v) => setAudience(v as PushAudience)}>
              <SelectTrigger className="bg-zinc-950 border-zinc-800"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-zinc-950 border-zinc-800">
                <SelectItem value="all">
                  <span className="flex items-center gap-2"><Users className="size-3.5" /> Everyone</span>
                </SelectItem>
                <SelectItem value="city">
                  <span className="flex items-center gap-2"><MapPin className="size-3.5" /> By city</span>
                </SelectItem>
                <SelectItem value="plus">
                  <span className="flex items-center gap-2"><Crown className="size-3.5" /> Stride+ only</span>
                </SelectItem>
                <SelectItem value="featured">
                  <span className="flex items-center gap-2"><Sparkles className="size-3.5" /> Featured cohort</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {audience === "city" && (
            <Field label="City" hint="Only users whose home city matches receive this.">
              <Select value={cityId} onValueChange={setCityId}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800"><SelectValue placeholder="Pick a city…" /></SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800 max-h-72">
                  {(cities ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.status === "live" ? "· LIVE" : "· waitlist"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          <Field label="Stride+ only" hint="Extra filter — combinable with any audience.">
            <Switch checked={plusOnly} onCheckedChange={setPlusOnly} />
          </Field>

          <Field label="Notification kind" hint="Drives the in-app icon. system | city-live | challenge-invite | challenge-won | friend-joined">
            <Input value={kind} onChange={(e) => setKind(e.target.value)} placeholder="system" />
          </Field>
        </div>

        <div className="px-5 py-4 border-t border-zinc-900 flex items-center gap-3 bg-zinc-950/60">
          <div className="text-xs text-zinc-500">
            {tokenCount === undefined
              ? "Loading reach…"
              : `Estimated reach: up to ${tokenCount.toLocaleString()} devices${
                  audience === "city" && cityId ? " (filtered by city)" : ""
                }${plusOnly || audience === "plus" ? " · Stride+ only" : ""}`}
          </div>
          <div className="ml-auto" />
          <Button
            onClick={handleSend}
            disabled={sending || !title.trim() || !body.trim()}
            className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold"
          >
            <Send className="size-4 mr-1.5" /> {sending ? "Sending…" : "Send broadcast"}
          </Button>
        </div>
      </div>

      {/* History */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <History className="size-4 text-zinc-500" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Recent broadcasts</h2>
        </div>
        <DataTable
          rows={log}
          loading={logLoading}
          rowKey={(r) => r.id}
          empty="No broadcasts yet. Compose your first push above."
          columns={[
            {
              key: "title",
              header: "Broadcast",
              render: (r) => (
                <div>
                  <div className="font-semibold">{r.title}</div>
                  <div className="text-xs text-zinc-500 line-clamp-1">{r.body}</div>
                </div>
              ),
            },
            {
              key: "audience",
              header: "Audience",
              render: (r) => {
                const filter = r.audience_filter ?? {};
                const bits: string[] = [r.audience];
                if (filter.cityId) bits.push(filter.cityId);
                if (filter.plusOnly) bits.push("plus");
                return <span className="text-xs text-zinc-400">{bits.join(" · ")}</span>;
              },
            },
            { key: "sent_count", header: "Reached", align: "right", render: (r) => r.sent_count.toLocaleString() },
            {
              key: "ok_count",
              header: "Delivered",
              align: "right",
              render: (r) => <span className="text-emerald-400 font-bold">{r.ok_count.toLocaleString()}</span>,
            },
            {
              key: "error_count",
              header: "Errors",
              align: "right",
              render: (r) => (r.error_count > 0 ? <span className="text-amber-400 font-bold">{r.error_count}</span> : "—"),
            },
            {
              key: "sent_at",
              header: "Sent",
              align: "right",
              render: (r) => new Date(r.sent_at).toLocaleString(),
            },
            { key: "sent_by", header: "By", render: (r) => r.sent_by ?? "admin" },
          ]}
        />
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  accent?: "amber" | "emerald";
  icon?: React.ReactNode;
}
function StatCard({ label, value, accent, icon }: StatCardProps) {
  const color = accent === "emerald" ? "text-emerald-400" : accent === "amber" ? "text-amber-400" : "text-zinc-100";
  return (
    <div className="rounded-2xl border border-zinc-900 bg-zinc-950/60 p-5">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
        {icon} {label}
      </div>
      <div className={`mt-2 text-2xl font-black ${color}`}>{value}</div>
    </div>
  );
}
