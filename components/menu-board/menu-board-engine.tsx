"use client";

import { useEffect, useRef, useState } from "react";
import { OrientationControls } from "@/components/menu-board/orientation-controls";
import { ScreenStage } from "@/components/menu-board/screen-stage";
import {
  DEFAULT_MENU_BOARD_TEMPLATE_ID,
  getMenuBoardTemplate,
} from "@/components/menu-board/templates/registry";
import { resolveOrientation } from "@/lib/menu-board/orientation";
import type {
  MenuBoardContent,
  OrientationMode,
  TemplateTheme,
} from "@/lib/menu-board/types";
import { cn } from "@/lib/utils";

type MenuBoardEngineProps = {
  templateId?: string;
  content?: Partial<MenuBoardContent>;
  theme?: Partial<TemplateTheme>;
  orientationMode?: OrientationMode;
  onOrientationModeChange?: (mode: OrientationMode) => void;
  showControls?: boolean;
  className?: string;
};

/**
 * Rendering engine: picks orientation variant from host aspect (or override),
 * mounts the template on a fixed canvas inside ScreenStage (scale-to-fit).
 * Never scrolls — html/body overflow is locked by the demo/player shell.
 */
export function MenuBoardEngine({
  templateId = DEFAULT_MENU_BOARD_TEMPLATE_ID,
  content: contentOverrides,
  theme: themeOverrides,
  orientationMode: controlledMode,
  onOrientationModeChange,
  showControls = true,
  className,
}: MenuBoardEngineProps) {
  const template = getMenuBoardTemplate(templateId);
  const hostRef = useRef<HTMLDivElement>(null);
  const [uncontrolledMode, setUncontrolledMode] =
    useState<OrientationMode>("auto");
  const mode = controlledMode ?? uncontrolledMode;
  const [hostSize, setHostSize] = useState({ w: 1920, h: 1080 });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const apply = () => {
      setHostSize({
        w: Math.max(1, host.clientWidth),
        h: Math.max(1, host.clientHeight),
      });
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  if (!template) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-white">
        Unknown template: {templateId}
      </div>
    );
  }

  const resolved = resolveOrientation(mode, hostSize.w, hostSize.h);
  const canvas = {
    ...template.canvases[resolved.variant],
    variant: resolved.variant,
  };
  const content: MenuBoardContent = {
    ...template.defaultContent,
    ...contentOverrides,
    items: contentOverrides?.items ?? template.defaultContent.items,
  };
  const theme: TemplateTheme = {
    ...template.theme,
    ...themeOverrides,
  };

  const Template = template.Component;

  const setMode = (next: OrientationMode) => {
    onOrientationModeChange?.(next);
    if (controlledMode === undefined) setUncontrolledMode(next);
  };

  return (
    <div
      ref={hostRef}
      className={cn("relative h-full w-full overflow-hidden", className)}
      style={{ backgroundColor: theme.bg }}
      data-menu-board-engine
    >
      <ScreenStage
        canvasWidth={canvas.width}
        canvasHeight={canvas.height}
        letterboxColor={theme.bg}
        rotationDeg={resolved.stageRotationDeg}
      >
        <Template
          content={content}
          theme={theme}
          variant={resolved.variant}
          canvas={canvas}
        />
      </ScreenStage>

      {showControls ? (
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-50 -translate-x-1/2">
          <OrientationControls
            value={mode}
            onChange={setMode}
            detectedLabel={`${resolved.variant} · ${canvas.width}×${canvas.height}`}
          />
        </div>
      ) : null}
    </div>
  );
}
