"use client";

import { useRef } from "react";
import { ScreenStage } from "@/components/menu-board/screen-stage";
import { ZoneRenderer } from "@/components/menu-board/zone-renderer";
import { SafeAreaOverlay } from "@/components/menu-board/preview-toolbar";
import { useAspectRatio } from "@/lib/menu-board/use-aspect-ratio";
import {
  DEFAULT_ZONE_TEMPLATE_ID,
  getZoneTemplate,
} from "@/lib/menu-board/templates";
import type { CanvasVariant } from "@/lib/menu-board/types";
import { cn } from "@/lib/utils";

type ZoneEngineProps = {
  templateId?: string;
  /** Force a canvas variant; default = detect from host via useAspectRatio */
  variant?: CanvasVariant;
  showSafeArea?: boolean;
  className?: string;
  clip?: { x: number; y: number; w: number; h: number };
};

/**
 * Zone-template engine: picks canvas from template (+ variant),
 * mounts zones inside ScreenStage scale-to-fit.
 */
export function ZoneEngine({
  templateId = DEFAULT_ZONE_TEMPLATE_ID,
  variant: variantOverride,
  showSafeArea = false,
  className,
  clip,
}: ZoneEngineProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const aspect = useAspectRatio(hostRef);
  const template = getZoneTemplate(templateId);

  if (!template) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-white">
        Unknown template: {templateId}
      </div>
    );
  }

  const variant = variantOverride ?? aspect.variant;
  const pack = template.variants?.[variant];
  const canvas = pack?.canvas ?? template.canvas;

  return (
    <div
      ref={hostRef}
      className={cn("relative h-full w-full overflow-hidden", className)}
      style={{ backgroundColor: template.theme.bg }}
      data-zone-engine
    >
      <ScreenStage
        canvasWidth={canvas.width}
        canvasHeight={canvas.height}
        letterboxColor={template.theme.bg}
      >
        <ZoneRenderer
          template={template}
          variant={variant}
          clip={clip}
        />
        {showSafeArea ? <SafeAreaOverlay insetPercent={5} /> : null}
      </ScreenStage>
    </div>
  );
}
