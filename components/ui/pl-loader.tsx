"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

/** Gooey bouncing-blob loader (Uiverse · wztd). */
export function PlLoader({
  className,
  label,
}: {
  className?: string;
  label?: string;
  /** Kept for call-site compatibility; colors are fixed by the loader CSS. */
  tone?: "light" | "dark";
}) {
  const rawId = useId();
  const gooId = `goo-${rawId.replace(/:/g, "")}`;

  return (
    <div
      role="status"
      aria-label={label ?? "Loading"}
      className={cn("inline-flex flex-col items-center gap-4", className)}
    >
      <svg width={0} height={0} aria-hidden className="absolute">
        <defs>
          <filter id={gooId}>
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation="6"
              result="blur"
            />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>
      <div className="loader" style={{ filter: `url(#${gooId})` }} />
      {label ? <span className="text-sm text-zinc-400">{label}</span> : null}
    </div>
  );
}
