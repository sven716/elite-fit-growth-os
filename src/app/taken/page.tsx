import { SectionHeading } from "@/components/SectionHeading";
import { CheckRow } from "@/components/CheckRow";
import { DeleteButton } from "@/components/DeleteButton";
import { getTasksGrouped, type Task } from "@/lib/queries";
import {
  createTask,
  toggleTask,
  deleteTask,
  setTaskPriority,
} from "@/lib/actions";
import {
  WORK_AREAS,
  WORK_AREA_LABELS,
  type WorkArea,
} from "@/lib/work-areas";
import { formatShortDate } from "@/lib/dates";

function TaskRow({
  task,
  projectName,
}: {
  task: Task;
  projectName: Map<string, string>;
}) {
  const project = task.project_id ? projectName.get(task.project_id) : undefined;
  const meta = [
    task.due_date ? formatShortDate(task.due_date) : null,
    task.category === "opvolgen" ? "opvolgen" : null,
    project,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="group flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <CheckRow
          title={task.title}
          done={false}
          meta={meta || undefined}
          onToggle={async (done) => {
            "use server";
            await toggleTask(task.id, done);
          }}
        />
      </div>
      <form
        action={async () => {
          "use server";
          await setTaskPriority(
            task.id,
            task.priority === "hoog" ? "normaal" : "hoog",
          );
        }}
      >
        <button
          type="submit"
          aria-label={
            task.priority === "hoog"
              ? "Prioriteit verwijderen"
              : "Als prioriteit markeren"
          }
          className={`rounded-md border px-2 py-1 text-[10px] font-bold uppercase transition-colors ${
            task.priority === "hoog"
              ? "border-terra/50 bg-terra/10 text-terra"
              : "border-light/10 text-light/30 hover:border-terra/30 hover:text-terra"
          }`}
        >
          Prio
        </button>
      </form>
      <DeleteButton
        label="×"
        onDelete={async () => {
          "use server";
          await deleteTask(task.id);
        }}
      />
    </div>
  );
}

function TaskGroup({
  title,
  tasks,
  projectName,
  empty,
  accent = false,
}: {
  title: string;
  tasks: Task[];
  projectName: Map<string, string>;
  empty: string;
  accent?: boolean;
}) {
  return (
    <section className={`ef-card p-5 ${accent && tasks.length > 0 ? "border-terra/25" : ""}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2
          className={`text-[11px] font-bold tracking-[0.18em] uppercase ${
            accent && tasks.length > 0 ? "text-terra" : "text-light/40"
          }`}
        >
          {title}
        </h2>
        {tasks.length > 0 ? (
          <span className="text-xs font-bold text-light/35">{tasks.length}</span>
        ) : null}
      </div>

      {tasks.length > 0 ? (
        <div className="space-y-4">
          {WORK_AREAS.map((area) => {
            const areaTasks = tasks.filter((task) => task.area === area);
            if (areaTasks.length === 0) return null;
            return (
              <div key={area}>
                <p className="mb-1 px-2 text-[10px] font-bold tracking-[0.16em] text-light/30 uppercase">
                  {WORK_AREA_LABELS[area]}
                </p>
                {areaTasks.map((task) => (
                  <TaskRow key={task.id} task={task} projectName={projectName} />
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="px-2 py-1 text-sm text-light/45">{empty}</p>
      )}
    </section>
  );
}

export default async function TakenPage() {
  const {
    overdue,
    vandaag,
    komendeWeek,
    later,
    zonderDatum,
    klaar,
    projects,
    projectName,
  } = await getTasksGrouped();

  return (
    <div className="space-y-6">
      <div>
        <SectionHeading eyebrow="Eén actielijst" accent="TAKEN">
          Alle
        </SectionHeading>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-light/45">
          Iedere uitvoerbare actie staat hier één keer, met één primair werkgebied.
          Vandaag toont automatisch alles wat nu aandacht vraagt.
        </p>
      </div>

      <TaskGroup
        title="Te laat"
        tasks={overdue}
        projectName={projectName}
        empty="Geen achterstallige taken."
        accent
      />
      <TaskGroup
        title="Vandaag"
        tasks={vandaag}
        projectName={projectName}
        empty="Niets meer voor vandaag."
      />
      <TaskGroup
        title="Komende 7 dagen"
        tasks={komendeWeek}
        projectName={projectName}
        empty="Niets gepland voor de komende week."
      />
      <TaskGroup
        title="Later"
        tasks={later}
        projectName={projectName}
        empty="Geen latere taken."
      />
      <TaskGroup
        title="Zonder datum"
        tasks={zonderDatum}
        projectName={projectName}
        empty="Alle taken hebben een datum."
      />

      <section className="ef-card p-5">
        <h2 className="mb-3 text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">
          Taak toevoegen
        </h2>
        <form action={createTask} className="grid gap-2 sm:grid-cols-2">
          <input
            name="title"
            required
            placeholder="Wat moet er gebeuren?"
            className="rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60 sm:col-span-2"
          />
          <select
            name="area"
            defaultValue={"centraal" satisfies WorkArea}
            className="rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60"
          >
            {WORK_AREAS.map((area) => (
              <option key={area} value={area}>
                {WORK_AREA_LABELS[area]}
              </option>
            ))}
          </select>
          <select
            name="project_id"
            className="rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60"
          >
            <option value="">Geen project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <select
            name="category"
            className="rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60"
          >
            <option value="todo">Te doen</option>
            <option value="opvolgen">Op te volgen</option>
          </select>
          <select
            name="priority"
            className="rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60"
          >
            <option value="normaal">Normale prioriteit</option>
            <option value="hoog">Hoge prioriteit</option>
          </select>
          <input
            name="due_date"
            type="date"
            className="rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60"
          />
          <button
            type="submit"
            className="rounded-lg border border-terra/50 px-4 py-2 text-sm font-bold text-terra transition-colors hover:bg-terra/10"
          >
            Toevoegen
          </button>
        </form>
      </section>

      {klaar.length > 0 ? (
        <details className="ef-card p-5">
          <summary className="cursor-pointer text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">
            Recent afgerond ({klaar.length})
          </summary>
          <div className="mt-2">
            {klaar.map((task) => (
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
    </div>
  );
}
