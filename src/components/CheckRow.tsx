"use client";

import { useTransition } from "react";

type CheckRowProps = {
  title: string;
  done: boolean;
  /** Kleine aanduiding rechts, bv. bron of project */
  meta?: string;
  onToggle: (done: boolean) => Promise<void>;
};

/** Afvinkbare regel — gebruikt voor taken en dagelijkse acties. */
export function CheckRow({ title, done, meta, onToggle }: CheckRowProps) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(async () => void (await onToggle(!done)))}
      aria-pressed={done}
      className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-light/5 disabled:opacity-50"
    >
      <span
        aria-hidden
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
          done ? "border-terra bg-terra/20" : "border-light/25"
        }`}
        style={done ? { boxShadow: "0 0 14px rgba(176,102,98,.4)" } : undefined}
      >
        {done ? (
          <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
            <path
              d="M2 6.5 4.5 9 10 3"
              stroke="#b06662"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </span>

      <span
        className={`flex-1 text-sm ${
          done ? "text-light/40 line-through" : "text-light/90"
        }`}
      >
        {title}
      </span>

      {meta ? (
        <span className="shrink-0 text-[10px] font-bold tracking-wide text-light/30 uppercase">
          {meta}
        </span>
      ) : null}
    </button>
  );
}
