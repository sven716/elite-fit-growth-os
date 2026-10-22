import Link from "next/link";
import { SectionHeading } from "@/components/SectionHeading";
import { getTasksGrouped } from "@/lib/queries";
import { getFinanceDashboardData } from "@/lib/platform-queries";

function euro(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function Card({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={accent ? "ef-card-accent p-4" : "ef-card p-4"}>
      <p className="text-[10px] font-bold tracking-[0.16em] text-light/40 uppercase">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-black ${accent ? "text-terra-light" : "text-light"}`}>
        {value}
      </p>
    </div>
  );
}

export default async function AdministratiePage() {
  const [finance, tasks] = await Promise.all([
    getFinanceDashboardData(),
    getTasksGrouped(),
  ]);
  const allOpen = [
    ...tasks.overdue,
    ...tasks.vandaag,
    ...tasks.komendeWeek,
    ...tasks.later,
    ...tasks.zonderDatum,
  ];
  const adminTasks = allOpen.filter((task) => task.area === "administratie");
  const month = finance.month;

  return (
    <div className="space-y-7">
      <div>
        <SectionHeading eyebrow="Moneybird + sturing" accent="ADMINISTRATIE">
          Eén
        </SectionHeading>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-light/45">
          Moneybird blijft de boekhouding. Growth OS toont alleen de actuele stand,
          afwijkingen en acties die Sven moet uitvoeren.
        </p>
      </div>

      {finance.errors.length > 0 ? (
        <div className="rounded-2xl border border-terra/30 bg-terra/10 p-4 text-sm text-light/65">
          {finance.errors[0]}
        </div>
      ) : null}

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">
            Deze maand
          </h2>
          <Link href="/financien" className="text-xs font-bold text-terra">
            Volledig overzicht
          </Link>
        </div>
        {month ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card label="Gefactureerd" value={euro(month.revenue_invoiced)} />
            <Card label="Ontvangen" value={euro(month.revenue_paid)} />
            <Card label="Kosten" value={euro(month.expenses)} />
            <Card
              label="Te laat"
              value={euro(month.overdue)}
              accent={month.overdue_count > 0}
            />
          </div>
        ) : (
          <div className="ef-card p-5 text-sm text-light/45">
            Nog geen financiële momentopname beschikbaar.
          </div>
        )}
      </section>

      <section className="ef-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-black text-light">Administratieve acties</h2>
            <p className="mt-1 text-sm text-light/40">
              Facturen, leveranciers, aangiften en financiële opvolging
            </p>
          </div>
          <span className="rounded-full bg-light/5 px-3 py-1.5 text-sm font-black text-light">
            {adminTasks.length}
          </span>
        </div>
        <Link
          href="/taken"
          className="mt-4 inline-block text-xs font-bold text-terra"
        >
          Acties bekijken
        </Link>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link href="/doelen" className="ef-card p-5 transition-colors hover:border-terra/25">
          <p className="font-black text-light">Doelen en rapportage</p>
          <p className="mt-1 text-sm text-light/40">
            Jaar- en maanddoelen, los van dagelijkse uitvoering
          </p>
        </Link>
        <Link href="/kosten" className="ef-card p-5 transition-colors hover:border-terra/25">
          <p className="font-black text-light">Bronnen controleren</p>
          <p className="mt-1 text-sm text-light/40">
            Bestaande kosten- en factuurbronnen controleren, niet dubbel boeken
          </p>
        </Link>
      </section>

      <p className="text-xs leading-relaxed text-light/35">
        Factuurdetails en boekingen worden niet opnieuw in Growth OS bijgehouden.
        Correcties doe je in Moneybird; Growth OS maakt alleen het vervolgwerk zichtbaar.
      </p>
    </div>
  );
}
