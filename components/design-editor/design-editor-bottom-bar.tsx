"use client";

import {
  Copy,
  Layers,
  Lock,
  Minus,
  Plus,
  Redo2,
  Scan,
  Trash2,
  Unlock,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

export function DesignEditorBottomBar({
  layersOpen,
  onToggleLayers,
  locked,
  onToggleLock,
  zoom,
  onZoomIn,
  onZoomOut,
  onFit,
  onDuplicate,
  onDelete,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  canMutate = false,
}: {
  layersOpen: boolean;
  onToggleLayers: () => void;
  locked: boolean;
  onToggleLock: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  canMutate?: boolean;
}) {
  return (
    <footer className="flex shrink-0 flex-wrap items-center gap-1 border-t border-zinc-200 bg-white px-3 py-2">
      <ToolButton
        active={layersOpen}
        onClick={onToggleLayers}
        label="Layers"
        icon={Layers}
      />
      <ToolButton
        onClick={onToggleLock}
        label={locked ? "Unlock" : "Lock"}
        icon={locked ? Unlock : Lock}
      />
      <ToolButton
        onClick={onDuplicate}
        label="Duplicate"
        icon={Copy}
        disabled={!canMutate}
      />
      <ToolButton
        onClick={onDelete}
        label="Delete"
        icon={Trash2}
        disabled={!canMutate}
        danger
      />

      <div className="mx-2 h-5 w-px bg-zinc-200" />

      <ToolButton onClick={onUndo} label="Undo" icon={Undo2} disabled={!canUndo} />
      <ToolButton onClick={onRedo} label="Redo" icon={Redo2} disabled={!canRedo} />

      <div className="mx-2 h-5 w-px bg-zinc-200" />

      <ToolButton onClick={onZoomOut} label="Zoom out" icon={Minus} />
      <span className="min-w-12 text-center text-xs font-medium tabular-nums text-zinc-600">
        {Math.round(zoom * 100)}%
      </span>
      <ToolButton onClick={onZoomIn} label="Zoom in" icon={Plus} />
      <ToolButton onClick={onFit} label="Fit" icon={Scan} />

      <p className="ml-auto hidden text-[11px] text-zinc-400 sm:block">
        Space=pan · Ctrl/Cmd+scroll=zoom · Del · Ctrl/Cmd+C/V/D/Z
      </p>
    </footer>
  );
}

function ToolButton({
  label,
  icon: Icon,
  onClick,
  disabled,
  active,
  danger,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      className={cn(
        "h-8 gap-1.5 px-2 text-xs",
        active && "bg-blue-50 text-blue-700",
        danger && !disabled && "hover:bg-red-50 hover:text-red-600",
      )}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden md:inline">{label}</span>
    </Button>
  );
}
