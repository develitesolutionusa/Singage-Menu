/**
 * Append one menu item (picture, description, price) at the end of the
 * current list and grow the template so the new row fits.
 */
import { createElementId, type DesignElement } from "@/lib/design-elements";
import { measureArtboard } from "@/lib/design-orientation";
import type { MenuItemData, Zone, ZoneTemplate } from "@/lib/menu-board/zone-schema";
import {
  getContentValues,
  getEditableFields,
  isSmartTemplate,
  type SmartEditableField,
} from "@/lib/smart-templates";
import type { DesignData, Orientation } from "@/types/db";

const NEW_ITEM_IMAGE = "/templates/heroes/new-item.svg";
const ITEM_GAP = 10;
const RICH_HEIGHT = 156;

const ITEM_ID =
  /^(.*)_((?:item|desc|description|price|image|name|photo))(\d+)$/i;

type ItemAnchor = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  /** Zone id encoded in converted menu-card ids (`{zone}_item_{id}`). */
  zoneId: string | null;
  source: DesignElement | null;
};

export type AppendMenuItemResult = {
  data: DesignData;
  selectedIds: string[];
};

function boundsOf(elements: DesignElement[]): ItemAnchor | null {
  if (!elements.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const el of elements) {
    minX = Math.min(minX, el.x);
    minY = Math.min(minY, el.y);
    maxX = Math.max(maxX, el.x + el.width);
    maxY = Math.max(maxY, el.y + el.height);
  }
  return {
    minX,
    minY,
    maxX,
    maxY,
    zoneId: zoneIdFromElement(elements[elements.length - 1]),
    source: elements[elements.length - 1] ?? null,
  };
}

function zoneIdFromElement(el: DesignElement | null): string | null {
  if (!el) return null;
  const match = /^(.+)_item_(.+)$/.exec(el.id);
  return match?.[1] ?? null;
}

function findLastAnchor(elements: DesignElement[]): ItemAnchor | null {
  const cards = elements.filter((el) => el.type === "menu-card" && !el.hidden);
  if (cards.length) {
    const sorted = [...cards].sort((a, b) =>
      a.y === b.y ? a.x - b.x : a.y - b.y,
    );
    const last = sorted[sorted.length - 1];
    return boundsOf([last]);
  }

  const groups = new Map<string, DesignElement[]>();
  for (const el of elements) {
    if (el.hidden) continue;
    const match = ITEM_ID.exec(el.id);
    if (!match) continue;
    const key = `${match[1]}#${match[3]}`;
    const list = groups.get(key);
    if (list) list.push(el);
    else groups.set(key, [el]);
  }
  let best: ItemAnchor | null = null;
  for (const group of groups.values()) {
    const box = boundsOf(group);
    if (!box) continue;
    const source =
      group.find((el) => /_item\d+$/i.test(el.id)) ?? group[0] ?? null;
    const candidate = { ...box, source, zoneId: null };
    if (
      !best ||
      candidate.maxY > best.maxY ||
      (candidate.maxY === best.maxY && candidate.maxX > best.maxX)
    ) {
      best = candidate;
    }
  }
  return best;
}

function isFullBleed(
  el: DesignElement,
  width: number,
  height: number,
): boolean {
  return (
    el.type === "shape" &&
    el.x <= 1 &&
    el.y <= 1 &&
    el.width >= width - 2 &&
    el.height >= height - 2
  );
}

function coversColumn(el: DesignElement, column: ItemAnchor): boolean {
  if (el.type !== "shape" || el.height < 36) return false;
  const overlapsX =
    el.x < column.maxX - 4 && el.x + el.width > column.minX + 4;
  const wrapsItems = el.y + el.height >= column.maxY - 16;
  return overlapsX && el.y <= column.minY + 4 && wrapsItems;
}

function blankItem(source: DesignElement | null, id: string): DesignElement {
  const base = source?.props ?? {};
  return {
    id,
    type: "menu-card",
    name: "New item",
    x: source?.x ?? 24,
    y: source?.y ?? 24,
    width: source?.width ?? 320,
    height: Math.max(source?.height ?? 0, RICH_HEIGHT),
    rotation: 0,
    locked: false,
    hidden: false,
    zIndex: (source?.zIndex ?? 5) + 1,
    props: {
      ...base,
      name: "New item",
      description: "Add a description",
      price: "$0.00",
      imageUrl: NEW_ITEM_IMAGE,
      featured: false,
      category: "",
      cta: "",
      padding: base.padding ?? 8,
      borderRadius: base.borderRadius ?? 12,
    },
  };
}

