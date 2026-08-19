"use client";

import { useState, useTransition } from "react";

/**
 * Verwijderknop met bevestiging in twee stappen — voorkomt per ongeluk wissen.
 */
export function DeleteButton({
  onDelete,
  label = "Verwijderen",
}: {
  onDelete: () => Promise<void>;
  label?: string;
}) {
  const [armed, setArmed] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="text-xs text-light/35 transition-colors hover:text-terra"
      >
        {label}
      </button>
    );
  }

  return (
    <span className="flex items-center gap-2 text-xs">
      <span className="text-light/50">Zeker?</span>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => void (await onDelete()))}
        className="font-bold text-terra hover:underline disabled:opacity-50"
      >
        Ja
      </button>
      <button
        type="button"
        onClick={() => setArmed(false)}
        className="text-light/40 hover:text-light"
      >
        Nee
      </button>
    </span>
  );
}
