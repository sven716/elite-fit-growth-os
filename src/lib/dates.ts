/** Periode-helpers. Alles in Europe/Amsterdam. */

const TZ = "Europe/Amsterdam";

/** Datum van vandaag als YYYY-MM-DD in Nederlandse tijd. */
export function today(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Huidige maand als YYYY-MM. */
export function currentMonthPeriod(): string {
  return today().slice(0, 7);
}

/** Huidig jaar als YYYY. */
export function currentYearPeriod(): string {
  return today().slice(0, 4);
}

/** Aantal hele dagen van vandaag tot de opgegeven datum (negatief = verleden). */
export function daysUntil(date: string): number {
  const start = Date.parse(`${today()}T00:00:00Z`);
  const end = Date.parse(`${date}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000);
}

/** Datum als "19 sep" voor compacte weergave. */
export function formatShortDate(date: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T00:00:00Z`));
}

/** Bedrag als € 1.234 (hele euro's). */
export function formatEuro(value: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}
