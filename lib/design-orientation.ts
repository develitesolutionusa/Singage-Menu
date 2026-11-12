import {
  getArtboardSize,
  getElements,
  MIN_ELEMENT_SIZE,
  withElements,
  type DesignElement,
  type ArtboardSize,
} from "@/lib/design-elements";
import { getOrientationLayouts } from "@/lib/elegant-food-menu";
import {
  applyContentValues,
  getContentValues,
  isSmartTemplate,
} from "@/lib/smart-templates";
import type { DesignData, Orientation } from "@/types/db";

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * Infer the artboard the design was authored for.
 * Prefers stored orientation / explicit size, then full-bleed background, then extents.
 */
export function inferDesignArtboard(
  data: DesignData | null | undefined,
): ArtboardSize {
  if (!data) return getArtboardSize("landscape");

  if (
    typeof data.artboardWidth === "number" &&
    typeof data.artboardHeight === "number" &&
    data.artboardWidth > 0 &&
    data.artboardHeight > 0
  ) {
    return {
      width: Number(data.artboardWidth),
      height: Number(data.artboardHeight),
    };
  }

  if (data.orientation === "portrait" || data.orientation === "landscape") {
    return getArtboardSize(data.orientation);
  }

  const elements = getElements(data);
  const bg = elements.find(
    (el) =>
      el.id === "el_bg" ||
      (el.type === "shape" &&
        el.x <= 1 &&
        el.y <= 1 &&
        el.width >= 500 &&
        el.height >= 500),
  );
  if (bg) {
    return { width: Math.round(bg.width), height: Math.round(bg.height) };
  }

  let maxX = 0;
  let maxY = 0;
  for (const el of elements) {
    maxX = Math.max(maxX, el.x + el.width);
    maxY = Math.max(maxY, el.y + el.height);
  }

  if (maxY > maxX * 1.1) return getArtboardSize("portrait");
  return getArtboardSize("landscape");
}

function scaleProps(
  props: DesignElement["props"],
  fontScale: number,
  sizeScale: number,
): DesignElement["props"] {
  const next = { ...props };
  if (typeof next.fontSize === "number") {
    next.fontSize = Math.max(8, round(next.fontSize * fontScale));
  }
  if (typeof next.borderRadius === "number") {
    next.borderRadius = round(next.borderRadius * sizeScale);
  }
  if (typeof next.borderWidth === "number") {
    next.borderWidth = round(next.borderWidth * sizeScale);
  }
  if (typeof next.padding === "number") {
    next.padding = round(next.padding * sizeScale);
  }
  if (typeof next.letterSpacing === "number") {
    next.letterSpacing = round(next.letterSpacing * fontScale);
  }
  return next;
}

function remapElement(
  el: DesignElement,
  from: ArtboardSize,
  to: ArtboardSize,
): DesignElement {
  const sx = to.width / from.width;
  const sy = to.height / from.height;
  // Fonts follow the narrower axis so copy still fits after a 16:9 → 9:16 flip.
  const fontScale = Math.min(sx, sy);
  const sizeScale = Math.min(sx, sy);

  const isFullBleed =
    el.x <= 1 &&
    el.y <= 1 &&
    el.width >= from.width * 0.95 &&
    el.height >= from.height * 0.95;

  if (isFullBleed) {
    return {
      ...el,
      x: 0,
      y: 0,
      width: to.width,
      height: to.height,
      props: scaleProps(el.props, fontScale, sizeScale),
    };
  }

  const width = clamp(round(el.width * sx), MIN_ELEMENT_SIZE, to.width);
  const height = clamp(round(el.height * sy), MIN_ELEMENT_SIZE, to.height);
  const x = clamp(round(el.x * sx), 0, Math.max(0, to.width - width));
  const y = clamp(round(el.y * sy), 0, Math.max(0, to.height - height));

  return {
    ...el,
    x,
    y,
    width,
    height,
    props: scaleProps(el.props, fontScale, sizeScale),
  };
}

export function designMatchesOrientation(
  data: DesignData | null | undefined,
  orientation: Orientation,
): boolean {
  if (!data) return true;
  const source = inferDesignArtboard(data);
  const target = getArtboardSize(orientation);
  return (
    Math.abs(source.width - target.width) < 1 &&
    Math.abs(source.height - target.height) < 1
  );
}

/**
 * Remap every canvas element so the design fills the target orientation.
 * Landscape templates authored at 960×540 become a complete 540×960 portrait view.
 */
export function adaptDesignToOrientation(
  data: DesignData | null | undefined,
  orientation: Orientation,
): DesignData {
  if (!data) {
    const artboard = getArtboardSize(orientation);
    return {
      orientation,
      artboardWidth: artboard.width,
      artboardHeight: artboard.height,
      elements: [],
    };
  }

  const target = getArtboardSize(orientation);
  const source = inferDesignArtboard(data);

  // Prefer authored dual layouts (e.g. Elegant Food Menu) over stretch remaps.
  const packs = getOrientationLayouts(data);
  const pack = packs?.[orientation];
  if (pack && Array.isArray(pack.elements) && pack.elements.length > 0) {
    const next: DesignData = {
      ...data,
      orientation,
      artboardWidth: pack.artboardWidth ?? target.width,
      artboardHeight: pack.artboardHeight ?? target.height,
      elements: pack.elements,
    };
    if (isSmartTemplate(next)) {
      return applyContentValues(next, getContentValues(next));
    }
    return next;
  }

  if (designMatchesOrientation(data, orientation)) {
    return {
      ...data,
      orientation,
      artboardWidth: target.width,
      artboardHeight: target.height,
    };
  }

  const elements = getElements(data).map((el) =>
    remapElement(el, source, target),
  );

  return {
    ...withElements(data, elements),
    orientation,
    artboardWidth: target.width,
    artboardHeight: target.height,
  };
}
