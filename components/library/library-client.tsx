"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Folder,
  Grid2X2,
  List,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button, ConfirmDialog, EmptyState, Input, PageHeader, Select } from "@/components/ui";
import { readApiJson } from "@/lib/api-json";
import { cn, formatBytes, formatDuration } from "@/lib/utils";
import type { LibraryFolder, LibraryItem } from "@/types/db";

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

type SortKey = "name" | "size" | "duration" | "date";
type ViewMode = "grid" | "list";
type PathSegment = { id: string; name: string };
type FolderRow = LibraryFolder & {
  size_bytes: number;
  duration_seconds: number;
};

function sortFolders(folders: FolderRow[], sort: SortKey): FolderRow[] {
  const sorted = [...folders];
  sorted.sort((a, b) => {
    switch (sort) {
      case "name":
        return a.name.localeCompare(b.name);
      case "size":
        return b.size_bytes - a.size_bytes;
      case "duration":
        return b.duration_seconds - a.duration_seconds;
      case "date":
      default:
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }
  });
  return sorted;
}

export function LibraryClient() {
  const [path, setPath] = useState<PathSegment[]>([]);
  const folderId = path.length ? path[path.length - 1].id : null;

  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [allFolders, setAllFolders] = useState<LibraryFolder[]>([]);
  const [sort, setSort] = useState<SortKey>("date");
  const [view, setView] = useState<ViewMode>("grid");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [savingRename, setSavingRename] = useState(false);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [dropTargetId, setDropTargetId] = useState<string | "root" | null>(
    null,
  );
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<
    | { kind: "folder"; id: string; name: string }
    | { kind: "item"; id: string }
    | null
  >(null);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const creatingFolderRef = useRef(false);
  const savingRenameRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const folderParam = folderId ?? "root";
      const [foldersRes, itemsRes, allFoldersRes] = await Promise.all([
        fetch(`/api/library/folders?parentId=${folderParam}`),
        fetch(`/api/library?folderId=${folderParam}&sort=${sort}`),
        fetch("/api/library/folders?parentId=all"),
      ]);
      const foldersJson = await foldersRes.json();
      const itemsJson = await itemsRes.json();
      const allFoldersJson = await allFoldersRes.json();
      if (!foldersRes.ok) throw new Error(foldersJson.error);
      if (!itemsRes.ok) throw new Error(itemsJson.error);
      if (!allFoldersRes.ok) throw new Error(allFoldersJson.error);
      const nextFolders: FolderRow[] = (foldersJson.folders ?? []).map(
        (folder: LibraryFolder & Partial<FolderRow>) => ({
          ...folder,
          size_bytes: Number(folder.size_bytes) || 0,
          duration_seconds: Number(folder.duration_seconds) || 0,
        }),
      );
      setFolders(sortFolders(nextFolders, sort));
      setItems(itemsJson.items ?? []);
      setAllFolders(allFoldersJson.folders ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load library");
    } finally {
      setLoading(false);
    }
  }, [folderId, sort]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onUpload(
    files: FileList | null,
    intoFolderId?: string | null,
  ) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      const fileList = Array.from(files);
      for (const file of fileList) {
        const mime = file.type || "application/octet-stream";
        const isImage = mime.startsWith("image/");
        const isVideo = mime.startsWith("video/");
        if (!isImage && !isVideo) {
          throw new Error(`Unsupported file type: ${file.name}`);
        }
        const maxBytes = isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
        if (file.size > maxBytes) {
          throw new Error(
            `"${file.name}" is too large. Max ${isImage ? "20 MB" : "100 MB"} for ${isImage ? "images" : "videos"}.`,
          );
        }
      }

      const target = intoFolderId !== undefined ? intoFolderId : folderId;
      const signRes = await fetch("/api/library/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderId: target,
          files: fileList.map((file) => ({
            name: file.name,
            mimeType: file.type || "application/octet-stream",
            sizeBytes: file.size,
          })),
        }),
      });
      const signJson = await readApiJson<{
        uploads: Array<{
          name: string;
          mimeType: string;
          sizeBytes: number;
          fileType: "image" | "video";
          storagePath: string;
          token: string;
          signedUrl: string;
          publicUrl: string;
        }>;
      }>(signRes);
      if (!signRes.ok) {
        throw new Error(signJson.error ?? "Could not start upload");
      }

      if (signJson.uploads.length !== fileList.length) {
        throw new Error("Upload session mismatch — try again");
      }

      const completed: Array<{
        name: string;
        mimeType: string;
        sizeBytes: number;
        fileType: "image" | "video";
        storagePath: string;
        publicUrl: string;
      }> = [];

      for (let i = 0; i < signJson.uploads.length; i++) {
        const upload = signJson.uploads[i];
        const file = fileList[i];
        // Upload directly to Supabase via signed URL (no browser env client needed).
        const putRes = await fetch(upload.signedUrl, {
          method: "PUT",
          headers: {
            "Content-Type": upload.mimeType || "application/octet-stream",
            "x-upsert": "false",
          },
          body: file,
        });
        if (!putRes.ok) {
          const detail = (await putRes.text()).slice(0, 160);
          throw new Error(
            detail || `Failed to upload ${file.name} (${putRes.status})`,
          );
        }
        completed.push({
          name: upload.name,
          mimeType: upload.mimeType,
          sizeBytes: upload.sizeBytes,
          fileType: upload.fileType,
          storagePath: upload.storagePath,
          publicUrl: upload.publicUrl,
        });
      }

      const completeRes = await fetch("/api/library/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderId: target,
          items: completed,
        }),
      });
      const completeJson = await readApiJson(completeRes);
      if (!completeRes.ok) {
        throw new Error(completeJson.error ?? "Could not save uploaded media");
      }

      toast.success(
        fileList.length === 1
          ? "Media uploaded"
          : `${fileList.length} files uploaded`,
      );
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Upload failed";
      setError(message);
      toast.error(message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function createFolder() {
    const name = newFolderName.trim();
    // Guard against Enter + Create click (or double-click) firing twice.
    if (!name || creatingFolderRef.current) return;
    creatingFolderRef.current = true;
    setCreatingFolder(true);
    setError(null);
    try {
      const res = await fetch("/api/library/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          parentId: folderId,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        const message = json.error ?? "Could not create folder";
        setError(message);
        toast.error(message);
        return;
      }
      setNewFolderName("");
      setShowNewFolder(false);
      toast.success("Folder created");
      await load();
    } finally {
      creatingFolderRef.current = false;
      setCreatingFolder(false);
    }
  }

  async function saveRename() {
    if (!renaming || !renaming.name.trim() || savingRenameRef.current) return;
    savingRenameRef.current = true;
    setSavingRename(true);
    setError(null);
    try {
      const res = await fetch("/api/library/folders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: renaming.id,
          name: renaming.name.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        const message = json.error ?? "Could not rename folder";
        setError(message);
        toast.error(message);
        return;
      }
      setPath((prev) =>
        prev.map((seg) =>
          seg.id === renaming.id ? { ...seg, name: renaming.name.trim() } : seg,
        ),
      );
      setRenaming(null);
      toast.success("Folder renamed");
      await load();
    } finally {
      savingRenameRef.current = false;
      setSavingRename(false);
    }
  }

  async function deleteFolder(id: string, name: string) {
    setPendingDelete({ kind: "folder", id, name });
  }

  async function deleteItem(id: string) {
    setPendingDelete({ kind: "item", id });
  }

  async function confirmPendingDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setError(null);
    try {
      if (pendingDelete.kind === "folder") {
        const res = await fetch("/api/library/folders", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: pendingDelete.id }),
        });
        const json = await res.json();
        if (!res.ok) {
          const message = json.error ?? "Could not delete folder";
          setError(message);
          toast.error(message);
          return;
        }
        if (path.some((p) => p.id === pendingDelete.id)) {
          setPath((prev) => {
            const idx = prev.findIndex((p) => p.id === pendingDelete.id);
            return idx >= 0 ? prev.slice(0, idx) : prev;
          });
        }
        toast.success("Folder deleted");
      } else {
        const res = await fetch("/api/library", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [pendingDelete.id] }),
        });
        const json = await res.json();
        if (!res.ok) {
          const message = json.error ?? "Delete failed";
          setError(message);
          toast.error(message);
          return;
        }
        toast.success("Item deleted");
      }
      setPendingDelete(null);
      await load();
    } finally {
      setDeleting(false);
    }
  }

  async function moveItems(ids: string[], targetFolderId: string | null) {
    setError(null);
    const res = await fetch("/api/library", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, folderId: targetFolderId }),
    });
    const json = await res.json();
    if (!res.ok) {
      const message = json.error ?? "Could not move item";
      setError(message);
      toast.error(message);
      return;
    }
    toast.success("Item moved");
    await load();
  }

  function openFolder(folder: LibraryFolder) {
    setPath((prev) => [...prev, { id: folder.id, name: folder.name }]);
  }

  function goToBreadcrumb(index: number) {
    if (index < 0) {
      setPath([]);
      return;
    }
    setPath((prev) => prev.slice(0, index + 1));
  }

  function onItemDragStart(e: React.DragEvent, itemId: string) {
    e.dataTransfer.setData("text/plain", itemId);
    e.dataTransfer.effectAllowed = "move";
    setDraggingItemId(itemId);
  }

  function onItemDragEnd() {
    setDraggingItemId(null);
    setDropTargetId(null);
  }

  function onFolderDragOver(e: React.DragEvent, target: string | "root") {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = draggingItemId ? "move" : "copy";
    setDropTargetId(target);
  }

  async function onFolderDrop(e: React.DragEvent, target: string | "root") {
    e.preventDefault();
    e.stopPropagation();
    const targetFolderId = target === "root" ? null : target;
    const itemId =
      e.dataTransfer.getData("text/plain") || draggingItemId || "";
    setDropTargetId(null);
    setDraggingItemId(null);

    if (itemId && /^[0-9a-f-]{36}$/i.test(itemId)) {
      await moveItems([itemId], targetFolderId);
      return;
    }

    if (e.dataTransfer.files?.length) {
      await onUpload(e.dataTransfer.files, targetFolderId);
    }
  }

  const moveOptions = (
    <>
      <option value="">Move to…</option>
      <option value="root">Root</option>
      {allFolders.map((f) => (
        <option key={f.id} value={f.id}>
          {f.name}
        </option>
      ))}
    </>
  );

  return (
    <div>
      <ConfirmDialog
        open={pendingDelete !== null}
        title={
          pendingDelete?.kind === "folder"
            ? `Delete folder "${pendingDelete.name}"?`
            : "Delete this media item?"
        }
        description={
          pendingDelete?.kind === "folder"
            ? "Nested folders are removed. Media inside is kept and moved to Root."
            : "This media will be permanently removed from your library."
        }
        busy={deleting}
        onCancel={() => {
          if (!deleting) setPendingDelete(null);
        }}
        onConfirm={() => void confirmPendingDelete()}
      />
      <PageHeader
        title="Library"
        description="Create folders, rename/delete them, and move assets by drag-drop or Move to…"
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => setShowNewFolder((v) => !v)}
            >
              <Plus className="h-4 w-4" />
              New folder
            </Button>
            <Button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="h-4 w-4" />
              {uploading ? "Uploading…" : "Upload"}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => void onUpload(e.target.files)}
            />
          </>
        }
      />

      {draggingItemId ? (
        <p className="mb-3 rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">
          Drag onto a folder (or Root) to move this asset.
        </p>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap items-center gap-1 text-sm">
          <button
            type="button"
            className={cn(
              "rounded px-2 py-1",
              path.length === 0
                ? "font-medium text-zinc-900"
                : "text-teal-700 hover:underline",
              dropTargetId === "root" && path.length > 0
                ? "bg-teal-50 ring-2 ring-teal-600"
                : "",
            )}
            onClick={() => goToBreadcrumb(-1)}
            onDragOver={(e) => {
              if (path.length > 0) onFolderDragOver(e, "root");
            }}
            onDragLeave={() => setDropTargetId(null)}
            onDrop={(e) => {
              if (path.length > 0) void onFolderDrop(e, "root");
            }}
          >
            Root
          </button>
          {path.map((seg, index) => (
            <span key={seg.id} className="flex items-center gap-1">
              <span className="text-zinc-300">/</span>
              <button
                type="button"
                className={cn(
                  "rounded px-2 py-1",
                  index === path.length - 1
                    ? "font-medium text-zinc-900"
                    : "text-teal-700 hover:underline",
                )}
                onClick={() => goToBreadcrumb(index)}
              >
                {seg.name}
              </button>
            </span>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
          >
            <option value="date">Sort: Date</option>
            <option value="name">Sort: Name</option>
            <option value="size">Sort: Size</option>
            <option value="duration">Sort: Duration</option>
          </Select>
          <div className="flex rounded-md border border-zinc-200">
            <button
              type="button"
              className={cn(
                "px-2 py-1.5",
                view === "grid" ? "bg-zinc-100 text-zinc-900" : "text-zinc-500",
              )}
              onClick={() => setView("grid")}
              aria-label="Grid view"
            >
              <Grid2X2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={cn(
                "px-2 py-1.5",
                view === "list" ? "bg-zinc-100 text-zinc-900" : "text-zinc-500",
              )}
              onClick={() => setView("list")}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {showNewFolder ? (
        <div className="mb-4 flex max-w-lg gap-2">
          <Input
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void createFolder();
              }
            }}
            disabled={creatingFolder}
            autoFocus
          />
          <Button
            type="button"
            className="shrink-0 whitespace-nowrap"
            onClick={() => void createFolder()}
            disabled={creatingFolder || !newFolderName.trim()}
          >
            {creatingFolder ? "Creating…" : "Create"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowNewFolder(false)}
            disabled={creatingFolder}
          >
            Cancel
          </Button>
        </div>
      ) : null}

      {renaming ? (
        <div className="mb-4 flex max-w-lg gap-2">
          <Input
            value={renaming.name}
            onChange={(e) =>
              setRenaming({ ...renaming, name: e.target.value })
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void saveRename();
              }
            }}
            disabled={savingRename}
            autoFocus
          />
          <Button
            type="button"
            className="shrink-0 whitespace-nowrap"
            onClick={() => void saveRename()}
            disabled={savingRename || !renaming.name.trim()}
          >
            {savingRename ? "Saving…" : "Save"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setRenaming(null)}
            disabled={savingRename}
          >
            Cancel
          </Button>
        </div>
      ) : null}

      {error ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-zinc-500">Loading library…</p>
      ) : folders.length === 0 && items.length === 0 ? (
        <EmptyState
          title={folderId ? "This folder is empty" : "Library is empty"}
          description="Create a folder, then upload media or drag files onto a folder."
          action={
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowNewFolder(true)}
              >
                <Plus className="h-4 w-4" />
                New folder
              </Button>
              <Button onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4" />
                Upload media
              </Button>
            </div>
          }
        />
      ) : view === "grid" ? (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {folders.map((folder) => (
            <div
              key={folder.id}
              onDragOver={(e) => onFolderDragOver(e, folder.id)}
              onDragLeave={() => setDropTargetId(null)}
              onDrop={(e) => void onFolderDrop(e, folder.id)}
              className={cn(
                "group relative rounded-lg border bg-white p-4 transition",
                dropTargetId === folder.id
                  ? "border-teal-600 bg-teal-50 ring-2 ring-teal-600"
                  : "border-zinc-200",
              )}
            >
              <div className="absolute right-2 top-2 z-10 flex gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                <button
                  type="button"
                  title="Rename"
                  aria-label={`Rename ${folder.name}`}
                  className="rounded-md border border-zinc-200 bg-white p-1.5 text-zinc-600 shadow-sm hover:bg-zinc-50 hover:text-teal-700"
                  onClick={() =>
                    setRenaming({ id: folder.id, name: folder.name })
                  }
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  title="Delete"
                  aria-label={`Delete ${folder.name}`}
                  className="rounded-md border border-zinc-200 bg-white p-1.5 text-zinc-600 shadow-sm hover:bg-red-50 hover:text-red-600"
                  onClick={() => void deleteFolder(folder.id, folder.name)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <button
                type="button"
                className="flex w-full items-center gap-3 text-left"
                onClick={() => openFolder(folder)}
              >
                <Folder className="h-8 w-8 shrink-0 text-teal-700" />
                <div className="min-w-0 flex-1 pr-16">
                  <p className="truncate text-sm font-medium">{folder.name}</p>
                  <p className="text-xs text-zinc-500">
                    {formatBytes(folder.size_bytes)} ·{" "}
                    {formatDuration(folder.duration_seconds)}
                  </p>
                </div>
              </button>
            </div>
          ))}

          {items.map((item) => (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => onItemDragStart(e, item.id)}
              onDragEnd={onItemDragEnd}
              className={cn(
                "overflow-hidden rounded-lg border border-zinc-200 bg-white",
                draggingItemId === item.id && "opacity-50",
              )}
            >
              <div className="relative aspect-video cursor-grab bg-zinc-100 active:cursor-grabbing">
                {item.file_type === "image" && item.public_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.public_url}
                    alt={item.name}
                    className="pointer-events-none h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                    Video
                  </div>
                )}
              </div>
              <div className="space-y-2 p-3">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p className="text-xs text-zinc-500">
                  {formatBytes(item.size_bytes)} ·{" "}
                  {formatDuration(item.duration_seconds)}
                </p>
                <Select
                  className="w-full"
                  defaultValue=""
                  onChange={(e) => {
                    const value = e.target.value;
                    e.target.value = "";
                    if (!value) return;
                    void moveItems([item.id], value === "root" ? null : value);
                  }}
                >
                  {moveOptions}
                </Select>
                <Button
                  variant="ghost"
                  className="w-full text-red-600"
                  onClick={() => void deleteItem(item.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Size</th>
                <th className="px-4 py-2 font-medium">Duration</th>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {folders.map((folder) => (
                <tr
                  key={folder.id}
                  className={cn(
                    "group",
                    dropTargetId === folder.id ? "bg-teal-50" : "hover:bg-zinc-50",
                  )}
                  onDragOver={(e) => onFolderDragOver(e, folder.id)}
                  onDragLeave={() => setDropTargetId(null)}
                  onDrop={(e) => void onFolderDrop(e, folder.id)}
                >
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      className="flex items-center gap-2 font-medium text-teal-700"
                      onClick={() => openFolder(folder)}
                    >
                      <Folder className="h-4 w-4" />
                      {folder.name}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-zinc-500">
                    {formatBytes(folder.size_bytes)}
                  </td>
                  <td className="px-4 py-2 text-zinc-500">
                    {formatDuration(folder.duration_seconds)}
                  </td>
                  <td className="px-4 py-2 text-zinc-500">
                    {new Date(folder.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-end gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                      <button
                        type="button"
                        title="Rename"
                        aria-label={`Rename ${folder.name}`}
                        className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-teal-700"
                        onClick={() =>
                          setRenaming({ id: folder.id, name: folder.name })
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="Delete"
                        aria-label={`Delete ${folder.name}`}
                        className="rounded-md p-1.5 text-zinc-500 hover:bg-red-50 hover:text-red-600"
                        onClick={() =>
                          void deleteFolder(folder.id, folder.name)
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.map((item) => (
                <tr
                  key={item.id}
                  draggable
                  onDragStart={(e) => onItemDragStart(e, item.id)}
                  onDragEnd={onItemDragEnd}
                  className={cn(
                    "cursor-grab hover:bg-zinc-50 active:cursor-grabbing",
                    draggingItemId === item.id && "opacity-50",
                  )}
                >
                  <td className="px-4 py-2 font-medium">{item.name}</td>
                  <td className="px-4 py-2 text-zinc-500">
                    {formatBytes(item.size_bytes)}
                  </td>
                  <td className="px-4 py-2 text-zinc-500">
                    {formatDuration(item.duration_seconds)}
                  </td>
                  <td className="px-4 py-2 text-zinc-500">
                    {new Date(item.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <Select
                        defaultValue=""
                        onChange={(e) => {
                          const value = e.target.value;
                          e.target.value = "";
                          if (!value) return;
                          void moveItems(
                            [item.id],
                            value === "root" ? null : value,
                          );
                        }}
                      >
                        {moveOptions}
                      </Select>
                      <button
                        type="button"
                        onClick={() => void deleteItem(item.id)}
                        className="text-red-600 hover:underline"
                      >
                        Delete
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
