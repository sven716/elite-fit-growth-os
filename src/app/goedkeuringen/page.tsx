import { SectionHeading } from "@/components/SectionHeading";
import {
  approveContentAsset,
  requestContentAssetChanges,
  stopContentAsset,
} from "@/lib/actions";
import {
  APPROVAL_STATUSES,
  getContentApprovals,
  type ApprovalStatus,
  type ContentApproval,
} from "@/lib/queries";

const STATUS_LABELS: Record<ApprovalStatus, string> = {
  wacht_op_goedkeuring: "Wacht op goedkeuring",
  goedgekeurd: "Goedgekeurd",
  aanpassen: "Aanpassen",
  gestopt: "Gestopt",
  geblokkeerd: "Geblokkeerd",
};

const STATUS_STYLES: Record<ApprovalStatus, string> = {
  wacht_op_goedkeuring: "border-terra/50 bg-terra/10 text-terra-light",
  goedgekeurd: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  aanpassen: "border-amber-300/30 bg-amber-300/10 text-amber-200",
  gestopt: "border-light/10 bg-light/5 text-light/40",
  geblokkeerd: "border-rose-300/30 bg-rose-300/10 text-rose-200",
};

function formatMoment(value: string | null) {
  if (!value) return "Nog niet gepland";
  return new Intl.DateTimeFormat("nl-NL", {
    timeZone: "Europe/Amsterdam",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getPreviewUrl(asset: ContentApproval) {
  if (asset.external_url) return asset.external_url;
  if (asset.preview_path?.startsWith("https://") || asset.preview_path?.startsWith("http://")) {
    return asset.preview_path;
  }
  return null;
}

function ApprovalCard({ asset }: { asset: ContentApproval }) {
  const previewUrl = getPreviewUrl(asset);

  return (
    <article className="ef-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${STATUS_STYLES[asset.status]}`}
            >
              {STATUS_LABELS[asset.status]}
            </span>
            <span className="text-[10px] font-bold tracking-wide text-light/35 uppercase">
              {asset.asset_type}
            </span>
            {asset.channel ? (
              <span className="text-[10px] font-bold tracking-wide text-light/35 uppercase">
                · {asset.channel}
              </span>
            ) : null}
          </div>
          <h2 className="mt-2 text-base font-black text-light">{asset.title}</h2>
        </div>
        {previewUrl ? (
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-lg border border-terra/40 px-3 py-1.5 text-xs font-bold text-terra transition-colors hover:bg-terra/10"
          >
            Voorbeeld ↗
          </a>
        ) : (
          <span className="shrink-0 text-xs text-light/30">Geen voorbeeld</span>
        )}
      </div>

      <dl className="mt-3 grid gap-2 border-t border-light/8 pt-3 text-xs sm:grid-cols-2">
        <div>
          <dt className="font-bold tracking-wide text-light/30 uppercase">Datum</dt>
          <dd className="mt-0.5 text-light/65">{formatMoment(asset.scheduled_for)}</dd>
        </div>
        <div>
          <dt className="font-bold tracking-wide text-light/30 uppercase">Bron</dt>
          <dd className="mt-0.5 break-all text-light/65">
            {asset.source_ref ?? "Niet opgegeven"}
          </dd>
        </div>
      </dl>

      {asset.blockers.length > 0 ? (
        <div className="mt-3 rounded-lg border border-rose-300/20 bg-rose-300/[0.06] px-3 py-2">
          <p className="text-[10px] font-bold tracking-wide text-rose-200/70 uppercase">
            Blokkades
          </p>
          <ul className="mt-1 space-y-1 text-xs text-rose-100/80">
            {asset.blockers.map((blocker) => (
              <li key={blocker}>• {blocker}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {asset.decision_reason ? (
        <p className="mt-3 text-xs leading-relaxed text-light/50">
          <span className="font-bold text-light/65">Besluit:</span>{" "}
          {asset.decision_reason}
        </p>
      ) : null}

      <form className="mt-4 grid gap-2 border-t border-light/8 pt-3 sm:grid-cols-[1fr_auto_auto_auto]">
        <input type="hidden" name="id" value={asset.id} />
        <input
          name="decision_reason"
          defaultValue={asset.decision_reason ?? ""}
          placeholder="Reden of aanpassing (optioneel)"
          aria-label={`Reden voor besluit over ${asset.title}`}
          className="min-w-0 rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-xs text-light outline-none placeholder:text-light/30 focus:border-terra/60"
        />
        <button
          formAction={approveContentAsset}
          className="rounded-lg border border-emerald-400/35 px-3 py-2 text-xs font-bold text-emerald-300 transition-colors hover:bg-emerald-400/10"
        >
          Goedkeuren
        </button>
        <button
          formAction={requestContentAssetChanges}
          className="rounded-lg border border-amber-300/35 px-3 py-2 text-xs font-bold text-amber-200 transition-colors hover:bg-amber-300/10"
        >
          Aanpassen
        </button>
        <button
          formAction={stopContentAsset}
          className="rounded-lg border border-light/15 px-3 py-2 text-xs font-bold text-light/55 transition-colors hover:border-rose-300/35 hover:text-rose-200"
        >
          Stoppen
        </button>
      </form>
    </article>
  );
}

export default async function GoedkeuringenPage() {
  const { approvals, counts } = await getContentApprovals();
  const actionable = approvals.filter((asset) =>
    ["wacht_op_goedkeuring", "aanpassen", "geblokkeerd"].includes(asset.status),
  );

  return (
    <div className="space-y-7">
      <div>
        <SectionHeading eyebrow="Content" accent="LIJST">
          Goedkeurings
        </SectionHeading>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-light/55">
          Eén plek om content te beoordelen. Goedkeuren registreert alleen je besluit
          in Growth OS en publiceert niets.
        </p>
      </div>

      <section aria-label="Aantallen per status" className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {APPROVAL_STATUSES.map((status) => (
          <div key={status} className="rounded-xl border border-light/8 bg-light/[0.03] px-3 py-3">
            <p className="text-2xl font-black text-light">{counts[status]}</p>
            <p className="mt-0.5 text-[10px] font-bold tracking-wide text-light/35 uppercase">
              {STATUS_LABELS[status]}
            </p>
          </div>
        ))}
      </section>

      {actionable.length > 0 ? (
        <section aria-label="Content om te beoordelen" className="space-y-3">
          {actionable.map((asset) => (
            <ApprovalCard key={asset.id} asset={asset} />
          ))}
        </section>
      ) : (
        <section className="ef-card p-6 text-center">
          <p className="font-bold text-light">Nog geen content in de goedkeuringslijst.</p>
          <p className="mt-1 text-sm text-light/45">
            Nieuwe items verschijnen hier zodra ze aan content_assets zijn toegevoegd.
          </p>
        </section>
      )}
    </div>
  );
}
