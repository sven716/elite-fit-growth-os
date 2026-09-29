import { SectionHeading } from "@/components/SectionHeading";
import { getFinanceDashboardData } from "@/lib/platform-queries";

function euro(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function Card({ label, value, hint, accent = false }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className={accent ? "ef-card-accent p-4" : "ef-card p-4"}>
      <p className="text-[10px] font-bold tracking-[0.16em] text-light/40 uppercase">{label}</p>
      <p className={`mt-2 text-3xl font-black ${accent ? "text-terra-light" : "text-light"}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-light/40">{hint}</p> : null}
    </div>
  );
}

function formatSync(value: string | null | undefined) {
  if (!value) return "Nog niet gesynchroniseerd";
  return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export default async function FinancienPage() {
  const data = await getFinanceDashboardData();
  const month = data.month;
  const year = data.year;

  return (
    <div className="space-y-8">
      <div>
        <SectionHeading eyebrow="Moneybird" accent="live">Financiën</SectionHeading>
        <p className="mt-2 text-sm text-light/45">Laatste synchronisatie: {formatSync(month?.last_synced_at ?? year?.last_synced_at)}</p>
      </div>

      {data.errors.length > 0 ? (
        <div className="rounded-2xl border border-terra/30 bg-terra/10 p-4 text-sm text-light/65">{data.errors[0]}</div>
      ) : null}

      <section>
        <h2 className="mb-3 text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">Deze maand</h2>
        {month ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card label="Gefactureerd" value={euro(month.revenue_invoiced)} />
            <Card label="Ontvangen" value={euro(month.revenue_paid)} />
            <Card label="Kosten" value={euro(month.expenses)} />
            <Card label="Marge" value={euro(month.margin)} hint={month.margin_percentage === null ? undefined : `${Math.round(month.margin_percentage)}%`} accent />
            <Card label="Openstaand" value={euro(month.outstanding)} />
            <Card label="Te laat" value={euro(month.overdue)} hint={`${month.overdue_count} facturen`} accent={month.overdue_count > 0} />
            <Card label="Verkoopfacturen" value={String(month.sales_invoice_count)} />
            <Card label="Inkoopfacturen" value={String(month.purchase_invoice_count)} />
          </div>
        ) : (
          <div className="ef-card p-5 text-sm text-light/45">Nog geen financiële momentopname geladen.</div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">Dit jaar</h2>
        {year ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card label="Gefactureerd" value={euro(year.revenue_invoiced)} />
            <Card label="Ontvangen" value={euro(year.revenue_paid)} />
            <Card label="Kosten" value={euro(year.expenses)} />
            <Card label="Marge" value={euro(year.margin)} hint={year.margin_percentage === null ? undefined : `${Math.round(year.margin_percentage)}%`} accent />
          </div>
        ) : (
          <div className="ef-card p-5 text-sm text-light/45">Nog geen jaaroverzicht geladen.</div>
        )}
      </section>

      <p className="text-xs leading-relaxed text-light/35">
        Moneybird blijft de financiële bron. Growth OS toont alleen geaggregeerde sturing en geen klant- of factuurdetails.
      </p>
    </div>
  );
}
