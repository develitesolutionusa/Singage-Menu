"use client";

import { LiveClock } from "@/components/menu-board/live-clock";
import { TickerStrip } from "@/components/menu-board/ticker-strip";
import { WifiQr } from "@/components/menu-board/wifi-qr";
import type { MenuBoardTemplateProps } from "@/lib/menu-board/types";
import { cn } from "@/lib/utils";

/**
 * Seasonal Menu — matches the Pincher's Dinner / Summer Flavours reference:
 * teal hero (~60%) + white menu panel (~40%) + orange ticker; portrait stacks
 * hero → menu → ticker. Square / ultrawide reflow via grid-template-areas.
 */
export function SeasonalMenuTemplate({
  content,
  theme,
  variant,
}: MenuBoardTemplateProps) {
  const isPortrait = variant === "portrait";
  const isSquare = variant === "square";
  const isUltrawide = variant === "ultrawide";
  const stacked = isPortrait || isSquare;

  return (
    <div
      className={cn(
        "menu-board-seasonal relative grid h-full w-full overflow-hidden",
        // Always: [main zones] + [ticker]. Hero/menu split lives inside main.
        "grid-rows-[minmax(0,1fr)_minmax(0,0.075fr)]",
      )}
      style={{
        backgroundColor: theme.bg,
        backgroundImage: `
          radial-gradient(ellipse 70% 55% at 28% 42%, rgba(255,255,255,0.07), transparent 60%),
          radial-gradient(ellipse 40% 30% at 70% 20%, rgba(0,0,0,0.18), transparent 55%),
          linear-gradient(145deg, ${theme.bg} 0%, #0A3A3A 48%, #0C4545 100%)
        `,
      }}
      data-variant={variant}
    >
      {/* Main zones */}
      <div
        className={cn(
          "grid min-h-0 min-w-0 overflow-hidden",
          stacked
            ? "grid-rows-[minmax(0,0.45fr)_minmax(0,0.55fr)]"
            : cn(
                "grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]",
                isUltrawide && "grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]",
              ),
        )}
        style={{
          gridTemplateAreas: stacked ? `"hero" "menu"` : `"hero menu"`,
        }}
      >
        {/* —— Hero —— */}
        <section
          className="relative min-h-0 min-w-0 overflow-hidden"
          style={{ gridArea: "hero" }}
        >
          {/* Accent garnish — kept clear of the headline */}
          {content.accentImageUrl && !stacked ? (
            <div
              className="pointer-events-none absolute left-[48%] top-[5%] z-[5] h-[9.5cqw] w-[9.5cqw] overflow-hidden rounded-full opacity-95"
              style={{ boxShadow: "0 8px 28px rgba(0,0,0,0.25)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={content.accentImageUrl}
                alt=""
                className="h-full w-full object-cover"
                draggable={false}
              />
            </div>
          ) : null}

          {/* Brand */}
          <div
            className={cn(
              "absolute z-20 flex items-center gap-[0.8cqw]",
              stacked ? "left-[4.5%] top-[3.5%]" : "left-[3.2%] top-[3.5%]",
            )}
          >
            {content.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={content.logoUrl}
                alt=""
                className="h-[clamp(28px,3.2cqw,52px)] w-[clamp(28px,3.2cqw,52px)] object-contain"
                draggable={false}
              />
            ) : null}
            <span
              className="font-extrabold uppercase tracking-[0.12em] text-white"
              style={{ fontSize: "clamp(12px, 1.35cqw, 22px)" }}
            >
              {content.brandName}
            </span>
          </div>

          {/* Clock on stacked (hero); landscape clock sits on the white panel */}
          {stacked ? (
            <LiveClock
              className="absolute right-[4%] top-[3.5%] z-20"
              timeClassName="text-[clamp(14px,1.7cqw,28px)] text-white"
              dateClassName="text-[clamp(11px,1.15cqw,18px)] text-white/85"
            />
          ) : null}

          {/* Badge + headline cluster */}
          <div
            className={cn(
              "absolute z-20 flex min-w-0 flex-col",
              stacked
                ? "left-[5%] right-[42%] top-[16%]"
                : "left-[3.5%] top-[18%] w-[min(48%,640px)]",
            )}
          >
            {content.badge ? (
              <span
                className="mb-[0.55em] inline-flex h-[clamp(40px,4.6cqw,72px)] w-[clamp(40px,4.6cqw,72px)] items-center justify-center rounded-full text-center font-extrabold uppercase leading-none text-white shadow-md"
                style={{
                  backgroundColor: theme.badge,
                  fontSize: "clamp(11px, 1.2cqw, 17px)",
                }}
              >
                {content.badge}
              </span>
            ) : null}

            <h1
              className="font-black uppercase leading-[0.92] tracking-tight text-white"
              style={{
                fontSize: stacked
                  ? "clamp(28px, 7.5cqh, 72px)"
                  : "clamp(42px, 5.6cqw, 104px)",
                textWrap: "balance",
              }}
            >
              {content.heroTitle}
            </h1>

            <p
              className="mt-[0.75em] max-w-[34ch] text-pretty leading-snug"
              style={{
                color: theme.muted,
                fontSize: "clamp(13px, 1.4cqw, 24px)",
              }}
            >
              {content.heroSubtitle}
            </p>
          </div>

          {/* Circular hero plate — overlaps menu panel on landscape */}
          <div
            className={cn(
              "pointer-events-none absolute z-10 overflow-hidden rounded-full",
              stacked
                ? "bottom-[-6%] right-[3%] h-[42%] aspect-square"
                : "bottom-[6%] right-[-22%] h-[86%] aspect-square",
              isUltrawide && "right-[-14%] h-[88%]",
            )}
            style={{
              boxShadow:
                "0 18px 50px rgba(0,0,0,0.35), inset 0 0 0 3px rgba(255,255,255,0.12)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={content.heroImageUrl}
              alt=""
              className="h-full w-full object-cover"
              draggable={false}
            />
          </div>

          {/* QR — landscape bottom-left of hero; portrait under headline area */}
          {!stacked ? (
            <WifiQr
              label={content.qrLabel}
              hint={content.qrHint}
              qrUrl={content.qrUrl}
              className="absolute bottom-[4%] left-[3.2%] z-20"
            />
          ) : null}
        </section>

        {/* —— Menu panel —— */}
        <section
          className="relative z-20 flex min-h-0 min-w-0 flex-col overflow-hidden bg-white"
          style={{ gridArea: "menu" }}
        >
          <header
            className={cn(
              "relative shrink-0 border-b border-zinc-100",
              stacked ? "px-[5%] pb-[2%] pt-[4%]" : "px-[7%] pb-[3%] pt-[6%]",
            )}
          >
            {!stacked ? (
              <LiveClock
                className="absolute right-[7%] top-[28%]"
                timeClassName="text-[clamp(14px,1.55cqw,24px)] text-zinc-700"
                dateClassName="text-[clamp(11px,1.05cqw,16px)] text-zinc-500"
              />
            ) : null}
            <h2
              className="font-black uppercase tracking-[0.04em]"
              style={{
                color: theme.panelText,
                fontSize: "clamp(18px, 2.4cqw, 36px)",
              }}
            >
              {content.panelTitle}
            </h2>
            <p
              className="mt-[0.35em] max-w-[85%] text-pretty"
              style={{
                color: "#64748B",
                fontSize: "clamp(11px, 1.15cqw, 18px)",
              }}
            >
              {content.panelTagline}
            </p>
          </header>

          <ul
            className={cn(
              "flex min-h-0 flex-1 flex-col justify-evenly overflow-hidden",
              stacked ? "px-[5%] py-[2%]" : "px-[7%] py-[2.5%]",
            )}
          >
            {content.items.map((item) => (
              <li key={item.id} className="min-h-0 py-[0.45em]">
                <div className="flex min-w-0 items-baseline gap-[0.5cqw]">
                  <p
                    className="min-w-0 shrink truncate font-extrabold uppercase tracking-[0.02em]"
                    style={{
                      color: theme.panelText,
                      fontSize: "clamp(12px, 1.35cqw, 22px)",
                    }}
                  >
                    {item.name}
                  </p>
                  <span
                    className="mx-[0.25em] min-w-[1.2cqw] flex-1 border-b border-dotted border-slate-300"
                    style={{ marginBottom: "0.22em" }}
                    aria-hidden
                  />
                  <span
                    className="shrink-0 font-bold tabular-nums"
                    style={{
                      color: theme.panelText,
                      fontSize: "clamp(12px, 1.35cqw, 22px)",
                    }}
                  >
                    {item.price}
                  </span>
                </div>
                {item.description ? (
                  <p
                    className="mt-[0.15em] line-clamp-1 text-pretty italic"
                    style={{
                      color: "#94A3B8",
                      fontSize: "clamp(10px, 1.05cqw, 15px)",
                    }}
                  >
                    {item.description}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>

          {stacked ? (
            <div className="shrink-0 px-[5%] pb-[3%] pt-[1%]">
              <WifiQr
                label={content.qrLabel}
                hint={content.qrHint}
                qrUrl={content.qrUrl}
                tone="dark"
              />
            </div>
          ) : null}
        </section>
      </div>

      {/* —— Ticker —— */}
      <TickerStrip
        text={content.ticker}
        background={theme.tickerBg}
        color={theme.tickerText}
        className="min-h-0"
      />
    </div>
  );
}
