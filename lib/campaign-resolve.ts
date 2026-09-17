/** Local calendar date + weekday in a player timezone (for exception matching). */
export function getZonedDateInfo(
  timeZone: string,
  now = new Date(),
): { dateStr: string; dayOfWeek: number } {
  const safeTz = timeZone || "UTC";
  let dateStr: string;
  try {
    dateStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: safeTz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  } catch {
    dateStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  }

  let weekday: string;
  try {
    weekday = new Intl.DateTimeFormat("en-US", {
      timeZone: safeTz,
      weekday: "short",
    }).format(now);
  } catch {
    weekday = new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      weekday: "short",
    }).format(now);
  }

  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return { dateStr, dayOfWeek: map[weekday] ?? 0 };
}

export type ExceptionRule = {
  id: string;
  enabled: boolean;
  start_date: string | null;
  end_date: string | null;
  days_of_week: number[] | null;
  override_loop_id: string;
  name: string;
};

/** First matching enabled exception for the local date, or null ("No Exception"). */
export function findActiveException(
  exceptions: ExceptionRule[],
  dateStr: string,
  dayOfWeek: number,
): ExceptionRule | null {
  for (const ex of exceptions) {
    if (!ex.enabled) continue;

    if (ex.start_date && dateStr < ex.start_date) continue;
    if (ex.end_date && dateStr > ex.end_date) continue;

    const days = ex.days_of_week;
    if (days && days.length > 0 && !days.includes(dayOfWeek)) continue;

    return ex;
  }
  return null;
}
