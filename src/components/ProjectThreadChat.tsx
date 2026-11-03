"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createProjectMessage } from "@/lib/actions";
import type { ProjectMessage } from "@/lib/queries";

export function ProjectThreadChat({
  projectId,
  threadId,
  botProfile,
  messages,
}: {
  projectId: string;
  threadId: string;
  botProfile: string;
  messages: ProjectMessage[];
}) {
  const router = useRouter();
  const waiting = messages.some(
    (message) => message.role === "user" && ["pending", "processing"].includes(message.status),
  );

  useEffect(() => {
    if (!waiting) return;
    const timer = window.setInterval(() => router.refresh(), 4000);
    return () => window.clearInterval(timer);
  }, [router, waiting]);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {messages.length > 0 ? (
          messages.map((message) => {
            const mine = message.role === "user";
            return (
              <div
                key={message.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <article
                  className={`max-w-[88%] rounded-2xl px-4 py-3 ${
                    mine
                      ? "rounded-br-sm bg-terra text-white"
                      : "rounded-bl-sm border border-light/8 bg-light/[0.04] text-light"
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.content}
                  </p>
                  <div
                    className={`mt-2 text-[10px] ${
                      mine ? "text-white/65" : "text-light/35"
                    }`}
                  >
                    {mine ? "Sven" : botProfile}
                    {message.status === "pending" ? " · wacht" : ""}
                    {message.status === "processing" ? " · bezig" : ""}
                    {message.status === "failed" ? " · mislukt" : ""}
                  </div>
                  {message.error ? (
                    <p className="mt-1 text-xs text-red-200">{message.error}</p>
                  ) : null}
                </article>
              </div>
            );
          })
        ) : (
          <div className="rounded-xl border border-dashed border-light/10 p-5 text-center text-sm text-light/40">
            Begin het gesprek hieronder.
          </div>
        )}
      </div>

      <form action={createProjectMessage} className="ef-card p-4">
        <input type="hidden" name="project_id" value={projectId} />
        <input type="hidden" name="thread_id" value={threadId} />
        <textarea
          name="content"
          required
          rows={4}
          placeholder={`Bericht aan ${botProfile}`}
          className="w-full resize-y rounded-lg border border-light/12 bg-light/5 px-3 py-3 text-sm text-light outline-none placeholder:text-light/30 focus:border-terra/60"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-light/35">
            Dit gesprek houdt zijn eigen projectgeheugen bij.
          </p>
          <button
            type="submit"
            className="rounded-lg bg-terra px-4 py-2 text-sm font-black text-white"
          >
            Versturen
          </button>
        </div>
      </form>
    </div>
  );
}
