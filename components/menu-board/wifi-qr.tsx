"use client";

import { cn } from "@/lib/utils";

/**
 * Stylized QR block for Free WiFi. Uses a deterministic pattern so it stays
 * sharp at any stage scale. Link via qrUrl when a real encoder is wired later.
 */
export function WifiQr({
  label,
  hint,
  className,
  tone = "light",
}: {
  label: string;
  hint: string;
  qrUrl?: string;
  className?: string;
  /** light = white copy on dark hero; dark = navy copy on white panel */
  tone?: "light" | "dark";
}) {
  const onDark = tone === "light";
  return (
    <div className={cn("flex items-end gap-[0.9cqw]", className)}>
      <div
        className={cn(
          "relative shrink-0 overflow-hidden",
          onDark ? "bg-white" : "bg-zinc-100 ring-1 ring-zinc-200",
        )}
        style={{
          width: "clamp(64px, 7.2cqw, 120px)",
          height: "clamp(64px, 7.2cqw, 120px)",
          padding: "0.45cqw",
        }}
        aria-hidden
      >
        <QrPattern />
      </div>
      <div
        className={cn(
          "min-w-0 pb-[0.2cqw]",
          onDark ? "text-white" : "text-[#14213D]",
        )}
      >
        <p className="text-[clamp(14px,1.55cqw,28px)] font-extrabold uppercase tracking-[0.04em]">
          {label}
        </p>
        <p
          className={cn(
            "mt-[0.25em] max-w-[18cqw] text-[clamp(11px,1.05cqw,18px)] leading-snug",
            onDark ? "text-white/85" : "text-slate-500",
          )}
        >
          {hint}
        </p>
      </div>
    </div>
  );
}

function QrPattern() {
  // 21×21 quiet-zone-less matrix — enough visual fidelity for a menu board.
  const cells = QR_MATRIX;
  const n = cells.length;
  return (
    <svg viewBox={`0 0 ${n} ${n}`} className="h-full w-full" role="img">
      <title>WiFi QR</title>
      <rect width={n} height={n} fill="#fff" />
      {cells.map((row, y) =>
        row.map((on, x) =>
          on ? (
            <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#111" />
          ) : null,
        ),
      )}
    </svg>
  );
}

/** Compact fake QR — finder patterns + data noise. */
const QR_MATRIX: number[][] = (() => {
  const n = 21;
  const m = Array.from({ length: n }, () => Array(n).fill(0));
  const finder = (ox: number, oy: number) => {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        const edge = x === 0 || y === 0 || x === 6 || y === 6;
        const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        m[oy + y][ox + x] = edge || core ? 1 : 0;
      }
    }
  };
  finder(0, 0);
  finder(n - 7, 0);
  finder(0, n - 7);
  // Timing + pseudo data
  for (let i = 8; i < n - 8; i++) {
    m[6][i] = i % 2 === 0 ? 1 : 0;
    m[i][6] = i % 2 === 0 ? 1 : 0;
  }
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (m[y][x]) continue;
      if (x < 8 && y < 8) continue;
      if (x >= n - 8 && y < 8) continue;
      if (x < 8 && y >= n - 8) continue;
      const h = ((x * 17 + y * 31 + x * y) % 7) < 3 ? 1 : 0;
      m[y][x] = h;
    }
  }
  return m;
})();
