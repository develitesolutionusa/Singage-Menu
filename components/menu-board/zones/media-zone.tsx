"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Focal = { x: number; y: number };

type ImageZoneViewProps = {
  src: string;
  alt?: string;
  fallbackSrc?: string;
  focalPoint?: Focal;
  objectFit?: "cover" | "contain" | "fill";
  circular?: boolean;
  className?: string;
};

export function ImageZoneView({
  src,
  alt = "",
  fallbackSrc,
  focalPoint,
  objectFit = "cover",
  circular,
  className,
}: ImageZoneViewProps) {
  const [failed, setFailed] = useState(false);
  const url = failed && fallbackSrc ? fallbackSrc : src;

  return (
    <div
      className={cn(
        "h-full w-full overflow-hidden",
        circular && "rounded-full",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        className="h-full w-full"
        style={{
          objectFit,
          objectPosition: focalPoint
            ? `${focalPoint.x}% ${focalPoint.y}%`
            : "center",
        }}
        draggable={false}
        loading="eager"
        decoding="async"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

type VideoZoneViewProps = {
  src: string;
  poster?: string;
  focalPoint?: Focal;
  objectFit?: "cover" | "contain" | "fill";
  className?: string;
};

/** Muted, autoplay, loop, playsInline — TV / kiosk safe. */
export function VideoZoneView({
  src,
  poster,
  focalPoint,
  objectFit = "cover",
  className,
}: VideoZoneViewProps) {
  return (
    <div className={cn("h-full w-full overflow-hidden", className)}>
      <video
        src={src}
        poster={poster}
        className="h-full w-full"
        style={{
          objectFit,
          objectPosition: focalPoint
            ? `${focalPoint.x}% ${focalPoint.y}%`
            : "center",
        }}
        muted
        autoPlay
        loop
        playsInline
        preload="auto"
      />
    </div>
  );
}
