"use client";

import { ORIENTATION_OPTIONS } from "@/lib/menu-board/orientation";
import type { OrientationMode } from "@/lib/menu-board/types";
import { cn } from "@/lib/utils";

export function OrientationControls({
  value,
  onChange,
  detectedLabel,
  className,
}: {
  value: OrientationMode;
  onChange: (mode: OrientationMode) => void;
  detectedLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "pointer-events-auto flex flex-wrap items-center gap-1 rounded-lg border border-white/15 bg-black/55 p-1.5 text-xs text-white shadow-lg backdrop-blur-md",
        className,
      )}
      role="group"
      aria-label="Orientation"
    >
      {ORIENTATION_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={cn(
            "rounded-md px-2.5 py-1.5 font-medium transition-colors",
            value === opt.id
              ? "bg-white text-zinc-900"
              : "text-white/80 hover:bg-white/10 hover:text-white",
          )}
        >
          {opt.label}
        </button>
      ))}
      {detectedLabel ? (
        <span className="ml-1 hidden px-2 text-white/55 sm:inline">
          {detectedLabel}
        </span>
      ) : null}
    </div>
  );
}
