"use client";

import { useEffect, useState, type RefObject } from "react";
import type { Orientation } from "@/types/db";

/** Portrait when taller than wide; otherwise landscape. */
export function orientationFromSize(width: number, height: number): Orientation {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return "landscape";
  }
  return height > width ? "portrait" : "landscape";
}

/**
 * Live orientation from a host element (preferred) or the window.
 * Use on the player stage so templates remap automatically — no manual toggle.
 */
export function useViewportOrientation(
  hostRef?: RefObject<HTMLElement | null>,
): Orientation {
  const [orientation, setOrientation] = useState<Orientation>("landscape");

  useEffect(() => {
    const read = () => {
      const host = hostRef?.current;
      if (host) {
        const w = host.clientWidth;
        const h = host.clientHeight;
        if (w > 0 && h > 0) {
          setOrientation(orientationFromSize(w, h));
          return;
        }
      }
      setOrientation(
        orientationFromSize(window.innerWidth, window.innerHeight),
      );
    };

    read();

    const host = hostRef?.current;
    let ro: ResizeObserver | null = null;
    if (host && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(read);
      ro.observe(host);
    }

    window.addEventListener("resize", read);
    window.addEventListener("orientationchange", read);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", read);
      window.removeEventListener("orientationchange", read);
    };
  }, [hostRef]);

  return orientation;
}
