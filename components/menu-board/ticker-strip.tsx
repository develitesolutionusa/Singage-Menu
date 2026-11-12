"use client";

import { cn } from "@/lib/utils";

type TickerStripProps = {
  text: string;
  className?: string;
  background: string;
  color: string;
};

/**
 * Full-width bottom ticker. Marquee is CSS-only; content never causes page scroll.
 */
export function TickerStrip({
  text,
  className,
  background,
  color,
}: TickerStripProps) {
  const loop = `${text}   •   ${text}   •   `;

  return (
    <div
      className={cn(
        "relative flex h-full w-full items-center overflow-hidden",
        className,
      )}
      style={{ backgroundColor: background, color }}
      data-ticker
    >
      <div className="menu-board-ticker-track flex whitespace-nowrap will-change-transform">
        <span className="px-[2cqw] text-[clamp(14px,1.6cqw,28px)] font-semibold tracking-wide">
          {loop}
        </span>
        <span
          className="px-[2cqw] text-[clamp(14px,1.6cqw,28px)] font-semibold tracking-wide"
          aria-hidden
        >
          {loop}
        </span>
      </div>
    </div>
  );
}
