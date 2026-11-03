import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectThreadChat } from "@/components/ProjectThreadChat";
import { getProjectThread } from "@/lib/queries";

const BOT_LABELS = {
  default: "Jarvis",
  marketing: "Marketing",
  sales: "Sales",
  coaching: "Coaching",
  operations: "Operations",
} as const;

export default async function ProjectThreadPage({
  params,
}: {
  params: Promise<{ id: string; threadId: string }>;
}) {
  const { id, threadId } = await params;
  const { project, thread, messages } = await getProjectThread(id, threadId);
  if (!project || !thread) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/projecten/${project.id}`}
          className="text-xs font-bold tracking-wide text-light/40 uppercase transition-colors hover:text-terra"
        >
          ← {project.name}
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl leading-tight font-black text-light">
              {thread.title}
            </h1>
            <p className="mt-1 text-sm text-light/45">
              {thread.topic_type.replace("_", " ")} · eigen gesprek en geheugen
            </p>
          </div>
          <span className="rounded-full border border-terra/40 bg-terra/10 px-3 py-1 text-xs font-bold text-terra">
            {BOT_LABELS[thread.bot_profile]}
          </span>
        </div>
      </div>

      <ProjectThreadChat
        projectId={project.id}
        threadId={thread.id}
        botProfile={BOT_LABELS[thread.bot_profile]}
        messages={messages}
      />
    </div>
  );
}
