"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ListPlus, Pencil, Plus, Trash2 } from "lucide-react";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Input,
  PageHeader,
  Select,
} from "@/components/ui";
import type { Loop, Orientation } from "@/types/db";

type EditState = {
  id: string;
  name: string;
  orientation: Orientation;
};

export function LoopsClient() {
  const [loops, setLoops] = useState<Loop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [orientation, setOrientation] = useState<Orientation>("landscape");
  const [creating, setCreating] = useState(false);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  function openEdit(loop: Loop) {
    setEdit({
      id: loop.id,
      name: loop.name,
      orientation: loop.orientation,
    });
  }

  async function saveEdit() {
    if (!edit || !edit.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/loops/${edit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: edit.name.trim(),
          orientation: edit.orientation,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setEdit(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update loop");
    } finally {
      setSaving(false);
    }
  }

  async function deleteLoop(id: string) {
    setPendingDeleteId(id);
  }

  async function confirmDeleteLoop() {
    if (!pendingDeleteId) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/loops/${pendingDeleteId}`, {
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
        title="Delete this loop?"
        description="Items inside it will be removed."
        busy={deleting}
        onCancel={() => {
          if (!deleting) setPendingDeleteId(null);
        }}
        onConfirm={() => void confirmDeleteLoop()}
      />
      <PageHeader
        title="Loops"
        description="Create, edit, and manage playlists from your library."
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
                <th className="px-4 py-2 font-medium">Action</th>
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
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(loop)}
                        className="text-zinc-500 hover:text-teal-700"
                        aria-label="Edit loop"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <Link
                        href={`/loops/${loop.id}`}
                        className="text-zinc-500 hover:text-teal-700"
                        aria-label="Add items to loop"
                        title="Add items"
                      >
                        <ListPlus className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => void deleteLoop(loop.id)}
                        className="text-zinc-400 hover:text-red-600"
                        aria-label="Delete loop"
                        title="Delete"
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
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg">
            <h2 className="text-lg font-semibold">Edit Loop</h2>
            <div className="mt-4 grid gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">
                  Name
                </label>
                <Input
                  value={edit.name}
                  onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void saveEdit();
                  }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">
                  Orientation
                </label>
                <Select
                  className="w-full"
                  value={edit.orientation}
                  onChange={(e) =>
                    setEdit({
                      ...edit,
                      orientation: e.target.value as Orientation,
                    })
                  }
                >
                  <option value="landscape">Landscape</option>
                  <option value="portrait">Portrait</option>
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
