import Link from "next/link";
import { SectionHeading } from "@/components/SectionHeading";
import { getProjects, type Project } from "@/lib/queries";
import { createProject, ensureContentProject } from "@/lib/actions";
import { daysUntil, formatShortDate } from "@/lib/dates";

function ProjectRow({ project }: { project: Project }) {
  const days = project.event_date ? daysUntil(project.event_date) : null;

  return (
    <Link
      href={`/planning/${project.id}`}
      className="ef-card flex items-center justify-between gap-4 p-4 transition-colors hover:border-terra/30"
    >
      <div className="min-w-0">
        <p className="truncate font-bold text-light">{project.name}</p>
        {project.description ? (
          <p className="truncate text-xs text-light/45">
            {project.description}
          </p>
        ) : null}
      </div>

      {days !== null && project.event_date ? (
        <div className="shrink-0 text-right">
          <p className="text-xl leading-none font-black text-terra">{days}</p>
          <p className="text-[10px] tracking-wide text-light/40 uppercase">
            {formatShortDate(project.event_date)}
          </p>
        </div>
      ) : (
        <span className="shrink-0 text-light/25">›</span>
      )}
    </Link>
  );
}

export default async function PlanningPage() {
  const { doorlopend, events } = await getProjects();
  const hasContentProject = [...doorlopend, ...events].some(
    (project) => project.name.trim().toLowerCase() === "content",
  );

  return (
    <div className="space-y-8">
      <SectionHeading eyebrow="Planning" accent="PROJECTEN">
        Jouw
      </SectionHeading>

      {!hasContentProject ? (
        <section className="ef-card p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">
                Content-categorie
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-light/60">
                Maak eerst het doorlopende project Content aan. Daaronder vallen
                straks goedgekeurde reels, carrousels, storysets, afbeeldingen en
                captions.
              </p>
            </div>
            <form action={ensureContentProject}>
              <button
                type="submit"
                className="rounded-lg border border-terra/50 px-4 py-2 text-sm font-bold text-terra transition-colors hover:bg-terra/10"
              >
                Content aanmaken
              </button>
            </form>
          </div>
        </section>
      ) : null}

      {events.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">
            Events
          </h2>
          {events.map((p) => (
            <ProjectRow key={p.id} project={p} />
          ))}
        </section>
      ) : null}

      {doorlopend.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">
            Doorlopend
          </h2>
          {doorlopend.map((p) => (
            <ProjectRow key={p.id} project={p} />
          ))}
        </section>
      ) : null}

      <section className="ef-card p-5">
        <h2 className="mb-3 text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">
          Nieuw project
        </h2>
        <form action={createProject} className="grid gap-3 sm:grid-cols-2">
          <input
            name="name"
            required
            placeholder="Naam van het project"
            className="rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60 sm:col-span-2"
          />
          <select
            name="kind"
            className="rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60"
          >
            <option value="doorlopend">Doorlopend</option>
            <option value="event">Event met datum</option>
          </select>
          <input
            name="event_date"
            type="date"
            className="rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60"
          />
          <input
            name="description"
            placeholder="Korte omschrijving"
            className="rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60 sm:col-span-2"
          />
          <button
            type="submit"
            className="rounded-lg border border-terra/50 px-4 py-2 text-sm font-bold text-terra transition-colors hover:bg-terra/10 sm:col-span-2"
          >
            Project toevoegen
          </button>
        </form>
      </section>
    </div>
  );
}
