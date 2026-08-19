import Link from "next/link";
import { SectionHeading } from "@/components/SectionHeading";
import { DeleteButton } from "@/components/DeleteButton";
import { createClient } from "@/lib/supabase/server";
import { addClient, setClientStatus, deleteClient } from "@/lib/actions";
import {
  currentMonthPeriod,
  currentYearPeriod,
  today,
  formatEuro,
  formatShortDate,
} from "@/lib/dates";

export default async function KlantenPage() {
  const supabase = await createClient();
  const month = currentMonthPeriod();
  const year = currentYearPeriod();

  const { data } = await supabase
    .from("clients")
    .select("id, name, start_date, program, deal_value, notes, status")
    .order("start_date", { ascending: false });

  const clients = data ?? [];
  const thisMonth = clients.filter((c) => c.start_date.startsWith(month));
  const thisYear = clients.filter((c) => c.start_date.startsWith(year));
  const active = clients.filter((c) => c.status === "actief");
  const activeValue = active.reduce(
    (sum, c) => sum + Number(c.deal_value ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      <SectionHeading eyebrow="Groei" accent="KLANTEN">
        Je
      </SectionHeading>

      <p className="text-light/70">
        Hier houd jij bij wie er echt is gestart. Dit telt mee als nieuwe klant
        op je Cockpit — niet je facturen.
      </p>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="ef-card p-5">
          <p className="mb-2 text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">
            Deze maand
          </p>
          <p className="text-3xl leading-none font-black text-light">
            {thisMonth.length}
          </p>
        </div>
        <div className="ef-card p-5">
          <p className="mb-2 text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">
            Dit jaar
          </p>
          <p className="text-3xl leading-none font-black text-light">
            {thisYear.length}
          </p>
        </div>
        <div className="ef-card p-5">
          <p className="mb-2 text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">
            Actief
          </p>
          <p className="text-3xl leading-none font-black text-light">
            {active.length}
          </p>
          {activeValue > 0 ? (
            <p className="mt-2 text-xs text-light/45">
              {formatEuro(activeValue)} aan trajecten
            </p>
          ) : null}
        </div>
      </section>

      <section className="ef-card-accent p-5">
        <h2 className="mb-3 text-[11px] font-bold tracking-[0.18em] text-terra uppercase">
          Klantenreviews
        </h2>
        <p className="mb-4 text-sm text-light/75">
          Open hier direct de Gainz-reviewflow voor je laatste klantenreviews,
          met signalen, bottleneck en intern advies per week.
        </p>
        <Link
          href="/meer/gainz-reviewflow"
          className="inline-flex items-center rounded-lg border-2 border-terra px-4 py-2.5 text-sm font-black text-terra transition-colors hover:bg-terra/10"
        >
          Open klantenreviews
        </Link>
      </section>

      <section className="ef-card-accent p-5">
        <h2 className="mb-3 text-[11px] font-bold tracking-[0.18em] text-terra uppercase">
          Nieuwe klant toevoegen
        </h2>
        <form action={addClient} className="grid gap-2 sm:grid-cols-2">
          <input
            name="name"
            required
            placeholder="Naam"
            className="rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60"
          />
          <input
            name="start_date"
            type="date"
            required
            defaultValue={today()}
            className="rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60"
          />
          <select
            name="program"
            className="rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60"
          >
            <option value="Improvement Accelerator">
              Improvement Accelerator
            </option>
            <option value="Traject zonder 1-op-1">
              Traject zonder 1-op-1
            </option>
            <option value="Anders">Anders</option>
          </select>
          <input
            name="deal_value"
            type="number"
            min="0"
            step="1"
            placeholder="Trajectwaarde in euro's"
            className="rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60"
          />
          <input
            name="notes"
            placeholder="Notitie, bv. waar kwam deze klant vandaan?"
            className="rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60 sm:col-span-2"
          />
          <button
            type="submit"
            className="rounded-lg border-2 border-terra px-4 py-2.5 text-sm font-black text-terra transition-colors hover:bg-terra/10 sm:col-span-2"
          >
            Klant toevoegen
          </button>
        </form>
      </section>

      <section className="ef-card p-5">
        <h2 className="mb-3 text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">
          Alle klanten
        </h2>

        {clients.length === 0 ? (
          <p className="text-sm text-light/45">
            Nog geen klanten toegevoegd. Zet ze hierboven erin zodra iemand
            start.
          </p>
        ) : (
          <div className="space-y-2">
            {clients.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 border-b border-light/6 py-3 last:border-0"
              >
                <div className="min-w-0">
                  <p
                    className={`truncate font-bold ${
                      c.status === "gestopt"
                        ? "text-light/40 line-through"
                        : "text-light"
                    }`}
                  >
                    {c.name}
                  </p>
                  <p className="text-xs text-light/45">
                    Gestart {formatShortDate(c.start_date)}
                    {c.program ? ` · ${c.program}` : ""}
                    {c.deal_value
                      ? ` · ${formatEuro(Number(c.deal_value))}`
                      : ""}
                  </p>
                  {c.notes ? (
                    <p className="mt-1 text-sm text-light/60">{c.notes}</p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <form
                    action={async () => {
                      "use server";
                      await setClientStatus(
                        c.id,
                        c.status === "actief" ? "gestopt" : "actief",
                      );
                    }}
                  >
                    <button
                      type="submit"
                      className="text-xs text-light/40 transition-colors hover:text-terra"
                    >
                      {c.status === "actief" ? "Gestopt" : "Heractiveren"}
                    </button>
                  </form>
                  <DeleteButton
                    label="×"
                    onDelete={async () => {
                      "use server";
                      await deleteClient(c.id);
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
