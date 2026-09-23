"use client";

import { useEffect, useRef, useState } from "react";
import { DesignElementView } from "@/components/design-editor/design-element-view";
import { TemplatePreview } from "@/components/templates/template-preview";
import {
  getArtboardSize,
  getElements,
  type DesignAnimation,
  type DesignElement,
} from "@/lib/design-elements";
import { ensureSmartDesign } from "@/lib/smart-templates";
import { cn } from "@/lib/utils";
import type { DesignData, Orientation } from "@/types/db";

export type PreviewResolution =
  | "fit"
  | "1920x1080"
  | "1280x720"
  | "1080x1920"
  | "720x1280";

export const PREVIEW_RESOLUTIONS: Array<{
  id: PreviewResolution;
  label: string;
  width?: number;
  height?: number;
}> = [
  { id: "fit", label: "Fit screen" },
  { id: "1920x1080", label: "1920×1080", width: 1920, height: 1080 },
  { id: "1280x720", label: "1280×720", width: 1280, height: 720 },
  { id: "1080x1920", label: "1080×1920", width: 1080, height: 1920 },
  { id: "720x1280", label: "720×1280", width: 720, height: 1280 },
];

function animationCss(
  name: DesignAnimation | undefined,
  durationMs: number,
): React.CSSProperties | undefined {
  if (!name || name === "none") return undefined;
  const map: Record<Exclude<DesignAnimation, "none">, string> = {
    fade: "design-preview-fade",
    "slide-up": "design-preview-slide-up",
    "slide-down": "design-preview-slide-down",
    scale: "design-preview-scale",
  };
  return {
    animationName: map[name],
    animationDuration: `${Math.max(100, durationMs)}ms`,
    animationTimingFunction: "ease-out",
    animationFillMode: "both",
  };
}

/**
 * Shared design slide renderer used by the player and Preview Mode.
 * Prefers canvas elements; falls back to TemplatePreview for legacy slides.
 */
export function DesignSlideStage({
  data,
  orientation = "landscape",
  className,
  playAnimations = false,
  animationKey = 0,
  deviceOrientation,
}: {
  data: DesignData | null | undefined;
  orientation?: Orientation;
  className?: string;
  playAnimations?: boolean;
  animationKey?: string | number;
  deviceOrientation?: Orientation;
}) {
  const design = ensureSmartDesign(data);
  const elements = getElements(design).filter((el) => {
    if (el.hidden) return false;
    const behavior = el.props.deviceBehavior ?? "all";
    if (!deviceOrientation || behavior === "all") return true;
    return behavior === deviceOrientation;
  });
  const artboard = getArtboardSize(orientation);
  const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);

  if (sorted.length === 0) {
    return (
      <TemplatePreview data={design} className={cn("h-full w-full", className)} />
    );
  }

  return (
    <div
      className={cn("relative h-full w-full overflow-hidden", className)}
      style={{ background: design.theme?.bg ?? "#0f172a" }}
    >
      <style>{`
        @keyframes design-preview-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes design-preview-slide-up {
          from { opacity: 0; transform: translateY(28px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes design-preview-slide-down {
          from { opacity: 0; transform: translateY(-28px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes design-preview-scale {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
      <ScaledArtboard width={artboard.width} height={artboard.height}>
        {sorted.map((el, index) => (
          <AnimatedElement
            key={`${el.id}-${animationKey}`}
            element={el}
            playAnimations={playAnimations}
            staggerMs={index * 40}
          />
        ))}
      </ScaledArtboard>
    </div>
  );
}

function ScaledArtboard({
  width,
  height,
  children,
}: {
  width: number;
  height: number;
  children: React.ReactNode;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const apply = () => {
      const pw = host.clientWidth;
      const ph = host.clientHeight;
      if (!pw || !ph) return;
      setScale(Math.min(pw / width, ph / height));
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(host);
    return () => ro.disconnect();
  }, [width, height]);

  return (
    <div ref={hostRef} className="relative flex h-full w-full items-center justify-center">
      <div
        className="relative shrink-0 overflow-hidden"
        style={{
          width,
          height,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function AnimatedElement({
  element,
  playAnimations,
  staggerMs,
}: {
  element: DesignElement;
  playAnimations: boolean;
  staggerMs: number;
}) {
  const entrance =
    element.props.entranceAnimation &&
    element.props.entranceAnimation !== "none"
      ? element.props.entranceAnimation
      : element.props.animation;
  const duration = element.props.animationDuration ?? 500;
  const style: React.CSSProperties = {
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    zIndex: element.zIndex,
    transform: element.rotation
      ? `rotate(${element.rotation}deg)`
      : undefined,
    transformOrigin: "center center",
    ...(playAnimations
      ? {
          ...animationCss(entrance, duration),
          animationDelay: `${staggerMs}ms`,
        }
      : null),
  };

  return (
    <div className="absolute" style={style}>
      <DesignElementView element={element} />
    </div>
  );
}
