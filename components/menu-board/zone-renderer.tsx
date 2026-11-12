"use client";

import { LiveClock } from "@/components/menu-board/live-clock";
import { TickerStrip } from "@/components/menu-board/ticker-strip";
import { WifiQr } from "@/components/menu-board/wifi-qr";
import { AutoFitText } from "@/components/menu-board/auto-fit-text";
import { MenuListZoneView } from "@/components/menu-board/zones/menu-list-zone";
import {
  ImageZoneView,
  VideoZoneView,
} from "@/components/menu-board/zones/media-zone";
import type { CanvasVariant } from "@/lib/menu-board/types";
import {
  zoneBoxStyle,
  type Zone,
  type ZoneTemplate,
} from "@/lib/menu-board/zone-schema";
import { cn } from "@/lib/utils";

function isZoneVisible(zone: Zone, variant: CanvasVariant): boolean {
  if (zone.hideOn?.includes(variant)) return false;
  if (zone.showOn && !zone.showOn.includes(variant)) return false;
  return true;
}

function ZoneView({ zone, theme }: { zone: Zone; theme: ZoneTemplate["theme"] }) {
  const box = zoneBoxStyle(zone);

  switch (zone.type) {
    case "shape":
      return (
        <div
          style={{
            ...box,
            borderRadius:
              zone.shape === "circle"
                ? "50%"
                : zone.shape === "rounded"
                  ? zone.style?.borderRadius ?? "1.2cqw"
                  : zone.style?.borderRadius,
          }}
          data-zone={zone.id}
        />
      );

    case "image":
      return (
        <div style={box} data-zone={zone.id}>
          <ImageZoneView
            src={zone.src}
            alt={zone.alt}
            fallbackSrc={zone.fallbackSrc}
            focalPoint={zone.focalPoint}
            objectFit={zone.style?.objectFit ?? "cover"}
            circular={zone.circular}
          />
        </div>
      );

    case "video":
      return (
        <div style={box} data-zone={zone.id}>
          <VideoZoneView
            src={zone.src}
            poster={zone.poster}
            focalPoint={zone.focalPoint}
            objectFit={zone.style?.objectFit ?? "cover"}
          />
        </div>
      );

    case "logo":
      return (
        <div
          style={box}
          className="flex items-center gap-[0.7cqw]"
          data-zone={zone.id}
        >
          {zone.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={zone.src}
              alt=""
              className="h-[70%] max-h-full w-auto object-contain"
              draggable={false}
            />
          ) : null}
          {zone.label ? (
            <span
              className="font-extrabold uppercase tracking-[0.12em]"
              style={{
                fontSize: zone.style?.fontSizeCqw
                  ? `${zone.style.fontSizeCqw}cqw`
                  : "clamp(12px, 1.35cqw, 22px)",
                color: zone.style?.color ?? theme.text,
              }}
            >
              {zone.label}
            </span>
          ) : null}
        </div>
      );

    case "text": {
      const size =
        zone.role === "heading"
          ? "clamp(36px, 5.2cqw, 96px)"
          : zone.role === "subheading"
            ? "clamp(18px, 2.2cqw, 36px)"
            : zone.role === "badge"
              ? "clamp(11px, 1.15cqw, 17px)"
              : zone.style?.fontSizeCqw
                ? `${zone.style.fontSizeCqw}cqw`
                : "clamp(13px, 1.35cqw, 24px)";

      const inner = (
        <span
          className={cn(
            zone.role === "heading" && "font-black uppercase leading-[0.92] tracking-tight",
            zone.role === "subheading" && "font-black uppercase tracking-[0.04em]",
            zone.role === "badge" &&
              "inline-flex h-full w-full items-center justify-center rounded-full font-extrabold uppercase leading-none text-white",
            zone.role === "body" && "leading-snug text-pretty",
            zone.role === "label" && "font-semibold uppercase tracking-wide",
          )}
          style={{
            fontSize: size,
            color:
              zone.role === "badge"
                ? "#fff"
                : (zone.style?.color ?? theme.text),
            backgroundColor:
              zone.role === "badge"
                ? (zone.style?.background ?? theme.badge)
                : undefined,
          }}
        >
          {zone.text}
        </span>
      );

      return (
        <div
          style={box}
          className={cn(
            "flex",
            zone.role === "badge" || zone.style?.textAlign === "center"
              ? "items-center justify-center"
              : "items-start",
          )}
          data-zone={zone.id}
        >
          {zone.autoFit ? (
            <AutoFitText
              maxFontSize={zone.role === "heading" ? 96 : 28}
              minFontSize={14}
              maxLines={zone.maxLines}
              className="h-full w-full"
            >
              {zone.text}
            </AutoFitText>
          ) : (
            inner
          )}
        </div>
      );
    }

    case "clock": {
      const tone = zone.tone ?? "dark";
      return (
        <div style={box} data-zone={zone.id}>
          <LiveClock
            className="h-full w-full justify-center"
            timeClassName={
              tone === "light"
                ? "text-[clamp(14px,1.6cqw,26px)] text-white"
                : "text-[clamp(14px,1.6cqw,26px)] text-zinc-700"
            }
            dateClassName={
              tone === "light"
                ? "text-[clamp(11px,1.1cqw,17px)] text-white/85"
                : "text-[clamp(11px,1.1cqw,17px)] text-zinc-500"
            }
          />
        </div>
      );
    }

    case "qr":
      return (
        <div style={box} data-zone={zone.id}>
          <WifiQr
            label={zone.label}
            hint={zone.hint ?? ""}
            qrUrl={zone.qrUrl}
            tone={zone.tone ?? "light"}
            className="h-full"
          />
        </div>
      );

    case "ticker":
      return (
        <div style={box} data-zone={zone.id}>
          <TickerStrip
            text={zone.text}
            background={zone.style?.background ?? theme.tickerBg}
            color={zone.style?.color ?? theme.tickerText}
          />
        </div>
      );

    case "menu-list":
      return (
        <div style={{ ...box, padding: zone.style?.padding ?? "4% 6%" }} data-zone={zone.id}>
          <MenuListZoneView
            title={zone.title}
            tagline={zone.tagline}
            items={zone.items}
            overflowMode={zone.overflowMode ?? "shrink"}
            showLeaders={zone.showLeaders ?? true}
            showIcons={zone.showIcons ?? false}
            titleColor={zone.titleColor ?? theme.panelText}
            itemColor={zone.itemColor ?? theme.panelText}
            mutedColor={zone.mutedColor ?? "#94A3B8"}
            priceColor={zone.priceColor}
          />
        </div>
      );

    default:
      return null;
  }
}

