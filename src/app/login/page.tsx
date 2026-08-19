"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Inloggen lukte niet. Controleer je e-mail en wachtwoord.");
      setBusy(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <p className="text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">
            Elite Fit
          </p>
          <p className="text-3xl leading-tight font-black text-light">
            Growth <span className="ef-accent">OS</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="ef-card space-y-4 p-6">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-xs font-bold tracking-wide text-light/60 uppercase"
            >
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-light/12 bg-light/5 px-3 py-2.5 text-light outline-none focus:border-terra/60"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-xs font-bold tracking-wide text-light/60 uppercase"
            >
              Wachtwoord
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-light/12 bg-light/5 px-3 py-2.5 text-light outline-none focus:border-terra/60"
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-terra">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg border-2 border-terra px-4 py-2.5 font-black text-terra transition-colors hover:bg-terra/10 disabled:opacity-50"
            style={{ boxShadow: "0 0 34px rgba(176,102,98,.25)" }}
          >
            {busy ? "Bezig..." : "Inloggen"}
          </button>
        </form>
      </div>
    </div>
  );
}
