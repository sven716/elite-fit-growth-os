import { SectionHeading } from "@/components/SectionHeading";
import { CheckRow } from "@/components/CheckRow";
import { DeleteButton } from "@/components/DeleteButton";
import { getTasksGrouped, type Task } from "@/lib/queries";
import { createTask, toggleTask, deleteTask } from "@/lib/actions";

function TaskGroup({
  title,
  tasks,
  projectName,
  empty,
}: {
  title: string;
  tasks: Task[];
  projectName: Map<string, string>;
  empty: string;
}) {
  return (
    <section className="ef-card p-5">
      <h2 className="mb-3 text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">
        {title}
      </h2>

      {tasks.length > 0 ? (
        tasks.map((task) => {
          const project = task.project_id
            ? projectName.get(task.project_id)
            : undefined;
          const meta =
            task.source !== "handmatig" ? task.source : project ?? undefined;

          return (
            <div key={task.id} className="group flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <CheckRow
                  title={task.title}
                  done={false}
                  meta={meta}
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
          );
        })
      ) : (
        <p className="px-2 py-1 text-sm text-light/45">{empty}</p>
      )}
    </section>
  );
}

export default async function TakenPage() {
  const { vandaag, opvolgen, overig, klaar, projects, projectName } =
    await getTasksGrouped();

  return (
    <div className="space-y-6">
      <SectionHeading eyebrow="Executie" accent="OVERZICHT">
        Eén
      </SectionHeading>

      <TaskGroup
        title="Vandaag"
        tasks={vandaag}
        projectName={projectName}
        empty="Niks meer voor vandaag."
      />

      <TaskGroup
        title="Op te volgen"
        tasks={opvolgen}
        projectName={projectName}
        empty="Geen openstaande opvolging."
      />

      <TaskGroup
        title="Later"
        tasks={overig}
        projectName={projectName}
        empty="Niks ingepland."
      />

      {/* Nieuwe taak */}
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
            name="project_id"
            className="rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60"
          >
            <option value="">Geen project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
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
