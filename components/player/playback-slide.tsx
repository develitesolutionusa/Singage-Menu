"use client";

import { useEffect, useRef } from "react";
import { DesignSlideStage } from "@/components/player/design-slide-stage";
import type { DesignData, Orientation } from "@/types/db";
import { cn } from "@/lib/utils";

export type PlaybackSlideInput = {
  kind: "design" | "image" | "video" | "empty";
  designData?: DesignData | null;
  url?: string | null;
  name?: string | null;
  orientation?: Orientation;
};

/** Shared slide renderer for the live player and Design Preview Mode. */
export function PlaybackSlide({
  slide,
  className,
  playAnimations = false,
  animationKey = 0,
  muted = true,
  autoPlayVideo = true,
  onVideoEnded,
}: {
  slide: PlaybackSlideInput;
  className?: string;
  playAnimations?: boolean;
  animationKey?: string | number;
  muted?: boolean;
  autoPlayVideo?: boolean;
  onVideoEnded?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || slide.kind !== "video") return;
    if (autoPlayVideo) {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, [autoPlayVideo, slide.kind, slide.url, animationKey]);

  if (slide.kind === "design" && slide.designData) {
    return (
      <DesignSlideStage
        data={slide.designData}
        orientation={slide.orientation ?? "landscape"}
        playAnimations={playAnimations}
        animationKey={animationKey}
        deviceOrientation={slide.orientation}
        className={className}
      />
    );
  }

  if (slide.kind === "image" && slide.url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={slide.url}
        alt={slide.name ?? ""}
        className={cn("h-full w-full object-contain bg-black", className)}
      />
    );
  }

  if (slide.kind === "video" && slide.url) {
    return (
      <video
        ref={videoRef}
        key={`${slide.url}-${animationKey}`}
        src={slide.url}
        className={cn("h-full w-full object-contain bg-black", className)}
        autoPlay={autoPlayVideo}
        muted={muted}
        playsInline
        onEnded={onVideoEnded}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center bg-zinc-950 text-sm text-zinc-500",
        className,
      )}
    >
      No content
    </div>
  );
}
