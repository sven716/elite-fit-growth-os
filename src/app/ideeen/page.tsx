import { SectionHeading } from "@/components/SectionHeading";
import {
  createContentIdea,
  setContentIdeaStatus,
} from "@/lib/actions";
import {
  getContentIdeas,
  type ContentIdea,
  type ContentIdeaStatus,
} from "@/lib/queries";

const FUNNEL_LABELS = {
  tof: "TOF · bereik",
  mof: "MOF · vertrouwen",
  bof: "BOF · gesprek",
} as const;

const STATUS_LABELS: Record<ContentIdeaStatus, string> = {
  goedgekeurd: "In bank",
  uitwerken: "Gekozen",
  gepland: "Gepland",
  gepubliceerd: "Gepubliceerd",
  afgekeurd: "Afgekeurd",
};

type SearchParams = Promise<{
  q?: string;
  topic?: string;
  funnel?: string;
  format?: string;
  status?: string;
}>;

function matches(value: string, filter: string) {
  return !filter || value === filter;
}

function IdeaCard({ idea }: { idea: ContentIdea }) {
  const nextStatus: ContentIdeaStatus =
    idea.status === "uitwerken" ? "goedgekeurd" : "uitwerken";

  return (
    <article className="ef-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2 text-[10px] font-bold tracking-wide uppercase">
            <span className="rounded-full bg-terra/12 px-2.5 py-1 text-terra">
              {FUNNEL_LABELS[idea.funnel_stage]}
            </span>
            <span className="rounded-full bg-light/5 px-2.5 py-1 text-light/50">
              {idea.topic}
            </span>
            <span className="rounded-full bg-light/5 px-2.5 py-1 text-light/50">
              {idea.format}
            </span>
          </div>
          <h2 className="mt-3 text-lg font-black text-light">{idea.title}</h2>
          {idea.hook ? (
            <p className="mt-2 text-sm leading-relaxed text-light/65">“{idea.hook}”</p>
          ) : null}
          {idea.notes ? (
            <p className="mt-2 text-xs leading-relaxed text-light/40">{idea.notes}</p>
          ) : null}
        </div>
        <span className="rounded-full border border-light/10 px-2.5 py-1 text-[10px] font-bold tracking-wide text-light/45 uppercase">
          {STATUS_LABELS[idea.status]}
        </span>
      </div>

      {idea.status === "goedgekeurd" || idea.status === "uitwerken" ? (
        <form action={setContentIdeaStatus} className="mt-4">
          <input type="hidden" name="id" value={idea.id} />
          <input type="hidden" name="status" value={nextStatus} />
          <button
            type="submit"
            className="rounded-lg border border-terra/50 px-3 py-2 text-xs font-bold text-terra transition-colors hover:bg-terra/10"
          >
            {idea.status === "uitwerken" ? "Terug in bank" : "Kies om uit te werken"}
          </button>
        </form>
      ) : null}
    </article>
  );
}

export default async function IdeeenPage({ searchParams }: { searchParams: SearchParams }) {
  const filters = await searchParams;
  const allIdeas = await getContentIdeas();
  const query = (filters.q ?? "").trim().toLocaleLowerCase("nl-NL");
  const topic = filters.topic ?? "";
  const funnel = filters.funnel ?? "";
  const format = filters.format ?? "";
  const status = filters.status ?? "";

  const ideas = allIdeas.filter((idea) => {
    const searchable = `${idea.title} ${idea.hook ?? ""} ${idea.notes ?? ""}`.toLocaleLowerCase("nl-NL");
    return (
      (!query || searchable.includes(query)) &&
      matches(idea.topic, topic) &&
      matches(idea.funnel_stage, funnel) &&
      matches(idea.format, format) &&
      matches(idea.status, status)
    );
  });

  const topics = [...new Set(allIdeas.map((idea) => idea.topic))].sort();
  const formats = [...new Set(allIdeas.map((idea) => idea.format))].sort();

  return (
    <div className="space-y-6">
      <div>
        <SectionHeading eyebrow="Content" accent="BANK">
          Ideeën
        </SectionHeading>
        <p className="mt-2 text-sm leading-relaxed text-light/50">
          Goedgekeurde ideeën uit je briefings. Filter en kies wat je wilt uitwerken of opnemen.
        </p>
      </div>

      <section className="ef-card p-5">
        <form method="get" className="grid gap-2 sm:grid-cols-2">
          <input
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder="Zoek op idee of hook"
            className="rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none placeholder:text-light/30 focus:border-terra/60 sm:col-span-2"
          />
          <select name="topic" defaultValue={topic} className="rounded-lg border border-light/12 bg-bg px-3 py-2 text-sm text-light outline-none focus:border-terra/60">
            <option value="">Alle onderwerpen</option>
            {topics.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select name="funnel" defaultValue={funnel} className="rounded-lg border border-light/12 bg-bg px-3 py-2 text-sm text-light outline-none focus:border-terra/60">
            <option value="">Hele funnel</option>
            <option value="tof">TOF · bereik</option>
            <option value="mof">MOF · vertrouwen</option>
            <option value="bof">BOF · gesprek</option>
          </select>
          <select name="format" defaultValue={format} className="rounded-lg border border-light/12 bg-bg px-3 py-2 text-sm text-light outline-none focus:border-terra/60">
            <option value="">Alle vormen</option>
            {formats.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select name="status" defaultValue={status} className="rounded-lg border border-light/12 bg-bg px-3 py-2 text-sm text-light outline-none focus:border-terra/60">
            <option value="">Alle statussen</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" className="rounded-lg bg-terra px-4 py-2 text-sm font-black text-white">Filteren</button>
            <a href="/ideeen" className="rounded-lg border border-light/12 px-4 py-2 text-sm font-bold text-light/55">Wissen</a>
          </div>
        </form>
      </section>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-light/70">{ideas.length} ideeën</p>
        <p className="text-xs text-light/35">{allIdeas.filter((idea) => idea.status === "uitwerken").length} gekozen</p>
      </div>

      {ideas.length > 0 ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {ideas.map((idea) => <IdeaCard key={idea.id} idea={idea} />)}
        </section>
      ) : (
        <section className="ef-card p-5 text-sm text-light/45">Geen ideeën voor deze filters.</section>
      )}

      <details className="ef-card p-5">
        <summary className="cursor-pointer text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">
          Idee handmatig toevoegen
        </summary>
        <form action={createContentIdea} className="mt-4 grid gap-2 sm:grid-cols-2">
          <input name="title" required placeholder="Titel" className="rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60 sm:col-span-2" />
          <input name="topic" required placeholder="Onderwerp, bijvoorbeeld voeding" className="rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60" />
          <select name="funnel_stage" className="rounded-lg border border-light/12 bg-bg px-3 py-2 text-sm text-light outline-none focus:border-terra/60">
            <option value="tof">TOF · bereik</option>
            <option value="mof">MOF · vertrouwen</option>
            <option value="bof">BOF · gesprek</option>
          </select>
          <input name="format" required placeholder="Vorm, bijvoorbeeld reel" className="rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60" />
          <input name="hook" placeholder="Sterkste hook" className="rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60" />
          <textarea name="notes" placeholder="Korte notitie" rows={3} className="rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60 sm:col-span-2" />
          <button type="submit" className="rounded-lg border border-terra/50 px-4 py-2 text-sm font-bold text-terra transition-colors hover:bg-terra/10 sm:col-span-2">Toevoegen</button>
        </form>
      </details>
    </div>
  );
}
