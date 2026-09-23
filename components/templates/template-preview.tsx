"use client";

import { DesignElementView } from "@/components/design-editor/design-element-view";
import {
  getArtboardSize,
  getElements,
} from "@/lib/design-elements";
import { buildDynamicContext, type OrgProfile } from "@/lib/dynamic-data";
import { cn } from "@/lib/utils";
import type { DesignData } from "@/types/db";

function themeOf(data: DesignData) {
  return {
    bg: data.theme?.bg ?? "#111827",
    accent: data.theme?.accent ?? "#14b8a6",
    text: data.theme?.text ?? "#f9fafb",
    muted: data.theme?.muted ?? "#9ca3af",
    panel: data.theme?.panel ?? "#1f2937",
  };
}

export function TemplatePreview({
  data,
  className,
  compact = false,
  orgProfile = null,
}: {
  data: DesignData;
  className?: string;
  compact?: boolean;
  /** Used to resolve restaurant dynamic bindings in canvas previews. */
  orgProfile?: OrgProfile | null;
}) {
  const theme = themeOf(data);
  const layout = data.layout ?? "promo-hero";
  const elements = getElements(data).filter((el) => !el.hidden);

  // Prefer schema-driven canvas elements (Smart Templates) over legacy layouts.
  if (elements.length > 0) {
    const artboard = getArtboardSize(
      data.orientation === "portrait" ? "portrait" : "landscape",
    );
    const dataContext = buildDynamicContext(data, orgProfile);
    const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);
    const scale = compact ? 0.22 : 0.35;

    return (
      <div
        className={cn("relative h-full w-full overflow-hidden", className)}
        style={{ background: theme.bg }}
      >
        <div
          className="absolute left-1/2 top-1/2 origin-center"
          style={{
            width: artboard.width,
            height: artboard.height,
            transform: `translate(-50%, -50%) scale(${scale})`,
          }}
        >
          {sorted.map((el) => (
            <div
              key={el.id}
              className="absolute overflow-hidden"
              style={{
                left: el.x,
                top: el.y,
                width: el.width,
                height: el.height,
                zIndex: el.zIndex,
                transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
              }}
            >
              <DesignElementView element={el} dataContext={dataContext} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden",
        compact
          ? "text-[7px] leading-tight"
          : "text-[10px] leading-snug sm:text-xs",
        className,
      )}
      style={{ background: theme.bg, color: theme.text }}
    >
      {layout === "menu-board" ? (
        <MenuBoard data={data} theme={theme} compact={compact} />
      ) : layout === "happy-hour" ? (
        <HappyHour data={data} theme={theme} compact={compact} />
      ) : layout === "special-split" ? (
        <SpecialSplit data={data} theme={theme} compact={compact} />
      ) : layout === "deal-card" || layout === "combo" ? (
        <DealCard data={data} theme={theme} compact={compact} />
      ) : layout === "new-item" ? (
        <NewItem data={data} theme={theme} compact={compact} />
      ) : (
        <PromoHero data={data} theme={theme} compact={compact} />
      )}
    </div>
  );
}

type Theme = ReturnType<typeof themeOf>;

function Badge({
  label,
  accent,
  compact,
}: {
  label?: string;
  accent: string;
  compact: boolean;
}) {
  if (!label) return null;
  return (
    <span
      className={cn(
        "inline-flex font-semibold tracking-wider uppercase",
        compact ? "rounded px-1 py-0.5" : "rounded-md px-2 py-1",
      )}
      style={{ background: accent, color: "#0a0a0a" }}
    >
      {label}
    </span>
  );
}

function MenuBoard({
  data,
  theme,
  compact,
}: {
  data: DesignData;
  theme: Theme;
  compact: boolean;
}) {
  const sections = data.sections?.slice(0, 2) ?? [];
  return (
    <div className={cn("flex h-full flex-col", compact ? "p-2 gap-1" : "p-4 gap-3")}>
      <div>
        <h3
          className={cn("font-semibold tracking-tight", compact ? "text-[9px]" : "text-sm")}
          style={{ color: theme.accent }}
        >
          {data.headline ?? "Menu"}
        </h3>
        {data.subheadline ? (
          <p style={{ color: theme.muted }}>{data.subheadline}</p>
        ) : null}
      </div>
      <div className={cn("grid flex-1", compact ? "grid-cols-2 gap-1" : "grid-cols-2 gap-3")}>
        {sections.map((section) => (
          <div
            key={section.title}
            className={cn("rounded", compact ? "p-1" : "p-2")}
            style={{ background: theme.panel }}
          >
            <p
              className="mb-1 font-semibold uppercase tracking-wide"
              style={{ color: theme.accent }}
            >
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {(section.items ?? []).slice(0, compact ? 3 : 4).map((item) => (
                <li key={item.name} className="flex justify-between gap-1">
                  <span className="truncate">{item.name}</span>
                  <span style={{ color: theme.accent }}>{item.price}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function PromoHero({
  data,
  theme,
  compact,
}: {
  data: DesignData;
  theme: Theme;
  compact: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-full flex-col justify-center",
        compact ? "gap-1 p-3" : "gap-2 p-5",
      )}
    >
      <Badge label={data.badge} accent={theme.accent} compact={compact} />
      <h3
        className={cn("font-semibold tracking-tight", compact ? "text-[10px]" : "text-base")}
      >
        {data.headline}
      </h3>
      {data.subheadline ? (
        <p style={{ color: theme.muted }}>{data.subheadline}</p>
      ) : null}
      <div className="mt-auto flex items-end justify-between gap-2">
        {data.price ? (
          <span
            className={cn("font-bold", compact ? "text-[11px]" : "text-lg")}
            style={{ color: theme.accent }}
          >
            {data.price}
          </span>
        ) : null}
        {data.cta ? <span style={{ color: theme.muted }}>{data.cta}</span> : null}
      </div>
    </div>
  );
}

function SpecialSplit({
  data,
  theme,
  compact,
}: {
  data: DesignData;
  theme: Theme;
  compact: boolean;
}) {
  return (
    <div className={cn("grid h-full grid-cols-2", compact ? "gap-1 p-2" : "gap-2 p-3")}>
      <div
        className="flex items-center justify-center rounded"
        style={{ background: theme.panel }}
      >
        <span
          className={cn("font-bold", compact ? "text-sm" : "text-2xl")}
          style={{ color: theme.accent }}
        >
          {data.price ?? "$"}
        </span>
      </div>
      <div className="flex flex-col justify-center gap-1">
        <Badge label={data.badge} accent={theme.accent} compact={compact} />
        <h3 className={cn("font-semibold", compact ? "text-[9px]" : "text-sm")}>
          {data.headline}
        </h3>
        <p style={{ color: theme.muted }}>{data.subheadline}</p>
        {data.body ? <p style={{ color: theme.muted }}>{data.body}</p> : null}
      </div>
    </div>
  );
}

function HappyHour({
  data,
  theme,
  compact,
}: {
  data: DesignData;
  theme: Theme;
  compact: boolean;
}) {
  return (
    <div className={cn("flex h-full flex-col", compact ? "gap-1 p-2" : "gap-2 p-4")}>
      <Badge label={data.badge} accent={theme.accent} compact={compact} />
      <h3 className={cn("font-semibold", compact ? "text-[10px]" : "text-sm")}>
        {data.headline}
      </h3>
      <p style={{ color: theme.muted }}>{data.subheadline}</p>
      <ul
        className={cn("mt-auto rounded", compact ? "space-y-0.5 p-1.5" : "space-y-1 p-2")}
        style={{ background: theme.panel }}
      >
        {(data.items ?? []).slice(0, 3).map((item) => (
          <li key={item.name} className="flex justify-between gap-2">
            <span>{item.name}</span>
            <span style={{ color: theme.accent }}>{item.price}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DealCard({
  data,
  theme,
  compact,
}: {
  data: DesignData;
  theme: Theme;
  compact: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-full flex-col items-center justify-center text-center",
        compact ? "gap-1 p-3" : "gap-2 p-5",
      )}
    >
      <Badge label={data.badge} accent={theme.accent} compact={compact} />
      <h3 className={cn("font-semibold", compact ? "text-[10px]" : "text-base")}>
        {data.headline}
      </h3>
      <p style={{ color: theme.muted }}>{data.subheadline}</p>
      <p
        className={cn("font-bold", compact ? "text-sm" : "text-2xl")}
        style={{ color: theme.accent }}
      >
        {data.price}
      </p>
      {data.body ? <p style={{ color: theme.muted }}>{data.body}</p> : null}
    </div>
  );
}

function NewItem({
  data,
  theme,
  compact,
}: {
  data: DesignData;
  theme: Theme;
  compact: boolean;
}) {
  return (
    <div className={cn("flex h-full", compact ? "gap-2 p-2" : "gap-3 p-4")}>
      <div
        className="flex w-2/5 items-center justify-center rounded"
        style={{
          background: `linear-gradient(145deg, ${theme.panel}, ${theme.accent}55)`,
        }}
      >
        <span
          className={cn("font-bold", compact ? "text-[9px]" : "text-sm")}
          style={{ color: theme.accent }}
        >
          NEW
        </span>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-1">
        <Badge label={data.badge} accent={theme.accent} compact={compact} />
        <h3 className={cn("font-semibold", compact ? "text-[9px]" : "text-sm")}>
          {data.headline}
        </h3>
        <p style={{ color: theme.muted }}>{data.subheadline}</p>
        <div className="mt-1 flex items-center justify-between">
          <span className="font-bold" style={{ color: theme.accent }}>
            {data.price}
          </span>
          {data.cta ? <span style={{ color: theme.muted }}>{data.cta}</span> : null}
        </div>
      </div>
    </div>
  );
}
