/**
 * Bridge: zone menu-board templates → Design Editor Smart Template DesignData.
 * Zones (%) map onto the editor artboard so Templates open fully editable.
 */
import type { DesignBlockType } from "@/components/design-editor/blocks";
import type {
  DesignElement,
  DesignElementProps,
} from "@/lib/design-elements";
import type {
  Zone,
  ZoneTemplate,
} from "@/lib/menu-board/zone-schema";
import type { DesignData, Orientation } from "@/types/db";

type SmartFieldKind =
  | "title"
  | "product"
  | "description"
  | "price"
  | "image"
  | "logo"
  | "cta"
  | "text"
  | "dynamic";

type SmartEditableField = {
  id: string;
  label: string;
  kind: SmartFieldKind;
  bindings: Array<{ elementId: string; prop: keyof DesignElementProps }>;
  defaultValue: string;
  placeholder?: string;
};

function el(
  partial: Omit<DesignElement, "rotation" | "locked" | "hidden"> &
    Partial<Pick<DesignElement, "rotation" | "locked" | "hidden">>,
): DesignElement {
  return {
    rotation: 0,
    locked: false,
    hidden: false,
    ...partial,
  };
}

function field(
  id: string,
  label: string,
  kind: SmartFieldKind,
  defaultValue: string,
  bindings: SmartEditableField["bindings"],
  placeholder?: string,
): SmartEditableField {
  return { id, label, kind, defaultValue, bindings, placeholder };
}

function pctToPx(
  zone: Pick<Zone, "x" | "y" | "w" | "h">,
  canvasW: number,
  canvasH: number,
  artboardW: number,
  artboardH: number,
) {
  const sx = artboardW / canvasW;
  const sy = artboardH / canvasH;
  return {
    x: Math.round((zone.x / 100) * canvasW * sx),
    y: Math.round((zone.y / 100) * canvasH * sy),
    width: Math.max(24, Math.round((zone.w / 100) * canvasW * sx)),
    height: Math.max(24, Math.round((zone.h / 100) * canvasH * sy)),
  };
}

function fontSizeFromRole(
  role: string | undefined,
  artboardW: number,
): number {
  const scale = artboardW / 960;
  if (role === "heading") return Math.round(56 * scale);
  if (role === "subheading") return Math.round(28 * scale);
  if (role === "badge") return Math.round(14 * scale);
  if (role === "label") return Math.round(16 * scale);
  return Math.round(16 * scale);
}

type ConvertResult = {
  elements: DesignElement[];
  editableFields: SmartEditableField[];
};

