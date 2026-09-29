import { SectionHeading } from "@/components/SectionHeading";
import { formatMetric } from "@/lib/growth-dashboard";
import { getSalesDashboardData } from "@/lib/platform-queries";

function Card({ label, value, hint, accent = false }: { label: string; value: number | null; hint?: string; accent?: boolean }) {
  return (
    <div className={accent ? "ef-card-accent p-4" : "ef-card p-4"}>
      <p className="text-[10px] font-bold tracking-[0.16em] text-light/40 uppercase">{label}</p>
      <p className={`mt-2 text-3xl font-black ${accent ? "text-terra-light" : "text-light"}`}>{formatMetric(value)}</p>
      {hint ? <p className="mt-1 text-xs text-light/40">{hint}</p> : null}
    </div>
  );
}

function percentage(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : null;
}

export default async function SalesPage() {
  const result = await getSalesDashboardData();
  const data = result.data;

  return (
    <div className="space-y-8">
      <SectionHeading eyebrow="GHL" accent="funnel">Sales</SectionHeading>

      {result.error ? <div className="rounded-2xl border border-terra/30 bg-terra/10 p-4 text-sm text-light/65">{result.error}</div> : null}

      {data ? (
        <>
          <section>
            <h2 className="mb-3 text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">Huidige meetperiode</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Card label="Contacten" value={data.contacts_total} />
              <Card label="Met e-mail" value={data.contacts_with_email} hint={`${percentage(data.contacts_with_email, data.contacts_total) ?? 0}%`} />
              <Card label="Verkoopkansen" value={data.opportunities_total} />
              <Card label="Open" value={data.open_opportunities} />
              <Card label="Geboekt" value={data.booked_calls} />
              <Card label="Gevoerd" value={data.held_calls} />
              <Card label="Gewonnen" value={data.won_opportunities} />
              <Card label="Klantstarts" value={data.confirmed_customer_starts} accent />
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="ef-card p-5">
              <p className="text-[10px] font-bold tracking-[0.16em] text-light/40 uppercase">Bronkwaliteit</p>
              <p className="mt-3 text-3xl font-black text-light">{percentage(data.attributed_opportunities, data.opportunities_total) ?? 0}%</p>
              <p className="mt-2 text-sm text-light/50">{data.unattributed_opportunities} kansen missen een bruikbare herkomst.</p>
            </div>
            <div className="ef-card p-5">
              <p className="text-[10px] font-bold tracking-[0.16em] text-light/40 uppercase">Gespreksconversie</p>
              <p className="mt-3 text-3xl font-black text-light">{percentage(data.confirmed_customer_starts, data.held_calls) === null ? "—" : `${percentage(data.confirmed_customer_starts, data.held_calls)}%`}</p>
              <p className="mt-2 text-sm text-light/50">Alleen betrouwbaar zodra gehouden gesprekken consequent zijn vastgelegd.</p>
            </div>
          </section>

          {data.unattributed_opportunities > 0 || data.held_calls === 0 ? (
            <section className="rounded-2xl border border-terra/30 bg-terra/10 p-4">
              <p className="font-bold text-light">Datakwaliteit blokkeert volledige funnelsturing</p>
              <p className="mt-1 text-sm leading-relaxed text-light/60">Maak bron, geboekt, gevoerd, no-show, gewonnen en klant gestart verplichte losse stappen in GHL. Tot die tijd toont Growth OS ontbrekende waarden als onbekend.</p>
            </section>
          ) : null}
        </>
      ) : (
        <div className="ef-card p-5 text-sm text-light/45">Nog geen GHL-momentopname geladen.</div>
      )}
    </div>
  );
}
