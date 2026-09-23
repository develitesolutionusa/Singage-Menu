"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Monitor,
  Pause,
  Play,
  Smartphone,
  X,
} from "lucide-react";
import {
  PlaybackSlide,
  type PlaybackSlideInput,
} from "@/components/player/playback-slide";
import {
  PREVIEW_RESOLUTIONS,
  type PreviewResolution,
} from "@/components/player/design-slide-stage";
import { cn } from "@/lib/utils";
import type { Orientation } from "@/types/db";

export type DesignPreviewSlide = {
  id: string;
  name: string;
  durationSeconds: number;
  slide: PlaybackSlideInput;
};

export function DesignPreviewMode({
  open,
  onClose,
  slides,
  initialSlideId,
  defaultOrientation = "landscape",
  title = "Preview",
}: {
  open: boolean;
  onClose: () => void;
  slides: DesignPreviewSlide[];
  initialSlideId?: string | null;
  defaultOrientation?: Orientation;
  title?: string;
}) {
  const [orientation, setOrientation] = useState<Orientation>(defaultOrientation);
  const [resolution, setResolution] = useState<PreviewResolution>("fit");
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [animationKey, setAnimationKey] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const safeSlides = slides.length > 0 ? slides : [];

  useEffect(() => {
    if (!open) return;
    setOrientation(defaultOrientation);
    setPlaying(true);
    setElapsedMs(0);
    setAnimationKey((k) => k + 1);
    const start =
      initialSlideId != null
        ? slides.findIndex((s) => s.id === initialSlideId)
        : 0;
    setIndex(start >= 0 ? start : 0);
    // Only re-seed when preview opens or the starting slide changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialSlideId, defaultOrientation]);

  const current = safeSlides[index] ?? null;
  const durationMs = Math.max(1, (current?.durationSeconds ?? 10) * 1000);

  const framedSlide = useMemo((): PlaybackSlideInput | null => {
    if (!current) return null;
    return {
      ...current.slide,
      orientation:
        current.slide.kind === "design"
          ? orientation
          : (current.slide.orientation ?? orientation),
    };
  }, [current, orientation]);

  const goTo = useCallback(
    (nextIndex: number) => {
      if (safeSlides.length === 0) return;
      const wrapped =
        ((nextIndex % safeSlides.length) + safeSlides.length) %
        safeSlides.length;
      setIndex(wrapped);
      setElapsedMs(0);
      setAnimationKey((k) => k + 1);
    },
    [safeSlides.length],
  );

  const goPrev = useCallback(() => goTo(index - 1), [goTo, index]);
  const goNext = useCallback(() => goTo(index + 1), [goTo, index]);

  // Auto-advance while playing (images/design); video ends via onVideoEnded
  useEffect(() => {
    if (!open || !playing || !current) return;
    if (current.slide.kind === "video") return;

    const started = Date.now() - elapsedMs;
    tickRef.current = setInterval(() => {
      const next = Date.now() - started;
      if (next >= durationMs) {
        setElapsedMs(0);
        goNext();
        return;
      }
      setElapsedMs(next);
    }, 100);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, playing, index, durationMs, current?.slide.kind]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, goPrev, goNext]);

  async function toggleBrowserFullscreen() {
    const el = stageRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch {
      // Browser may block fullscreen without gesture / preference
    }
  }

  const resMeta = PREVIEW_RESOLUTIONS.find((r) => r.id === resolution);
  const frameStyle: React.CSSProperties =
    resolution === "fit" || !resMeta?.width || !resMeta.height
      ? orientation === "portrait"
        ? {
            aspectRatio: "9 / 16",
            height: "min(78vh, 100%)",
            width: "auto",
            maxWidth: "100%",
          }
        : {
            aspectRatio: "16 / 9",
            width: "min(92vw, 100%)",
            height: "auto",
            maxHeight: "78vh",
          }
      : {
          width: `min(${resMeta.width}px, 96vw)`,
          aspectRatio: `${resMeta.width} / ${resMeta.height}`,
          maxHeight: "78vh",
        };

  if (!open) return null;

  const progress = Math.min(1, elapsedMs / durationMs);

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-zinc-950 text-white">
      {/* Top chrome */}
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-zinc-800 bg-zinc-950/95 px-3 py-2 backdrop-blur sm:px-4">
        <div className="mr-auto min-w-0">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className="truncate text-xs text-zinc-400">
            {current
              ? `${current.name} · ${index + 1}/${safeSlides.length}`
              : "No slides"}
            {" · "}
            {orientation}
            {resolution !== "fit" ? ` · ${resolution}` : ""}
          </p>
        </div>

        <div className="inline-flex rounded-lg border border-zinc-700 bg-zinc-900 p-0.5">
          <button
            type="button"
            onClick={() => setOrientation("landscape")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium",
              orientation === "landscape"
                ? "bg-zinc-100 text-zinc-900"
                : "text-zinc-300 hover:bg-zinc-800",
            )}
          >
            <Monitor className="h-3.5 w-3.5" />
            Landscape
          </button>
          <button
            type="button"
            onClick={() => setOrientation("portrait")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium",
              orientation === "portrait"
                ? "bg-zinc-100 text-zinc-900"
                : "text-zinc-300 hover:bg-zinc-800",
            )}
          >
            <Smartphone className="h-3.5 w-3.5" />
            Portrait
          </button>
        </div>

        <label className="flex items-center gap-2 text-xs text-zinc-400">
          <span className="hidden sm:inline">Resolution</span>
          <select
            value={resolution}
            onChange={(e) =>
              setResolution(e.target.value as PreviewResolution)
            }
            className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100 outline-none focus:border-teal-500"
          >
            {PREVIEW_RESOLUTIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => void toggleBrowserFullscreen()}
          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
          title="Browser fullscreen"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Fullscreen</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-600 bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-100 hover:bg-zinc-700"
        >
          Back to Editor
        </button>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1 rounded-md bg-teal-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-500"
        >
          <X className="h-3.5 w-3.5" />
          Close Preview
        </button>
      </header>

      {/* Stage */}
      <div
        ref={stageRef}
        className="relative flex min-h-0 flex-1 items-center justify-center bg-black p-4"
      >
        {framedSlide ? (
          <div
            className="relative overflow-hidden rounded-sm bg-zinc-950 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
            style={frameStyle}
          >
            <PlaybackSlide
              slide={framedSlide}
              playAnimations={playing}
              animationKey={animationKey}
              autoPlayVideo={playing}
              muted
              className="h-full w-full"
              onVideoEnded={() => {
                if (playing) goNext();
              }}
            />
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Nothing to preview yet.</p>
        )}
      </div>

      {/* Transport */}
      <footer className="shrink-0 border-t border-zinc-800 bg-zinc-950/95 px-3 py-3 sm:px-4">
        <div className="mx-auto mb-2 h-1 max-w-3xl overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full bg-teal-500 transition-[width] duration-100 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className="mx-auto flex max-w-3xl items-center justify-center gap-2">
          <button
            type="button"
            onClick={goPrev}
            disabled={safeSlides.length < 2}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800 disabled:opacity-40"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            disabled={safeSlides.length === 0}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-teal-600 text-white hover:bg-teal-500 disabled:opacity-40"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 pl-0.5" />
            )}
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={safeSlides.length < 2}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800 disabled:opacity-40"
            aria-label="Next slide"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <span className="ml-3 hidden text-xs text-zinc-500 sm:inline">
            Space play/pause · ← → slides · Esc close
          </span>
        </div>
      </footer>
    </div>
  );
}
