"use client";

import { useEffect, useState, type RefObject } from "react";
import { variantFromAspectRatio } from "@/lib/menu-board/canvas";
import type { CanvasVariant } from "@/lib/menu-board/types";

export type AspectRatioState = {
  width: number;
  height: number;
  /** width / height */
  ratio: number;
  variant: CanvasVariant;
  /** Common label e.g. "16:9", "9:16" */
  label: string;
};

function nearestLabel(ratio: number): string {
  const presets: Array<[string, number]> = [
    ["21:9", 21 / 9],
    ["16:9", 16 / 9],
    ["3× Portrait wall", (1080 * 3) / 1920],
    ["4:3", 4 / 3],
    ["1:1", 1],
    ["3:4", 3 / 4],
    ["9:16", 9 / 16],
  ];
  let best = presets[0];
  let bestDist = Infinity;
  for (const p of presets) {
    const d = Math.abs(ratio - p[1]);
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best[0];
}

/**
 * Observe a host element and report live aspect ratio + canvas variant.
 * Prefer this over window.innerWidth so letterboxed preview frames work.
 */
export function useAspectRatio(
  hostRef: RefObject<HTMLElement | null>,
): AspectRatioState {
  const [state, setState] = useState<AspectRatioState>({
    width: 1920,
    height: 1080,
    ratio: 16 / 9,
    variant: "landscape",
    label: "16:9",
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const apply = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      const ratio = width / height;
      setState({
        width,
        height,
        ratio,
        variant: variantFromAspectRatio(ratio),
        label: nearestLabel(ratio),
      });
    };

    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(host);
    return () => ro.disconnect();
  }, [hostRef]);

  return state;
}
