import { formatEuro } from "@/lib/dates";

type MetricCardProps = {
  label: string;
  value: number | null;
  target: number | null;
  /** 'euro' toont bedragen, 'aantal' toont hele getallen */
  format: "euro" | "aantal";
  /** Toelichting als er nog geen data is */
  emptyHint?: string;
};

/** Kaart met één kerncijfer en de voortgang richting het doel. */
export function MetricCard({
  label,
  value,
  target,
  format,
  emptyHint,
}: MetricCardProps) {
  const display = (n: number) =>
    format === "euro" ? formatEuro(n) : String(Math.round(n));

  const pct =
    value !== null && target && target > 0
      ? Math.min(100, Math.round((value / target) * 100))
      : null;

  return (
    <div className="ef-card p-5">
      <p className="mb-2 text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">
        {label}
      </p>

      {value === null ? (
        <p className="text-sm text-light/50">
          {emptyHint ?? "Nog geen data gesynct."}
        </p>
      ) : (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl leading-none font-black text-light">
              {display(value)}
            </span>
            {target ? (
              <span className="text-sm text-light/40">
                van {display(target)}
              </span>
            ) : null}
          </div>

          {pct !== null ? (
            <div className="mt-4">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-light/8">
                <div
                  className="ef-progress-fill h-full rounded-full"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-light/45">
                {pct}% van je doel
                {pct < 100 && target && value !== null
                  ? ` — nog ${display(target - value)} te gaan`
                  : null}
              </p>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
