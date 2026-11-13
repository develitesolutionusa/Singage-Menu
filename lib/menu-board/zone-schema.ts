/**
 * Zone-based menu board template schema.
 * Positions are % of the design canvas — never hard-coded screen pixels.
 */
import { z } from "zod";

export const ZONE_TYPES = [
  "image",
  "video",
  "menu-list",
  "text",
  "clock",
  "qr",
  "ticker",
  "logo",
  "shape",
] as const;

export type ZoneType = (typeof ZONE_TYPES)[number];

export const zoneStyleSchema = z
  .object({
    background: z.string().optional(),
    color: z.string().optional(),
    fontFamily: z.string().optional(),
    fontWeight: z.union([z.number(), z.string()]).optional(),
    fontSizeCqw: z.number().optional(),
    letterSpacing: z.string().optional(),
    textAlign: z.enum(["left", "center", "right"]).optional(),
    textTransform: z.enum(["none", "uppercase", "lowercase", "capitalize"]).optional(),
    borderRadius: z.string().optional(),
    border: z.string().optional(),
    padding: z.string().optional(),
    opacity: z.number().min(0).max(1).optional(),
    objectFit: z.enum(["cover", "contain", "fill"]).optional(),
    objectPosition: z.string().optional(),
    boxShadow: z.string().optional(),
    overflow: z.enum(["hidden", "visible"]).optional(),
  })
  .strict();

export type ZoneStyle = z.infer<typeof zoneStyleSchema>;

const pct = z.number().min(-50).max(150);

const zoneBaseSchema = z.object({
  id: z.string().min(1),
  type: z.enum(ZONE_TYPES),
  /** Left edge as % of canvas width */
  x: pct,
  /** Top edge as % of canvas height */
  y: pct,
  /** Width as % of canvas width */
  w: pct,
  /** Height as % of canvas height */
  h: pct,
  zIndex: z.number().int().optional(),
  style: zoneStyleSchema.optional(),
  /** Hide on specific canvas variants */
  hideOn: z.array(z.enum(["landscape", "portrait", "square", "ultrawide"])).optional(),
  /** Only show on these variants (if set) */
  showOn: z.array(z.enum(["landscape", "portrait", "square", "ultrawide"])).optional(),
});

export const menuItemBadgeSchema = z.enum(["veg", "spicy", "new"]);

export const menuItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  price: z.string(),
  /** Optional dish photo. Omitted items stay text-only. */
  image: z.string().optional(),
  badges: z.array(menuItemBadgeSchema).optional(),
  category: z.string().optional(),
});

export type MenuItemData = z.infer<typeof menuItemSchema>;

export const imageZoneSchema = zoneBaseSchema.extend({
  type: z.literal("image"),
  src: z.string(),
  alt: z.string().optional(),
  focalPoint: z
    .object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) })
    .optional(),
  fallbackSrc: z.string().optional(),
  circular: z.boolean().optional(),
});

export const videoZoneSchema = zoneBaseSchema.extend({
  type: z.literal("video"),
  src: z.string(),
  poster: z.string().optional(),
  focalPoint: z
    .object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) })
    .optional(),
});

export const textZoneSchema = zoneBaseSchema.extend({
  type: z.literal("text"),
  text: z.string(),
  role: z.enum(["heading", "subheading", "body", "badge", "label"]).optional(),
  maxLines: z.number().int().positive().optional(),
  autoFit: z.boolean().optional(),
});

export const logoZoneSchema = zoneBaseSchema.extend({
  type: z.literal("logo"),
  src: z.string().optional(),
  label: z.string().optional(),
});

export const clockZoneSchema = zoneBaseSchema.extend({
  type: z.literal("clock"),
  showDate: z.boolean().optional(),
  tone: z.enum(["light", "dark"]).optional(),
});

export const qrZoneSchema = zoneBaseSchema.extend({
  type: z.literal("qr"),
  label: z.string(),
  hint: z.string().optional(),
  qrUrl: z.string().optional(),
  tone: z.enum(["light", "dark"]).optional(),
});

