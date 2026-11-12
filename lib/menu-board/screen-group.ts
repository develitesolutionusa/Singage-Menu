import type { ScreenGroup } from "@/lib/menu-board/zone-schema";

export type ScreenSlice = {
  groupId: string;
  index: number;
  columns: number;
  rows: number;
  mode: ScreenGroup["mode"];
  /** Clip region of the spanned canvas as % (span mode) */
  clip: { x: number; y: number; w: number; h: number };
  /** Template to render for this screen */
  templateId: string;
  /** CSS transform origin offset for span slicing */
  translatePercent: { x: number; y: number };
};

/**
 * Resolve which slice / template a device should show.
 * URL: /player/[screenId]?group=abc&index=0
 */
export function resolveScreenSlice(
  group: ScreenGroup,
  index: number,
): ScreenSlice {
  const total = group.columns * group.rows;
  const safeIndex = ((index % total) + total) % total;
  const col = safeIndex % group.columns;
  const row = Math.floor(safeIndex / group.columns);
  const bezel = group.bezelGapPercent ?? 1.5;

  // Each screen is 1/N of content width, with bezel eaten from edges
  const cellW = 100 / group.columns;
  const cellH = 100 / group.rows;
  const gapX = bezel / group.columns;
  const gapY = bezel / group.rows;

  const clip = {
    x: col * cellW + gapX / 2,
    y: row * cellH + gapY / 2,
    w: cellW - gapX,
    h: cellH - gapY,
  };

  let templateId = group.templateId ?? "";
  if (group.mode === "linked") {
    templateId =
      group.screenTemplateIds?.[safeIndex] ??
      group.screenTemplateIds?.[0] ??
      templateId;
  }

  return {
    groupId: group.id,
    index: safeIndex,
    columns: group.columns,
    rows: group.rows,
    mode: group.mode,
    clip,
    templateId,
    translatePercent: {
      x: -(col * 100),
      y: -(row * 100),
    },
  };
}

/** Build a composite canvas size for a multi-screen wall preview. */
export function wallCanvasSize(
  screenW: number,
  screenH: number,
  columns: number,
  rows: number,
  bezelPx = 24,
) {
  return {
    width: screenW * columns + bezelPx * Math.max(0, columns - 1),
    height: screenH * rows + bezelPx * Math.max(0, rows - 1),
  };
}

export function parseGroupQuery(search: {
  group?: string | null;
  index?: string | null;
}): { groupId: string | null; index: number } {
  const groupId = search.group?.trim() || null;
  const raw = Number(search.index ?? 0);
  const index = Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
  return { groupId, index };
}
