import { shiftDays } from "@/lib/streak";

/** Toont de laatste 7 dagen als stippen: gevuld = afgevinkt. */
export function StreakDots({
  dates,
  today,
  streak,
}: {
  dates: string[];
  today: string;
  streak: number;
}) {
  const set = new Set(dates);
  const days = Array.from({ length: 7 }, (_, i) => shiftDays(today, i - 6));

  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1.5">
        {days.map((d) => {
          const done = set.has(d);
          return (
            <span
              key={d}
              title={d}
              className={`h-2 w-2 rounded-full ${
                done ? "bg-terra" : "bg-light/15"
              }`}
              style={
                done ? { boxShadow: "0 0 8px rgba(176,102,98,.7)" } : undefined
              }
            />
          );
        })}
      </div>
      <span className="text-xs font-bold text-light/50">
        {streak > 0 ? `${streak} dagen op rij` : "nog geen reeks"}
      </span>
    </div>
  );
}
