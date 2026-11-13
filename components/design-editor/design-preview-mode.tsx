"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Pause,
  Play,
  X,
} from "lucide-react";
import {
  PlaybackSlide,
  type PlaybackSlideInput,
} from "@/components/player/playback-slide";
import {
  DEVICE_FRAMES,
  SafeAreaOverlay,
  type DeviceFrameId,
} from "@/components/menu-board/preview-toolbar";
import { cn } from "@/lib/utils";
import type { Orientation } from "@/types/db";

export type DesignPreviewSlide = {
  id: string;
  name: string;
  durationSeconds: number;
  slide: PlaybackSlideInput;
};

function fitFrame(
  hostW: number,
  hostH: number,
  ratio: number,
): { width: number; height: number } {
  const byWidth = { width: hostW, height: hostW / ratio };
  if (byWidth.height <= hostH) return byWidth;
  return { width: hostH * ratio, height: hostH };
}

/**
 * Fullscreen Preview for ANY design template.
 * Device frames (16:9 / 9:16 / 4:3 / 21:9 / 3-screen wall) + safe-area overscan overlay.
 */
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
  const [frameId, setFrameId] = useState<DeviceFrameId>(
    defaultOrientation === "portrait" ? "9-16" : "16-9",
  );
  const [safeArea, setSafeArea] = useState(false);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [animationKey, setAnimationKey] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });
  const stageRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const safeSlides = slides.length > 0 ? slides : [];
  const preset =
    DEVICE_FRAMES.find((p) => p.id === frameId) ?? DEVICE_FRAMES[1];

  // Fill = auto from host size; fixed frames force landscape/portrait.
  const orientation: Orientation =
    frameId === "fill"
      ? frameSize.height > frameSize.width
        ? "portrait"
        : "landscape"
      : frameId === "9-16" || frameId === "wall-3"
        ? "portrait"
        : "landscape";

  useEffect(() => {
    if (!open) return;
    setFrameId(defaultOrientation === "portrait" ? "9-16" : "16-9");
    setPlaying(true);
    setElapsedMs(0);
    setAnimationKey((k) => k + 1);
    const start =
      initialSlideId != null
        ? slides.findIndex((s) => s.id === initialSlideId)
        : 0;
    setIndex(start >= 0 ? start : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialSlideId, defaultOrientation]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !open) return;
    const apply = () => {
      const pad = 32;
      const hw = Math.max(1, host.clientWidth - pad);
      const hh = Math.max(1, host.clientHeight - pad);
      if (preset.ratio == null) {
        setFrameSize({ width: host.clientWidth, height: host.clientHeight });
        return;
      }
      setFrameSize(fitFrame(hw, hh, preset.ratio));
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(host);
    return () => ro.disconnect();
  }, [preset.ratio, open, frameId]);

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
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        setSafeArea((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, goPrev, goNext]);

  async function toggleBrowserFullscreen() {
    const el = stageRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await el.requestFullscreen();
    } catch {
      /* blocked */
    }
  }

  if (!open) return null;

  const progress = Math.min(1, elapsedMs / durationMs);
  const showWall = frameId === "wall-3";

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-zinc-950 text-white">
      <header className="flex shrink-0 flex-col gap-2 border-b border-zinc-800 bg-zinc-950/95 px-3 py-2 backdrop-blur sm:px-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-auto min-w-0">
            <p className="truncate text-sm font-semibold">{title}</p>
            <p className="truncate text-xs text-zinc-400">
              {current
                ? `${current.name} · ${index + 1}/${safeSlides.length}`
                : "No slides"}
              {" · "}
              {DEVICE_FRAMES.find((f) => f.id === frameId)?.label}
              {safeArea ? " · Safe area" : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void toggleBrowserFullscreen()}
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Fullscreen</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 rounded-md bg-teal-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-500"
          >
            <X className="h-3.5 w-3.5" />
            Close Preview
          </button>
        </div>

        {/* Device frames — applies to every template */}
        <div className="flex flex-wrap items-center gap-1">
          {DEVICE_FRAMES.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFrameId(f.id)}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                frameId === f.id
                  ? "bg-teal-500 text-white"
                  : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white",
              )}
            >
              {f.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSafeArea((v) => !v)}
            className={cn(
              "ml-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
              safeArea
                ? "bg-amber-500 text-black"
                : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800",
            )}
            title="Toggle 5% TV overscan safe area (S)"
          >
            Safe area
          </button>
        </div>
      </header>

      <div
        ref={(node) => {
          stageRef.current = node;
          hostRef.current = node;
        }}
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black p-4"
      >
        {framedSlide ? (
          showWall ? (
            <div
              className="grid h-full max-h-full w-full max-w-[96vw] grid-cols-3 gap-[0.6%] overflow-hidden"
              style={{
                width: frameSize.width || "100%",
                height: frameSize.height || "100%",
              }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="relative min-h-0 min-w-0 overflow-hidden rounded-sm ring-1 ring-white/10"
                >
                  <PlaybackSlide
                    slide={framedSlide}
                    playAnimations={playing}
                    animationKey={`${animationKey}-${i}`}
                    autoPlayVideo={playing}
                    muted
                    className="h-full w-full"
                  />
                  {safeArea ? <SafeAreaOverlay insetPercent={5} /> : null}
                  <span className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/90">
                    Screen {i + 1}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="relative overflow-hidden rounded-sm bg-zinc-950 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
              style={{
                width: frameSize.width || "100%",
                height: frameSize.height || "100%",
              }}
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
              {safeArea ? <SafeAreaOverlay insetPercent={5} /> : null}
            </div>
          )
        ) : (
          <p className="text-sm text-zinc-500">Nothing to preview yet.</p>
        )}
      </div>

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
            Device frames · Safe area (S) · Space play · Esc close
          </span>
        </div>
      </footer>
    </div>
  );
}
