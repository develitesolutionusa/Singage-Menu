import { getContentValues } from "@/lib/smart-templates";
import type { Zone, ZoneTemplate } from "@/lib/menu-board/zone-schema";
import type { DesignData } from "@/types/db";

/**
 * Push Design Editor contentValues back onto the stored zone template
 * so ZoneRenderer / player stay in sync with Smart field edits.
 */
export function applyContentToZoneTemplate(
  template: ZoneTemplate,
  values: Record<string, string>,
): ZoneTemplate {
  const mapZone = (zone: Zone): Zone => {
    switch (zone.type) {
      case "image": {
        const key = `img_${zone.id}`;
        if (values[key]) return { ...zone, src: values[key] };
        return zone;
      }
      case "logo": {
        const label = values[`logo_${zone.id}`];
        const src = values[`logo_img_${zone.id}`];
        return {
          ...zone,
          ...(label != null ? { label } : null),
          ...(src != null ? { src } : null),
        };
      }
      case "text": {
        const key = `text_${zone.id}`;
        if (values[key] != null) return { ...zone, text: values[key] };
        return zone;
      }
      case "qr": {
        const key = `qr_${zone.id}`;
        if (values[key] != null) return { ...zone, label: values[key] };
        return zone;
      }
      case "ticker": {
        const key = `ticker_${zone.id}`;
        if (values[key] != null) return { ...zone, text: values[key] };
        return zone;
      }
      case "menu-list": {
        const title = values[`menu_title_${zone.id}`];
        const tagline = values[`menu_tag_${zone.id}`];
        const items = zone.items.map((item) => {
          const rowId = `${zone.id}_item_${item.id}`;
          const image = values[`${rowId}_image`];
          return {
            ...item,
            name: values[`${rowId}_name`] ?? item.name,
            description: values[`${rowId}_desc`] ?? item.description,
            price: values[`${rowId}_price`] ?? item.price,
            ...(image != null ? { image } : null),
          };
        });
        return {
          ...zone,
          ...(title != null ? { title } : null),
          ...(tagline != null ? { tagline } : null),
          items,
        };
      }
      default:
        return zone;
    }
  };

  const next: ZoneTemplate = {
    ...template,
    zones: template.zones.map(mapZone),
  };

  if (template.variants) {
    const variants: NonNullable<ZoneTemplate["variants"]> = {};
    for (const [key, pack] of Object.entries(template.variants)) {
      variants[key as keyof typeof variants] = {
        ...pack,
        zones: pack.zones.map(mapZone),
      };
    }
    next.variants = variants;
  }

  return next;
}

export function resolveZoneTemplateFromDesign(
  data: DesignData | null | undefined,
): ZoneTemplate | null {
  const raw = data?.zoneTemplate;
  if (!raw || typeof raw !== "object") return null;
  const template = raw as ZoneTemplate;
  const values = getContentValues(data);
  return applyContentToZoneTemplate(template, values);
}
