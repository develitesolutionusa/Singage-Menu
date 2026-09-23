"use client";

import {
  Copy,
  Eye,
  EyeOff,
  Layers,
  Lock,
  Trash2,
  Unlock,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function DesignContextToolbar({
  x,
  y,
  locked,
  hidden,
  onDuplicate,
  onDelete,
  onToggleLock,
  onToggleHide,
  onOpenLayers,
}: {
  x: number;
  y: number;
  locked: boolean;
  hidden: boolean;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleLock: () => void;
  onToggleHide: () => void;
  onOpenLayers?: () => void;
}) {
  return (
    <div
      className="absolute z-30 flex -translate-x-1/2 -translate-y-[calc(100%+10px)] items-center gap-0.5 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg"
      style={{ left: x, top: y }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Tool label="Duplicate" icon={Copy} onClick={onDuplicate} />
      <Tool
        label={locked ? "Unlock" : "Lock"}
        icon={locked ? Unlock : Lock}
        onClick={onToggleLock}
      />
      <Tool
        label={hidden ? "Show" : "Hide"}
        icon={hidden ? Eye : EyeOff}
        onClick={onToggleHide}
      />
      <Tool label="Delete" icon={Trash2} onClick={onDelete} danger />
      {onOpenLayers ? (
        <Tool label="Layers" icon={Layers} onClick={onOpenLayers} />
      ) : null}
    </div>
  );
}

function Tool({
  label,
  icon: Icon,
  onClick,
  danger,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "rounded-md p-1.5 text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900",
        danger && "hover:bg-red-50 hover:text-red-600",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}
