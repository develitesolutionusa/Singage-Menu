"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

type ScreenStageProps = {
  canvasWidth: number;
  canvasHeight: number;
  /** Letterbox / pillarbox bars match template background — never white gaps. */
  letterboxColor: string;
  /** CSS rotate for TVs mounted at 90° / 270°. */
  rotationDeg?: 0 | 90 | 270;
  className?: string;
  children: ReactNode;
};

/**
 * Fixed design canvas + scale-to-fit.
 * Measures the host with ResizeObserver and applies
 * transform: scale(min(vw/canvasW, vh/canvasH)), centered.
 */
export function ScreenStage({
  canvasWidth,
  canvasHeight,
  letterboxColor,
  rotationDeg = 0,
  className,
  children,
}: ScreenStageProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const apply = () => {
      const rotated = rotationDeg === 90 || rotationDeg === 270;
      // After CSS rotation, the canvas's visual footprint swaps axes —
      // measure against the swapped host so letterboxing stays correct.
      const rw = rotated ? host.clientHeight : host.clientWidth;
      const rh = rotated ? host.clientWidth : host.clientHeight;
      if (!rw || !rh) return;
      setScale(Math.min(rw / canvasWidth, rh / canvasHeight));
    };

    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(host);
    return () => ro.disconnect();
  }, [canvasWidth, canvasHeight, rotationDeg]);

  const rotated = rotationDeg === 90 || rotationDeg === 270;

  const canvasStyle: CSSProperties = {
    width: canvasWidth,
    height: canvasHeight,
    transform: rotated
      ? `translate(-50%, -50%) rotate(${rotationDeg}deg) scale(${scale})`
      : `translate(-50%, -50%) scale(${scale})`,
    transformOrigin: "center center",
    backgroundColor: letterboxColor,
    // Container queries resolve against the fixed canvas — cqw/cqh stay stable
    // at design resolution, then the whole stage scales visually.
    containerType: "size",
    containerName: "menu-board-canvas",
  };

  return (
    <div
      ref={hostRef}
      className={cn("relative h-full w-full overflow-hidden", className)}
      style={{ backgroundColor: letterboxColor }}
      data-menu-board-stage
    >
      <div
        className="absolute left-1/2 top-1/2 overflow-hidden"
        style={canvasStyle}
        data-menu-board-canvas
      >
        {children}
      </div>
    </div>
  );
}
