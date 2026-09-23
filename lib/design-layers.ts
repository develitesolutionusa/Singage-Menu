import type { DesignElement } from "@/lib/design-elements";

/** Front-first order (highest zIndex first). */
export function layersFrontToBack(elements: DesignElement[]): DesignElement[] {
  return [...elements].sort((a, b) => {
    if (b.zIndex !== a.zIndex) return b.zIndex - a.zIndex;
    return a.id.localeCompare(b.id);
  });
}

/** Assign dense zIndex values from a front-to-back id list. */
export function applyFrontToBackOrder(
  elements: DesignElement[],
  orderedIdsFrontFirst: string[],
): DesignElement[] {
  const byId = new Map(elements.map((el) => [el.id, el]));
  const n = orderedIdsFrontFirst.length;
  const next: DesignElement[] = [];

  orderedIdsFrontFirst.forEach((id, index) => {
    const el = byId.get(id);
    if (!el) return;
    next.push({ ...el, zIndex: n - 1 - index });
    byId.delete(id);
  });

  // Preserve any unexpected leftovers at the back
  for (const el of byId.values()) {
    next.push({ ...el, zIndex: next.length ? Math.min(...next.map((e) => e.zIndex)) - 1 : 0 });
  }

  return normalizeZIndexes(next);
}

export function normalizeZIndexes(elements: DesignElement[]): DesignElement[] {
  const sorted = [...elements].sort((a, b) => {
    if (a.zIndex !== b.zIndex) return a.zIndex - b.zIndex;
    return a.id.localeCompare(b.id);
  });
  const rank = new Map(sorted.map((el, i) => [el.id, i]));
  return elements.map((el) => ({
    ...el,
    zIndex: rank.get(el.id) ?? el.zIndex,
  }));
}

function swapZ(
  elements: DesignElement[],
  aId: string,
  bId: string,
): DesignElement[] {
  const a = elements.find((el) => el.id === aId);
  const b = elements.find((el) => el.id === bId);
  if (!a || !b) return elements;
  return elements.map((el) => {
    if (el.id === aId) return { ...el, zIndex: b.zIndex };
    if (el.id === bId) return { ...el, zIndex: a.zIndex };
    return el;
  });
}

/** Move layer one step toward the front. */
export function bringForward(
  elements: DesignElement[],
  id: string,
): DesignElement[] {
  const order = layersFrontToBack(elements);
  const idx = order.findIndex((el) => el.id === id);
  if (idx <= 0) return elements;
  return normalizeZIndexes(swapZ(elements, order[idx].id, order[idx - 1].id));
}

/** Move layer one step toward the back. */
export function sendBackward(
  elements: DesignElement[],
  id: string,
): DesignElement[] {
  const order = layersFrontToBack(elements);
  const idx = order.findIndex((el) => el.id === id);
  if (idx < 0 || idx >= order.length - 1) return elements;
  return normalizeZIndexes(swapZ(elements, order[idx].id, order[idx + 1].id));
}

export function bringToFront(
  elements: DesignElement[],
  id: string,
): DesignElement[] {
  const order = layersFrontToBack(elements);
  const idx = order.findIndex((el) => el.id === id);
  if (idx <= 0) return elements;
  const [item] = order.splice(idx, 1);
  order.unshift(item);
  return applyFrontToBackOrder(
    elements,
    order.map((el) => el.id),
  );
}

export function sendToBack(
  elements: DesignElement[],
  id: string,
): DesignElement[] {
  const order = layersFrontToBack(elements);
  const idx = order.findIndex((el) => el.id === id);
  if (idx < 0 || idx >= order.length - 1) return elements;
  const [item] = order.splice(idx, 1);
  order.push(item);
  return applyFrontToBackOrder(
    elements,
    order.map((el) => el.id),
  );
}

export function renameLayer(
  elements: DesignElement[],
  id: string,
  name: string,
): DesignElement[] {
  const trimmed = name.trim() || "Layer";
  return elements.map((el) => (el.id === id ? { ...el, name: trimmed } : el));
}

export function setLayerHidden(
  elements: DesignElement[],
  id: string,
  hidden: boolean,
): DesignElement[] {
  return elements.map((el) => (el.id === id ? { ...el, hidden } : el));
}

export function setLayerLocked(
  elements: DesignElement[],
  id: string,
  locked: boolean,
): DesignElement[] {
  return elements.map((el) => (el.id === id ? { ...el, locked } : el));
}
