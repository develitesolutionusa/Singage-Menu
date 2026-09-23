"use client";

import { getBlockDefinition } from "@/components/design-editor/blocks";
import {
  SHADOW_CSS,
  fontFamilyCss,
  type DesignElement,
  type DesignShadow,
} from "@/lib/design-elements";
import {
  hasDynamicBinding,
  resolveElementProps,
  type DynamicDataContext,
} from "@/lib/dynamic-data";
import { cn } from "@/lib/utils";

export function DesignElementView({
  element,
  selected,
  dataContext,
  showDynamicBadge = false,
}: {
  element: DesignElement;
  selected?: boolean;
  dataContext?: DynamicDataContext | null;
  showDynamicBadge?: boolean;
}) {
  const def = getBlockDefinition(element.type);
  const rawProps = element.props;
  const props = dataContext
    ? resolveElementProps(rawProps, dataContext)
    : rawProps;
  const bg = props.background ?? "transparent";
  const color = props.color ?? "#111827";
  const radius = props.borderRadius ?? 8;
  const opacity = (props.opacity ?? 100) / 100;
  const align = props.align ?? "left";
  const shadow = SHADOW_CSS[(props.shadow ?? "none") as DesignShadow];
  const borderWidth = props.borderWidth ?? 0;
  const borderColor = props.borderColor ?? "transparent";
  const padding = props.padding ?? 0;
  const margin = props.margin ?? 0;
  const fontFamily = fontFamilyCss(props.fontFamily);
  const showBadge = showDynamicBadge && hasDynamicBinding(rawProps);

  return (
    <div
      className={cn(
        "relative box-border h-full w-full overflow-hidden",
        selected && "ring-0",
        props.featured && "ring-2 ring-amber-400/80",
      )}
      style={{
        opacity,
        borderRadius: radius,
        background: bg,
        color,
        textAlign: align,
        fontFamily,
        boxShadow: shadow,
        borderWidth,
        borderStyle: borderWidth > 0 ? "solid" : undefined,
        borderColor: borderWidth > 0 ? borderColor : undefined,
        padding,
        margin,
        lineHeight: props.lineHeight,
        letterSpacing:
          props.letterSpacing != null ? `${props.letterSpacing}px` : undefined,
      }}
    >
      {showBadge ? (
        <span className="pointer-events-none absolute right-1 top-1 z-10 rounded bg-teal-600/90 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
          Dyn
        </span>
      ) : null}

      {element.type === "text" ? (
        <div
          className="flex h-full w-full items-center whitespace-pre-wrap"
          style={{
            fontSize: props.fontSize ?? 24,
            fontWeight: props.fontWeight ?? 600,
            justifyContent:
              align === "center"
                ? "center"
                : align === "right"
                  ? "flex-end"
                  : "flex-start",
          }}
        >
          {props.text || "Text"}
        </div>
      ) : null}

      {element.type === "button" ? (
        <div
          className="flex h-full w-full items-center justify-center font-semibold"
          style={{
            fontSize: props.fontSize ?? 14,
            fontWeight: props.fontWeight ?? 600,
          }}
        >
          {props.label || "Button"}
        </div>
      ) : null}

      {element.type === "image" ||
      element.type === "logo" ||
      element.type === "video" ? (
        props.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={props.imageUrl}
            alt={props.alt || def?.label || element.type}
            className="h-full w-full"
            style={{
              objectFit:
                props.fit === "contain"
                  ? "contain"
                  : props.fit === "fill"
                    ? "fill"
                    : "cover",
            }}
            draggable={false}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 border border-dashed border-zinc-300 bg-zinc-100 text-[11px] text-zinc-500">
            <span className="font-semibold uppercase tracking-wide">
              {def?.label ?? element.type}
            </span>
            <span>{props.alt || "Add image URL in Properties"}</span>
          </div>
        )
      ) : null}

      {element.type === "menu-card" || element.type === "promotion-card" ? (
        <div className="flex h-full flex-col justify-between gap-2">
          {props.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={props.imageUrl}
              alt={props.name || "Item"}
              className="h-16 w-full rounded object-cover"
              draggable={false}
            />
          ) : null}
          <div className="min-h-0 flex-1">
            {props.category ? (
              <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                {props.category}
              </p>
            ) : null}
            <p className="text-sm font-semibold leading-tight">
              {props.name || "Item"}
              {props.featured ? (
                <span className="ml-1 text-[10px] font-bold text-amber-500">
                  ★
                </span>
              ) : null}
            </p>
            {props.description ? (
              <p className="mt-1 text-[11px] opacity-80">{props.description}</p>
            ) : null}
          </div>
          <div className="flex items-end justify-between gap-2">
            <span className="text-base font-bold">{props.price || "$0"}</span>
            {props.cta ? (
              <span className="rounded bg-black/10 px-2 py-0.5 text-[10px] font-semibold">
                {props.cta}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {element.type === "price-badge" ? (
        <div
          className="flex h-full w-full items-center justify-center font-bold"
          style={{ fontSize: props.fontSize ?? 20 }}
        >
          {props.price || "$0"}
        </div>
      ) : null}

      {element.type === "shape" ? <div className="h-full w-full" /> : null}

      {element.type === "qr-code" ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 border border-zinc-200 bg-white p-2">
          <div className="grid w-full flex-1 grid-cols-5 gap-0.5" aria-hidden>
            {Array.from({ length: 25 }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "rounded-[1px]",
                  i % 3 === 0 || i % 7 === 0 ? "bg-zinc-900" : "bg-zinc-200",
                )}
              />
            ))}
          </div>
          <span className="text-[9px] text-zinc-500">{props.label || "QR"}</span>
        </div>
      ) : null}

      {element.type === "divider" ? (
        <div className="flex h-full w-full items-center">
          <div
            className="h-0.5 w-full rounded-full"
            style={{ background: props.background ?? "#cbd5e1" }}
          />
        </div>
      ) : null}

      {element.type === "dynamic-data" ? (
        <div className="flex h-full w-full items-center gap-2">
          <span className="rounded bg-teal-100 px-1.5 py-0.5 text-[10px] font-semibold text-teal-800">
            Dynamic
          </span>
          <span
            className="truncate font-semibold"
            style={{ fontSize: props.fontSize ?? 16 }}
          >
            {props.text ||
              `{{${props.dataSource ?? "product"}.${props.field ?? "price"}}}`}
          </span>
        </div>
      ) : null}

      {(element.type === "contact" ||
        element.type === "hours" ||
        element.type === "location" ||
        element.type === "social-icons") && (
        <div
          className="flex h-full w-full items-center whitespace-pre-line text-xs leading-relaxed"
          style={{ fontSize: props.fontSize ?? 14 }}
        >
          {props.text || def?.label}
        </div>
      )}
    </div>
  );
}
