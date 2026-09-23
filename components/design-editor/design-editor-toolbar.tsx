"use client";

import Link from "next/link";
import {
  ChevronLeft,
  Cloud,
  Eye,
  MonitorPlay,
  Redo2,
  Save,
  Undo2,
  Upload,
} from "lucide-react";
import { Button, Input, Select } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Orientation } from "@/types/db";

export type EditorWorkspaceMode = "timeline" | "design";
export type AutoSaveStatus = "saved" | "saving" | "unsaved" | "idle";

export function DesignEditorToolbar({
  slideName,
  onSlideNameChange,
  orientation,
  onOrientationChange,
  mode,
  onModeChange,
  autoSaveStatus,
  lastSavedAt,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onPreview,
  onSave,
  onPublish,
  saving = false,
  dirty = false,
}: {
  slideName: string;
  onSlideNameChange: (value: string) => void;
  orientation: Orientation;
  onOrientationChange: (value: Orientation) => void;
  mode: EditorWorkspaceMode;
  onModeChange: (mode: EditorWorkspaceMode) => void;
  autoSaveStatus: AutoSaveStatus;
  lastSavedAt?: string | null;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onPreview: () => void;
  onSave: () => void;
  onPublish: () => void;
  saving?: boolean;
  dirty?: boolean;
}) {
  const statusLabel =
    autoSaveStatus === "saving"
      ? "Saving…"
      : autoSaveStatus === "unsaved"
        ? "Unsaved changes"
        : autoSaveStatus === "saved"
          ? lastSavedAt
            ? `✓ Auto-saved ${lastSavedAt}`
            : "✓ Auto-saved"
          : "Ready";

  return (
    <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-zinc-200 bg-white px-3 py-2.5">
      <Link
        href="/loops"
        className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
      >
        <ChevronLeft className="h-4 w-4" />
        Back
      </Link>

      <div className="h-5 w-px bg-zinc-200" />

      <Input
        value={slideName}
        onChange={(e) => onSlideNameChange(e.target.value)}
        className="max-w-[220px] border-zinc-200 font-medium"
        placeholder="Slide name"
        aria-label="Template or slide name"
      />

      <Select
        value={orientation}
        onChange={(e) => onOrientationChange(e.target.value as Orientation)}
        className="w-[130px]"
        aria-label="Orientation"
      >
        <option value="landscape">Landscape</option>
        <option value="portrait">Portrait</option>
      </Select>

      <div className="ml-1 inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5">
        <button
          type="button"
          onClick={() => onModeChange("timeline")}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition",
            mode === "timeline"
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-500 hover:text-zinc-800",
          )}
        >
          Timeline
        </button>
        <button
          type="button"
          onClick={() => onModeChange("design")}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition",
            mode === "design"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-zinc-500 hover:text-zinc-800",
          )}
        >
          Design Editor
        </button>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            "mr-1 hidden items-center gap-1.5 text-xs sm:inline-flex",
            autoSaveStatus === "unsaved" ? "text-amber-600" : "text-zinc-500",
          )}
        >
          <Cloud className="h-3.5 w-3.5" />
          {statusLabel}
        </span>

        <Button
          type="button"
          variant="ghost"
          className="h-8 w-8 p-0"
          disabled={!canUndo}
          onClick={onUndo}
          aria-label="Undo"
          title="Undo"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-8 w-8 p-0"
          disabled={!canRedo}
          onClick={onRedo}
          aria-label="Redo"
          title="Redo"
        >
          <Redo2 className="h-4 w-4" />
        </Button>

        <div className="mx-1 hidden h-5 w-px bg-zinc-200 sm:block" />

        <Button
          type="button"
          variant="secondary"
          className="h-8"
          onClick={onPreview}
        >
          <Eye className="h-4 w-4" />
          Preview
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="h-8"
          onClick={onSave}
          disabled={saving || !dirty}
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button
          type="button"
          className="h-8 bg-blue-600 hover:bg-blue-700"
          onClick={onPublish}
        >
          <Upload className="h-4 w-4" />
          Publish
        </Button>
        <span className="sr-only">
          <MonitorPlay className="h-4 w-4" />
        </span>
      </div>
    </header>
  );
}
