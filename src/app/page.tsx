import Link from "next/link";
import { SectionHeading } from "@/components/SectionHeading";
import { MetricCard } from "@/components/MetricCard";
import { CheckRow } from "@/components/CheckRow";
import { getCockpitData } from "@/lib/queries";
import { toggleTask, toggleCheckin } from "@/lib/actions";
import { daysUntil, formatShortDate, today } from "@/lib/dates";
import { getIntegrationHealth } from "@/lib/platform-queries";
import { WORK_AREA_HINTS, WORK_AREA_LABELS } from "@/lib/work-areas";

export default async function VandaagPage() {
  const [data, integrations] = await Promise.all([
    getCockpitData(),
    getIntegrationHealth(),
  ]);
  const day = today();
  const totalTasks = data.todayByArea.reduce(
    (sum, group) => sum + group.tasks.length,
    0,
  );

  return (
    <div className="space-y-7">
      <div className="flex items-end justify-between gap-4">
        <SectionHeading eyebrow="Dagoverzicht" accent="VANDAAG">
          Jouw
        </SectionHeading>
        <Link href="/taken" className="pb-1 text-xs font-bold text-terra">
          Alle taken
        </Link>
      </div>

      <section className="ef-card border-terra/25 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold tracking-[0.18em] text-terra uppercase">
              Te doen
            </p>
            <p className="mt-1 text-3xl font-black text-light">{totalTasks}</p>
            <p className="text-sm text-light/45">taken met aandacht vandaag</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl border border-light/8 bg-light/[0.03] px-4 py-3">
              <p className="text-xl font-black text-light">{data.attention.overdue}</p>
              <p className="text-[10px] font-bold tracking-wide text-light/35 uppercase">
                Te laat
              </p>
            </div>
            <div className="rounded-xl border border-light/8 bg-light/[0.03] px-4 py-3">
              <p className="text-xl font-black text-light">
                {data.attention.highPriority}
              </p>
              <p className="text-[10px] font-bold tracking-wide text-light/35 uppercase">
                Hoge prio
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        {data.todayByArea.length > 0 ? (
          data.todayByArea.map((group) => (
            <div key={group.area} className="ef-card overflow-hidden">
              <div className="flex items-start justify-between gap-4 border-b border-light/8 px-5 py-4">
                <div>
                  <h2 className="font-black text-light">
                    {WORK_AREA_LABELS[group.area]}
                  </h2>
                  <p className="text-xs text-light/35">
                    {WORK_AREA_HINTS[group.area]}
                  </p>
                </div>
                <span className="rounded-full bg-light/5 px-2.5 py-1 text-xs font-bold text-light/50">
                  {group.tasks.length}
                </span>
              </div>
              <div className="px-3 py-2">
                {group.tasks.map((task) => {
                  const overdue = task.due_date !== null && task.due_date < day;
                  const meta = [
                    overdue ? "te laat" : null,
                    task.priority === "hoog" ? "hoge prio" : null,
                    task.projectName,
                  ]
                    .filter(Boolean)
                    .join(" · ");

                  return (
                    <CheckRow
                      key={task.id}
                      title={task.title}
                      done={false}
                      meta={meta || undefined}
                      onToggle={async (done) => {
                        "use server";
                        await toggleTask(task.id, done);
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="ef-card p-6 text-center">
            <p className="font-bold text-light">Geen open werk voor vandaag</p>
            <p className="mt-1 text-sm text-light/40">
              Nieuwe acties voeg je één keer toe bij Taken.
            </p>
          </div>
        )}
      </section>

      {data.dailyActions.length > 0 ? (
        <details className="ef-card p-5">
          <summary className="cursor-pointer text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">
            Dagritme ({data.dailyActions.filter((action) => !action.done).length} open)
          </summary>
          <div className="mt-2">
            {data.dailyActions.map((action) => (
              <CheckRow
                key={action.id}
                title={action.title}
                done={action.done}
                meta="routine"
                onToggle={async (done) => {
                  "use server";
                  await toggleCheckin(action.id, done);
                }}
              />
            ))}
          </div>
        </details>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2">
        <MetricCard
          label="Omzet deze maand"
          value={data.revenue.month}
          target={data.revenue.monthGoal?.target ?? null}
          format="euro"
          emptyHint="Geen actuele Moneybird-meting beschikbaar."
        />
        <MetricCard
          label="Nieuwe klanten deze maand"
          value={data.clients.month}
          target={data.clients.monthGoal?.target ?? null}
          format="aantal"
          emptyHint="Nog geen klantstart geregistreerd."
        />
      </section>

      {data.upcomingEvents.length > 0 ? (
        <section>
          <h2 className="mb-3 text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">
            Aankomend
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.upcomingEvents.map((event) => (
              <div key={event.id} className="ef-card flex items-center justify-between p-4">
                <div>
                  <p className="font-bold text-light">{event.name}</p>
                  <p className="text-xs text-light/45">
                    {formatShortDate(event.event_date)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl leading-none font-black text-terra">
                    {daysUntil(event.event_date)}
                  </p>
                  <p className="text-[10px] tracking-wide text-light/40 uppercase">
                    dagen
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="ef-card p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">
            Systeemstatus
          </h2>
          <Link href="/operations" className="text-xs font-bold text-terra">
            Operations
          </Link>
        </div>
        <p className="text-sm text-light/45">
          {integrations.length} koppelingen gecontroleerd. Afwijkingen staan bij Operations.
        </p>
      </section>
    </div>
  );
}
