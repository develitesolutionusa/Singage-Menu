"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Folder,
  Grid2X2,
  List,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { Button, EmptyState, Input, PageHeader, Select } from "@/components/ui";
import { cn, formatBytes, formatDuration } from "@/lib/utils";
import type { LibraryFolder, LibraryItem } from "@/types/db";

type SortKey = "name" | "size" | "duration" | "date";
type ViewMode = "grid" | "list";

export function LibraryClient() {
  const [folderId, setFolderId] = useState<string | null>(null);
  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [sort, setSort] = useState<SortKey>("date");
  const [view, setView] = useState<ViewMode>("grid");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const folderParam = folderId ?? "root";
      const [foldersRes, itemsRes] = await Promise.all([
        fetch(`/api/library/folders?parentId=${folderParam}`),
        fetch(`/api/library?folderId=${folderParam}&sort=${sort}`),
      ]);
      const foldersJson = await foldersRes.json();
      const itemsJson = await itemsRes.json();
      if (!foldersRes.ok) throw new Error(foldersJson.error);
      if (!itemsRes.ok) throw new Error(itemsJson.error);
      setFolders(foldersJson.folders ?? []);
      setItems(itemsJson.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load library");
    } finally {
      setLoading(false);
    }
  }, [folderId, sort]);

  useEffect(() => {
    void load();
  }, [load]);

  const breadcrumb = useMemo(() => {
    return folderId ? (
      <button
        type="button"
        className="text-sm text-teal-700 hover:underline"
        onClick={() => setFolderId(null)}
      >
        ← Back to root
      </button>
    ) : (
      <span className="text-sm text-zinc-500">Root folder</span>
    );
  }, [folderId]);

  async function onUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      Array.from(files).forEach((file) => form.append("files", file));
      if (folderId) form.append("folderId", folderId);
      const res = await fetch("/api/library", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function createFolder() {
    if (!newFolderName.trim()) return;
    const res = await fetch("/api/library/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newFolderName.trim(),
        parentId: folderId,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Could not create folder");
      return;
    }
    setNewFolderName("");
    setShowNewFolder(false);
    await load();
  }

  async function deleteItem(id: string) {
    if (!confirm("Delete this media item?")) return;
    const res = await fetch("/api/library", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
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
        title="Library"
        description="Upload images and videos, organize into folders."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => setShowNewFolder((v) => !v)}
            >
              <Plus className="h-4 w-4" />
              New folder
            </Button>
            <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
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

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {breadcrumb}
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
        <div className="mb-4 flex max-w-md gap-2">
          <Input
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void createFolder();
            }}
          />
          <Button onClick={() => void createFolder()}>Create</Button>
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
          title="Library is empty"
          description="Upload images or videos to start building loops."
          action={
            <Button onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" />
              Upload media
            </Button>
          }
        />
      ) : view === "grid" ? (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {folders.map((folder) => (
            <button
              key={folder.id}
              type="button"
              onClick={() => setFolderId(folder.id)}
              className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-4 text-left hover:border-teal-600"
            >
              <Folder className="h-8 w-8 text-teal-700" />
              <div>
                <p className="text-sm font-medium">{folder.name}</p>
                <p className="text-xs text-zinc-500">Folder</p>
              </div>
            </button>
          ))}
          {items.map((item) => (
            <div
              key={item.id}
              className="group overflow-hidden rounded-lg border border-zinc-200 bg-white"
            >
              <div className="relative aspect-video bg-zinc-100">
                {item.file_type === "image" && item.public_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.public_url}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                    Video
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => void deleteItem(item.id)}
                  className="absolute right-2 top-2 rounded bg-white/90 p-1.5 text-zinc-600 opacity-0 shadow-sm transition group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="p-3">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {formatBytes(item.size_bytes)} ·{" "}
                  {formatDuration(item.duration_seconds)}
                </p>
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
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {folders.map((folder) => (
                <tr key={folder.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      className="flex items-center gap-2 font-medium text-teal-700"
                      onClick={() => setFolderId(folder.id)}
                    >
                      <Folder className="h-4 w-4" />
                      {folder.name}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-zinc-500">—</td>
                  <td className="px-4 py-2 text-zinc-500">—</td>
                  <td className="px-4 py-2 text-zinc-500">
                    {new Date(folder.created_at).toLocaleDateString()}
                  </td>
                  <td />
                </tr>
              ))}
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-50">
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
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => void deleteItem(item.id)}
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
