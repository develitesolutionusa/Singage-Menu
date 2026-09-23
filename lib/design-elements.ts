import type { DesignBlockType } from "@/components/design-editor/blocks";
import { getBlockDefinition } from "@/components/design-editor/blocks";
import type { DesignData, Orientation } from "@/types/db";

export const GRID_SIZE = 24;
export const SNAP_THRESHOLD = 8;
export const MIN_ELEMENT_SIZE = 24;
export const ZOOM_MIN = 0.35;
export const ZOOM_MAX = 2;
export const ZOOM_STEP = 0.1;

export type DesignFitMode = "cover" | "contain" | "fill";
export type DesignTextAlign = "left" | "center" | "right";
export type DesignShadow = "none" | "sm" | "md" | "lg";
export type DesignAnimation =
  | "none"
  | "fade"
  | "slide-up"
  | "slide-down"
  | "scale";
export type DesignDeviceBehavior = "all" | "landscape" | "portrait";
export type DesignButtonAction = "none" | "link" | "deep-link";

export type DesignElementProps = {
  text?: string;
  label?: string;
  url?: string;
  action?: DesignButtonAction;
  alt?: string;
  imageUrl?: string;
  fit?: DesignFitMode;
  name?: string;
  description?: string;
  price?: string;
  category?: string;
  cta?: string;
  featured?: boolean;
  dataSource?: string;
  field?: string;
  fallback?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  background?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  shadow?: DesignShadow;
  opacity?: number;
  align?: DesignTextAlign;
  lineHeight?: number;
  letterSpacing?: number;
  padding?: number;
  margin?: number;
  animation?: DesignAnimation;
  entranceAnimation?: DesignAnimation;
  exitAnimation?: DesignAnimation;
  animationDuration?: number;
  deviceBehavior?: DesignDeviceBehavior;
};

export const FONT_FAMILIES = [
  { value: "sans", label: "Sans", css: "ui-sans-serif, system-ui, sans-serif" },
  { value: "serif", label: "Serif", css: "ui-serif, Georgia, serif" },
  { value: "mono", label: "Mono", css: "ui-monospace, SFMono-Regular, monospace" },
  { value: "display", label: "Display", css: "Georgia, 'Times New Roman', serif" },
] as const;

export function fontFamilyCss(value?: string): string {
  return (
    FONT_FAMILIES.find((f) => f.value === value)?.css ??
    FONT_FAMILIES[0].css
  );
}

export const SHADOW_CSS: Record<DesignShadow, string> = {
  none: "none",
  sm: "0 1px 2px rgba(15, 23, 42, 0.12)",
  md: "0 4px 12px rgba(15, 23, 42, 0.16)",
  lg: "0 12px 28px rgba(15, 23, 42, 0.22)",
};

export type DesignElement = {
  id: string;
  type: DesignBlockType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  locked: boolean;
  hidden: boolean;
  zIndex: number;
  props: DesignElementProps;
};

export type ArtboardSize = { width: number; height: number };

export function getArtboardSize(orientation: Orientation): ArtboardSize {
  return orientation === "portrait"
    ? { width: 540, height: 960 }
    : { width: 960, height: 540 };
}

