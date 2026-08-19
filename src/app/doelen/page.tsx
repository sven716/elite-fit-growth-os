import { SectionHeading } from "@/components/SectionHeading";
import { CheckRow } from "@/components/CheckRow";
import { DeleteButton } from "@/components/DeleteButton";
import { getGoalsPage } from "@/lib/queries";
import {
  setVision,
  createGoal,
  updateGoal,
  deleteGoal,
  addMilestone,
  toggleMilestone,
  deleteMilestone,
} from "@/lib/actions";
import { formatEuro } from "@/lib/dates";

export default async function DoelenPage() {
  const { vision, goals, milestones } = await getGoalsPage();

  const display = (metric: string, n: number) =>
    metric === "omzet" ? formatEuro(n) : String(Math.round(n));

  return (
    <div className="space-y-8">
      <SectionHeading eyebrow="Richting" accent="DOELEN">
        Visie &
      </SectionHeading>

      {/* Visie */}
      <section className="ef-card-accent p-6">
        <p className="mb-3 text-[11px] font-bold tracking-[0.18em] text-terra uppercase">
          Je noorderster
        </p>
        <form action={setVision} className="space-y-3">
          <textarea
            name="vision"
            defaultValue={vision}
            rows={3}
            placeholder="Waar bouw je naartoe?"
            className="w-full resize-none rounded-lg border border-light/12 bg-light/5 px-3 py-2.5 leading-relaxed text-light outline-none focus:border-terra/60"
          />
          <button
            type="submit"
            className="rounded-lg border border-terra/50 px-4 py-2 text-sm font-bold text-terra transition-colors hover:bg-terra/10"
          >
            Visie opslaan
          </button>
        </form>
      </section>

      {/* Doelen */}
      <section className="space-y-4">
        <h2 className="text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">
          Doelen
        </h2>

        {goals.length === 0 ? (
          <p className="text-sm text-light/45">Nog geen doelen ingesteld.</p>
        ) : (
          goals.map((goal) => {
            const goalMilestones = milestones.filter(
              (m) => m.goal_id === goal.id,
            );
            const pct =
              goal.target > 0
                ? Math.min(100, Math.round((goal.current / goal.target) * 100))
                : 0;

            return (
              <div key={goal.id} className="ef-card p-5">
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <div>
                    <p className="font-black text-light">{goal.title}</p>
                    <p className="text-xs text-light/40">
                      {goal.type === "jaar" ? "Jaardoel" : "Maanddoel"} ·{" "}
                      {goal.period}
                    </p>
                  </div>
                  <p className="shrink-0 text-right text-sm text-light/60">
                    <span className="text-lg font-black text-light">
                      {display(goal.metric, goal.current)}
                    </span>
                    <span className="text-light/40">
                      {" "}
                      / {display(goal.metric, goal.target)}
                    </span>
                  </p>
                </div>

                <div className="h-1.5 w-full overflow-hidden rounded-full bg-light/8">
                  <div
                    className="ef-progress-fill h-full rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* Aanpassen */}
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs text-light/35 hover:text-terra">
                    Aanpassen
                  </summary>
                  <form action={updateGoal} className="mt-2 flex gap-2">
                    <input type="hidden" name="id" value={goal.id} />
                    <input
                      name="title"
                      defaultValue={goal.title}
                      className="flex-1 rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60"
                    />
                    <input
                      name="target"
                      type="number"
                      min="0"
                      defaultValue={goal.target}
                      className="w-28 rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60"
                    />
                    <button
                      type="submit"
                      className="shrink-0 rounded-lg border border-light/15 px-3 py-2 text-sm font-bold text-light/70 transition-colors hover:border-terra/50 hover:text-terra"
                    >
                      Opslaan
                    </button>
                  </form>
                  <div className="mt-2">
                    <DeleteButton
                      label="Doel verwijderen"
                      onDelete={async () => {
                        "use server";
                        await deleteGoal(goal.id);
                      }}
                    />
                  </div>
                </details>

                {/* Milestones */}
                <div className="mt-4 border-t border-light/8 pt-3">
                  {goalMilestones.length > 0 ? (
                    <div className="mb-2">
                      {goalMilestones.map((m) =>
                        m.auto_source ? (
                          <div
                            key={m.id}
                            className="flex items-center gap-3 px-2 py-2.5"
                          >
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${
                                m.done
                                  ? "border-terra bg-terra/20"
                                  : "border-light/25"
                              }`}
                            >
                              {m.done ? (
                                <svg
                                  viewBox="0 0 12 12"
                                  className="h-3 w-3"
                                  fill="none"
                                >
                                  <path
                                    d="M2 6.5 4.5 9 10 3"
                                    stroke="#b06662"
                                    strokeWidth="2.2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              ) : null}
                            </span>
                            <span
                              className={`flex-1 text-sm ${
                                m.done
                                  ? "text-light/40 line-through"
                                  : "text-light/90"
                              }`}
                            >
                              {m.title}
                            </span>
                            <span className="text-[10px] font-bold tracking-wide text-light/30 uppercase">
                              auto
                            </span>
                          </div>
                        ) : (
                          <div key={m.id} className="flex items-center gap-2">
                            <div className="min-w-0 flex-1">
                              <CheckRow
                                title={m.title}
                                done={m.done}
                                onToggle={async (done) => {
                                  "use server";
                                  await toggleMilestone(m.id, done);
                                }}
                              />
                            </div>
                            <DeleteButton
                              label="×"
                              onDelete={async () => {
                                "use server";
                                await deleteMilestone(m.id);
                              }}
                            />
                          </div>
                        ),
                      )}
                    </div>
                  ) : null}

                  <form action={addMilestone} className="flex gap-2">
                    <input type="hidden" name="goal_id" value={goal.id} />
                    <input
                      name="title"
                      placeholder="Milestone toevoegen"
                      className="flex-1 rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60"
                    />
                    <button
                      type="submit"
                      className="shrink-0 rounded-lg border border-light/15 px-3 py-2 text-sm font-bold text-light/70 transition-colors hover:border-terra/50 hover:text-terra"
                    >
                      +
                    </button>
                  </form>
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* Nieuw doel */}
      <section className="ef-card p-5">
        <h2 className="mb-3 text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">
          Nieuw doel
        </h2>
        <form action={createGoal} className="grid gap-3 sm:grid-cols-2">
          <input
            name="title"
            required
            placeholder="Titel, bv. Omzet augustus"
            className="rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60 sm:col-span-2"
          />
          <select
            name="type"
            className="rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60"
          >
            <option value="maand">Maanddoel</option>
            <option value="jaar">Jaardoel</option>
          </select>
          <select
            name="metric"
            className="rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60"
          >
            <option value="omzet">Omzet</option>
            <option value="klanten">Nieuwe klanten</option>
          </select>
          <input
            name="period"
            required
            placeholder="Periode: 2026-08 of 2026"
            className="rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60"
          />
          <input
            name="target"
            type="number"
            min="0"
            required
            placeholder="Streefwaarde"
            className="rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60"
          />
          <button
            type="submit"
            className="rounded-lg border border-terra/50 px-4 py-2 text-sm font-bold text-terra transition-colors hover:bg-terra/10 sm:col-span-2"
          >
            Doel toevoegen
          </button>
        </form>
      </section>
    </div>
  );
}
