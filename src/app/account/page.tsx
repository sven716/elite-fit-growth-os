"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SectionHeading } from "@/components/SectionHeading";
import { createClient } from "@/lib/supabase/client";

export default function AccountPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (password.length < 10) {
      setError("Kies een wachtwoord van minstens 10 tekens.");
      return;
    }
    if (password !== repeat) {
      setError("De twee wachtwoorden zijn niet gelijk.");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (error) {
      setError("Wijzigen lukte niet. Probeer het opnieuw.");
      return;
    }

    setPassword("");
    setRepeat("");
    setMessage("Je wachtwoord is gewijzigd.");
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <SectionHeading eyebrow="Account" accent="ACCOUNT">
        Je
      </SectionHeading>

      <form onSubmit={handleSubmit} className="ef-card space-y-4 p-6">
        <h2 className="text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">
          Wachtwoord wijzigen
        </h2>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-xs font-bold tracking-wide text-light/60 uppercase"
          >
            Nieuw wachtwoord
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-light/12 bg-light/5 px-3 py-2.5 text-light outline-none focus:border-terra/60"
          />
        </div>

        <div>
          <label
            htmlFor="repeat"
            className="mb-1.5 block text-xs font-bold tracking-wide text-light/60 uppercase"
          >
            Herhaal
          </label>
          <input
            id="repeat"
            type="password"
            autoComplete="new-password"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            className="w-full rounded-lg border border-light/12 bg-light/5 px-3 py-2.5 text-light outline-none focus:border-terra/60"
          />
        </div>

        {error ? (
          <p role="alert" className="text-sm text-terra">
            {error}
          </p>
        ) : null}
        {message ? (
          <p role="status" className="text-sm text-light/80">
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg border-2 border-terra px-4 py-2.5 font-black text-terra transition-colors hover:bg-terra/10 disabled:opacity-50"
        >
          {busy ? "Bezig..." : "Wachtwoord wijzigen"}
        </button>
      </form>

      <button
        type="button"
        onClick={handleLogout}
        className="rounded-lg border border-light/15 px-4 py-2 text-sm font-bold text-light/60 transition-colors hover:border-terra/50 hover:text-terra"
      >
        Uitloggen
      </button>
    </div>
  );
}
