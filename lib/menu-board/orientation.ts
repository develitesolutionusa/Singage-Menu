import { getCanvas, variantFromAspectRatio } from "@/lib/menu-board/canvas";
import type {
  CanvasSize,
  CanvasVariant,
  OrientationMode,
} from "@/lib/menu-board/types";

export type ResolvedOrientation = {
  mode: OrientationMode;
  variant: CanvasVariant;
  canvas: CanvasSize;
  /** CSS rotation applied to the stage for mounted-rotated TVs. */
  stageRotationDeg: 0 | 90 | 270;
  /**
   * Effective viewport size used for scale math after accounting for
   * physical rotation (width/height swap when rotated 90/270).
   */
  measureWidth: number;
  measureHeight: number;
};

/**
 * Resolve which canvas + stage rotation to use for the current viewport.
 * `mode: "auto"` picks landscape / portrait / square / ultrawide from aspect ratio.
 */
export function resolveOrientation(
  mode: OrientationMode,
  viewportWidth: number,
  viewportHeight: number,
): ResolvedOrientation {
  const vw = Math.max(1, viewportWidth);
  const vh = Math.max(1, viewportHeight);

  if (mode === "rotated-90" || mode === "rotated-270") {
    // Physical TV is rotated: design stays landscape; stage CSS rotates.
    // Measure against the swapped logical viewport so scale-to-fit is correct.
    const measureWidth = vh;
    const measureHeight = vw;
    const variant: CanvasVariant = "landscape";
    return {
      mode,
      variant,
      canvas: getCanvas(variant),
      stageRotationDeg: mode === "rotated-90" ? 90 : 270,
      measureWidth,
      measureHeight,
    };
  }

  if (mode === "landscape") {
    return {
      mode,
      variant: "landscape",
      canvas: getCanvas("landscape"),
      stageRotationDeg: 0,
      measureWidth: vw,
      measureHeight: vh,
    };
  }

  if (mode === "portrait") {
    return {
      mode,
      variant: "portrait",
      canvas: getCanvas("portrait"),
      stageRotationDeg: 0,
      measureWidth: vw,
      measureHeight: vh,
    };
  }

  // Auto: detect from current aspect ratio
  const variant = variantFromAspectRatio(vw / vh);
  return {
    mode: "auto",
    variant,
    canvas: getCanvas(variant),
    stageRotationDeg: 0,
    measureWidth: vw,
    measureHeight: vh,
  };
}

export const ORIENTATION_OPTIONS: Array<{
  id: OrientationMode;
  label: string;
}> = [
  { id: "auto", label: "Auto" },
  { id: "landscape", label: "Landscape" },
  { id: "portrait", label: "Portrait" },
  { id: "rotated-90", label: "Rotated 90°" },
  { id: "rotated-270", label: "Rotated 270°" },
];
