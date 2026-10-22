import Link from "next/link";
import { SectionHeading } from "@/components/SectionHeading";
import { getCoachingOverview } from "@/lib/queries";

function Stat({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={accent ? "ef-card-accent p-4" : "ef-card p-4"}>
      <p className={`text-3xl font-black ${accent ? "text-terra-light" : "text-light"}`}>
        {value}
      </p>
      <p className="mt-1 text-[10px] font-bold tracking-wide text-light/35 uppercase">
        {label}
      </p>
    </div>
  );
}

export default async function CoachingPage() {
  const data = await getCoachingOverview();

  return (
    <div className="space-y-7">
      <div>
        <SectionHeading eyebrow="Klanten + opvolging" accent="COACHING">
          Eén
        </SectionHeading>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-light/45">
          Klantdossiers en reviews blijven gescheiden van de algemene actielijst.
          Iedere concrete vervolgactie wordt wel als Coaching-taak zichtbaar op Vandaag.
        </p>
      </div>

      {data.errors.length > 0 ? (
        <div className="rounded-2xl border border-terra/30 bg-terra/10 p-4 text-sm text-light/65">
          {data.errors[0]}
        </div>
      ) : null}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Actieve klanten" value={data.activeClients} />
        <Stat label="Klantdossiers" value={data.totalClients} />
        <Stat label="Reviews" value={data.reviews} />
        <Stat label="Acties vandaag" value={data.dueActions} accent={data.dueActions > 0} />
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link href="/klanten" className="ef-card p-5 transition-colors hover:border-terra/25">
          <p className="font-black text-light">Klanten</p>
          <p className="mt-1 text-sm leading-relaxed text-light/40">
            Klantstatus, coachnotities en koppelingen met het dossier
          </p>
        </Link>
        <Link
          href="/meer/gainz-reviewflow"
          className="ef-card p-5 transition-colors hover:border-terra/25"
        >
          <p className="font-black text-light">Reviews verwerken</p>
          <p className="mt-1 text-sm leading-relaxed text-light/40">
            Gainz-review beoordelen en coachingfeedback voorbereiden
          </p>
        </Link>
        <Link
          href="/meer/gainz-legenda"
          className="ef-card p-5 transition-colors hover:border-terra/25"
        >
          <p className="font-black text-light">Gainz-legenda</p>
          <p className="mt-1 text-sm leading-relaxed text-light/40">
            Uitleg van de scores en signalen uit reviews
          </p>
        </Link>
        <Link href="/taken" className="ef-card p-5 transition-colors hover:border-terra/25">
          <div className="flex items-center justify-between gap-3">
            <p className="font-black text-light">Coachingsacties</p>
            <span className="rounded-full bg-light/5 px-2.5 py-1 text-xs font-bold text-light/50">
              {data.openActions}
            </span>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-light/40">
            Eerstvolgende acties met werkgebied Coaching
          </p>
        </Link>
      </section>

      <p className="text-xs leading-relaxed text-light/35">
        Growth OS toont hier alleen sturing. Gezondheidsgegevens en volledige
        klantinhoud blijven in de daarvoor bedoelde bronsystemen.
      </p>
    </div>
  );
}
