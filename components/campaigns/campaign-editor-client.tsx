"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import {
  Button,
  EmptyState,
  Input,
  PageHeader,
  Select,
} from "@/components/ui";
import type {
  Campaign,
  CampaignException,
  CampaignLoop,
  CampaignPlayer,
  Loop,
  Player,
} from "@/types/db";

const DAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

type ExceptionRow = CampaignException & {
  override_loop?: Loop | null;
};

type LoopRow = CampaignLoop & { loop?: Loop | null };
type PlayerRow = CampaignPlayer & { player?: Player | null };

export function CampaignEditorClient({ campaignId }: { campaignId: string }) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [name, setName] = useState("");
  const [campaignLoops, setCampaignLoops] = useState<LoopRow[]>([]);
  const [campaignPlayers, setCampaignPlayers] = useState<PlayerRow[]>([]);
  const [exceptions, setExceptions] = useState<ExceptionRow[]>([]);
  const [allLoops, setAllLoops] = useState<Loop[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [addLoopId, setAddLoopId] = useState("");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);

  const [exName, setExName] = useState("Holiday Override");
  const [exLoopId, setExLoopId] = useState("");
  const [exStart, setExStart] = useState("");
  const [exEnd, setExEnd] = useState("");
  const [exDays, setExDays] = useState<number[]>([]);
  const [exEnabled, setExEnabled] = useState(true);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [cRes, lRes, pRes] = await Promise.all([
        fetch(`/api/campaigns/${campaignId}`),
        fetch("/api/loops"),
        fetch("/api/players"),
      ]);
      const cJson = await cRes.json();
      const lJson = await lRes.json();
      const pJson = await pRes.json();
      if (!cRes.ok) throw new Error(cJson.error);
      if (!lRes.ok) throw new Error(lJson.error);
      if (!pRes.ok) throw new Error(pJson.error);

      setCampaign(cJson.campaign);
      setName(cJson.campaign?.name ?? "");
      setCampaignLoops(cJson.loops ?? []);
      setCampaignPlayers(cJson.players ?? []);
      setExceptions(cJson.exceptions ?? []);
      setAllLoops(lJson.loops ?? []);
      setAllPlayers(pJson.players ?? []);
      setSelectedPlayerIds(
        (cJson.players ?? []).map((row: PlayerRow) => row.player_id),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load campaign");
    }
  }, [campaignId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveName() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setCampaign(json.campaign);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function addLoop() {
    if (!addLoopId) return;
    const res = await fetch(`/api/campaigns/${campaignId}/loops`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loopId: addLoopId }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Could not add loop");
      return;
    }
    setAddLoopId("");
    await load();
  }

  async function removeLoop(campaignLoopId: string) {
    const res = await fetch(`/api/campaigns/${campaignId}/loops`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignLoopId }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Could not remove loop");
      return;
    }
    await load();
  }

  async function moveLoop(index: number, direction: -1 | 1) {
    const next = [...campaignLoops];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const tmp = next[index];
    next[index] = next[target];
    next[target] = tmp;
    const res = await fetch(`/api/campaigns/${campaignId}/loops`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loopIds: next.map((row) => row.loop_id) }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Could not reorder");
      return;
    }
    await load();
  }

  async function savePlayers() {
    const res = await fetch(`/api/campaigns/${campaignId}/players`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerIds: selectedPlayerIds }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Could not assign players");
      return;
    }
    await load();
  }

  function toggleDay(day: number) {
    setExDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  }

  async function addException() {
    if (!exLoopId) {
      setError("Pick an override loop for the exception");
      return;
    }
    const res = await fetch(`/api/campaigns/${campaignId}/exceptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: exName.trim() || "Exception",
        overrideLoopId: exLoopId,
        startDate: exStart || null,
        endDate: exEnd || null,
        daysOfWeek: exDays.length ? exDays : null,
        enabled: exEnabled,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Could not create exception");
      return;
    }
    setExName("Holiday Override");
    setExLoopId("");
    setExStart("");
    setExEnd("");
    setExDays([]);
    setExEnabled(true);
    await load();
  }

  async function toggleException(ex: ExceptionRow) {
    const res = await fetch(`/api/campaigns/${campaignId}/exceptions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exceptionId: ex.id,
        enabled: !ex.enabled,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Could not update exception");
      return;
    }
    await load();
  }

  async function deleteException(exceptionId: string) {
    if (!confirm("Delete this exception?")) return;
    const res = await fetch(`/api/campaigns/${campaignId}/exceptions`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exceptionId }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Could not delete exception");
      return;
    }
    await load();
  }

  async function deleteCampaign() {
    if (!confirm("Delete this campaign?")) return;
    const res = await fetch(`/api/campaigns/${campaignId}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Could not delete");
      return;
    }
    window.location.href = "/campaigns";
  }

  const attachedLoopIds = new Set(campaignLoops.map((r) => r.loop_id));

  return (
    <div>
      <PageHeader
        title={campaign?.name ?? "Campaign"}
        description="Loops play in order. Exceptions override the schedule on matching dates."
        actions={
          <>
            <Link href="/campaigns">
              <Button variant="secondary">Back</Button>
            </Link>
            <Button variant="danger" onClick={() => void deleteCampaign()}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </>
        }
      />

      {error ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <section className="mb-6 max-w-xl rounded-lg border border-zinc-200 p-4">
        <h2 className="text-sm font-semibold">Details</h2>
        <div className="mt-3 flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
          <Button
            onClick={() => void saveName()}
            disabled={saving || name.trim() === campaign?.name}
          >
            Save
          </Button>
        </div>
      </section>

      <section className="mb-6 rounded-lg border border-zinc-200 p-4">
        <h2 className="text-sm font-semibold">Loops (ordered)</h2>
        <p className="mt-1 text-xs text-zinc-500">
          First loop is the Main Loop. Multiple loops play back-to-back.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Select
            value={addLoopId}
            onChange={(e) => setAddLoopId(e.target.value)}
          >
            <option value="">Add loop…</option>
            {allLoops
              .filter((l) => !attachedLoopIds.has(l.id))
              .map((loop) => (
                <option key={loop.id} value={loop.id}>
                  {loop.name}
                </option>
              ))}
          </Select>
          <Button onClick={() => void addLoop()} disabled={!addLoopId}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
        {campaignLoops.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No loops attached"
              description="Add at least one loop for normal (non-exception) playback."
            />
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-100 rounded-md border border-zinc-100">
            {campaignLoops.map((row, index) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
              >
                <div>
                  <span className="mr-2 text-xs text-zinc-400">
                    #{index + 1}
                    {index === 0 ? " · Main" : ""}
                  </span>
                  <span className="font-medium">
                    {row.loop?.name ?? row.loop_id}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => void moveLoop(index, -1)}
                    disabled={index === 0}
                  >
                    Up
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => void moveLoop(index, 1)}
                    disabled={index === campaignLoops.length - 1}
                  >
                    Down
                  </Button>
                  <button
                    type="button"
                    onClick={() => void removeLoop(row.id)}
                    className="text-zinc-400 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-6 rounded-lg border border-zinc-200 p-4">
        <h2 className="text-sm font-semibold">Players</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Assign one or more players to this campaign (replaces direct loop
          assignment).
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {allPlayers.map((player) => {
            const checked = selectedPlayerIds.includes(player.id);
            return (
              <label
                key={player.id}
                className="flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    setSelectedPlayerIds((prev) =>
                      checked
                        ? prev.filter((id) => id !== player.id)
                        : [...prev, player.id],
                    );
                  }}
                />
                {player.name}
              </label>
            );
          })}
        </div>
        {allPlayers.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">
            No paired players yet. Pair a device first.
          </p>
        ) : (
          <div className="mt-3">
            <Button onClick={() => void savePlayers()}>Save player assignments</Button>
          </div>
        )}
        {campaignPlayers.length > 0 ? (
          <p className="mt-2 text-xs text-zinc-500">
            Currently assigned:{" "}
            {campaignPlayers
              .map((row) => row.player?.name ?? row.player_id.slice(0, 8))
              .join(", ")}
          </p>
        ) : null}
      </section>

      <section className="mb-6 rounded-lg border border-zinc-200 p-4">
        <h2 className="text-sm font-semibold">Exceptions</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Default state is <strong>No Exception</strong> (campaign loops play).
          When a rule matches today&apos;s date/day in the player timezone, its
          override loop plays instead.
        </p>

        <div className="mt-4 grid max-w-2xl gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-zinc-500">
              Name
            </label>
            <Input value={exName} onChange={(e) => setExName(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-zinc-500">
              Override loop
            </label>
            <Select
              className="w-full"
              value={exLoopId}
              onChange={(e) => setExLoopId(e.target.value)}
            >
              <option value="">Select loop…</option>
              {allLoops.map((loop) => (
                <option key={loop.id} value={loop.id}>
                  {loop.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">
              Start date
            </label>
            <Input
              type="date"
              value={exStart}
              onChange={(e) => setExStart(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">
              End date
            </label>
            <Input
              type="date"
              value={exEnd}
              onChange={(e) => setExEnd(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-zinc-500">
              Days of week (optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => (
                <label
                  key={day.value}
                  className="flex items-center gap-1 rounded border border-zinc-200 px-2 py-1 text-xs"
                >
                  <input
                    type="checkbox"
                    checked={exDays.includes(day.value)}
                    onChange={() => toggleDay(day.value)}
                  />
                  {day.label}
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={exEnabled}
              onChange={(e) => setExEnabled(e.target.checked)}
            />
            Enabled
          </label>
          <div className="sm:col-span-2">
            <Button onClick={() => void addException()}>
              <Plus className="h-4 w-4" />
              Add exception
            </Button>
          </div>
        </div>

        {exceptions.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">
            No exceptions — players use the campaign loops (No Exception).
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-100 rounded-md border border-zinc-100">
            {exceptions.map((ex) => (
              <li
                key={ex.id}
                className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {ex.name}{" "}
                    <span
                      className={
                        ex.enabled ? "text-emerald-600" : "text-zinc-400"
                      }
                    >
                      ({ex.enabled ? "enabled" : "disabled"})
                    </span>
                  </p>
                  <p className="text-xs text-zinc-500">
                    Override: {ex.override_loop?.name ?? ex.override_loop_id}
                    {" · "}
                    {ex.start_date || "…"} → {ex.end_date || "…"}
                    {ex.days_of_week?.length
                      ? ` · ${ex.days_of_week
                          .map(
                            (d) => DAYS.find((x) => x.value === d)?.label ?? d,
                          )
                          .join(",")}`
                      : " · all days"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => void toggleException(ex)}
                  >
                    {ex.enabled ? "Disable" : "Enable"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => void deleteException(ex.id)}
                    className="text-zinc-400 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
