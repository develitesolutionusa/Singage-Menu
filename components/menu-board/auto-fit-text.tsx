"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

type AutoFitTextProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Starting font size in px (design-canvas space). */
  maxFontSize: number;
  /** Readable floor for ~3m viewing distance on a scaled stage. */
  minFontSize?: number;
  /** Max lines before clamp; shrinks first, then line-clamps. */
  maxLines?: number;
  as?: "p" | "h1" | "h2" | "h3" | "span" | "div";
};

/**
 * Shrinks font-size until text fits its box (no overflow / scroll).
 * Uses binary search against scrollHeight/scrollWidth.
 */
export function AutoFitText({
  children,
  className,
  style,
  maxFontSize,
  minFontSize = 14,
  maxLines,
  as: Tag = "div",
}: AutoFitTextProps) {
  const ref = useRef<HTMLElement>(null);
  const [fontSize, setFontSize] = useState(maxFontSize);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fit = () => {
      const parent = el.parentElement;
      if (!parent) return;

      const maxW = parent.clientWidth;
      const maxH = parent.clientHeight;
      if (!maxW || !maxH) return;

      let lo = minFontSize;
      let hi = maxFontSize;
      let best = minFontSize;

      // Binary search readable size that still fits the box
      for (let i = 0; i < 16; i++) {
        const mid = (lo + hi) / 2;
        el.style.fontSize = `${mid}px`;
        const fits =
          el.scrollWidth <= maxW + 1 && el.scrollHeight <= maxH + 1;
        if (fits) {
          best = mid;
          lo = mid;
        } else {
          hi = mid;
        }
      }

      setFontSize(Math.max(minFontSize, Math.floor(best * 100) / 100));
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el.parentElement ?? el);
    return () => ro.disconnect();
  }, [children, maxFontSize, minFontSize, maxLines]);

  return (
    <Tag
      ref={ref as never}
      className={cn("overflow-hidden text-balance", className)}
      style={{
        ...style,
        fontSize,
        ...(maxLines
          ? {
              display: "-webkit-box",
              WebkitLineClamp: maxLines,
              WebkitBoxOrient: "vertical" as const,
              overflow: "hidden",
            }
          : null),
      }}
    >
      {children}
    </Tag>
  );
}
