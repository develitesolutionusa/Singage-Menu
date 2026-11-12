"use client";

import { ZoneEngine } from "@/components/menu-board/zone-engine";
import {
  getScreenGroup,
  getZoneTemplate,
} from "@/lib/menu-board/templates";
import { resolveScreenSlice } from "@/lib/menu-board/screen-group";
import { cn } from "@/lib/utils";

type WallPreviewProps = {
  groupId: string;
  showSafeArea?: boolean;
  className?: string;
};

/**
 * Renders a multi-screen group as linked portrait panels side-by-side
 * (preview of a 3×1 video wall). Each panel uses its own template.
 */
export function WallPreview({
  groupId,
  showSafeArea = false,
  className,
}: WallPreviewProps) {
  const group = getScreenGroup(groupId);
  if (!group) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-900 text-white">
        Unknown screen group: {groupId}
      </div>
    );
  }

  const total = group.columns * group.rows;
  const screens = Array.from({ length: total }, (_, index) => {
    const slice = resolveScreenSlice(group, index);
    return { index, slice, template: getZoneTemplate(slice.templateId) };
  });

  return (
    <div
      className={cn(
        "grid h-full w-full gap-[0.6%] overflow-hidden bg-black p-[0.4%]",
        className,
      )}
      style={{
        gridTemplateColumns: `repeat(${group.columns}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${group.rows}, minmax(0, 1fr))`,
      }}
      data-screen-group={group.id}
    >
      {screens.map(({ index, slice, template }) => (
        <div
          key={index}
          className="relative min-h-0 min-w-0 overflow-hidden rounded-[0.4cqw] ring-1 ring-white/10"
          data-screen-index={index}
        >
          {template ? (
            <ZoneEngine
              templateId={slice.templateId}
              variant="portrait"
              showSafeArea={showSafeArea}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-zinc-800 text-sm text-white">
              Missing template
            </div>
          )}
          <span className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/90">
            Screen {index + 1}
          </span>
        </div>
      ))}
    </div>
  );
}
