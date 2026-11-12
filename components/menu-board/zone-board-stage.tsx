"use client";

import { ScreenStage } from "@/components/menu-board/screen-stage";
import { ZoneRenderer } from "@/components/menu-board/zone-renderer";
import { resolveZoneTemplateFromDesign } from "@/lib/menu-board/apply-zone-content";
import type { CanvasVariant } from "@/lib/menu-board/types";
import { cn } from "@/lib/utils";
import type { DesignData, Orientation } from "@/types/db";

/**
 * Pixel-faithful zone board playback/preview for Design Editor slides
 * marked with zoneBoard: true. Uses ScreenStage scale-to-fit.
 */
export function ZoneBoardStage({
  data,
  orientation = "landscape",
  className,
}: {
  data: DesignData | null | undefined;
  orientation?: Orientation;
  className?: string;
}) {
  const template = resolveZoneTemplateFromDesign(data);
  if (!template) return null;

  const variant: CanvasVariant =
    orientation === "portrait"
      ? "portrait"
      : template.variants?.portrait &&
          template.canvas.height > template.canvas.width
        ? "portrait"
        : "landscape";

  const pack = template.variants?.[variant];
  const canvas = pack?.canvas ?? template.canvas;

  // Portrait-only wall templates always use their native canvas
  const useCanvas =
    template.canvas.height > template.canvas.width && !template.variants
      ? template.canvas
      : canvas;
  const useVariant: CanvasVariant =
    useCanvas.height > useCanvas.width ? "portrait" : variant;

  return (
    <div
      className={cn("relative h-full w-full overflow-hidden", className)}
      style={{ backgroundColor: template.theme.bg }}
      data-zone-board-stage
    >
      <ScreenStage
        canvasWidth={useCanvas.width}
        canvasHeight={useCanvas.height}
        letterboxColor={template.theme.bg}
      >
        <ZoneRenderer template={template} variant={useVariant} />
      </ScreenStage>
    </div>
  );
}
