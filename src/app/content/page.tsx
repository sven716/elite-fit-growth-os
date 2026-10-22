import Link from "next/link";
import { SectionHeading } from "@/components/SectionHeading";
import { getContentApprovals, getContentIdeas } from "@/lib/queries";

const IDEA_LABELS = {
  goedgekeurd: "Ideeënbank",
  uitwerken: "In productie",
  gepland: "Gepland",
  gepubliceerd: "Gepubliceerd",
  afgekeurd: "Archief",
} as const;

export default async function ContentPage() {
  const [ideas, approvals] = await Promise.all([
    getContentIdeas(),
    getContentApprovals(),
  ]);
  const activeIdeas = ideas.filter((idea) =>
    ["goedgekeurd", "uitwerken", "gepland"].includes(idea.status),
  );
  const decisions = approvals.approvals.filter((approval) =>
    ["wacht_op_goedkeuring", "aanpassen", "geblokkeerd"].includes(
      approval.status,
    ),
  );

  return (
    <div className="space-y-7">
      <div>
        <SectionHeading eyebrow="Van idee tot publicatie" accent="CONTENT">
          Eén
        </SectionHeading>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-light/45">
          Ideeën, productie en beslissingen staan hier als één inhoudsstroom. Taken
          die vandaag uitgevoerd moeten worden staan daarnaast automatisch op Vandaag.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {Object.entries(IDEA_LABELS).map(([status, label]) => (
          <div key={status} className="ef-card p-4">
            <p className="text-2xl font-black text-light">
              {ideas.filter((idea) => idea.status === status).length}
            </p>
            <p className="mt-1 text-[10px] font-bold tracking-wide text-light/35 uppercase">
              {label}
            </p>
          </div>
        ))}
      </section>

      <section className="ef-card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-black text-light">Actie nodig</h2>
            <p className="text-xs text-light/40">
              Beslissen, aanpassen of blokkade oplossen
            </p>
          </div>
          <Link href="/goedkeuringen" className="text-xs font-bold text-terra">
            Alles beoordelen
          </Link>
        </div>
        {decisions.length > 0 ? (
          <div className="space-y-2">
            {decisions.slice(0, 6).map((approval) => (
              <Link
                key={approval.id}
                href="/goedkeuringen"
                className="flex items-center justify-between gap-4 rounded-xl border border-light/8 px-4 py-3 transition-colors hover:bg-light/5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-light">
                    {approval.title}
                  </p>
                  <p className="text-xs text-light/35">{approval.asset_type}</p>
                </div>
                <span className="shrink-0 text-[10px] font-bold tracking-wide text-terra uppercase">
                  {approval.status.replaceAll("_", " ")}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-light/45">Geen contentbeslissingen open.</p>
        )}
      </section>

      <section className="ef-card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-black text-light">Inhoudsstroom</h2>
            <p className="text-xs text-light/40">
              Goedgekeurde ideeën, productie en planning
            </p>
          </div>
          <Link href="/ideeen" className="text-xs font-bold text-terra">
            Ideeën beheren
          </Link>
        </div>
        {activeIdeas.length > 0 ? (
          <div className="space-y-2">
            {activeIdeas.slice(0, 8).map((idea) => (
              <Link
                key={idea.id}
                href="/ideeen"
                className="flex items-center justify-between gap-4 rounded-xl border border-light/8 px-4 py-3 transition-colors hover:bg-light/5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-light">{idea.title}</p>
                  <p className="text-xs text-light/35">
                    {idea.topic} · {idea.format}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-light/5 px-2.5 py-1 text-[10px] font-bold text-light/50 uppercase">
                  {IDEA_LABELS[idea.status]}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-light/45">Nog geen actieve contentideeën.</p>
        )}
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/groei" className="ef-card p-5 transition-colors hover:border-terra/25">
          <p className="font-black text-light">Prestaties</p>
          <p className="mt-1 text-sm text-light/40">
            Instagram, bereik en marketingtrechter
          </p>
        </Link>
        <Link href="/taken" className="ef-card p-5 transition-colors hover:border-terra/25">
          <p className="font-black text-light">Contenttaken</p>
          <p className="mt-1 text-sm text-light/40">
            Uitvoerbare acties met werkgebied Content
          </p>
        </Link>
      </div>
    </div>
  );
}