type ZoneRendererProps = {
  template: ZoneTemplate;
  variant?: CanvasVariant;
  className?: string;
  /** Optional clip for multi-screen span slices (percent of canvas) */
  clip?: { x: number; y: number; w: number; h: number };
};

/**
 * Absolute-positioned zone compositor. Designs on fixed canvas % coords;
 * ScreenStage scale-to-fits the whole canvas to any TV.
 */
export function ZoneRenderer({
  template,
  variant = "landscape",
  className,
  clip,
}: ZoneRendererProps) {
  const pack =
    template.variants?.[variant] ??
    (variant === "landscape"
      ? { canvas: template.canvas, zones: template.zones }
      : template.variants?.[variant]);

  const zones = pack?.zones ?? template.zones;
  const canvas = pack?.canvas ?? template.canvas;
  const theme = template.theme;

  return (
    <div
      className={cn("relative h-full w-full overflow-hidden", className)}
      style={{
        backgroundColor: theme.bg,
        width: "100%",
        height: "100%",
        // Expose design size for container queries inside zones
        containerType: "size",
        clipPath: clip
          ? `inset(${clip.y}% ${100 - clip.x - clip.w}% ${100 - clip.y - clip.h}% ${clip.x}%)`
          : undefined,
      }}
      data-zone-template={template.id}
      data-canvas={`${canvas.width}x${canvas.height}`}
    >
      {zones.filter((z) => isZoneVisible(z, variant)).map((zone) => (
        <ZoneView key={zone.id} zone={zone} theme={theme} />
      ))}
    </div>
  );
}
