"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import {
  Button,
  EmptyState,
  Input,
  PageHeader,
  Select,
} from "@/components/ui";
import type { Loop, Orientation } from "@/types/db";

export function LoopsClient() {
  const [loops, setLoops] = useState<Loop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [orientation, setOrientation] = useState<Orientation>("landscape");
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/loops");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setLoops(json.loops ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load loops");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const pastNames = useMemo(
    () => Array.from(new Set(loops.map((l) => l.name))).sort(),
    [loops],
  );

  const suggestions = useMemo(() => {
    const q = name.trim().toLowerCase();
    if (!q) return pastNames.slice(0, 6);
    return pastNames.filter((n) => n.toLowerCase().includes(q)).slice(0, 6);
  }, [name, pastNames]);

  async function createLoop() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/loops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), orientation }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setName("");
      setShowCreate(false);
      window.location.href = `/loops/${json.loop.id}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create loop");
    } finally {
      setCreating(false);
    }
  }

  async function deleteLoop(id: string) {
    if (!confirm("Delete this loop?")) return;
    const res = await fetch("/api/loops", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
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
        title="Loops"
        description="Build playlists from your library assets."
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            Create New Loop
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
          <h2 className="text-sm font-semibold">Create New Loop</h2>
          <div className="mt-3 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">
                Name
              </label>
              <Input
                list="loop-name-suggestions"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Lobby Menu"
              />
              <datalist id="loop-name-suggestions">
                {suggestions.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">
                Orientation
              </label>
              <Select
                value={orientation}
                onChange={(e) =>
                  setOrientation(e.target.value as Orientation)
                }
              >
                <option value="landscape">Landscape</option>
                <option value="portrait">Portrait</option>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => void createLoop()} disabled={creating}>
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
        <p className="text-sm text-zinc-500">Loading loops…</p>
      ) : loops.length === 0 ? (
        <EmptyState
          title="No loops yet"
          description="Create a loop, then add assets from your library."
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" />
              Create New Loop
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Orientation</th>
                <th className="px-4 py-2 font-medium">Updated</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loops.map((loop) => (
                <tr key={loop.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/loops/${loop.id}`}
                      className="font-medium text-teal-700 hover:underline"
                    >
                      {loop.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 capitalize text-zinc-600">
                    {loop.orientation}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {new Date(loop.updated_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => void deleteLoop(loop.id)}
                      className="text-zinc-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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
