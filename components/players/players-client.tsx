"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Input,
  PageHeader,
  Select,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Campaign, Player, PlayerRotation } from "@/types/db";

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Karachi",
  "Asia/Dubai",
  "Asia/Singapore",
  "Australia/Sydney",
];

type EditState = {
  id: string;
  name: string;
  description: string;
  location: string;
  timezone: string;
  rotation: PlayerRotation;
  campaignId: string;
};

export function PlayersClient() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPair, setShowPair] = useState(false);
  const [pairCode, setPairCode] = useState("");
  const [pairName, setPairName] = useState("");
  const [pairing, setPairing] = useState(false);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load(opts?: { silent?: boolean }) {
    if (!opts?.silent) setLoading(true);
    setError(null);
    try {
      const [playersRes, campaignsRes] = await Promise.all([
        fetch("/api/players"),
        fetch("/api/campaigns"),
      ]);
      const playersJson = await playersRes.json();
      const campaignsJson = await campaignsRes.json();
      if (!playersRes.ok) throw new Error(playersJson.error);
      if (!campaignsRes.ok) throw new Error(campaignsJson.error);
      setPlayers(playersJson.players ?? []);
      setCampaigns(campaignsJson.campaigns ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load players");
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const id = setInterval(() => {
      void load({ silent: true });
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  async function pairPlayer() {
    setPairing(true);
    setError(null);
    try {
      const res = await fetch("/api/players/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: pairCode.trim(),
          name: pairName.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setPairCode("");
      setPairName("");
      setShowPair(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pairing failed");
    } finally {
      setPairing(false);
    }
  }

  function openEdit(player: Player) {
    setEdit({
      id: player.id,
      name: player.name,
      description: player.description ?? "",
      location: player.location ?? "",
      timezone: player.timezone,
      rotation: player.rotation,
      campaignId: player.campaign_id ?? "",
    });
  }

  async function saveEdit() {
    if (!edit) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/players/${edit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: edit.name,
          description: edit.description || null,
          location: edit.location || null,
          timezone: edit.timezone,
          rotation: edit.rotation,
          campaignId: edit.campaignId || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setEdit(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function deletePlayer(id: string) {
    setPendingDeleteId(id);
  }

  async function confirmDeletePlayer() {
    if (!pendingDeleteId) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/players/${pendingDeleteId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Delete failed");
        return;
      }
      setPendingDeleteId(null);
      await load();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Delete this player?"
        description="The device will need to be paired again to reconnect."
        busy={deleting}
        onCancel={() => {
          if (!deleting) setPendingDeleteId(null);
        }}
        onConfirm={() => void confirmDeletePlayer()}
      />
      <PageHeader
        title="Players"
        description="Pair devices, assign a campaign, and monitor online status."
        actions={
          <Button onClick={() => setShowPair(true)}>
            <Plus className="h-4 w-4" />
            Add New Player
          </Button>
        }
      />

      {error ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {showPair ? (
        <div className="mb-6 max-w-md rounded-lg border border-zinc-200 p-4">
          <h2 className="text-sm font-semibold">Add New Player</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Open <code className="rounded bg-zinc-100 px-1">/player</code> on
            the device, then enter the 6-digit code shown there.
          </p>
          <div className="mt-3 space-y-3">
            <Input
              placeholder="6-digit code"
              value={pairCode}
              maxLength={6}
              onChange={(e) =>
                setPairCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
            />
            <Input
              placeholder="Player name (optional)"
              value={pairName}
              onChange={(e) => setPairName(e.target.value)}
            />
            <div className="flex gap-2">
              <Button onClick={() => void pairPlayer()} disabled={pairing}>
                {pairing ? "Pairing…" : "Pair player"}
              </Button>
              <Button variant="ghost" onClick={() => setShowPair(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-zinc-500">Loading players…</p>
      ) : players.length === 0 ? (
        <EmptyState
          title="No players paired"
          description="Open /player on a device to get a pairing code, then add it here."
          action={
            <Button onClick={() => setShowPair(true)}>
              <Plus className="h-4 w-4" />
              Add New Player
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Player ID</th>
                <th className="px-4 py-2 font-medium">Last Connected</th>
                <th className="px-4 py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {players.map((player) => (
                <tr key={player.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className={cn(
                          "h-2.5 w-2.5 rounded-full",
                          player.status === "online"
                            ? "bg-emerald-500"
                            : player.status === "offline"
                              ? "bg-zinc-400"
                              : "bg-amber-400",
                        )}
                      />
                      <span className="capitalize text-zinc-600">
                        {player.status}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">{player.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                    {player.id.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {player.last_seen_at
                      ? new Date(player.last_seen_at).toLocaleString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/player/${player.id}`}
                        target="_blank"
                        className="text-zinc-500 hover:text-teal-700"
                        aria-label="Open player screen"
                        title="Open player screen"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => openEdit(player)}
                        className="text-zinc-500 hover:text-teal-700"
                        aria-label="Edit player"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void deletePlayer(player.id)}
                        className="text-zinc-400 hover:text-red-600"
                        aria-label="Delete player"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {edit ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-lg">
            <h2 className="text-lg font-semibold">Edit Player</h2>
            <div className="mt-4 grid gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">
                  Name
                </label>
                <Input
                  value={edit.name}
                  onChange={(e) =>
                    setEdit({ ...edit, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">
                  Description
                </label>
                <Input
                  value={edit.description}
                  onChange={(e) =>
                    setEdit({ ...edit, description: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">
                  Location
                </label>
                <Input
                  value={edit.location}
                  onChange={(e) =>
                    setEdit({ ...edit, location: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">
                  Timezone
                </label>
                <Select
                  className="w-full"
                  value={edit.timezone}
                  onChange={(e) =>
                    setEdit({ ...edit, timezone: e.target.value })
                  }
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">
                  Rotation
                </label>
                <Select
                  className="w-full"
                  value={edit.rotation}
                  onChange={(e) =>
                    setEdit({
                      ...edit,
                      rotation: Number(e.target.value) as PlayerRotation,
                    })
                  }
                >
                  <option value={0}>0°</option>
                  <option value={90}>90°</option>
                  <option value={180}>180°</option>
                  <option value={270}>270°</option>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">
                  Assigned campaign
                </label>
                <Select
                  className="w-full"
                  value={edit.campaignId}
                  onChange={(e) =>
                    setEdit({ ...edit, campaignId: e.target.value })
                  }
                >
                  <option value="">No campaign</option>
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEdit(null)}>
                Cancel
              </Button>
              <Button onClick={() => void saveEdit()} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