function convertZones(
  zones: Zone[],
  canvasW: number,
  canvasH: number,
  artboardW: number,
  artboardH: number,
  theme: ZoneTemplate["theme"],
): ConvertResult {
  const elements: DesignElement[] = [];
  const editableFields: SmartEditableField[] = [];

  for (const zone of zones) {
    const box = pctToPx(zone, canvasW, canvasH, artboardW, artboardH);
    const z = zone.zIndex ?? 1;

    switch (zone.type) {
      case "shape": {
        elements.push(
          el({
            id: zone.id,
            type: "shape",
            name: zone.id,
            ...box,
            zIndex: z,
            props: {
              background: zone.style?.background ?? theme.bg,
              borderRadius:
                zone.shape === "circle"
                  ? 999
                  : zone.shape === "rounded"
                    ? 24
                    : 0,
              opacity: zone.style?.opacity,
            },
          }),
        );
        break;
      }
      case "image": {
        elements.push(
          el({
            id: zone.id,
            type: "image",
            name: zone.id,
            ...box,
            zIndex: z,
            props: {
              imageUrl: zone.src,
              alt: zone.alt ?? "",
              fit: zone.style?.objectFit ?? "cover",
              borderRadius: zone.circular ? 999 : 0,
              shadow: zone.circular ? "lg" : "none",
            },
          }),
        );
        editableFields.push(
          field(
            `img_${zone.id}`,
            zone.id.includes("hero") ? "Hero image" : `Image (${zone.id})`,
            "image",
            zone.src,
            [{ elementId: zone.id, prop: "imageUrl" }],
          ),
        );
        break;
      }
      case "video": {
        elements.push(
          el({
            id: zone.id,
            type: "video",
            name: zone.id,
            ...box,
            zIndex: z,
            props: {
              imageUrl: zone.poster ?? zone.src,
              url: zone.src,
              fit: "cover",
            },
          }),
        );
        break;
      }
      case "logo": {
        elements.push(
          el({
            id: zone.id,
            type: "logo",
            name: "Brand",
            ...box,
            zIndex: z,
            props: {
              imageUrl: zone.src,
              label: zone.label ?? "",
              text: zone.label ?? "",
              color: zone.style?.color ?? theme.text,
              fontSize: Math.round(18 * (artboardW / 960)),
              fontWeight: 800,
              align: "left",
            },
          }),
        );
        if (zone.label) {
          editableFields.push(
            field(
              `logo_${zone.id}`,
              "Brand name",
              "logo",
              zone.label,
              [
                { elementId: zone.id, prop: "label" },
                { elementId: zone.id, prop: "text" },
              ],
            ),
          );
        }
        if (zone.src) {
          editableFields.push(
            field(
              `logo_img_${zone.id}`,
              "Logo image",
              "image",
              zone.src,
              [{ elementId: zone.id, prop: "imageUrl" }],
            ),
          );
        }
        break;
      }
      case "text": {
        const type: DesignBlockType =
          zone.role === "badge" ? "price-badge" : "text";
        elements.push(
          el({
            id: zone.id,
            type,
            name: zone.id,
            ...box,
            zIndex: z,
            props: {
              text: zone.text,
              price: zone.role === "badge" ? zone.text : undefined,
              color:
                zone.role === "badge"
                  ? "#FFFFFF"
                  : (zone.style?.color ?? theme.text),
              background:
                zone.role === "badge"
                  ? (zone.style?.background ?? theme.badge)
                  : zone.style?.background,
              fontSize: fontSizeFromRole(zone.role, artboardW),
              fontWeight: zone.role === "heading" || zone.role === "badge" ? 900 : 600,
              align: zone.style?.textAlign ?? (zone.role === "badge" ? "center" : "left"),
              borderRadius: zone.role === "badge" ? 999 : 8,
              padding: zone.role === "badge" ? 8 : 0,
            },
          }),
        );
        editableFields.push(
          field(
            `text_${zone.id}`,
            zone.role === "heading"
              ? "Headline"
              : zone.role === "badge"
                ? "Badge"
                : zone.role === "body"
                  ? "Subcopy"
                  : `Text (${zone.id})`,
            zone.role === "heading"
              ? "title"
              : zone.role === "badge"
                ? "text"
                : zone.role === "body"
                  ? "description"
                  : "text",
            zone.text,
            zone.role === "badge"
              ? [
                  { elementId: zone.id, prop: "text" },
                  { elementId: zone.id, prop: "price" },
                ]
              : [{ elementId: zone.id, prop: "text" }],
          ),
        );
        break;
      }
      case "clock": {
        elements.push(
          el({
            id: zone.id,
            type: "hours",
            name: "Clock",
            ...box,
            zIndex: z,
            props: {
              text: "12:00:00\n01/01/2026",
              color: zone.tone === "light" ? "#FFFFFF" : "#3F3F46",
              fontSize: Math.round(16 * (artboardW / 960)),
              fontWeight: 600,
              align: "right",
              dataSource: "clock",
              field: "now",
            },
          }),
        );
        break;
      }
      case "qr": {
        elements.push(
          el({
            id: zone.id,
            type: "qr-code",
            name: "WiFi QR",
            ...box,
            zIndex: z,
            props: {
              label: zone.label,
              text: zone.hint ?? "",
              url: zone.qrUrl,
              color: zone.tone === "dark" ? "#14213D" : "#FFFFFF",
              background: "transparent",
              fontSize: Math.round(14 * (artboardW / 960)),
              fontWeight: 800,
            },
          }),
        );
        editableFields.push(
          field(
            `qr_${zone.id}`,
            "QR label",
            "text",
            zone.label,
            [{ elementId: zone.id, prop: "label" }],
          ),
        );
        break;
      }
      case "ticker": {
        elements.push(
          el({
            id: zone.id,
            type: "promotion-card",
            name: "Ticker",
            ...box,
            zIndex: z,
            props: {
              text: zone.text,
              name: zone.text,
              description: zone.text,
              background: zone.style?.background ?? theme.tickerBg,
              color: zone.style?.color ?? theme.tickerText,
              fontSize: Math.round(18 * (artboardW / 960)),
              fontWeight: 700,
              align: "left",
              padding: 12,
              animation: "fade",
            },
          }),
        );
        editableFields.push(
          field(
            `ticker_${zone.id}`,
            "Ticker text",
            "cta",
            zone.text,
            [
              { elementId: zone.id, prop: "text" },
              { elementId: zone.id, prop: "name" },
              { elementId: zone.id, prop: "description" },
            ],
          ),
        );
        break;
      }
      case "menu-list": {
        // Title
        if (zone.title) {
          const titleId = `${zone.id}_title`;
          const titleH = Math.round(box.height * 0.12);
          elements.push(
            el({
              id: titleId,
              type: "text",
              name: "Menu title",
              x: box.x,
              y: box.y,
              width: box.width,
              height: titleH,
              zIndex: z + 1,
              props: {
                text: zone.title,
                color: zone.titleColor ?? theme.panelText,
                fontSize: Math.round(26 * (artboardW / 960)),
                fontWeight: 900,
                align: "left",
              },
            }),
          );
          editableFields.push(
            field(
              `menu_title_${zone.id}`,
              "Menu title",
              "title",
              zone.title,
              [{ elementId: titleId, prop: "text" }],
            ),
          );
          if (zone.tagline) {
            const tagId = `${zone.id}_tagline`;
            elements.push(
              el({
                id: tagId,
                type: "text",
                name: "Menu tagline",
                x: box.x,
                y: box.y + titleH,
                width: Math.round(box.width * 0.85),
                height: Math.round(titleH * 0.7),
                zIndex: z + 1,
                props: {
                  text: zone.tagline,
                  color: zone.mutedColor ?? "#64748B",
                  fontSize: Math.round(13 * (artboardW / 960)),
                  fontWeight: 500,
                },
              }),
            );
            editableFields.push(
              field(
                `menu_tag_${zone.id}`,
                "Menu tagline",
                "description",
                zone.tagline,
                [{ elementId: tagId, prop: "text" }],
              ),
            );
          }
        }

        const headerH = zone.title ? Math.round(box.height * 0.18) : 0;
        const listTop = box.y + headerH;
        const listH = box.height - headerH;
        const rowH = Math.max(
          36,
          Math.floor(listH / Math.max(1, zone.items.length)),
        );

        zone.items.forEach((item, i) => {
          const rowId = `${zone.id}_item_${item.id}`;
          const y = listTop + i * rowH;
          elements.push(
            el({
              id: rowId,
              type: "menu-card",
              name: item.name,
              x: box.x,
              y,
              width: box.width,
              height: Math.max(32, rowH - 4),
              zIndex: z + 2,
              props: {
                name: item.name,
                description: item.description,
                price: item.price,
                color: zone.itemColor ?? theme.panelText,
                background: "transparent",
                fontSize: Math.round(14 * (artboardW / 960)),
                fontWeight: 800,
                featured: item.badges?.includes("new") ?? false,
                category: item.badges?.join(",") ?? "",
                padding: 2,
              },
            }),
          );
          editableFields.push(
            field(
              `${rowId}_name`,
              `Item ${i + 1} name`,
              "product",
              item.name,
              [{ elementId: rowId, prop: "name" }],
            ),
            field(
              `${rowId}_desc`,
              `Item ${i + 1} description`,
              "description",
              item.description ?? "",
              [{ elementId: rowId, prop: "description" }],
            ),
            field(
              `${rowId}_price`,
              `Item ${i + 1} price`,
              "price",
              item.price,
              [{ elementId: rowId, prop: "price" }],
            ),
          );
        });
        break;
      }
      default:
        break;
    }
  }

  return { elements, editableFields };
}

