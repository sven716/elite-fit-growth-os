import { SectionHeading } from "@/components/SectionHeading";
import { CoachCard } from "@/components/CoachCard";
import { MetricCard } from "@/components/MetricCard";
import { CheckRow } from "@/components/CheckRow";
import { getCockpitData } from "@/lib/queries";
import { toggleTask, toggleCheckin } from "@/lib/actions";
import { daysUntil, formatShortDate } from "@/lib/dates";

export default async function CockpitPage() {
  const data = await getCockpitData();

  return (
    <div className="space-y-8">
      <SectionHeading eyebrow="Cockpit" accent="OS">
        Growth
      </SectionHeading>

      {data.activation ? (
        <p className="text-lg leading-snug font-bold text-light/85">
          {data.activation}
        </p>
      ) : null}

      <CoachCard note={data.coachNote} />

      <section className="grid gap-4 sm:grid-cols-2">
        <MetricCard
          label="Omzet deze maand"
          value={data.revenue.month}
          target={data.revenue.monthGoal?.target ?? null}
          format="euro"
          emptyHint="Wordt live opgehaald zodra de Moneybird-sync draait."
        />
        <MetricCard
          label="Nieuwe klanten deze maand"
          value={data.clients.month}
          target={data.clients.monthGoal?.target ?? null}
          format="aantal"
          emptyHint="Wordt live opgehaald zodra de Moneybird-sync draait."
        />
      </section>

      <section className="ef-card p-5">
        <h2 className="mb-3 text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">
          Vandaag
        </h2>

        {data.dailyActions.length > 0 ? (
          <div className="mb-2">
            {data.dailyActions.map((action) => (
              <CheckRow
                key={action.id}
                title={action.title}
                done={action.done}
                meta="formule"
                onToggle={async (done) => {
                  "use server";
                  await toggleCheckin(action.id, done);
                }}
              />
            ))}
          </div>
        ) : null}

        {data.todayTasks.length > 0 ? (
          <div className="border-t border-light/8 pt-2">
            {data.todayTasks.map((task) => (
              <CheckRow
                key={task.id}
                title={task.title}
                done={false}
                meta={task.source !== "handmatig" ? task.source : undefined}
                onToggle={async (done) => {
                  "use server";
                  await toggleTask(task.id, done);
                }}
              />
            ))}
          </div>
        ) : (
          <p className="px-2 py-2 text-sm text-light/45">
            Geen openstaande taken voor vandaag.
          </p>
        )}
      </section>

      {data.upcomingEvents.length > 0 ? (
        <section>
          <h2 className="mb-3 text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">
            Aankomend
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.upcomingEvents.map((event) => {
              const days = daysUntil(event.event_date);
              return (
                <div
                  key={event.id}
                  className="ef-card flex items-center justify-between p-4"
                >
                  <div>
                    <p className="font-bold text-light">{event.name}</p>
                    <p className="text-xs text-light/45">
                      {formatShortDate(event.event_date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl leading-none font-black text-terra">
                      {days}
                    </p>
                    <p className="text-[10px] tracking-wide text-light/40 uppercase">
                      dagen
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
