"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { MenuItemData } from "@/lib/menu-board/zone-schema";
import { cn } from "@/lib/utils";

const BADGE_STYLE: Record<string, { bg: string; label: string }> = {
  veg: { bg: "#16A34A", label: "VEG" },
  spicy: { bg: "#DC2626", label: "SPICY" },
  new: { bg: "#EA580C", label: "NEW" },
};

type MenuListZoneProps = {
  title?: string;
  tagline?: string;
  items: MenuItemData[];
  overflowMode?: "scroll" | "paginate" | "shrink";
  showLeaders?: boolean;
  showIcons?: boolean;
  titleColor?: string;
  itemColor?: string;
  mutedColor?: string;
  priceColor?: string;
  className?: string;
};

/**
 * Menu items with dotted leader lines. Overflow: shrink fonts, paginate,
 * or smooth vertical scroll-loop — never hard-clip mid-item.
 */
export function MenuListZoneView({
  title,
  tagline,
  items,
  overflowMode = "shrink",
  showLeaders = true,
  showIcons = false,
  titleColor = "#14213D",
  itemColor = "#14213D",
  mutedColor = "#94A3B8",
  priceColor,
  className,
}: MenuListZoneProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(items.length);

  useEffect(() => {
    const el = listRef.current;
    if (!el || overflowMode !== "shrink") return;

    const fit = () => {
      let s = 1;
      el.style.setProperty("--menu-scale", "1");
      for (let i = 0; i < 12; i++) {
        if (el.scrollHeight <= el.clientHeight + 2) break;
        s = Math.max(0.72, s - 0.04);
        el.style.setProperty("--menu-scale", String(s));
      }
      setScale(s);
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [items, overflowMode, title, tagline]);

  useEffect(() => {
    if (overflowMode !== "paginate") return;
    const el = listRef.current;
    if (!el) return;

    const measure = () => {
      const sample = el.querySelector("[data-menu-item]") as HTMLElement | null;
      if (!sample) {
        setPageSize(items.length);
        return;
      }
      const rowH = sample.getBoundingClientRect().height || 48;
      const avail = el.clientHeight;
      const n = Math.max(1, Math.floor(avail / rowH));
      setPageSize(n);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [items, overflowMode]);

  useEffect(() => {
    if (overflowMode !== "paginate") return;
    const pages = Math.max(1, Math.ceil(items.length / pageSize));
    if (pages <= 1) return;
    const id = window.setInterval(() => {
      setPage((p) => (p + 1) % pages);
    }, 8000);
    return () => window.clearInterval(id);
  }, [items.length, overflowMode, pageSize]);

  useEffect(() => {
    if (overflowMode !== "scroll") return;
    const el = listRef.current;
    if (!el) return;
    let raf = 0;
    let offset = 0;
    const tick = () => {
      offset += 0.35;
      const max = Math.max(0, el.scrollHeight / 2 - el.clientHeight);
      if (offset > max + el.clientHeight) offset = 0;
      el.scrollTop = offset;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [overflowMode, items]);

  const visible =
    overflowMode === "paginate"
      ? items.slice(page * pageSize, page * pageSize + pageSize)
      : overflowMode === "scroll"
        ? [...items, ...items]
        : items;

  return (
    <div
      className={cn("flex h-full w-full min-h-0 flex-col", className)}
      style={{ color: itemColor }}
    >
      {title ? (
        <header className="shrink-0 pb-[0.6em]">
          <h2
            className="font-black uppercase tracking-[0.04em]"
            style={{
              color: titleColor,
              fontSize: "clamp(16px, 2.2cqw, 34px)",
            }}
          >
            {title}
          </h2>
          {tagline ? (
            <p
              className="mt-[0.3em] text-pretty"
              style={{
                color: mutedColor,
                fontSize: "clamp(11px, 1.1cqw, 17px)",
              }}
            >
              {tagline}
            </p>
          ) : null}
        </header>
      ) : null}

      <div
        ref={listRef}
        className="min-h-0 flex-1 overflow-hidden"
        style={
          overflowMode === "shrink"
            ? ({ ["--menu-scale" as string]: scale } as CSSProperties)
            : undefined
        }
      >
        <ul
          className="flex flex-col justify-evenly"
          style={{
            transform:
              overflowMode === "shrink"
                ? `scale(var(--menu-scale, 1))`
                : undefined,
            transformOrigin: "top left",
            width:
              overflowMode === "shrink"
                ? `calc(100% / var(--menu-scale, 1))`
                : "100%",
            height:
              overflowMode === "shrink"
                ? `calc(100% / var(--menu-scale, 1))`
                : undefined,
          }}
        >
          {visible.map((item, idx) => (
            <li
              key={`${item.id}-${idx}`}
              data-menu-item
              className="py-[0.45em]"
            >
              <div className="flex min-w-0 items-baseline gap-[0.5cqw]">
                {showIcons ? (
                  <span
                    className="mt-[0.15em] inline-flex h-[0.85em] w-[0.85em] shrink-0 items-center justify-center rounded-full text-[0.55em] font-bold text-white"
                    style={{ backgroundColor: "#E11D48" }}
                    aria-hidden
                  >
                    ✓
                  </span>
                ) : null}
                <span
                  className="min-w-0 shrink font-extrabold uppercase tracking-[0.02em]"
                  style={{
                    fontSize: "clamp(12px, 1.3cqw, 22px)",
                    color: itemColor,
                  }}
                >
                  {item.name}
                </span>
                {item.badges?.map((b) => {
                  const meta = BADGE_STYLE[b];
                  if (!meta) return null;
                  return (
                    <span
                      key={b}
                      className="shrink-0 rounded px-[0.35em] py-[0.1em] text-[clamp(8px,0.75cqw,11px)] font-bold uppercase text-white"
                      style={{ backgroundColor: meta.bg }}
                    >
                      {meta.label}
                    </span>
                  );
                })}
                {showLeaders ? (
                  <span
                    className="mx-[0.35em] min-w-[1.5cqw] flex-1 border-b border-dotted"
                    style={{ borderColor: `${mutedColor}99`, marginBottom: "0.25em" }}
                    aria-hidden
                  />
                ) : (
                  <span className="flex-1" />
                )}
                <span
                  className="shrink-0 font-bold tabular-nums"
                  style={{
                    fontSize: "clamp(12px, 1.3cqw, 22px)",
                    color: priceColor ?? itemColor,
                  }}
                >
                  {item.price}
                </span>
              </div>
              {item.description ? (
                <p
                  className="mt-[0.15em] line-clamp-1 italic"
                  style={{
                    color: mutedColor,
                    fontSize: "clamp(10px, 1cqw, 15px)",
                    paddingLeft: showIcons ? "1.4em" : 0,
                  }}
                >
                  {item.description}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
