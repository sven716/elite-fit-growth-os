/**
 * Aantal aaneengesloten dagen met een check-in, geteld vanaf vandaag terug.
 *
 * Is er vandaag nog niet afgevinkt maar gisteren wel, dan telt de reeks t/m
 * gisteren nog steeds — de dag is immers nog bezig.
 */
export function computeStreak(dates: string[], today: string): number {
  const set = new Set(dates);
  if (set.size === 0) return 0;

  // Start bij vandaag; is vandaag leeg, dan bij gisteren.
  let cursor = today;
  if (!set.has(cursor)) {
    cursor = shiftDays(today, -1);
    if (!set.has(cursor)) return 0;
  }

  let streak = 0;
  while (set.has(cursor)) {
    streak += 1;
    cursor = shiftDays(cursor, -1);
  }
  return streak;
}

/** Datum (YYYY-MM-DD) verschuiven met een aantal dagen. */
export function shiftDays(date: string, delta: number): string {
  const ms = Date.parse(`${date}T00:00:00Z`) + delta * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}
