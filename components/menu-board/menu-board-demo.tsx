"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEVICE_FRAMES,
  PreviewToolbar,
  type DeviceFrameId,
} from "@/components/menu-board/preview-toolbar";
import { WallPreview } from "@/components/menu-board/wall-preview";
import { ZoneEngine } from "@/components/menu-board/zone-engine";
import { runTemplateQa } from "@/lib/menu-board/templates";
import { cn } from "@/lib/utils";

const TEMPLATE_SWITCHER: Array<{ id: string; name: string }> = [
  { id: "seasonal-menu", name: "Seasonal Menu" },
  { id: "promo-ticker", name: "Promo Ticker" },
  { id: "wall-3", name: "3-Screen Wall" },
];

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
 * Locks the document to a no-scroll kiosk shell and mounts the zone engine.
 * Preview toolbar: device frames, safe-area overlay, template switch, QA badge.
 */
export function MenuBoardDemo() {
  const shellRef = useRef<HTMLElement>(null);
  const [frameId, setFrameId] = useState<DeviceFrameId>("16-9");
  const [templateId, setTemplateId] = useState("seasonal-menu");
  const [safeArea, setSafeArea] = useState(false);
  const [frame, setFrame] = useState({ width: 0, height: 0 });

  const qaCount = useMemo(() => {
    const all = runTemplateQa();
    return Object.values(all).reduce((n, list) => n + list.length, 0);
  }, []);

  const preset =
    DEVICE_FRAMES.find((p) => p.id === frameId) ?? DEVICE_FRAMES[0];

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.cssText;
    const prevBody = body.style.cssText;

    html.style.width = "100vw";
    html.style.height = "100dvh";
    html.style.overflow = "hidden";
    html.style.margin = "0";
    body.style.width = "100vw";
    body.style.height = "100dvh";
    body.style.overflow = "hidden";
    body.style.margin = "0";
    body.style.background = "#061818";

    return () => {
      html.style.cssText = prevHtml;
      body.style.cssText = prevBody;
    };
  }, []);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    const apply = () => {
      const pad = 24;
      const hw = Math.max(1, shell.clientWidth - pad);
      const hh = Math.max(1, shell.clientHeight - pad);
      if (preset.ratio == null) {
        setFrame({ width: shell.clientWidth, height: shell.clientHeight });
        return;
      }
      setFrame(fitFrame(hw, hh, preset.ratio));
    };

    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(shell);
    return () => ro.disconnect();
  }, [preset.ratio]);

  useEffect(() => {
    if (templateId === "wall-3" && frameId !== "wall-3") setFrameId("wall-3");
  }, [templateId, frameId]);

  const showWall = templateId === "wall-3" || frameId === "wall-3";

  return (
    <main
      ref={shellRef}
      className="relative flex h-[100dvh] w-screen items-center justify-center overflow-hidden bg-[#061818]"
    >
      <div
        className={cn(
          "relative overflow-hidden",
          preset.ratio != null && "shadow-2xl ring-1 ring-white/10",
        )}
        style={{
          width: frame.width || "100%",
          height: frame.height || "100%",
        }}
      >
        {showWall ? (
          <WallPreview groupId="portrait-wall-3" showSafeArea={safeArea} />
        ) : (
          <ZoneEngine
            templateId={templateId}
            showSafeArea={safeArea}
            variant={
              frameId === "9-16"
                ? "portrait"
                : frameId === "1-1"
                  ? "square"
                  : frameId === "21-9"
                    ? "ultrawide"
                    : "landscape"
            }
          />
        )}
      </div>

      <PreviewToolbar
        frameId={frameId}
        onFrameChange={(id) => {
          setFrameId(id);
          if (id === "wall-3") setTemplateId("wall-3");
        }}
        safeArea={safeArea}
        onSafeAreaChange={setSafeArea}
        templateId={templateId}
        onTemplateChange={(id) => {
          setTemplateId(id);
          if (id === "wall-3") setFrameId("wall-3");
          else if (frameId === "wall-3") setFrameId("16-9");
        }}
        templates={TEMPLATE_SWITCHER}
        qaCount={qaCount}
      />
    </main>
  );
}