function placeItem(
  elements: DesignElement[],
  item: DesignElement,
  anchor: ItemAnchor | null,
  artboard: { width: number; height: number },
): DesignElement[] {
  const placed: DesignElement = { ...item, props: { ...item.props } };
  if (anchor) {
    const sameRow = elements.filter(
      (el) =>
        el.type === "menu-card" &&
        !el.hidden &&
        Math.abs(el.y - anchor.minY) < 6 &&
        el.id !== anchor.source?.id,
    );
    const rowHeight = anchor.maxY - anchor.minY;
    const nextX = anchor.maxX + ITEM_GAP;
    if (
      sameRow.length > 0 &&
      placed.height <= rowHeight + 4 &&
      nextX + (anchor.maxX - anchor.minX) <= artboard.width - 8
    ) {
      placed.x = nextX;
      placed.y = anchor.minY;
      placed.width = anchor.maxX - anchor.minX;
      return [...elements, placed];
    }
    placed.x = anchor.minX;
    placed.y = anchor.maxY + ITEM_GAP;
    placed.width = Math.max(120, anchor.maxX - anchor.minX);
  } else {
    const bottom = elements.reduce(
      (max, el) => Math.max(max, el.hidden ? 0 : el.y + el.height),
      0,
    );
    placed.x = 24;
    placed.y = bottom > 0 ? bottom + ITEM_GAP : 24;
    placed.width = Math.min(420, Math.max(160, artboard.width - 48));
  }

  const column = anchor ?? {
    minX: placed.x,
    minY: placed.y,
    maxX: placed.x + placed.width,
    maxY: placed.y,
    zoneId: null,
    source: null,
  };
  const itemBottom = placed.y + placed.height;
  const obstacleIds = new Set<string>();
  let nextTop = Infinity;
  for (const el of elements) {
    if (el.hidden || isFullBleed(el, artboard.width, artboard.height)) continue;
    if (coversColumn(el, column) && el.y < placed.y) continue;
    // Anything that runs into the new row, including a footer that starts a few pixels above it.
    if (el.y + el.height <= placed.y + 1) continue;
    obstacleIds.add(el.id);
    nextTop = Math.min(nextTop, el.y);
  }
  const neededShift = Number.isFinite(nextTop)
    ? Math.max(0, itemBottom + 8 - nextTop)
    : 0;

  const shifted = elements.map((el) => {
    if (isFullBleed(el, artboard.width, artboard.height)) return el;
    if (coversColumn(el, column) && el.y < placed.y) {
      const bottom = Math.max(el.y + el.height, itemBottom + 8);
      return { ...el, height: bottom - el.y };
    }
    if (neededShift > 0 && obstacleIds.has(el.id)) {
      return { ...el, y: el.y + neededShift };
    }
    return el;
  });

  const next = [...shifted, placed];
  let bottom = 0;
  for (const el of next) {
    if (!el.hidden) bottom = Math.max(bottom, el.y + el.height);
  }
  const growth = Math.max(0, Math.ceil(bottom + 12) - artboard.height);
  if (growth <= 0) return next;
  return next.map((el) =>
    isFullBleed(el, artboard.width, artboard.height)
      ? { ...el, height: el.height + growth }
      : el,
  );
}

function fieldsForItem(elementId: string, index: number): SmartEditableField[] {
  const label = `Item ${index}`;
  return [
    {
      id: `${elementId}_name`,
      label: `${label} name`,
      kind: "product",
      bindings: [{ elementId, prop: "name" }],
      defaultValue: "New item",
    },
    {
      id: `${elementId}_desc`,
      label: `${label} description`,
      kind: "description",
      bindings: [{ elementId, prop: "description" }],
      defaultValue: "Add a description",
    },
    {
      id: `${elementId}_price`,
      label: `${label} price`,
      kind: "price",
      bindings: [{ elementId, prop: "price" }],
      defaultValue: "$0.00",
    },
    {
      id: `${elementId}_image`,
      label: `${label} picture`,
      kind: "image",
      bindings: [{ elementId, prop: "imageUrl" }],
      defaultValue: NEW_ITEM_IMAGE,
    },
  ];
}

