"use client";

import { cn } from "@/lib/utils";

export type DeviceFrameId =
  | "fill"
  | "16-9"
  | "9-16"
  | "4-3"
  | "21-9"
  | "1-1"
  | "wall-3";

export type DeviceFrame = {
  id: DeviceFrameId;
  label: string;
  /** null = fill host; otherwise width/height */
  ratio: number | null;
};

export const DEVICE_FRAMES: DeviceFrame[] = [
  { id: "fill", label: "Fill", ratio: null },
  { id: "16-9", label: "16:9 TV", ratio: 16 / 9 },
  { id: "9-16", label: "9:16 Portrait", ratio: 9 / 16 },
  { id: "4-3", label: "4:3", ratio: 4 / 3 },
  { id: "21-9", label: "21:9", ratio: 21 / 9 },
  { id: "1-1", label: "1:1", ratio: 1 },
  { id: "wall-3", label: "3-screen wall", ratio: (1080 * 3) / 1920 },
];

type PreviewToolbarProps = {
  frameId: DeviceFrameId;
  onFrameChange: (id: DeviceFrameId) => void;
  safeArea: boolean;
  onSafeAreaChange: (on: boolean) => void;
  templateId: string;
  onTemplateChange: (id: string) => void;
  templates: Array<{ id: string; name: string }>;
  qaCount?: number;
  className?: string;
};

/**
 * Editor preview toolbar: device frames, safe-area (overscan) overlay, template switch.
 */
export function PreviewToolbar({
  frameId,
  onFrameChange,
  safeArea,
  onSafeAreaChange,
  templateId,
  onTemplateChange,
  templates,
  qaCount = 0,
  className,
}: PreviewToolbarProps) {
  return (
    <div
      className={cn(
        "pointer-events-auto absolute left-3 top-3 z-50 flex max-w-[min(100vw-1.5rem,56rem)] flex-col gap-1.5 rounded-lg border border-white/15 bg-black/60 p-1.5 text-xs text-white shadow-lg backdrop-blur-md",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-1">
        {DEVICE_FRAMES.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onFrameChange(f.id)}
            className={cn(
              "rounded-md px-2.5 py-1.5 font-medium transition-colors",
              frameId === f.id
                ? "bg-teal-500 text-white"
                : "text-white/80 hover:bg-white/10 hover:text-white",
            )}
          >
            {f.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onSafeAreaChange(!safeArea)}
          className={cn(
            "ml-1 rounded-md px-2.5 py-1.5 font-medium transition-colors",
            safeArea
              ? "bg-amber-500 text-black"
              : "text-white/80 hover:bg-white/10",
          )}
          title="Toggle 5% overscan safe-area overlay"
        >
          Safe area
        </button>
        {qaCount > 0 ? (
          <span className="ml-1 rounded-md bg-rose-500/90 px-2 py-1 font-semibold">
            QA {qaCount}
          </span>
        ) : (
          <span className="ml-1 rounded-md bg-emerald-600/90 px-2 py-1 font-semibold">
            QA OK
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1 border-t border-white/10 pt-1.5">
        {templates.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onTemplateChange(t.id)}
            className={cn(
              "rounded-md px-2.5 py-1.5 font-medium transition-colors",
              templateId === t.id
                ? "bg-white text-zinc-900"
                : "text-white/80 hover:bg-white/10",
            )}
          >
            {t.name}
          </button>
        ))}
      </div>
    </div>
  );
}

/** 3–5% overscan guide — content inside should stay visible on TVs. */
export function SafeAreaOverlay({ insetPercent = 5 }: { insetPercent?: number }) {
  return (
    <div
      className="pointer-events-none absolute z-[60] border border-dashed border-amber-400/80 bg-amber-400/10"
      aria-hidden
      style={{
        left: `${insetPercent}%`,
        top: `${insetPercent}%`,
        width: `${100 - insetPercent * 2}%`,
        height: `${100 - insetPercent * 2}%`,
      }}
    />
  );
}