export function createElementId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `el_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

const DEFAULT_SIZES: Record<DesignBlockType, { width: number; height: number }> =
  {
    text: { width: 280, height: 64 },
    image: { width: 240, height: 160 },
    video: { width: 280, height: 160 },
    "menu-card": { width: 260, height: 140 },
    button: { width: 160, height: 48 },
    shape: { width: 160, height: 160 },
    "qr-code": { width: 120, height: 120 },
    logo: { width: 120, height: 80 },
    "social-icons": { width: 200, height: 48 },
    divider: { width: 320, height: 16 },
    "dynamic-data": { width: 220, height: 48 },
    "price-badge": { width: 120, height: 56 },
    "promotion-card": { width: 280, height: 160 },
    contact: { width: 220, height: 72 },
    hours: { width: 220, height: 88 },
    location: { width: 240, height: 72 },
  };

function defaultProps(type: DesignBlockType): DesignElementProps {
  switch (type) {
    case "text":
      return {
        text: "Double-click to edit",
        fontFamily: "sans",
        fontSize: 28,
        fontWeight: 700,
        color: "#111827",
        align: "left",
        lineHeight: 1.25,
        letterSpacing: 0,
        opacity: 100,
        shadow: "none",
        padding: 8,
        animation: "none",
        entranceAnimation: "none",
        exitAnimation: "none",
        animationDuration: 500,
        deviceBehavior: "all",
      };
    case "button":
      return {
        label: "Learn more",
        url: "",
        action: "link",
        background: "#2563eb",
        color: "#ffffff",
        borderRadius: 8,
        fontFamily: "sans",
        fontWeight: 600,
        fontSize: 14,
        align: "center",
        opacity: 100,
        shadow: "sm",
        padding: 8,
        animation: "none",
        entranceAnimation: "none",
        exitAnimation: "none",
        animationDuration: 500,
        deviceBehavior: "all",
      };
    case "image":
    case "logo":
    case "video":
      return {
        alt: type,
        fit: "cover",
        imageUrl: "",
        background: "#e2e8f0",
        borderRadius: 8,
        opacity: 100,
        shadow: "none",
        animation: "none",
        entranceAnimation: "none",
        exitAnimation: "none",
        animationDuration: 500,
        deviceBehavior: "all",
      };
    case "menu-card":
      return {
        name: "Featured Item",
        description: "Short description",
        price: "$12.00",
        category: "Mains",
        cta: "Order",
        featured: false,
        imageUrl: "",
        background: "#ffffff",
        color: "#111827",
        borderRadius: 12,
        opacity: 100,
        shadow: "sm",
        padding: 12,
        animation: "none",
        entranceAnimation: "none",
        exitAnimation: "none",
        animationDuration: 500,
        deviceBehavior: "all",
      };
    case "price-badge":
      return {
        price: "$9.99",
        background: "#f59e0b",
        color: "#111827",
        borderRadius: 999,
        fontFamily: "sans",
        fontWeight: 700,
        fontSize: 20,
        opacity: 100,
        shadow: "sm",
        animation: "none",
        entranceAnimation: "none",
        exitAnimation: "none",
        animationDuration: 500,
        deviceBehavior: "all",
      };
    case "promotion-card":
      return {
        name: "Limited Offer",
        description: "This week only",
        price: "50% OFF",
        cta: "Claim deal",
        featured: true,
        imageUrl: "",
        background: "#0f172a",
        color: "#f8fafc",
        borderRadius: 12,
        opacity: 100,
        shadow: "md",
        padding: 12,
        animation: "none",
        entranceAnimation: "none",
        exitAnimation: "none",
        animationDuration: 500,
        deviceBehavior: "all",
      };
    case "shape":
      return {
        background: "#93c5fd",
        borderRadius: 12,
        opacity: 100,
        borderWidth: 0,
        borderColor: "#3b82f6",
        shadow: "none",
        animation: "none",
        entranceAnimation: "none",
        exitAnimation: "none",
        animationDuration: 500,
        deviceBehavior: "all",
      };
    case "qr-code":
      return {
        background: "#ffffff",
        label: "QR",
        url: "",
        opacity: 100,
        shadow: "none",
        animation: "none",
        entranceAnimation: "none",
        exitAnimation: "none",
        animationDuration: 500,
        deviceBehavior: "all",
      };
    case "divider":
      return {
        background: "#cbd5e1",
        opacity: 100,
        animation: "none",
        entranceAnimation: "none",
        exitAnimation: "none",
        animationDuration: 500,
        deviceBehavior: "all",
      };
    case "dynamic-data":
      return {
        dataSource: "product",
        field: "price",
        fallback: "$0.00",
        text: "{{product.price}}",
        fontFamily: "sans",
        fontSize: 20,
        fontWeight: 600,
        color: "#0f766e",
        opacity: 100,
        animation: "none",
        entranceAnimation: "none",
        exitAnimation: "none",
        animationDuration: 500,
        deviceBehavior: "all",
      };
    case "contact":
      return {
        text: "hello@example.com\n(555) 010-2000",
        fontFamily: "sans",
        fontSize: 14,
        color: "#334155",
        opacity: 100,
        animation: "none",
        entranceAnimation: "none",
        exitAnimation: "none",
        animationDuration: 500,
        deviceBehavior: "all",
      };
    case "hours":
      return {
        text: "Mon–Fri 9am–9pm\nSat–Sun 10am–8pm",
        fontFamily: "sans",
        fontSize: 14,
        color: "#334155",
        opacity: 100,
        animation: "none",
        entranceAnimation: "none",
        exitAnimation: "none",
        animationDuration: 500,
        deviceBehavior: "all",
      };
    case "location":
      return {
        text: "123 Main Street\nYour City",
        fontFamily: "sans",
        fontSize: 14,
        color: "#334155",
        opacity: 100,
        animation: "none",
        entranceAnimation: "none",
        exitAnimation: "none",
        animationDuration: 500,
        deviceBehavior: "all",
      };
    case "social-icons":
      return {
        text: "f  in  ig  x",
        fontFamily: "sans",
        fontSize: 16,
        color: "#475569",
        opacity: 100,
        animation: "none",
        entranceAnimation: "none",
        exitAnimation: "none",
        animationDuration: 500,
        deviceBehavior: "all",
      };
    default:
      return {};
  }
}

export function createElementFromBlock(
  type: DesignBlockType,
  position: { x: number; y: number },
  artboard: ArtboardSize,
  zIndex: number,
): DesignElement {
  const size = DEFAULT_SIZES[type];
  const def = getBlockDefinition(type);
  const x = clamp(
    position.x - size.width / 2,
    0,
    Math.max(0, artboard.width - size.width),
  );
  const y = clamp(
    position.y - size.height / 2,
    0,
    Math.max(0, artboard.height - size.height),
  );

  return {
    id: createElementId(),
    type,
    name: def?.label ?? type,
    x,
    y,
    width: size.width,
    height: size.height,
    rotation: 0,
    locked: false,
    hidden: false,
    zIndex,
    props: defaultProps(type),
  };
}

export function duplicateElement(
  element: DesignElement,
  offset = 24,
): DesignElement {
  return {
    ...element,
    id: createElementId(),
    name: `${element.name} copy`,
    x: element.x + offset,
    y: element.y + offset,
    zIndex: element.zIndex + 1,
    locked: false,
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function snapValue(value: number, grid = GRID_SIZE): number {
  return Math.round(value / grid) * grid;
}

export function snapWithThreshold(
  value: number,
  grid = GRID_SIZE,
  threshold = SNAP_THRESHOLD,
): number {
  const snapped = snapValue(value, grid);
  return Math.abs(snapped - value) <= threshold ? snapped : value;
}

export function constrainElement(
  element: Pick<DesignElement, "x" | "y" | "width" | "height">,
  artboard: ArtboardSize,
): Pick<DesignElement, "x" | "y" | "width" | "height"> {
  const width = clamp(element.width, MIN_ELEMENT_SIZE, artboard.width);
  const height = clamp(element.height, MIN_ELEMENT_SIZE, artboard.height);
  const x = clamp(element.x, 0, artboard.width - width);
  const y = clamp(element.y, 0, artboard.height - height);
  return { x, y, width, height };
}

export function getElements(data: DesignData | null | undefined): DesignElement[] {
  if (!data || !Array.isArray(data.elements)) return [];
  return data.elements as unknown as DesignElement[];
}

export function withElements(
  data: DesignData | null | undefined,
  elements: DesignElement[],
): DesignData {
  return {
    ...(data ?? {}),
    elements,
  };
}

export function selectionBounds(elements: DesignElement[]) {
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
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export type AlignGuide = {
  orientation: "v" | "h";
  position: number;
};

/** Alignment guides against artboard center and other element edges/centers. */
export function computeAlignGuides(
  moving: DesignElement[],
  others: DesignElement[],
  artboard: ArtboardSize,
  threshold = SNAP_THRESHOLD,
): { guides: AlignGuide[]; dx: number; dy: number } {
  if (!moving.length) return { guides: [], dx: 0, dy: 0 };

  const bounds = selectionBounds(moving)!;
  const movingCenters = {
    cx: bounds.x + bounds.width / 2,
    cy: bounds.y + bounds.height / 2,
    left: bounds.x,
    right: bounds.x + bounds.width,
    top: bounds.y,
    bottom: bounds.y + bounds.height,
  };

  const xTargets = [
    0,
    artboard.width / 2,
    artboard.width,
    ...others.flatMap((el) => [el.x, el.x + el.width / 2, el.x + el.width]),
  ];
  const yTargets = [
    0,
    artboard.height / 2,
    artboard.height,
    ...others.flatMap((el) => [el.y, el.y + el.height / 2, el.y + el.height]),
  ];

  const movingX = [
    movingCenters.left,
    movingCenters.cx,
    movingCenters.right,
  ];
  const movingY = [
    movingCenters.top,
    movingCenters.cy,
    movingCenters.bottom,
  ];

  let bestDx = 0;
  let bestDxDist = threshold + 1;
  let bestDy = 0;
  let bestDyDist = threshold + 1;
  const guides: AlignGuide[] = [];

  for (const mx of movingX) {
    for (const tx of xTargets) {
      const dist = Math.abs(mx - tx);
      if (dist < bestDxDist) {
        bestDxDist = dist;
        bestDx = tx - mx;
      }
    }
  }
  for (const my of movingY) {
    for (const ty of yTargets) {
      const dist = Math.abs(my - ty);
      if (dist < bestDyDist) {
        bestDyDist = dist;
        bestDy = ty - my;
      }
    }
  }

  if (bestDxDist <= threshold) {
    guides.push({ orientation: "v", position: movingCenters.cx + bestDx });
  } else {
    bestDx = 0;
  }
  if (bestDyDist <= threshold) {
    guides.push({ orientation: "h", position: movingCenters.cy + bestDy });
  } else {
    bestDy = 0;
  }

  return { guides, dx: bestDx, dy: bestDy };
}

export function isDesignBlockType(value: string): value is DesignBlockType {
  return Boolean(getBlockDefinition(value as DesignBlockType));
}

export const BLOCK_DRAG_MIME = "application/x-signage-block";
