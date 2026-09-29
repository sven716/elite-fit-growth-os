import { SectionHeading } from "@/components/SectionHeading";
import { formatMetric, isSyncStale } from "@/lib/growth-dashboard";
import { getOperationsDashboardData } from "@/lib/platform-queries";

const LABELS: Record<string, string> = {
  instagram: "Instagram",
  ghl: "GHL",
  moneybird: "Moneybird",
  google_analytics: "Google Analytics",
  google_calendar: "Google Agenda",
  fathom: "Fathom",
};

function Card({ label, value, hint }: { label: string; value: number | null; hint?: string }) {
  return (
    <div className="ef-card p-4">
      <p className="text-[10px] font-bold tracking-[0.16em] text-light/40 uppercase">{label}</p>
      <p className="mt-2 text-3xl font-black text-light">{formatMetric(value)}</p>
      {hint ? <p className="mt-1 text-xs text-light/40">{hint}</p> : null}
    </div>
  );
}

function formatDateTime(value: string | null) {
  if (!value) return "nooit";
  return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export default async function OperationsPage() {
  const data = await getOperationsDashboardData();
  const snapshot = data.snapshot;

  return (
    <div className="space-y-8">
      <SectionHeading eyebrow="Systemen + capaciteit" accent="live">Operations</SectionHeading>

      {data.errors.length > 0 ? <div className="rounded-2xl border border-terra/30 bg-terra/10 p-4 text-sm text-light/65">{data.errors[0]}</div> : null}

      <section>
        <h2 className="mb-3 text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">Koppelingen</h2>
        <div className="space-y-2">
          {data.statuses.length > 0 ? data.statuses.map((status) => {
            const stale = isSyncStale(status.last_completed_at);
            const healthy = status.status === "ok" && !stale;
            return (
              <div key={status.id} className="ef-card flex items-center justify-between gap-4 px-4 py-3">
                <div>
                  <p className="font-bold text-light">{LABELS[status.source] ?? status.source}</p>
                  <p className="text-xs text-light/40">{status.message ?? `${status.record_count ?? 0} records`}</p>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-bold ${healthy ? "text-emerald-300" : "text-terra-light"}`}>{healthy ? "Actueel" : stale ? "Verouderd" : "Aandacht"}</p>
                  <p className="mt-1 text-[10px] text-light/35">{formatDateTime(status.last_completed_at)}</p>
                </div>
              </div>
            );
          }) : <div className="ef-card p-5 text-sm text-light/45">Nog geen synchronisatiestatus geladen.</div>}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">Werkvoorraad</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card label="Open taken" value={data.taskDebt.open} />
          <Card label="Te laat" value={data.taskDebt.overdue} />
          <Card label="Zonder deadline" value={data.taskDebt.withoutDate} />
          <Card label="Actieve klanten" value={data.clients.active} hint={`${data.clients.startedThisMonth} gestart deze maand`} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">Agenda en capaciteit</h2>
        {snapshot ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card label="Zakelijke afspraken" value={snapshot.business_meetings} />
            <Card label="Strategiegesprekken" value={snapshot.strategy_calls} />
            <Card label="Coachingscalls" value={snapshot.coaching_calls} />
            <Card label="Groepscalls" value={snapshot.group_calls} />
            <Card label="Focusblokken" value={snapshot.focus_blocks} />
            <Card label="Vergadertijd" value={Math.round(snapshot.meeting_minutes / 60)} hint="uur deze maand" />
            <Card label="Komende 7 dagen" value={snapshot.upcoming_7d_events} hint="zakelijke afspraken" />
            <Card label="Fathom-calls" value={snapshot.fathom_meetings} />
          </div>
        ) : <div className="ef-card p-5 text-sm text-light/45">Nog geen capaciteitsmeting geladen.</div>}
      </section>

      <p className="text-xs leading-relaxed text-light/35">Growth OS bewaart alleen geaggregeerde agenda- en callgegevens. Privéafspraken, transcripten en klantdetails blijven in de bronsystemen.</p>
    </div>
  );
}
