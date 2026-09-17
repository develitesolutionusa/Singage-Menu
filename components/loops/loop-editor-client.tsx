"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Button, ConfirmDialog, EmptyState, Input, PageHeader, Select } from "@/components/ui";
import { formatDuration } from "@/lib/utils";
import type { LibraryItem, Loop, LoopItem, Orientation } from "@/types/db";

function SortableRow({
  item,
  onDurationChange,
  onRemove,
}: {
  item: LoopItem;
  onDurationChange: (id: string, value: number) => void;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-md border border-zinc-200 bg-white px-3 py-2"
    >
      <button
        type="button"
        className="cursor-grab text-zinc-400 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {item.library_item?.name ?? "Asset"}
        </p>
        <p className="text-xs text-zinc-500 capitalize">
          {item.library_item?.file_type ?? "media"}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={1}
          step={1}
          className="w-20"
          value={item.duration_seconds}
          onChange={(e) =>
            onDurationChange(item.id, Number(e.target.value) || 1)
          }
        />
        <span className="text-xs text-zinc-500">sec</span>
      </div>
      <button
        type="button"
        onClick={() => onRemove(item.id)}
        className="text-zinc-400 hover:text-red-600"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export function LoopEditorClient({ loopId }: { loopId: string }) {
  const [loop, setLoop] = useState<Loop | null>(null);
  const [items, setItems] = useState<LoopItem[]>([]);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [folderNames, setFolderNames] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [editName, setEditName] = useState("");
  const [editOrientation, setEditOrientation] =
    useState<Orientation>("landscape");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const load = useCallback(async () => {
    setError(null);
    try {
      const [loopRes, libRes, foldersRes] = await Promise.all([
        fetch(`/api/loops/${loopId}/items`),
        fetch("/api/library?folderId=all&sort=name&order=asc"),
        fetch("/api/library/folders?parentId=all"),
      ]);
      const loopJson = await loopRes.json();
      const libJson = await libRes.json();
      const foldersJson = await foldersRes.json();
      if (!loopRes.ok) throw new Error(loopJson.error);
      if (!libRes.ok) throw new Error(libJson.error);
      if (!foldersRes.ok) throw new Error(foldersJson.error);
      setLoop(loopJson.loop);
      setEditName(loopJson.loop?.name ?? "");
      setEditOrientation(loopJson.loop?.orientation ?? "landscape");
      setItems(loopJson.items ?? []);
      setLibrary(libJson.items ?? []);
      const names: Record<string, string> = {};
      for (const folder of foldersJson.folders ?? []) {
        names[folder.id] = folder.name;
      }
      setFolderNames(names);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load loop");
    }
  }, [loopId]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalSeconds = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.duration_seconds || 0), 0),
    [items],
  );

  const availableLibrary = useMemo(() => {
    const used = new Set(
      items
        .map((item) => item.library_item_id)
        .filter((id): id is string => Boolean(id)),
    );
    return library.filter((asset) => !used.has(asset.id));
  }, [library, items]);

  async function persistOrder(next: LoopItem[]) {
    setSaving(true);
    try {
      const res = await fetch(`/api/loops/${loopId}/items`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: next.map((item, index) => ({
            id: item.id,
            position: index,
            durationSeconds: Number(item.duration_seconds),
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const next = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
      ...item,
      position: index,
    }));
    setItems(next);
    void persistOrder(next);
  }

  function onDurationChange(id: string, value: number) {
    const next = items.map((item) =>
      item.id === id ? { ...item, duration_seconds: value } : item,
    );
    setItems(next);
  }

  async function commitDurations() {
    await persistOrder(items);
  }

  async function addAsset(libraryItemId: string) {
    const res = await fetch(`/api/loops/${loopId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ libraryItemId }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Could not add asset");
      return;
    }
    await load();
  }

  async function removeItem(itemId: string) {
    const res = await fetch(`/api/loops/${loopId}/items`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Could not remove item");
      return;
    }
    await load();
  }

  async function saveLoopMeta() {
    if (!editName.trim()) {
      setError("Loop name is required");
      return;
    }
    setSavingMeta(true);
    setError(null);
    try {
      const res = await fetch(`/api/loops/${loopId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          orientation: editOrientation,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not update loop");
      setLoop(json.loop);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update loop");
    } finally {
      setSavingMeta(false);
    }
  }

  async function deleteLoop() {
    setConfirmDelete(true);
  }

  async function confirmDeleteLoop() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/loops/${loopId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Could not delete loop");
        return;
      }
      window.location.href = "/loops";
    } finally {
      setDeleting(false);
    }
  }

  const metaDirty =
    !!loop &&
    (editName.trim() !== loop.name || editOrientation !== loop.orientation);

  return (
    <div>
      <ConfirmDialog
        open={confirmDelete}
        title="Delete this loop?"
        description="This cannot be undone."
        busy={deleting}
        onCancel={() => {
          if (!deleting) setConfirmDelete(false);
        }}
        onConfirm={() => void confirmDeleteLoop()}
      />
      <PageHeader
        title={loop?.name ?? "Loop Editor"}
        description={
          loop
            ? `${loop.orientation} · Running time ${formatDuration(totalSeconds)}${saving ? " · Saving…" : ""}`
            : "Loading…"
        }
        actions={
          <>
            <Link href="/loops">
              <Button variant="secondary">Back to loops</Button>
            </Link>
            <Button variant="danger" onClick={() => void deleteLoop()}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
            <Button onClick={() => setShowPicker((v) => !v)}>
              <Plus className="h-4 w-4" />
              Add from Library
            </Button>
          </>
        }
      />

      {loop ? (
        <div className="mb-6 grid max-w-2xl gap-3 rounded-lg border border-zinc-200 p-4 sm:grid-cols-[1fr_auto_auto]">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">
              Name
            </label>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">
              Orientation
            </label>
            <Select
              value={editOrientation}
              onChange={(e) =>
                setEditOrientation(e.target.value as Orientation)
              }
            >
              <option value="landscape">Landscape</option>
              <option value="portrait">Portrait</option>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={() => void saveLoopMeta()}
              disabled={!metaDirty || savingMeta}
            >
              {savingMeta ? "Saving…" : "Save details"}
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {showPicker ? (
        <div className="mb-6 max-h-64 overflow-auto rounded-lg border border-zinc-200">
          {availableLibrary.length === 0 ? (
            <p className="p-4 text-sm text-zinc-500">
              {library.length === 0
                ? "No library items yet. Upload media first."
                : "All library items are already in this loop."}
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {availableLibrary.map((asset) => (
                <li
                  key={asset.id}
                  className="flex items-center justify-between gap-3 px-4 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{asset.name}</p>
                    <p className="text-xs capitalize text-zinc-500">
                      {asset.file_type}
                      {" · "}
                      {asset.folder_id
                        ? (folderNames[asset.folder_id] ?? "Folder")
                        : "Root"}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => void addAsset(asset.id)}
                  >
                    Add
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {items.length === 0 ? (
        <EmptyState
          title="This loop is empty"
          description="Add assets from your library, then drag to reorder."
          action={
            <Button onClick={() => setShowPicker(true)}>
              <Plus className="h-4 w-4" />
              Add from Library
            </Button>
          }
        />
      ) : (
        <>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={items.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {items.map((item) => (
                  <SortableRow
                    key={item.id}
                    item={item}
                    onDurationChange={onDurationChange}
                    onRemove={(id) => void removeItem(id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <div className="mt-4">
            <Button variant="secondary" onClick={() => void commitDurations()}>
              Save durations
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
