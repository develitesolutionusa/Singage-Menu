"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import {
  Button,
  EmptyState,
  Input,
  PageHeader,
  Select,
} from "@/components/ui";
import type { Loop } from "@/types/db";

type CampaignRow = {
  id: string;
  name: string;
  mainLoopName: string | null;
  loopsCount: number;
  playersCount: number;
  updated_at: string;
};

export function CampaignsClient() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loops, setLoops] = useState<Loop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [mainLoopId, setMainLoopId] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [cRes, lRes] = await Promise.all([
        fetch("/api/campaigns"),
        fetch("/api/loops"),
      ]);
      const cJson = await cRes.json();
      const lJson = await lRes.json();
      if (!cRes.ok) throw new Error(cJson.error);
      if (!lRes.ok) throw new Error(lJson.error);
      setCampaigns(cJson.campaigns ?? []);
      setLoops(lJson.loops ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createCampaign() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          loopIds: mainLoopId ? [mainLoopId] : [],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setName("");
      setMainLoopId("");
      setShowCreate(false);
      window.location.href = `/campaigns/${json.campaign.id}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create campaign");
    } finally {
      setCreating(false);
    }
  }

  async function deleteCampaign(id: string) {
    if (!confirm("Delete this campaign?")) return;
    const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Delete failed");
      return;
    }
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Campaigns"
        description="Schedule loops, assign players, and set date exceptions."
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            Create Campaign
          </Button>
        }
      />

      {error ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {showCreate ? (
        <div className="mb-6 max-w-lg rounded-lg border border-zinc-200 p-4">
          <h2 className="text-sm font-semibold">Create Campaign</h2>
          <div className="mt-3 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">
                Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Lobby Weekday"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">
                Main loop (optional)
              </label>
              <Select
                className="w-full"
                value={mainLoopId}
                onChange={(e) => setMainLoopId(e.target.value)}
              >
                <option value="">Select later</option>
                {loops.map((loop) => (
                  <option key={loop.id} value={loop.id}>
                    {loop.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => void createCampaign()} disabled={creating}>
                {creating ? "Creating…" : "Create"}
              </Button>
              <Button variant="ghost" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-zinc-500">Loading campaigns…</p>
      ) : campaigns.length === 0 ? (
        <EmptyState
          title="No campaigns yet"
          description="Create a campaign, attach loops, then assign players."
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" />
              Create Campaign
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Main Loop</th>
                <th className="px-4 py-2 font-medium">Number of Loops</th>
                <th className="px-4 py-2 font-medium">Players</th>
                <th className="px-4 py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {campaigns.map((campaign) => (
                <tr key={campaign.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/campaigns/${campaign.id}`}
                      className="font-medium text-teal-700 hover:underline"
                    >
                      {campaign.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {campaign.mainLoopName ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {campaign.loopsCount}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {campaign.playersCount}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/campaigns/${campaign.id}`}
                        className="text-xs font-medium text-teal-700 hover:underline"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => void deleteCampaign(campaign.id)}
                        className="text-zinc-400 hover:text-red-600"
                        aria-label="Delete campaign"
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
    </div>
  );
}
