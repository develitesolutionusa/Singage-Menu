/**
 * Digital Menu Board engine — shared types.
 * Templates design on a fixed canvas; ScreenStage scale-to-fits any viewport.
 */

import type { ComponentType } from "react";

export type CanvasVariant =
  | "landscape"
  | "portrait"
  | "square"
  | "ultrawide";

/** Manual override including TV mount rotations. */
export type OrientationMode =
  | "auto"
  | "landscape"
  | "portrait"
  | "rotated-90"
  | "rotated-270";

export type CanvasSize = {
  width: number;
  height: number;
  variant: CanvasVariant;
};

export type MenuItem = {
  id: string;
  name: string;
  description?: string;
  price: string;
};

export type MenuBoardContent = {
  brandName: string;
  logoUrl?: string;
  badge?: string;
  heroTitle: string;
  heroSubtitle: string;
  panelTitle: string;
  panelTagline: string;
  items: MenuItem[];
  qrLabel: string;
  qrHint: string;
  qrUrl?: string;
  ticker: string;
  heroImageUrl: string;
  accentImageUrl?: string;
};

export type TemplateTheme = {
  bg: string;
  panel: string;
  text: string;
  muted: string;
  accent: string;
  badge: string;
  panelText: string;
  tickerBg: string;
  tickerText: string;
};

export type MenuBoardTemplateProps = {
  content: MenuBoardContent;
  theme: TemplateTheme;
  variant: CanvasVariant;
  canvas: CanvasSize;
};

export type MenuBoardTemplateDefinition = {
  id: string;
  name: string;
  theme: TemplateTheme;
  defaultContent: MenuBoardContent;
  /** Fixed design canvases per variant — ScreenStage scales these. */
  canvases: Record<CanvasVariant, Omit<CanvasSize, "variant">>;
  Component: ComponentType<MenuBoardTemplateProps>;
};
