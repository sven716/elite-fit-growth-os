import { SectionHeading } from "@/components/SectionHeading";
import { DeleteButton } from "@/components/DeleteButton";
import { createClient } from "@/lib/supabase/server";
import { addExpense, deleteExpense } from "@/lib/actions";
import { currentMonthPeriod, formatEuro } from "@/lib/dates";

export default async function KostenPage() {
  const supabase = await createClient();
  const month = currentMonthPeriod();

  const [expensesRes, revenueRes, sourcesRes] = await Promise.all([
    supabase
      .from("expenses")
      .select("id, description, amount, period, recurring")
      .order("period", { ascending: false })
      .order("amount", { ascending: false }),
    supabase
      .from("metrics")
      .select("value")
      .eq("metric", "omzet")
      .eq("period", month)
      .maybeSingle(),
    supabase
      .from("invoice_sources")
      .select(
        "id, supplier, channel, portal_url, expected_monthly, last_received_period",
      )
      .neq("channel", "negeren")
      .order("supplier"),
  ]);

  const expenses = expensesRes.data ?? [];

  // Vaste leveranciers tonen we altijd, incidentele alleen als ze deze maand
  // iets stuurden. Zo blijft de lijst een signaal en geen adressenboek.
  const sources = (sourcesRes.data ?? []).filter(
    (s) => s.expected_monthly || s.last_received_period === month,
  );
  const received = sources.filter((s) => s.last_received_period === month);
  const missing = sources.filter((s) => s.last_received_period !== month);
  const thisMonth = expenses.filter((e) => e.period === month);
  const monthTotal = thisMonth.reduce((sum, e) => sum + Number(e.amount), 0);
  const recurringTotal = expenses
    .filter((e) => e.recurring)
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const revenue = revenueRes.data?.value ?? null;

  return (
    <div className="space-y-6">
      <SectionHeading eyebrow="Kritisch" accent="KOSTEN">
        Je
      </SectionHeading>

      <p className="text-light/70">
        Elke euro die eruit gaat en geen klant oplevert, kost je groei. Log ze
        hier, dan houdt je coach je er scherp op.
      </p>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="ef-card p-5">
          <p className="mb-2 text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">
            Kosten deze maand
          </p>
          <p className="text-3xl leading-none font-black text-light">
            {formatEuro(monthTotal)}
          </p>
          {revenue !== null ? (
            <p className="mt-2 text-xs text-light/45">
              {revenue > 0
                ? `${Math.round((monthTotal / revenue) * 100)}% van je omzet`
                : "nog geen omzet deze maand"}
            </p>
          ) : null}
        </div>

        <div className="ef-card p-5">
          <p className="mb-2 text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">
            Vaste lasten
          </p>
          <p className="text-3xl leading-none font-black text-light">
            {formatEuro(recurringTotal)}
          </p>
          <p className="mt-2 text-xs text-light/45">
            per maand terugkerend
          </p>
        </div>
      </section>

      <section className="ef-card p-5">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">
            Facturen deze maand
          </h2>
          <span className="text-xs text-light/45">
            {received.length} van {sources.length} binnen
          </span>
        </div>

        {sources.length === 0 ? (
          <p className="text-sm text-light/45">
            Nog geen leveranciers bekend. De dagelijkse doorstuurronde vult dit
            vanzelf.
          </p>
        ) : (
          <div className="space-y-2">
            {[...missing, ...received].map((s) => {
              const isIn = s.last_received_period === month;
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 border-b border-light/6 py-2 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-light/90">
                      {s.supplier}
                    </p>
                    <p className="text-xs text-light/40">
                      {s.channel === "portaal"
                        ? "zelf ophalen uit het portaal"
                        : "komt per mail binnen"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {!isIn && s.channel === "portaal" && s.portal_url ? (
                      <a
                        href={s.portal_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-terra underline-offset-2 hover:underline"
                      >
                        Ophalen
                      </a>
                    ) : null}
                    <span
                      className={
                        isIn
                          ? "text-xs font-bold text-light/50"
                          : "text-xs font-bold text-terra"
                      }
                    >
                      {isIn ? "binnen" : "ontbreekt"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="ef-card p-5">
        <h2 className="mb-3 text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">
          Uitgave toevoegen
        </h2>
        <form action={addExpense} className="grid gap-2 sm:grid-cols-2">
          <input
            name="description"
            required
            placeholder="Waar gaat het heen?"
            className="rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60 sm:col-span-2"
          />
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0"
            required
            placeholder="Bedrag"
            className="rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60"
          />
          <input
            name="period"
            required
            defaultValue={month}
            placeholder="Periode, bv. 2026-07"
            className="rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60"
          />
          <label className="flex items-center gap-2 text-sm text-light/70">
            <input
              type="checkbox"
              name="recurring"
              className="h-4 w-4 accent-terra"
            />
            Terugkerend elke maand
          </label>
          <button
            type="submit"
            className="rounded-lg border border-terra/50 px-4 py-2 text-sm font-bold text-terra transition-colors hover:bg-terra/10"
          >
            Toevoegen
          </button>
        </form>
      </section>

      <section className="ef-card p-5">
        <h2 className="mb-3 text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">
          Alle uitgaven
        </h2>

        {expenses.length === 0 ? (
          <p className="text-sm text-light/45">Nog niks gelogd.</p>
        ) : (
          <div className="space-y-2">
            {expenses.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between gap-3 border-b border-light/6 py-2 last:border-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-light/90">
                    {e.description}
                  </p>
                  <p className="text-xs text-light/40">
                    {e.period}
                    {e.recurring ? " · terugkerend" : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-bold text-light">
                    {formatEuro(Number(e.amount))}
                  </span>
                  <DeleteButton
                    label="×"
                    onDelete={async () => {
                      "use server";
                      await deleteExpense(e.id);
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