function appendZoneItem(
  template: ZoneTemplate,
  preferZoneId: string | null,
  item: MenuItemData,
): ZoneTemplate {
  const growPack = (
    canvas: { width: number; height: number },
    zones: Zone[],
  ) => {
    const lists = zones.filter(
      (zone): zone is Extract<Zone, { type: "menu-list" }> =>
        zone.type === "menu-list",
    );
    if (!lists.length) return { canvas, zones };
    const target =
      lists.find((zone) => zone.id === preferZoneId) ??
      lists.reduce((lowest, zone) =>
        zone.y + zone.h > lowest.y + lowest.h ? zone : lowest,
      );
    const oldH = canvas.height;
    const rowPx =
      ((target.h / 100) * oldH) / Math.max(1, target.items.length);
    const newH = oldH + rowPx;
    const zoneBottom = ((target.y + target.h) / 100) * oldH;

    const nextZones = zones.map((zone) => {
      const top = (zone.y / 100) * oldH;
      const h = (zone.h / 100) * oldH;
      const growThis = zone.id === target.id;
      const nextTop = !growThis && top >= zoneBottom - 0.5 ? top + rowPx : top;
      const nextH = growThis ? h + rowPx : h;
      const moved = {
        ...zone,
        y: (nextTop / newH) * 100,
        h: (nextH / newH) * 100,
      };
      if (growThis && zone.type === "menu-list") {
        return { ...moved, items: [...zone.items, item] };
      }
      return moved;
    });

    return {
      canvas: { ...canvas, height: Math.round(newH) },
      zones: nextZones,
    };
  };

  const base = growPack(template.canvas, template.zones);
  let variants = template.variants;
  if (variants) {
    const nextVariants: NonNullable<ZoneTemplate["variants"]> = {};
    for (const [key, pack] of Object.entries(variants)) {
      if (!pack) continue;
      const grown = growPack(pack.canvas, pack.zones);
      nextVariants[key as keyof typeof nextVariants] = grown;
    }
    variants = nextVariants;
  }

  return {
    ...template,
    canvas: base.canvas,
    zones: base.zones,
    ...(variants ? { variants } : null),
  };
}

function withArtboard(
  data: DesignData,
  elements: DesignElement[],
  orientation: Orientation,
): DesignData {
  const size = measureArtboard(data, orientation, elements);
  const raw = data.orientationLayouts;
  let orientationLayouts = raw;
  if (raw && typeof raw === "object") {
    const packs = raw as Record<
      string,
      { artboardWidth?: number; artboardHeight?: number; elements?: DesignElement[] }
    >;
    const pack = packs[orientation];
    if (pack && Array.isArray(pack.elements)) {
      orientationLayouts = {
        ...packs,
        [orientation]: {
          ...pack,
          elements,
          artboardWidth: size.width,
          artboardHeight: size.height,
        },
      };
    }
  }

  return {
    ...data,
    elements,
    orientation,
    artboardWidth: size.width,
    artboardHeight: size.height,
    ...(orientationLayouts ? { orientationLayouts } : null),
  };
}

/** Where the next item will land, so the editor can pin Add items under the list. */
export function menuItemInsertPoint(
  elements: DesignElement[],
): { x: number; y: number; width: number } | null {
  const anchor = findLastAnchor(elements);
  if (!anchor) return null;
  return {
    x: anchor.minX,
    y: anchor.maxY,
    width: Math.max(120, anchor.maxX - anchor.minX),
  };
}

export function appendMenuItem(
  data: DesignData,
  orientation: Orientation,
): AppendMenuItemResult {
  const elements = (Array.isArray(data.elements) ? data.elements : []) as DesignElement[];
  const artboard = measureArtboard(data, orientation, elements);
  const anchor = findLastAnchor(elements);
  const zoneId = anchor?.zoneId ?? null;
  const itemId = `added_${createElementId().slice(0, 8)}`;
  const elementId = zoneId ? `${zoneId}_item_${itemId}` : createElementId();
  const item = blankItem(anchor?.source ?? null, elementId);
  const nextElements = placeItem(elements, item, anchor, artboard);

  const index =
    nextElements.filter((el) => el.type === "menu-card" && !el.hidden).length;
  const addedFields = fieldsForItem(elementId, index);
  const smart = isSmartTemplate(data) || Array.isArray(data.editableFields);
  const editableFields = smart
    ? [...getEditableFields(data), ...addedFields]
    : data.editableFields;
  const contentValues = smart
    ? {
        ...getContentValues(data),
        [`${elementId}_name`]: "New item",
        [`${elementId}_desc`]: "Add a description",
        [`${elementId}_price`]: "$0.00",
        [`${elementId}_image`]: NEW_ITEM_IMAGE,
      }
    : data.contentValues;

  let zoneTemplate = data.zoneTemplate;
  if (zoneTemplate && typeof zoneTemplate === "object") {
    const menuItem: MenuItemData = {
      id: itemId,
      name: "New item",
      description: "Add a description",
      price: "$0.00",
      image: NEW_ITEM_IMAGE,
    };
    zoneTemplate = appendZoneItem(
      zoneTemplate as ZoneTemplate,
      zoneId,
      menuItem,
    );
  }

  const next: DesignData = withArtboard(
    {
      ...data,
      ...(smart ? { smart: true, editableFields, contentValues } : null),
      ...(zoneTemplate ? { zoneTemplate } : null),
    },
    nextElements,
    orientation,
  );

  return { data: next, selectedIds: [elementId] };
}
