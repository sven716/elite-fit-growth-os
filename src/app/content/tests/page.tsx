import Link from "next/link";
import { SectionHeading } from "@/components/SectionHeading";
import {
  experimentScoreExplanation,
  metricsForWindow,
  scoreExperimentVariants,
  type MeasurementWindow,
} from "@/lib/content-experiments";
import {
  getContentExperiments,
  type ContentExperiment,
  type ContentExperimentVariant,
} from "@/lib/queries";

function formatNumber(value: number | null, suffix = "") {
  if (value === null) return "—";
  return `${new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1 }).format(value)}${suffix}`;
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function scoreFor(
  variant: ContentExperimentVariant,
  experiment: ContentExperiment,
  window: MeasurementWindow,
) {
  const stored = window === "24h" ? variant.score_24h : variant.score_72h;
  if (stored !== null) return stored;

  const scored = scoreExperimentVariants(
    experiment.variants.map((item) =>
      metricsForWindow(item as unknown as Record<string, unknown>, window),
    ),
    experiment.objective,
  );
  return scored.find((item) => item.code === variant.code)?.score ?? null;
}

function VariantMetrics({
  variant,
  experiment,
  window,
}: {
  variant: ContentExperimentVariant;
  experiment: ContentExperiment;
  window: MeasurementWindow;
}) {
  const suffix = window === "24h" ? "24h" : "72h";
  const metric = (name: string) =>
    variant[`${name}_${suffix}` as keyof ContentExperimentVariant] as number | null;

  const avgWatchTimeMs = metric("avg_watch_time_ms");

  return (
    <div className="rounded-xl border border-light/8 bg-black/10 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold tracking-[0.14em] text-light/40 uppercase">
          Na {window === "24h" ? "24 uur" : "72 uur"}
        </p>
        <p className="text-sm font-black text-terra">
          {formatNumber(scoreFor(variant, experiment, window))}
          <span className="ml-1 text-[10px] font-bold text-light/30">/ 100</span>
        </p>
      </div>
      <div className="grid grid-cols-3 gap-x-3 gap-y-3">
        <MiniMetric label="Views" value={metric("views")} />
        <MiniMetric label="Bereik" value={metric("reach")} />
        <MiniMetric label="Skip" value={metric("skip_rate")} suffix="%" />
        <MiniMetric
          label="Kijktijd"
          value={avgWatchTimeMs === null ? null : avgWatchTimeMs / 1000}
          suffix="s"
        />
        <MiniMetric label="Saves" value={metric("saved")} />
        <MiniMetric label="Shares" value={metric("shares")} />
      </div>
    </div>
  );
}

function MiniMetric({ label, value, suffix = "" }: { label: string; value: number | null; suffix?: string }) {
  return (
    <div>
      <p className="text-[9px] tracking-[0.1em] text-light/30 uppercase">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-light/80">{formatNumber(value, suffix)}</p>
    </div>
  );
}

function ExperimentCard({ experiment }: { experiment: ContentExperiment }) {
  const hasMeasurement = experiment.variants.some(
    (variant) => variant.views_24h !== null || variant.views_72h !== null,
  );

  return (
    <article className="ef-card overflow-hidden">
      <div className="border-b border-light/8 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold tracking-[0.16em] text-terra uppercase">
              {experiment.batch_id}
            </p>
            <h2 className="mt-1 text-lg font-black text-light">{experiment.title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-light/45">{experiment.topic}</p>
          </div>
          <span className="rounded-full bg-light/5 px-3 py-1.5 text-[10px] font-bold tracking-wide text-light/50 uppercase">
            {statusLabel(experiment.status)}
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-bold uppercase">
          <span className="rounded-full bg-terra/12 px-2.5 py-1 text-terra">
            Doel: {experiment.objective}
          </span>
          <span className="rounded-full bg-light/5 px-2.5 py-1 text-light/45">
            {experiment.format}
          </span>
          <span className="rounded-full bg-light/5 px-2.5 py-1 text-light/45">
            Bewijs: {statusLabel(experiment.evidence_strength)}
          </span>
        </div>
      </div>

      <div className="space-y-3 p-5">
        {experiment.variants
          .slice()
          .sort((a, b) => a.code.localeCompare(b.code))
          .map((variant) => (
            <details key={variant.id} className="rounded-2xl border border-light/8 bg-light/[0.02]" open>
              <summary className="cursor-pointer list-none p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-terra/15 text-sm font-black text-terra">
                    {variant.code}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold leading-snug text-light">{variant.hook}</p>
                    <p className="mt-1 text-xs leading-relaxed text-light/40">
                      {variant.change_description ?? "Geen montageverschil vastgelegd."}
                    </p>
                  </div>
                  {variant.is_winner || experiment.winner_variant_code === variant.code ? (
                    <span className="shrink-0 rounded-full bg-terra/15 px-2 py-1 text-[9px] font-black text-terra uppercase">
                      Winnaar
                    </span>
                  ) : null}
                </div>
              </summary>
              <div className="grid gap-3 border-t border-light/8 p-4 sm:grid-cols-2">
                <VariantMetrics variant={variant} experiment={experiment} window="24h" />
                <VariantMetrics variant={variant} experiment={experiment} window="72h" />
              </div>
              <div className="grid grid-cols-2 gap-3 border-t border-light/8 px-4 py-3 sm:grid-cols-4">
                <MiniMetric label="Gesprekken" value={variant.conversations} />
                <MiniMetric label="Passende leads" value={variant.qualified_leads} />
                <div>
                  <p className="text-[9px] tracking-[0.1em] text-light/30 uppercase">Status</p>
                  <p className="mt-0.5 text-sm font-bold text-light/80">{statusLabel(variant.status)}</p>
                </div>
                <div>
                  <p className="text-[9px] tracking-[0.1em] text-light/30 uppercase">Mediakoppeling</p>
                  <p className="mt-0.5 text-sm font-bold text-light/80">
                    {variant.external_media_id ? "gekoppeld" : "nog niet"}
                  </p>
                </div>
              </div>
            </details>
          ))}
      </div>

      <div className="border-t border-light/8 bg-black/10 p-5">
        <h3 className="text-[10px] font-bold tracking-[0.16em] text-light/40 uppercase">
          Conclusie en vervolg
        </h3>
        {hasMeasurement || experiment.conclusion_observation ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Conclusion label="Feitelijke observatie" value={experiment.conclusion_observation} />
            <Conclusion label="Interpretatie" value={experiment.interpretation} />
            <Conclusion label="Regel voor volgende content" value={experiment.next_rule} />
            <Conclusion label="Volgende hypothese" value={experiment.next_hypothesis} />
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-light/8 p-4">
            <p className="text-sm font-bold text-light/75">Test staat klaar voor publicatiebesluit</p>
            <p className="mt-1 text-xs leading-relaxed text-light/40">
              Na publicatie worden de metingen na 24 en 72 uur ingevuld. Pas daarna ontstaat een winnaar en een leerregel.
            </p>
          </div>
        )}
        <p className="mt-4 text-[10px] leading-relaxed text-light/30">
          Interne score: {experimentScoreExplanation(experiment.objective)}. Alleen beschikbare metingen worden binnen deze test onderling gerangschikt.
        </p>
      </div>
    </article>
  );
}

function Conclusion({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-xl border border-light/8 p-3">
      <p className="text-[9px] font-bold tracking-[0.12em] text-light/30 uppercase">{label}</p>
      <p className="mt-1 text-sm leading-relaxed text-light/65">{value ?? "Nog niet vastgesteld."}</p>
    </div>
  );
}

export default async function ContentTestsPage() {
  const data = await getContentExperiments();

  return (
    <div className="space-y-8">
      <div>
        <SectionHeading eyebrow="Meten, besluiten, herhalen" accent="TESTS">
          Content
        </SectionHeading>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-light/45">
          Per post zie je welke varianten zijn getest, wat de cijfers zeggen en welke regel de volgende content scherper maakt.
        </p>
        <Link href="/content" className="mt-3 inline-block text-xs font-bold text-terra">
          Terug naar content
        </Link>
      </div>

      {data.errors.length > 0 ? (
        <section className="rounded-2xl border border-terra/30 bg-terra/10 p-4">
          <p className="font-bold text-light">Testdata vraagt aandacht</p>
          <p className="mt-1 text-sm text-light/60">{data.errors[0]}</p>
        </section>
      ) : null}

      <section>
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">
              Lopende en afgeronde tests
            </h2>
            <p className="mt-1 text-xs text-light/35">{data.experiments.length} testbatches</p>
          </div>
        </div>
        {data.experiments.length > 0 ? (
          <div className="space-y-5">
            {data.experiments.map((experiment) => (
              <ExperimentCard key={experiment.id} experiment={experiment} />
            ))}
          </div>
        ) : (
          <div className="ef-card p-5 text-sm text-light/45">Nog geen split-tests vastgelegd.</div>
        )}
      </section>

      <section>
        <div className="mb-3">
          <h2 className="text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">
            Wat we meenemen naar volgende content
          </h2>
          <p className="mt-1 text-xs text-light/35">
            Eén test is een signaal. Herhaling maakt er pas een patroon van.
          </p>
        </div>
        {data.learnings.length > 0 ? (
          <div className="space-y-3">
            {data.learnings.map((learning) => (
              <article key={learning.id} className="ef-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-terra/12 px-2.5 py-1 text-[9px] font-black text-terra uppercase">
                    {learning.category}
                  </span>
                  <span className="text-[10px] font-bold text-light/35 uppercase">
                    {learning.status} · {learning.evidence_count} tests
                  </span>
                </div>
                <p className="mt-3 font-bold leading-relaxed text-light">{learning.rule}</p>
                {learning.next_hypothesis ? (
                  <p className="mt-2 text-sm leading-relaxed text-light/45">
                    Volgende test: {learning.next_hypothesis}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="ef-card p-5 text-sm leading-relaxed text-light/45">
            Nog geen leerregel vastgesteld. Na de eerste 72-uursmeting wordt hier het eerste signaal toegevoegd.
          </div>
        )}
      </section>
    </div>
  );
}
