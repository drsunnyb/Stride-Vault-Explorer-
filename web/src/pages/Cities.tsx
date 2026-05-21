import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { getSupabase } from "@/lib/supabase";
import { sendPush } from "@/lib/push";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/DataTable";
import { RowEditor, Field } from "@/components/RowEditor";
import type { CityRow } from "@/lib/types";

const EMPTY: CityRow = {
  id: "",
  name: "",
  country: "",
  country_code: "",
  lat: 0,
  lng: 0,
  radius_km: 25,
  status: "waitlist",
  tagline: "",
  votes: 0,
  active: true,
  sort_order: 0,
};

function flag(cc: string): string {
  if (!cc || cc.length < 2) return "🏳️";
  return cc.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

export function CitiesPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["cities"],
    queryFn: async (): Promise<CityRow[]> => {
      const supa = getSupabase();
      const { data, error } = await supa
        .from("cities")
        .select("*")
        .order("status", { ascending: false })
        .order("votes", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CityRow[];
    },
  });

  const [editing, setEditing] = useState<CityRow | null>(null);
  const [isNew, setIsNew] = useState<boolean>(false);

  const save = useMutation({
    mutationFn: async (row: CityRow) => {
      const supa = getSupabase();
      // Detect waitlist -> live flips so we can broadcast to that city's
      // residents without spamming on every edit.
      const prev = (data ?? []).find((r) => r.id === row.id);
      const goingLive = prev && prev.status !== "live" && row.status === "live";
      const { error } = await supa.from("cities").upsert(
        { ...row, updated_at: new Date().toISOString() },
        { onConflict: "id" }
      );
      if (error) throw error;
      return { row, goingLive: !!goingLive };
    },
    onSuccess: async ({ row, goingLive }) => {
      toast.success("City saved");
      qc.invalidateQueries({ queryKey: ["cities"] });
      if (goingLive) {
        try {
          const res = await sendPush({
            title: `🎉 ${row.name} is now LIVE`,
            body: `Vaults just unlocked in ${row.name} — open the map and start your streak.`,
            audience: "city",
            cityId: row.id,
            data: { kind: "city-live", cityId: row.id },
            sentBy: "auto:city-live",
          });
          toast.message(`Push fired to ${row.name} · ${res.ok}/${res.expoTokens} delivered`);
        } catch (e) {
          toast.error(`Push failed: ${(e as Error).message}`);
        }
      }
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const supa = getSupabase();
      const { error } = await supa.from("cities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("City deleted");
      qc.invalidateQueries({ queryKey: ["cities"] });
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-zinc-500 text-sm">
          Cities & waitlist. Flip a city's status to <strong className="text-emerald-400">live</strong> to unlock vaults there.
          Players outside live cities rally votes to push their metro up the leaderboard.
        </p>
        <Button
          onClick={() => {
            setIsNew(true);
            setEditing({ ...EMPTY, sort_order: (data?.length ?? 0) * 10 });
          }}
          className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold"
        >
          <Plus className="size-4 mr-1" /> New city
        </Button>
      </div>

      <DataTable
        rows={data}
        loading={isLoading}
        rowKey={(r) => r.id}
        empty="No cities yet."
        onRowClick={(r) => {
          setIsNew(false);
          setEditing(r);
        }}
        columns={[
          {
            key: "name",
            header: "City",
            render: (r) => (
              <div className="flex items-center gap-3">
                <span className="text-2xl leading-none">{flag(r.country_code)}</span>
                <div>
                  <div className="font-semibold">{r.name}</div>
                  <div className="text-xs text-zinc-500">{r.country}</div>
                </div>
              </div>
            ),
          },
          { key: "tagline", header: "Tagline", render: (r) => r.tagline ?? "" },
          {
            key: "status",
            header: "Status",
            render: (r) =>
              r.status === "live" ? (
                <span className="text-xs font-bold text-emerald-400 bg-emerald-950/40 px-2 py-1 rounded">LIVE</span>
              ) : (
                <span className="text-xs font-bold text-amber-400 bg-amber-950/30 px-2 py-1 rounded">WAITLIST</span>
              ),
          },
          { key: "votes", header: "Votes", align: "right", render: (r) => r.votes.toLocaleString() },
          { key: "radius_km", header: "Radius", align: "right", render: (r) => `${r.radius_km} km` },
        ]}
      />

      <RowEditor
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        title={isNew ? "New city" : editing?.name ?? ""}
        saving={save.isPending}
        isNew={isNew}
        onSave={() => editing && save.mutate(editing)}
        onDelete={() => editing && confirm(`Delete ${editing.name}?`) && remove.mutate(editing.id)}
      >
        {editing && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="ID (slug)" hint="lowercase, e.g. new-york">
              <Input disabled={!isNew} value={editing.id} onChange={(e) => setEditing({ ...editing, id: e.target.value })} />
            </Field>
            <Field label="Name">
              <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </Field>
            <Field label="Country">
              <Input value={editing.country} onChange={(e) => setEditing({ ...editing, country: e.target.value })} />
            </Field>
            <Field label="Country code (ISO-2)" hint={`Flag preview: ${flag(editing.country_code)}`}>
              <Input
                value={editing.country_code}
                onChange={(e) => setEditing({ ...editing, country_code: e.target.value.toUpperCase() })}
                maxLength={2}
              />
            </Field>
            <Field label="Latitude">
              <Input
                type="number"
                step="0.0001"
                value={editing.lat}
                onChange={(e) => setEditing({ ...editing, lat: parseFloat(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Longitude">
              <Input
                type="number"
                step="0.0001"
                value={editing.lng}
                onChange={(e) => setEditing({ ...editing, lng: parseFloat(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Radius (km)" hint="Auto-detect range — London ~40km covers Greater London + commuter belt">
              <Input
                type="number"
                value={editing.radius_km}
                onChange={(e) => setEditing({ ...editing, radius_km: parseInt(e.target.value) || 25 })}
              />
            </Field>
            <Field label="Tagline">
              <Input value={editing.tagline ?? ""} onChange={(e) => setEditing({ ...editing, tagline: e.target.value })} />
            </Field>
            <Field label="Status">
              <Select
                value={editing.status}
                onValueChange={(v) => setEditing({ ...editing, status: v as "live" | "waitlist" })}
              >
                <SelectTrigger className="bg-zinc-950 border-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800">
                  <SelectItem value="waitlist">Waitlist</SelectItem>
                  <SelectItem value="live">Live (vaults unlocked)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Votes (override)" hint="Live total — usually managed automatically">
              <Input
                type="number"
                value={editing.votes}
                onChange={(e) => setEditing({ ...editing, votes: parseInt(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Sort order">
              <Input
                type="number"
                value={editing.sort_order}
                onChange={(e) => setEditing({ ...editing, sort_order: parseInt(e.target.value) || 0 })}
              />
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
