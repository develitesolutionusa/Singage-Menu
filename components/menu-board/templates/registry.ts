import { SeasonalMenuTemplate } from "@/components/menu-board/templates/seasonal-menu";
import { CANVAS_PRESETS } from "@/lib/menu-board/canvas";
import {
  SEASONAL_CONTENT,
  SEASONAL_THEME,
} from "@/lib/menu-board/seasonal-content";
import type { MenuBoardTemplateDefinition } from "@/lib/menu-board/types";

export const MENU_BOARD_TEMPLATES: Record<string, MenuBoardTemplateDefinition> =
  {
    "seasonal-menu": {
      id: "seasonal-menu",
      name: "Seasonal Menu",
      theme: SEASONAL_THEME,
      defaultContent: SEASONAL_CONTENT,
      canvases: CANVAS_PRESETS,
      Component: SeasonalMenuTemplate,
    },
  };

export function getMenuBoardTemplate(
  id: string,
): MenuBoardTemplateDefinition | null {
  return MENU_BOARD_TEMPLATES[id] ?? null;
}

export const DEFAULT_MENU_BOARD_TEMPLATE_ID = "seasonal-menu";
