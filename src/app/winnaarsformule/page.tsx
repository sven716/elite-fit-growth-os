import { SectionHeading } from "@/components/SectionHeading";
import { CheckRow } from "@/components/CheckRow";
import { StreakDots } from "@/components/StreakDots";
import { getDailyFormula } from "@/lib/queries";
import { toggleCheckin, addDailyAction } from "@/lib/actions";

export default async function WinnaarsformulePage() {
  const { today, actions } = await getDailyFormula();
  const doneCount = actions.filter((a) => a.done).length;

  return (
    <div className="space-y-6">
      <SectionHeading eyebrow="Dagelijks" accent="WINNAARSFORMULE">
        Je
      </SectionHeading>

      <p className="text-light/70">
        Doe je deze dingen elke dag, dan win je. Vandaag:{" "}
        <span className="font-black text-light">
          {doneCount} van {actions.length}
        </span>
        .
      </p>

      <section className="space-y-3">
        {actions.length === 0 ? (
          <p className="text-sm text-light/45">
            Nog geen acties ingesteld. Voeg er hieronder een toe.
          </p>
        ) : (
          actions.map((action) => (
            <div key={action.id} className="ef-card p-4">
              <CheckRow
                title={action.title}
                done={action.done}
                onToggle={async (done) => {
                  "use server";
                  await toggleCheckin(action.id, done);
                }}
              />
              <div className="mt-2 pl-2">
                <StreakDots
                  dates={action.dates}
                  today={today}
                  streak={action.streak}
                />
              </div>
            </div>
          ))
        )}
      </section>

      <section className="ef-card p-5">
        <h2 className="mb-3 text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">
          Actie toevoegen
        </h2>
        <form action={addDailyAction} className="flex gap-2">
          <input
            name="title"
            required
            placeholder="Wat doe je elke dag?"
            className="flex-1 rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60"
          />
          <button
            type="submit"
            className="shrink-0 rounded-lg border border-terra/50 px-4 py-2 text-sm font-bold text-terra transition-colors hover:bg-terra/10"
          >
            Toevoegen
          </button>
        </form>
      </section>
    </div>
  );
}
