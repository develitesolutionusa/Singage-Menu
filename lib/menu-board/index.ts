export { CANVAS_PRESETS, getCanvas, variantFromAspectRatio } from "@/lib/menu-board/canvas";
export {
  ORIENTATION_OPTIONS,
  resolveOrientation,
  type ResolvedOrientation,
} from "@/lib/menu-board/orientation";
export { SEASONAL_CONTENT, SEASONAL_THEME } from "@/lib/menu-board/seasonal-content";
export { useAspectRatio, type AspectRatioState } from "@/lib/menu-board/use-aspect-ratio";
export {
  parseGroupQuery,
  resolveScreenSlice,
  wallCanvasSize,
  type ScreenSlice,
} from "@/lib/menu-board/screen-group";
export { auditAllTemplates, auditZoneTemplate, type QaIssue } from "@/lib/menu-board/qa";
export {
  zoneBoxStyle,
  zoneSchema,
  zoneTemplateSchema,
  screenGroupSchema,
  parseZoneTemplate,
  ZONE_TYPES,
  type Zone,
  type ZoneTemplate,
  type ZoneType,
  type ZoneStyle,
  type ScreenGroup,
  type MenuItemData,
} from "@/lib/menu-board/zone-schema";
export {
  ZONE_TEMPLATES,
  SCREEN_GROUPS,
  DEFAULT_ZONE_TEMPLATE_ID,
  getZoneTemplate,
  getScreenGroup,
  listZoneTemplates,
  runTemplateQa,
  SEASONAL_MENU_TEMPLATE,
  PROMO_TICKER_TEMPLATE,
  WALL_STARTERS_TEMPLATE,
  WALL_MAINS_TEMPLATE,
  WALL_DESSERTS_TEMPLATE,
  PORTRAIT_WALL_GROUP,
} from "@/lib/menu-board/templates";
export { buildZoneBoardCatalog } from "@/lib/menu-board/zone-board-catalog";
export {
  zoneTemplateToDesignData,
  isZoneBoardDesign,
} from "@/lib/menu-board/to-design-data";
export {
  applyContentToZoneTemplate,
  resolveZoneTemplateFromDesign,
} from "@/lib/menu-board/apply-zone-content";
export type {
  CanvasSize,
  CanvasVariant,
  MenuBoardContent,
  MenuBoardTemplateDefinition,
  MenuBoardTemplateProps,
  MenuItem,
  OrientationMode,
  TemplateTheme,
} from "@/lib/menu-board/types";
