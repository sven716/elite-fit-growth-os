import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckRow } from "@/components/CheckRow";
import { DeleteButton } from "@/components/DeleteButton";
import { getProject } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import {
  createTask,
  toggleTask,
  deleteTask,
  addContact,
  deleteContact,
  updateProject,
  deleteProject,
  createApprovedContentAsset,
} from "@/lib/actions";
import { daysUntil, formatShortDate } from "@/lib/dates";

type ContentAsset = {
  id: string;
  title: string;
  asset_type: string;
  status: string;
  approved_at: string | null;
  source_path: string | null;
  preview_path: string | null;
  external_url: string | null;
  notes: string | null;
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { project, contacts, tasks, emails } = await getProject(id);

  if (!project) notFound();

  const supabase = await createClient();
  const { data: contentAssets } = await supabase
    .from("content_assets")
    .select(
      "id, title, asset_type, status, approved_at, source_path, preview_path, external_url, notes",
    )
    .eq("project_id", project.id)
    .order("approved_at", { ascending: false });

  const assets = (contentAssets ?? []) as ContentAsset[];
  const days = project.event_date ? daysUntil(project.event_date) : null;
  const openTasks = tasks.filter((t) => t.status === "open");
  const doneTasks = tasks.filter((t) => t.status === "klaar");

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/planning"
          className="text-xs font-bold tracking-wide text-light/40 uppercase transition-colors hover:text-terra"
        >
          ← Planning
        </Link>
        <div className="mt-3 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl leading-tight font-black text-light">
              {project.name}
            </h1>
            {project.description ? (
              <p className="mt-1 text-sm text-light/55">
                {project.description}
              </p>
            ) : null}
          </div>
          {days !== null && project.event_date ? (
            <div className="shrink-0 text-right">
              <p className="text-3xl leading-none font-black text-terra">
                {days}
              </p>
              <p className="text-[10px] tracking-wide text-light/40 uppercase">
                dagen · {formatShortDate(project.event_date)}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Taken */}
      <section className="ef-card p-5">
        <h2 className="mb-3 text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">
          Taken
        </h2>

        {openTasks.length > 0 ? (
          <div className="mb-2">
            {openTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <CheckRow
                    title={task.title}
                    done={false}
                    meta={task.source !== "handmatig" ? task.source : undefined}
                    onToggle={async (done) => {
                      "use server";
                      await toggleTask(task.id, done);
                    }}
                  />
                </div>
                <DeleteButton
                  label="×"
                  onDelete={async () => {
                    "use server";
                    await deleteTask(task.id);
                  }}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="px-2 pb-2 text-sm text-light/45">
            Nog geen openstaande taken.
          </p>
        )}

        <form action={createTask} className="flex gap-2 pt-2">
          <input type="hidden" name="project_id" value={project.id} />
          <input
            name="title"
            placeholder="Taak toevoegen"
            className="flex-1 rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60"
          />
          <button
            type="submit"
            className="shrink-0 rounded-lg border border-light/15 px-3 py-2 text-sm font-bold text-light/70 transition-colors hover:border-terra/50 hover:text-terra"
          >
            +
          </button>
        </form>

        {doneTasks.length > 0 ? (
          <details className="mt-3 border-t border-light/8 pt-3">
            <summary className="cursor-pointer text-xs text-light/40">
              {doneTasks.length} afgerond
            </summary>
            <div className="mt-1">
              {doneTasks.map((task) => (
                <CheckRow
                  key={task.id}
                  title={task.title}
                  done
                  onToggle={async (done) => {
                    "use server";
                    await toggleTask(task.id, done);
                  }}
                />
              ))}
            </div>
          </details>
        ) : null}
      </section>

      {/* Goedgekeurde content / assets */}
      <section className="ef-card p-5">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">
              Goedgekeurde content
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-light/60">
              Sla hier goedgekeurde reels, carrousels, storysets, afbeeldingen,
              captions en lead magnets op. Elke invoer maakt ook automatisch een
              afgeronde taak aan onder dit project.
            </p>
          </div>
        </div>

        {assets.length > 0 ? (
          <div className="mb-5 space-y-3">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="rounded-lg border border-light/8 bg-light/[0.03] p-3"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-bold text-light">{asset.title}</p>
                    <div className="mt-1 flex flex-wrap gap-2 text-[10px] font-bold tracking-wide uppercase">
                      <span className="rounded-full border border-terra/40 px-2 py-0.5 text-terra">
                        {asset.asset_type}
                      </span>
                      <span className="rounded-full border border-light/10 px-2 py-0.5 text-light/45">
                        {asset.status}
                      </span>
                      {asset.approved_at ? (
                        <span className="rounded-full border border-light/10 px-2 py-0.5 text-light/45">
                          {new Date(asset.approved_at).toLocaleDateString("nl-NL")}
                        </span>
                      ) : null}
                    </div>
                    {asset.notes ? (
                      <p className="mt-2 text-sm leading-relaxed text-light/65">
                        {asset.notes}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-col items-start gap-2 text-xs">
                    {asset.source_path ? (
                      <span className="text-light/45">bron: {asset.source_path}</span>
                    ) : null}
                    {asset.preview_path ? (
                      <span className="text-light/45">preview: {asset.preview_path}</span>
                    ) : null}
                    {asset.external_url ? (
                      <a
                        href={asset.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-terra hover:underline"
                      >
                        Externe link openen
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mb-5 text-sm text-light/45">
            Nog geen goedgekeurde content opgeslagen.
          </p>
        )}

        <form action={createApprovedContentAsset} className="grid gap-2 sm:grid-cols-2">
          <input type="hidden" name="project_id" value={project.id} />
          <input
            name="title"
            required
            placeholder="Titel, bv. Carousel eiwit-mythe"
            className="rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60 sm:col-span-2"
          />
          <select
            name="asset_type"
            className="rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60"
          >
            <option value="reel">Reel</option>
            <option value="carousel">Carousel</option>
            <option value="storyset">Storyset</option>
            <option value="afbeelding">Afbeelding</option>
            <option value="caption">Caption</option>
            <option value="lead_magnet">Lead magnet</option>
            <option value="overig">Overig</option>
          </select>
          <input
            name="external_url"
            placeholder="Optionele externe link"
            className="rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60"
          />
          <input
            name="source_path"
            placeholder="Lokaal pad, bv. Elite Fit Content OS/..."
            className="rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60 sm:col-span-2"
          />
          <input
            name="preview_path"
            placeholder="Preview of export-pad"
            className="rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60 sm:col-span-2"
          />
          <input
            name="notes"
            placeholder="Korte notitie, bv. goedgekeurd voor publiceren"
            className="rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60 sm:col-span-2"
          />
          <button
            type="submit"
            className="rounded-lg border border-terra/50 px-4 py-2 text-sm font-bold text-terra transition-colors hover:bg-terra/10 sm:col-span-2"
          >
            Goedgekeurde content opslaan
          </button>
        </form>
      </section>

      {/* Mailverkeer */}
      {emails.length > 0 ? (
        <section className="ef-card p-5">
          <h2 className="mb-3 text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">
            Mailverkeer
          </h2>
          <div className="space-y-3">
            {emails.map((mail) => (
              <a
                key={mail.id}
                href={`https://mail.google.com/mail/u/0/#all/${mail.thread_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg border border-light/8 bg-light/[0.03] p-3 transition-colors hover:border-terra/30"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate font-bold text-light">
                    {mail.subject ?? "(geen onderwerp)"}
                  </p>
                  <div className="flex shrink-0 items-center gap-2">
                    {mail.needs_reply ? (
                      <span className="rounded-full border border-terra/40 px-2 py-0.5 text-[10px] font-bold tracking-wide text-terra uppercase">
                        antwoord open
                      </span>
                    ) : null}
                    {mail.last_date ? (
                      <span className="text-xs text-light/40">
                        {formatShortDate(mail.last_date.slice(0, 10))}
                      </span>
                    ) : null}
                  </div>
                </div>
                {mail.participants ? (
                  <p className="mt-0.5 truncate text-xs text-light/45">
                    {mail.participants}
                    {mail.message_count && mail.message_count > 1
                      ? ` · ${mail.message_count} berichten`
                      : ""}
                  </p>
                ) : null}
                {mail.snippet ? (
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-light/65">
                    {mail.snippet}
                  </p>
                ) : null}
              </a>
            ))}
          </div>
        </section>
      ) : null}

      {/* Contacten */}
      <section className="ef-card p-5">
        <h2 className="mb-3 text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">
          Contacten
        </h2>

        {contacts.length > 0 ? (
          <div className="mb-4 space-y-3">
            {contacts.map((c) => (
              <div
                key={c.id}
                className="rounded-lg border border-light/8 bg-light/[0.03] p-3"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-bold text-light">{c.name}</p>
                  <div className="flex shrink-0 items-center gap-3">
                    {c.role ? (
                      <span className="text-[10px] font-bold tracking-wide text-light/35 uppercase">
                        {c.role}
                      </span>
                    ) : null}
                    <DeleteButton
                      label="×"
                      onDelete={async () => {
                        "use server";
                        await deleteContact(c.id);
                      }}
                    />
                  </div>
                </div>
                {c.company ? (
                  <p className="text-xs text-light/45">{c.company}</p>
                ) : null}
                {c.email ? (
                  <a
                    href={`mailto:${c.email}`}
                    className="text-xs text-terra hover:underline"
                  >
                    {c.email}
                  </a>
                ) : null}
                {c.notes ? (
                  <p className="mt-2 text-sm leading-relaxed text-light/65">
                    {c.notes}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="mb-4 text-sm text-light/45">Nog geen contacten.</p>
        )}

        <form action={addContact} className="grid gap-2 sm:grid-cols-2">
          <input type="hidden" name="project_id" value={project.id} />
          <input
            name="name"
            placeholder="Naam"
            className="rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60"
          />
          <input
            name="company"
            placeholder="Bedrijf"
            className="rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60"
          />
          <input
            name="email"
            type="email"
            placeholder="E-mail"
            className="rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60"
          />
          <input
            name="role"
            placeholder="Rol, bv. leverancier"
            className="rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60"
          />
          <input
            name="notes"
            placeholder="Notitie"
            className="rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60 sm:col-span-2"
          />
          <button
            type="submit"
            className="rounded-lg border border-terra/50 px-4 py-2 text-sm font-bold text-terra transition-colors hover:bg-terra/10 sm:col-span-2"
          >
            Contact toevoegen
          </button>
        </form>
      </section>

      {/* Project aanpassen */}
      <details className="ef-card p-5">
        <summary className="cursor-pointer text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">
          Project aanpassen
        </summary>
        <form action={updateProject} className="mt-3 grid gap-2 sm:grid-cols-2">
          <input type="hidden" name="id" value={project.id} />
          <input
            name="name"
            defaultValue={project.name}
            className="rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60 sm:col-span-2"
          />
          <input
            name="description"
            defaultValue={project.description ?? ""}
            placeholder="Omschrijving"
            className="rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60"
          />
          <input
            name="event_date"
            type="date"
            defaultValue={project.event_date ?? ""}
            className="rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60"
          />
          <button
            type="submit"
            className="rounded-lg border border-terra/50 px-4 py-2 text-sm font-bold text-terra transition-colors hover:bg-terra/10 sm:col-span-2"
          >
            Opslaan
          </button>
        </form>
        <div className="mt-3">
          <DeleteButton
            label="Project verwijderen"
            onDelete={async () => {
              "use server";
              await deleteProject(project.id);
              redirect("/planning");
            }}
          />
        </div>
      </details>
    </div>
  );
}