export const tickerZoneSchema = zoneBaseSchema.extend({
  type: z.literal("ticker"),
  text: z.string(),
});

export const menuListZoneSchema = zoneBaseSchema.extend({
  type: z.literal("menu-list"),
  title: z.string().optional(),
  tagline: z.string().optional(),
  items: z.array(menuItemSchema),
  /** When items overflow: scroll loop, paginate, or shrink fonts */
  overflowMode: z.enum(["scroll", "paginate", "shrink"]).optional(),
  showLeaders: z.boolean().optional(),
  showIcons: z.boolean().optional(),
  titleColor: z.string().optional(),
  itemColor: z.string().optional(),
  mutedColor: z.string().optional(),
  priceColor: z.string().optional(),
});

export const shapeZoneSchema = zoneBaseSchema.extend({
  type: z.literal("shape"),
  shape: z.enum(["rect", "circle", "rounded"]).optional(),
});

export const zoneSchema = z.discriminatedUnion("type", [
  imageZoneSchema,
  videoZoneSchema,
  textZoneSchema,
  logoZoneSchema,
  clockZoneSchema,
  qrZoneSchema,
  tickerZoneSchema,
  menuListZoneSchema,
  shapeZoneSchema,
]);

export type Zone = z.infer<typeof zoneSchema>;

export const templateThemeSchema = z.object({
  bg: z.string(),
  panel: z.string(),
  text: z.string(),
  muted: z.string(),
  accent: z.string(),
  badge: z.string(),
  panelText: z.string(),
  tickerBg: z.string(),
  tickerText: z.string(),
});

export const canvasSizeSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
});

export const zoneTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  theme: templateThemeSchema,
  /** Design canvas in CSS px at 1× — ScreenStage scale-fits this. */
  canvas: canvasSizeSchema,
  zones: z.array(zoneSchema).min(1),
  /** Optional alternate zone sets for other variants */
  variants: z
    .partialRecord(
      z.enum(["landscape", "portrait", "square", "ultrawide"]),
      z.object({
        canvas: canvasSizeSchema,
        zones: z.array(zoneSchema).min(1),
      }),
    )
    .optional(),
});

export type ZoneTemplate = z.infer<typeof zoneTemplateSchema>;

export const screenGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** Columns × rows — e.g. 3×1 portrait wall */
  columns: z.number().int().positive(),
  rows: z.number().int().positive().default(1),
  /**
   * span = one template sliced across screens (bezel-aware).
   * linked = different template per screen, synced transitions.
   */
  mode: z.enum(["span", "linked"]),
  /** Bezel gap as % of single-screen width (span mode) */
  bezelGapPercent: z.number().min(0).max(10).optional(),
  /** Template id when mode=span */
  templateId: z.string().optional(),
  /** Per-screen template ids when mode=linked (length = columns*rows) */
  screenTemplateIds: z.array(z.string()).optional(),
});

export type ScreenGroup = z.infer<typeof screenGroupSchema>;

export function parseZoneTemplate(data: unknown): ZoneTemplate {
  return zoneTemplateSchema.parse(data);
}

export function zoneBoxStyle(zone: Pick<Zone, "x" | "y" | "w" | "h" | "zIndex" | "style">) {
  return {
    position: "absolute" as const,
    left: `${zone.x}%`,
    top: `${zone.y}%`,
    width: `${zone.w}%`,
    height: `${zone.h}%`,
    zIndex: zone.zIndex ?? 1,
    background: zone.style?.background,
    color: zone.style?.color,
    fontFamily: zone.style?.fontFamily,
    fontWeight: zone.style?.fontWeight,
    letterSpacing: zone.style?.letterSpacing,
    textAlign: zone.style?.textAlign,
    textTransform: zone.style?.textTransform,
    borderRadius: zone.style?.borderRadius,
    border: zone.style?.border,
    padding: zone.style?.padding,
    opacity: zone.style?.opacity,
    boxShadow: zone.style?.boxShadow,
    overflow: zone.style?.overflow ?? "hidden",
  };
}
