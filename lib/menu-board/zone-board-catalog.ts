import {
  PROMO_TICKER_TEMPLATE,
  SEASONAL_MENU_TEMPLATE,
  WALL_DESSERTS_TEMPLATE,
  WALL_MAINS_TEMPLATE,
  WALL_STARTERS_TEMPLATE,
} from "@/lib/menu-board/templates";
import { zoneTemplateToDesignData } from "@/lib/menu-board/to-design-data";
import type { DesignData } from "@/types/db";

/**
 * Zone menu boards as Design Editor Smart Templates.
 * Appear in Template Library + left panel; open in Design Editor.
 */
export function buildZoneBoardCatalog(): Record<string, DesignData> {
  return {
    "Seasonal Menu Board": zoneTemplateToDesignData(SEASONAL_MENU_TEMPLATE, {
      layoutLocked: false,
      catalogName: "Seasonal Menu Board",
    }),
    "Promo Ticker Board": zoneTemplateToDesignData(PROMO_TICKER_TEMPLATE, {
      layoutLocked: false,
      catalogName: "Promo Ticker Board",
    }),
    "Wall Starters Board": zoneTemplateToDesignData(WALL_STARTERS_TEMPLATE, {
      layoutLocked: false,
      catalogName: "Wall Starters Board",
    }),
    "Wall Mains Board": zoneTemplateToDesignData(WALL_MAINS_TEMPLATE, {
      layoutLocked: false,
      catalogName: "Wall Mains Board",
    }),
    "Wall Specials Board": zoneTemplateToDesignData(WALL_DESSERTS_TEMPLATE, {
      layoutLocked: false,
      catalogName: "Wall Specials Board",
    }),
  };
}
