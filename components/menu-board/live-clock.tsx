"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function formatNow(date: Date) {
  return {
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
    day: `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`,
  };
}

export function LiveClock({
  className,
  timeClassName,
  dateClassName,
}: {
  className?: string;
  timeClassName?: string;
  dateClassName?: string;
}) {
  // Avoid SSR/client time mismatch — render placeholders until mounted.
  const [now, setNow] = useState<{ time: string; day: string } | null>(null);

  useEffect(() => {
    const tick = () => setNow(formatNow(new Date()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className={cn(
        "flex flex-col items-end leading-none tabular-nums",
        className,
      )}
      aria-live="polite"
    >
      <span className={cn("font-semibold tracking-wide", timeClassName)}>
        {now?.time ?? "--:--:--"}
      </span>
      <span className={cn("mt-[0.35em] opacity-90", dateClassName)}>
        {now?.day ?? "--/--/----"}
      </span>
    </div>
  );
}
