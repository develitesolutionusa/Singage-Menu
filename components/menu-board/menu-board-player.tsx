"use client";

import { useEffect } from "react";
import { ZoneEngine } from "@/components/menu-board/zone-engine";
import {
  getScreenGroup,
  getZoneTemplate,
} from "@/lib/menu-board/templates";
import { resolveScreenSlice } from "@/lib/menu-board/screen-group";

type MenuBoardPlayerProps = {
  screenId: string;
  groupId: string;
  index: number;
};

/**
 * Kiosk player for a screen-group slice.
 * URL: /player/[screenId]?group=portrait-wall-3&index=0
 *
 * Enables fullscreen, hides cursor, and requests a wake lock when available.
 */
export function MenuBoardPlayer({
  screenId,
  groupId,
  index,
}: MenuBoardPlayerProps) {
  const group = getScreenGroup(groupId);
  const slice = group ? resolveScreenSlice(group, index) : null;
  const template = slice ? getZoneTemplate(slice.templateId) : null;

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.cssText;
    const prevBody = body.style.cssText;
    const prevCursor = body.style.cursor;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.margin = "0";
    body.style.cursor = "none";
    body.style.background = "#000";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "f" || e.key === "F") {
        void document.documentElement.requestFullscreen?.();
      }
    };
    window.addEventListener("keydown", onKey);

    let wake: WakeLockSentinel | null = null;
    const requestWake = async () => {
      try {
        if ("wakeLock" in navigator) {
          wake = await navigator.wakeLock.request("screen");
        }
      } catch {
        /* unsupported / denied — ignore */
      }
    };
    void requestWake();
    void document.documentElement.requestFullscreen?.().catch(() => null);

    return () => {
      html.style.cssText = prevHtml;
      body.style.cssText = prevBody;
      body.style.cursor = prevCursor;
      window.removeEventListener("keydown", onKey);
      void wake?.release();
    };
  }, []);

  if (!group || !slice || !template) {
    return (
      <div className="flex h-[100dvh] w-screen flex-col items-center justify-center gap-2 bg-black text-white">
        <p className="text-lg font-semibold">Screen group not found</p>
        <p className="text-sm text-white/60">
          screen={screenId} group={groupId} index={index}
        </p>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-screen overflow-hidden bg-black" data-screen-id={screenId}>
      <ZoneEngine
        templateId={slice.templateId}
        variant="portrait"
        clip={slice.mode === "span" ? slice.clip : undefined}
      />
    </div>
  );
}
