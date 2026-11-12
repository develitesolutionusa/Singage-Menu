import { SEASONAL_MENU_TEMPLATE } from "@/lib/menu-board/templates/seasonal-menu";
import {
  PORTRAIT_WALL_GROUP,
  WALL_DESSERTS_TEMPLATE,
  WALL_MAINS_TEMPLATE,
  WALL_STARTERS_TEMPLATE,
} from "@/lib/menu-board/templates/portrait-wall";
import { PROMO_TICKER_TEMPLATE } from "@/lib/menu-board/templates/promo-ticker";
import { auditAllTemplates } from "@/lib/menu-board/qa";
import type { ScreenGroup, ZoneTemplate } from "@/lib/menu-board/zone-schema";

/** All zone-based templates (data-driven, no hard-coded screen pixels). */
export const ZONE_TEMPLATES: Record<string, ZoneTemplate> = {
  [SEASONAL_MENU_TEMPLATE.id]: SEASONAL_MENU_TEMPLATE,
  [PROMO_TICKER_TEMPLATE.id]: PROMO_TICKER_TEMPLATE,
  [WALL_STARTERS_TEMPLATE.id]: WALL_STARTERS_TEMPLATE,
  [WALL_MAINS_TEMPLATE.id]: WALL_MAINS_TEMPLATE,
  [WALL_DESSERTS_TEMPLATE.id]: WALL_DESSERTS_TEMPLATE,
};

export const SCREEN_GROUPS: Record<string, ScreenGroup> = {
  [PORTRAIT_WALL_GROUP.id]: PORTRAIT_WALL_GROUP,
};

export const DEFAULT_ZONE_TEMPLATE_ID = SEASONAL_MENU_TEMPLATE.id;

export function getZoneTemplate(id: string): ZoneTemplate | null {
  return ZONE_TEMPLATES[id] ?? null;
}

export function getScreenGroup(id: string): ScreenGroup | null {
  return SCREEN_GROUPS[id] ?? null;
}

export function listZoneTemplates(): ZoneTemplate[] {
  return Object.values(ZONE_TEMPLATES);
}

/** Pre-built catalog names from the product brief. */
export const PRESET_TEMPLATE_IDS = [
  "seasonal-menu",
  "promo-ticker",
  "wall-starters",
  "wall-mains",
  "wall-desserts",
] as const;

export function runTemplateQa() {
  return auditAllTemplates(listZoneTemplates());
}

export {
  SEASONAL_MENU_TEMPLATE,
  PROMO_TICKER_TEMPLATE,
  WALL_STARTERS_TEMPLATE,
  WALL_MAINS_TEMPLATE,
  WALL_DESSERTS_TEMPLATE,
  PORTRAIT_WALL_GROUP,
};
