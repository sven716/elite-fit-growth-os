import type { CoachNote } from "@/lib/queries";

/** De dagelijkse coaching-reflectie. Wordt elke ochtend weggeschreven. */
export function CoachCard({ note }: { note: CoachNote | null }) {
  return (
    <div className="ef-card-accent p-6">
      <p className="mb-3 text-[11px] font-bold tracking-[0.18em] text-terra uppercase">
        Je dag-coach
      </p>

      {note ? (
        <div className="space-y-4">
          {note.reflection ? (
            <p className="leading-relaxed text-light/90">{note.reflection}</p>
          ) : null}

          {note.wins ? (
            <div>
              <p className="mb-1 text-xs font-bold tracking-wide text-light/45 uppercase">
                Dit ging goed
              </p>
              <p className="text-sm leading-relaxed text-light/75">
                {note.wins}
              </p>
            </div>
          ) : null}

          {note.misses ? (
            <div>
              <p className="mb-1 text-xs font-bold tracking-wide text-light/45 uppercase">
                Dit bleef liggen
              </p>
              <p className="text-sm leading-relaxed text-light/75">
                {note.misses}
              </p>
            </div>
          ) : null}

          {note.advice ? (
            <div className="border-t border-terra/25 pt-4">
              <p className="mb-1 text-xs font-bold tracking-wide text-terra uppercase">
                Je stap vandaag
              </p>
              <p className="leading-relaxed font-bold text-light">
                {note.advice}
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="leading-relaxed text-light/70">
          Je coach kijkt morgenvroeg mee. Dan staat hier wat er goed ging, wat
          bleef liggen, en de ene stap die je dichter bij meer klanten brengt.
        </p>
      )}
    </div>
  );
}
