"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  ChevronLeft,
  Folder,
  GripVertical,
  Pause,
  Play,
  SkipForward,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Input,
  Select,
} from "@/components/ui";
import { DesignEditorShell } from "@/components/design-editor/design-editor-shell";
import type { EditorWorkspaceMode } from "@/components/design-editor/design-editor-toolbar";
import { TemplatePreview } from "@/components/templates/template-preview";
import { resolveSlideDesign } from "@/lib/loop-slides";
import { cn, formatBytes, formatDuration } from "@/lib/utils";
import type {
  DesignData,
  LibraryFolder,
  LibraryItem,
  Loop,
  LoopItem,
  Orientation,
} from "@/types/db";

type PathSegment = { id: string; name: string };

function SortableTimelineRow({
  item,
  index,
  selected,
  onSelect,
  onDurationChange,
  onRemove,
}: {
  item: LoopItem;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onDurationChange: (id: string, value: number) => void;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const media = item.library_item;
  const isDesign = item.item_type === "design";

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-md border bg-white px-3 py-2",
        selected
          ? "border-teal-600 ring-1 ring-teal-600"
          : "border-zinc-200 hover:border-zinc-300",
      )}
    >
      <button
        type="button"
        className="cursor-grab text-zinc-400 active:cursor-grabbing"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="w-6 shrink-0 text-xs text-zinc-400">#{index + 1}</span>
      <div className="h-9 w-14 shrink-0 overflow-hidden rounded bg-zinc-100">
        {isDesign && (item.content_data || item.design_data) ? (
          <TemplatePreview
            data={
              (resolveSlideDesign(item) ??
                item.content_data ??
                item.design_data) as DesignData
            }
            compact
            className="h-full w-full"
          />
        ) : media?.file_type === "image" && media.public_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={media.public_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-zinc-400">
            Video
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {isDesign ? (item.slide_name ?? "Template") : (media?.name ?? "Asset")}
        </p>
        <p className="text-xs capitalize text-zinc-500">
          {isDesign ? "template" : (media?.file_type ?? "media")}
        </p>
      </div>
      <div
        className="flex items-center gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        <Input
          type="number"
          min={1}
          step={1}
          className="w-16"
          value={item.duration_seconds}
          onChange={(e) =>
            onDurationChange(item.id, Number(e.target.value) || 1)
          }
        />
        <span className="text-xs text-zinc-500">sec</span>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(item.id);
        }}
        className="text-zinc-400 hover:text-red-600"
        aria-label="Remove from loop"
        title="Remove"
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
  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [path, setPath] = useState<PathSegment[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState("");
  const [editOrientation, setEditOrientation] =
    useState<Orientation>("landscape");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [workspaceMode, setWorkspaceMode] =
    useState<EditorWorkspaceMode>("timeline");
  const [designDirty, setDesignDirty] = useState(false);
  const [baseline, setBaseline] = useState<{
    name: string;
    orientation: Orientation;
    itemsKey: string;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const folderId = path.length ? path[path.length - 1].id : null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const itemsKey = useMemo(
    () =>
      items
        .map((i) => `${i.id}:${i.position}:${i.duration_seconds}`)
        .join("|"),
    [items],
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

      const nextItems: LoopItem[] = loopJson.items ?? [];
      const nextName = loopJson.loop?.name ?? "";
      const nextOrientation: Orientation =
        loopJson.loop?.orientation ?? "landscape";

      setLoop(loopJson.loop);
      setEditName(nextName);
      setEditOrientation(nextOrientation);
      setItems(nextItems);
      setLibrary(libJson.items ?? []);
      setFolders(foldersJson.folders ?? []);
      setBaseline({
        name: nextName,
        orientation: nextOrientation,
        itemsKey: nextItems
          .map((i) => `${i.id}:${i.position}:${i.duration_seconds}`)
          .join("|"),
      });
      setDirty(false);
      setSelectedId((prev) => {
        if (prev && nextItems.some((i) => i.id === prev)) return prev;
        return nextItems[0]?.id ?? null;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load loop");
    }
  }, [loopId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!baseline) return;
    setDirty(
      editName.trim() !== baseline.name ||
        editOrientation !== baseline.orientation ||
        itemsKey !== baseline.itemsKey ||
        designDirty,
    );
  }, [baseline, designDirty, editName, editOrientation, itemsKey]);

  const totalSeconds = useMemo(
    () =>
      items.reduce((sum, item) => sum + Number(item.duration_seconds || 0), 0),
    [items],
  );

  const usedLibraryIds = useMemo(
    () =>
      new Set(
        items
          .map((item) => item.library_item_id)
          .filter((id): id is string => Boolean(id)),
      ),
    [items],
  );

  const childFolders = useMemo(
    () =>
      folders
        .filter((f) => f.parent_id === folderId)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [folders, folderId],
  );

  const paneAssets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return library
      .filter((asset) => !usedLibraryIds.has(asset.id))
      .filter((asset) =>
        q
          ? asset.name.toLowerCase().includes(q)
          : (asset.folder_id ?? null) === folderId,
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [library, usedLibraryIds, folderId, search]);

  const selectedItem = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  );

  const selectedIndex = useMemo(
    () => items.findIndex((i) => i.id === selectedId),
    [items, selectedId],
  );

  useEffect(() => {
    if (!playing || !selectedItem) return;
    const media = selectedItem.library_item;
    if (media?.file_type === "video") {
      void videoRef.current?.play().catch(() => undefined);
      return;
    }
    const ms = Math.max(1, Number(selectedItem.duration_seconds) || 1) * 1000;
    const timer = window.setTimeout(() => {
      if (items.length === 0) {
        setPlaying(false);
        return;
      }
      const next = (selectedIndex + 1) % items.length;
      setSelectedId(items[next].id);
    }, ms);
    return () => window.clearTimeout(timer);
  }, [playing, selectedItem, selectedIndex, items]);

  function openFolder(folder: LibraryFolder) {
    setPath((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setSearch("");
  }

  function goBreadcrumb(index: number) {
    if (index < 0) {
      setPath([]);
      return;
    }
    setPath((prev) => prev.slice(0, index + 1));
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
      ...item,
      position: index,
    }));
    setItems(next);
  }

  function onDurationChange(id: string, value: number) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, duration_seconds: value } : item,
      ),
    );
  }

  async function addAsset(libraryItemId: string) {
    setError(null);
    const res = await fetch(`/api/loops/${loopId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ libraryItemId }),
    });
    const json = await res.json();
    if (!res.ok) {
      const message = json.error ?? "Could not add asset";
      setError(message);
      toast.error(message);
      return;
    }
    toast.success("Asset added to loop");
    await load();
    if (json.item?.id) setSelectedId(json.item.id);
  }

  async function removeItem(itemId: string) {
    setError(null);
    const res = await fetch(`/api/loops/${loopId}/items`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    });
    const json = await res.json();
    if (!res.ok) {
      const message = json.error ?? "Could not remove item";
      setError(message);
      toast.error(message);
      return;
    }
    toast.success("Item removed from loop");
    await load();
  }

  async function confirmDeleteLoop() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/loops/${loopId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        const message = json.error ?? "Could not delete loop";
        setError(message);
        toast.error(message);
        return;
      }
      toast.success("Loop deleted");
      window.location.href = "/loops";
    } finally {
      setDeleting(false);
    }
  }

  function playPreview() {
    if (items.length === 0) return;
    if (!selectedId) setSelectedId(items[0].id);
    setPlaying(true);
  }

  function pausePreview() {
    setPlaying(false);
    videoRef.current?.pause();
  }

  function nextPreview() {
    if (items.length === 0) return;
    const next = (Math.max(0, selectedIndex) + 1) % items.length;
    setSelectedId(items[next].id);
  }

  const previewMedia = selectedItem?.library_item ?? null;
  const previewDesign =
    selectedItem?.item_type === "design"
      ? resolveSlideDesign(selectedItem)
      : null;

  function handleDesignDataChange(data: DesignData) {
    if (!selectedId) return;
    setItems((prev) =>
      prev.map((item) =>
        item.id === selectedId
          ? {
              ...item,
              content_data: data,
              design_data: data,
              publish_status: "draft",
            }
          : item,
      ),
    );
    setDesignDirty(true);
  }

  async function saveAll() {
    if (!editName.trim()) {
      const message = "Loop name is required";
      setError(message);
      toast.error(message);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const metaRes = await fetch(`/api/loops/${loopId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          orientation: editOrientation,
        }),
      });
      const metaJson = await metaRes.json();
      if (!metaRes.ok) throw new Error(metaJson.error ?? "Could not save loop");

      const itemsRes = await fetch(`/api/loops/${loopId}/items`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item, index) => ({
            id: item.id,
            position: index,
            durationSeconds: Number(item.duration_seconds),
            ...(item.item_type === "design"
              ? {
                  contentData: item.content_data ?? item.design_data ?? {},
                  slideName: item.slide_name ?? undefined,
                }
              : {}),
          })),
        }),
      });
      const itemsJson = await itemsRes.json();
      if (!itemsRes.ok) throw new Error(itemsJson.error ?? "Could not save items");

      toast.success("Loop saved");
      setDesignDirty(false);
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not save";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col">
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

      {workspaceMode === "design" ? (
        <DesignEditorShell
          mode={workspaceMode}
          onModeChange={(mode) => {
            if (mode === "timeline") setWorkspaceMode("timeline");
            else setWorkspaceMode("design");
          }}
          slideName={
            selectedItem?.slide_name ||
            selectedItem?.library_item?.name ||
            editName ||
            "Untitled slide"
          }
          onSlideNameChange={(value) => {
            if (!selectedId) return;
            setItems((prev) =>
              prev.map((item) =>
                item.id === selectedId ? { ...item, slide_name: value } : item,
              ),
            );
            setDesignDirty(true);
          }}
          orientation={editOrientation}
          onOrientationChange={setEditOrientation}
          designData={selectedItem?.design_data ?? null}
          contentData={selectedItem?.content_data ?? null}
          autoSaveStatus={
            saving ? "saving" : dirty ? "unsaved" : "saved"
          }
          dirty={dirty}
          saving={saving}
          onSave={() => void saveAll()}
          onDesignDataChange={handleDesignDataChange}
          slideId={selectedId}
        />
      ) : (
        <>
      <div className="mb-4 flex flex-wrap items-center gap-3 px-6 pt-4">
        <Link
          href="/loops"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Link>
        <Input
          className="max-w-xs text-base font-semibold"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          placeholder="Loop name"
        />
        <Select
          value={editOrientation}
          onChange={(e) =>
            setEditOrientation(e.target.value as Orientation)
          }
        >
          <option value="landscape">Landscape</option>
          <option value="portrait">Portrait</option>
        </Select>
        <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5">
          <button
            type="button"
            onClick={() => setWorkspaceMode("timeline")}
            className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 shadow-sm"
          >
            Timeline
          </button>
          <button
            type="button"
            onClick={() => {
              if (
                selectedItem?.item_type === "design" ||
                items.some((i) => i.item_type === "design")
              ) {
                if (selectedItem?.item_type !== "design") {
                  const firstDesign = items.find((i) => i.item_type === "design");
                  if (firstDesign) setSelectedId(firstDesign.id);
                }
                setWorkspaceMode("design");
              } else {
                toast.message("Add a Smart Template slide first", {
                  description:
                    "Use Template from the Template Library, then open Design Editor.",
                });
              }
            }}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-800"
          >
            Design Editor
          </button>
        </div>
        <span className="text-sm text-zinc-500">
          Running time {formatDuration(totalSeconds)} · {items.length} item
          {items.length === 1 ? "" : "s"}
        </span>
        <div className="ml-auto">
          <Button
            variant="danger"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {error ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[240px_minmax(0,1fr)_280px]">
        {/* Library pane */}
        <section className="flex min-h-[320px] flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 px-3 py-2">
            <p className="text-sm font-semibold">Library</p>
          </div>
          <div className="space-y-2 border-b border-zinc-100 p-3">
            <Input
              placeholder="Search library…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {!search ? (
              <nav className="flex flex-wrap items-center gap-1 text-xs">
                <button
                  type="button"
                  className={cn(
                    "rounded px-1.5 py-0.5",
                    path.length === 0
                      ? "font-medium text-zinc-900"
                      : "text-teal-700 hover:underline",
                  )}
                  onClick={() => goBreadcrumb(-1)}
                >
                  Root
                </button>
                {path.map((seg, index) => (
                  <span key={seg.id} className="flex items-center gap-1">
                    <span className="text-zinc-300">/</span>
                    <button
                      type="button"
                      className={cn(
                        "rounded px-1.5 py-0.5",
                        index === path.length - 1
                          ? "font-medium text-zinc-900"
                          : "text-teal-700 hover:underline",
                      )}
                      onClick={() => goBreadcrumb(index)}
                    >
                      {seg.name}
                    </button>
                  </span>
                ))}
              </nav>
            ) : null}
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {!search
              ? childFolders.map((folder) => (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => openFolder(folder)}
                    className="flex w-full items-center gap-2 rounded-md border border-zinc-200 px-2 py-2 text-left text-sm hover:bg-zinc-50"
                  >
                    <Folder className="h-4 w-4 text-teal-700" />
                    <span className="truncate font-medium">{folder.name}</span>
                  </button>
                ))
              : null}

            {paneAssets.length === 0 && childFolders.length === 0 ? (
              <p className="py-6 text-center text-xs text-zinc-500">
                {library.length === 0
                  ? "No library items yet."
                  : search
                    ? "No matches."
                    : "Nothing here — try another folder."}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {paneAssets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => void addAsset(asset.id)}
                    className="overflow-hidden rounded-md border border-zinc-200 text-left hover:border-teal-600"
                    title="Add to loop"
                  >
                    <div className="aspect-video bg-zinc-100">
                      {asset.file_type === "image" && asset.public_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={asset.public_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] text-zinc-400">
                          Video
                        </div>
                      )}
                    </div>
                    <div className="space-y-0.5 p-1.5">
                      <p className="truncate text-[11px] font-medium">
                        {asset.name}
                      </p>
                      <p className="text-[10px] capitalize text-zinc-500">
                        {asset.file_type} · {formatBytes(asset.size_bytes)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Timeline pane */}
        <section className="flex min-h-[320px] flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 px-3 py-2">
            <p className="text-sm font-semibold">Timeline</p>
            <p className="text-xs text-zinc-500">
              Drag to reorder · click to preview · edit duration
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {items.length === 0 ? (
              <EmptyState
                title="This loop is empty"
                description="Click media in the Library pane to add it here."
              />
            ) : (
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
                    {items.map((item, index) => (
                      <SortableTimelineRow
                        key={item.id}
                        item={item}
                        index={index}
                        selected={item.id === selectedId}
                        onSelect={() => {
                          setSelectedId(item.id);
                          setPlaying(false);
                        }}
                        onDurationChange={onDurationChange}
                        onRemove={(id) => void removeItem(id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </section>

        {/* Preview pane */}
        <section className="flex min-h-[320px] flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 px-3 py-2">
            <p className="text-sm font-semibold">Preview</p>
          </div>
          <div className="flex flex-1 flex-col gap-3 p-3">
            <div
              className={cn(
                "relative mx-auto w-full overflow-hidden rounded-md bg-zinc-900",
                editOrientation === "portrait"
                  ? "aspect-[9/16] max-w-[180px]"
                  : "aspect-video",
              )}
            >
              {previewDesign ? (
                <TemplatePreview
                  data={previewDesign as DesignData}
                  className="h-full w-full"
                />
              ) : previewMedia?.file_type === "image" && previewMedia.public_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewMedia.public_url}
                  alt={previewMedia.name}
                  className="h-full w-full object-contain"
                />
              ) : previewMedia?.file_type === "video" &&
                previewMedia.public_url ? (
                <video
                  ref={videoRef}
                  key={previewMedia.id}
                  src={previewMedia.public_url}
                  className="h-full w-full object-contain"
                  muted
                  playsInline
                  onEnded={nextPreview}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                  Select an item
                </div>
              )}
            </div>
            <div className="flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={playPreview}
                disabled={items.length === 0}
                aria-label="Play"
              >
                <Play className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={pausePreview}
                disabled={!playing}
                aria-label="Pause"
              >
                <Pause className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={nextPreview}
                disabled={items.length < 2}
                aria-label="Next"
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>
            <p className="truncate text-center text-xs text-zinc-500">
              {previewDesign
                ? `Now: ${selectedItem?.slide_name ?? "Template"}`
                : previewMedia
                  ? `Now: ${previewMedia.name}`
                  : "Nothing selected"}
            </p>
          </div>
        </section>
      </div>

      <div className="sticky bottom-0 z-10 mt-6 flex items-center justify-between border-t border-zinc-200 bg-white/95 px-6 py-4 backdrop-blur">
        <p className="text-sm text-zinc-500">
          {dirty ? "Unsaved changes" : loop ? "All changes saved" : "Loading…"}
        </p>
        <Button
          className="min-w-28"
          onClick={() => void saveAll()}
          disabled={saving || !editName.trim() || !dirty}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
        </>
      )}
    </div>
  );
}