/**
 * Convert a zone template into Design Editor–ready Smart Template data.
 * Landscape uses 960×540; portrait pack uses 540×960 when variants exist.
 */
export function zoneTemplateToDesignData(
  template: ZoneTemplate,
  options?: { layoutLocked?: boolean; catalogName?: string },
): DesignData {
  const landscapeCanvas = template.canvas;
  const portraitPack = template.variants?.portrait;

  const landscapeArtboard = { width: 960, height: 540 };
  const portraitArtboard = { width: 540, height: 960 };

  const landscape = convertZones(
    template.zones,
    landscapeCanvas.width,
    landscapeCanvas.height,
    landscapeArtboard.width,
    landscapeArtboard.height,
    template.theme,
  );

  let portrait: ConvertResult | null = null;
  if (portraitPack) {
    portrait = convertZones(
      portraitPack.zones,
      portraitPack.canvas.width,
      portraitPack.canvas.height,
      portraitArtboard.width,
      portraitArtboard.height,
      template.theme,
    );
  }

  const defaultOrientation: Orientation = portraitPack && !template.zones.length
    ? "portrait"
    : landscapeCanvas.width >= landscapeCanvas.height
      ? "landscape"
      : "portrait";

  // Portrait-only templates (wall screens)
  const isPortraitOnly =
    landscapeCanvas.height > landscapeCanvas.width && !portraitPack;

  let elements = landscape.elements;
  let editableFields = landscape.editableFields;
  let artboardWidth = landscapeArtboard.width;
  let artboardHeight = landscapeArtboard.height;
  let orientation: Orientation = defaultOrientation;

  if (isPortraitOnly) {
    const converted = convertZones(
      template.zones,
      landscapeCanvas.width,
      landscapeCanvas.height,
      portraitArtboard.width,
      portraitArtboard.height,
      template.theme,
    );
    elements = converted.elements;
    editableFields = converted.editableFields;
    artboardWidth = portraitArtboard.width;
    artboardHeight = portraitArtboard.height;
    orientation = "portrait";
  }

  const contentValues: Record<string, string> = {};
  for (const f of editableFields) contentValues[f.id] = f.defaultValue;

  const design: DesignData = {
    smart: true,
    layoutLocked: options?.layoutLocked ?? false,
    layout: `zone-board:${template.id}`,
    zoneBoard: true,
    zoneTemplateId: template.id,
    zoneTemplate: template,
    theme: {
      bg: template.theme.bg,
      accent: template.theme.accent,
      text: template.theme.text,
      muted: template.theme.muted,
      panel: template.theme.panel,
    },
    orientation,
    artboardWidth,
    artboardHeight,
    elements,
    editableFields,
    contentValues,
    badge: template.name,
    headline: options?.catalogName ?? template.name,
  };

  if (portrait && !isPortraitOnly) {
    design.orientationLayouts = {
      landscape: {
        artboardWidth: landscapeArtboard.width,
        artboardHeight: landscapeArtboard.height,
        elements: landscape.elements,
      },
      portrait: {
        artboardWidth: portraitArtboard.width,
        artboardHeight: portraitArtboard.height,
        elements: portrait.elements,
      },
    };
  }

  return design;
}

export function isZoneBoardDesign(
  data: DesignData | null | undefined,
): boolean {
  return Boolean(data?.zoneBoard === true || String(data?.layout ?? "").startsWith("zone-board:"));
}
