import type { CanvasSize, CanvasVariant } from "@/lib/menu-board/types";

/** Canonical fixed design canvases (CSS px at 1×). */
export const CANVAS_PRESETS: Record<
  CanvasVariant,
  Omit<CanvasSize, "variant">
> = {
  landscape: { width: 1920, height: 1080 },
  portrait: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 },
  ultrawide: { width: 2560, height: 1080 },
};

export function getCanvas(variant: CanvasVariant): CanvasSize {
  const size = CANVAS_PRESETS[variant];
  return { ...size, variant };
}

/**
 * Pick the best canvas variant from a viewport aspect ratio.
 * Covers 16:9, 9:16, 21:9, 4:3, 1:1, and multi-portrait video walls.
 */
export function variantFromAspectRatio(ratio: number): CanvasVariant {
  if (!Number.isFinite(ratio) || ratio <= 0) return "landscape";
  // 21:9 ≈ 2.33; 3× portrait wall ≈ 1.69–2.5 depending on bezel gap
  if (ratio >= 2.05) return "ultrawide";
  if (ratio >= 1.15) return "landscape";
  if (ratio <= 0.87) return "portrait";
  return "square";
}
