"use client";

import { useMemo, useState } from "react";
import { saveGainzReview, deleteGainzReview } from "@/lib/actions";

type ClientOption = {
  id: string;
  name: string;
  status: string;
};

type ReviewRow = {
  id: string;
  client_name: string;
  week_label: string;
  uitvoerbaarheid: string | null;
  resultaat: string | null;
  adherence: string | null;
  tevredenheid: string | null;
  een_op_een: string | null;
  verlenging: string | null;
  referral: string | null;
  hoofdgewoonte: string | null;
  bottleneck: string | null;
  next_step: string | null;
  intern_advies: string | null;
  created_at: string;
};

type SignalKey =
  | "uitvoerbaarheid"
  | "resultaat"
  | "adherence"
  | "tevredenheid"
  | "eenOpEen"
  | "verlenging"
  | "referral";

type Option = {
  value: string;
  label: string;
  meaning: string;
};

type SignalConfig = {
  label: string;
  question: string;
  options: Option[];
};

const SIGNALS: Record<SignalKey, SignalConfig> = {
  uitvoerbaarheid: {
    label: "Uitvoerbaarheid",
    question: "Past het plan echt bij iemands leven?",
    options: [
      { value: "groen", label: "Groen", meaning: "Plan past zichtbaar bij werk, gezin en ritme." },
      { value: "oranje", label: "Oranje", meaning: "Plan schuurt met agenda, energie of praktische haalbaarheid." },
      { value: "rood", label: "Rood", meaning: "Plan past duidelijk niet en moet eerst leefstijl-fit krijgen." },
    ],
  },
  resultaat: {
    label: "Resultaat op koers",
    question: "Beweegt de trend logisch richting doel?",
    options: [
      { value: "groen", label: "Groen", meaning: "Trend beweegt duidelijk richting doel of gaat logisch volgen." },
      { value: "oranje", label: "Oranje", meaning: "Gemengd beeld, nog onduidelijk waar de bottleneck zit." },
      { value: "rood", label: "Rood", meaning: "Resultaat blijft uit of beweegt verkeerde kant op." },
    ],
  },
  adherence: {
    label: "Adherence",
    question: "Hoe consistent voert iemand de basis echt uit?",
    options: [
      { value: "hoog", label: "Hoog", meaning: "Voeding, training en hoofdafspraken worden grotendeels uitgevoerd." },
      { value: "redelijk", label: "Redelijk", meaning: "Veel gaat goed, maar het patroon is nog niet stabiel." },
      { value: "laag", label: "Laag", meaning: "Basis wordt niet consistent uitgevoerd." },
    ],
  },
  tevredenheid: {
    label: "Tevredenheidssignaal",
    question: "Voelt de cliënt zich gehoord en goed begeleid?",
    options: [
      { value: "groen", label: "Groen", meaning: "Cliënt voelt zich gehoord en ervaart duidelijkheid en waarde." },
      { value: "oranje", label: "Oranje", meaning: "Twijfel, frictie of afvlakking zichtbaar. Opletten." },
      { value: "rood", label: "Rood", meaning: "Cliënt lijkt afgehaakt, onzeker of teleurgesteld." },
    ],
  },
  eenOpEen: {
    label: "1:1-signaal",
    question: "Is schriftelijke coaching genoeg of lost een gesprek meer op?",
    options: [
      { value: "niet relevant", label: "Niet relevant", meaning: "Schriftelijke coaching is nu voldoende." },
      { value: "in de gaten houden", label: "In de gaten houden", meaning: "Nog geen directe noodzaak, wel signalen om op te letten." },
      { value: "voorstellen", label: "Voorstellen", meaning: "Een 1:1 lost waarschijnlijk meer op dan nog een losse feedbackronde." },
      { value: "nodig", label: "Nodig", meaning: "Zonder gesprek blijft de cliënt waarschijnlijk hangen." },
    ],
  },
  verlenging: {
    label: "Verlengsignaal",
    question: "Wanneer is verlengen logisch om te bespreken?",
    options: [
      { value: "niet relevant", label: "Niet relevant", meaning: "Nog te vroeg of basis klopt nog onvoldoende." },
      { value: "later", label: "Later", meaning: "Potentie aanwezig, maar timing nog te vroeg." },
      { value: "binnenkort bespreken", label: "Binnenkort bespreken", meaning: "Eindpunt komt in zicht en er ligt nog progressie open." },
      { value: "nu bespreken", label: "Nu bespreken", meaning: "Logisch en tijdig moment om doorpakken of borgen te bespreken." },
    ],
  },
  referral: {
    label: "Referralsignaal",
    question: "Is een referral al natuurlijk en kansrijk?",
    options: [
      { value: "niet relevant", label: "Niet relevant", meaning: "Resultaat, vertrouwen of tevredenheid nog niet sterk genoeg." },
      { value: "later", label: "Later", meaning: "Gaat goede kant op, maar timing is nog te vroeg." },
      { value: "kansrijk bij volgende positieve week", label: "Kansrijk bij volgende positieve week", meaning: "Bijna goed moment, nog iets meer stabiliteit of resultaat nodig." },
      { value: "nu kansrijk", label: "Nu kansrijk", meaning: "Resultaat, vertrouwen en tevredenheid staan sterk genoeg." },
    ],
  },
};

const DEFAULT_VALUES: Record<SignalKey, string> = {
  uitvoerbaarheid: "groen",
  resultaat: "groen",
  adherence: "hoog",
  tevredenheid: "groen",
  eenOpEen: "niet relevant",
  verlenging: "later",
  referral: "later",
};

function recommendation(values: Record<SignalKey, string>) {
  if (values.uitvoerbaarheid === "rood") return "Eerst leefstijl-fit herstellen. Nog niet harder op resultaat sturen.";
  if (values.adherence === "laag") return "Eerst basis versimpelen of bottleneck oplossen. Nog niet opschalen.";
  if (values.tevredenheid === "rood") return "Direct extra aandacht geven. Eerst waardeperceptie en begeleiding herstellen.";
  if (values.eenOpEen === "nodig") return "Plan een 1:1. Schriftelijke feedback alleen gaat dit waarschijnlijk niet lossen.";
  if (values.resultaat === "rood") return "Trend klopt niet. Check adherence, herstel en plan-fit en stel bij.";
  if (values.verlenging === "nu bespreken") return "Goed moment om verlengen nu concreet te bespreken.";
  if (values.referral === "nu kansrijk") return "Goed moment om een referral natuurlijk te vragen.";
  return "Basis oogt werkbaar. Houd richting vast en stuur op de eerstvolgende bottleneck.";
}

function selectedMeaning(key: SignalKey, value: string) {
  return SIGNALS[key].options.find((option) => option.value === value)?.meaning ?? "";
}

export function GainzReviewflowClient({ clients, reviews }: { clients: ClientOption[]; reviews: ReviewRow[] }) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [weekLabel, setWeekLabel] = useState("");
  const [hoofdgewoonte, setHoofdgewoonte] = useState("");
  const [bottleneck, setBottleneck] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [values, setValues] = useState<Record<SignalKey, string>>(DEFAULT_VALUES);

  const advies = useMemo(() => recommendation(values), [values]);
  const selectedClient = clients.find((client) => client.id === clientId);

  const summary = useMemo(() => {
    const lines = [
      `Klant: ${selectedClient?.name || "-"}`,
      `Week: ${weekLabel || "-"}`,
      `Uitvoerbaarheid: ${values.uitvoerbaarheid}`,
      `Resultaat op koers: ${values.resultaat}`,
      `Adherence: ${values.adherence}`,
      `Tevredenheid: ${values.tevredenheid}`,
      `1:1-signaal: ${values.eenOpEen}`,
      `Verlengsignaal: ${values.verlenging}`,
      `Referralsignaal: ${values.referral}`,
      `Hoofdgewoonte: ${hoofdgewoonte || "-"}`,
      `Bottleneck: ${bottleneck || "-"}`,
      `Volgende stap: ${nextStep || "-"}`,
      `Intern advies: ${advies}`,
    ];
    return lines.join("\n");
  }, [advies, bottleneck, hoofdgewoonte, nextStep, selectedClient?.name, values, weekLabel]);

  return (
    <div className="space-y-8">
      <section className="ef-card-accent space-y-3 p-5">
        <p className="text-[11px] font-bold tracking-[0.18em] text-terra uppercase">Werkrichting</p>
        <ol className="space-y-2 text-sm text-light/80">
          <li>1. past het plan bij iemands leven</li>
          <li>2. kan iemand het volhouden</li>
          <li>3. volgt resultaat</li>
          <li>4. blijft iemand goed begeleid</li>
          <li>5. pas daarna kijk je naar 1:1, verlenging en referral</li>
        </ol>
      </section>

      <section className="ef-card space-y-4 p-5">
        <h2 className="text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">Nieuwe klantenreview</h2>
        <form action={saveGainzReview} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <select name="client_id" value={clientId} onChange={(event) => setClientId(event.target.value)} className="rounded-lg border border-light/12 bg-bg px-3 py-2 text-sm text-light outline-none focus:border-terra/60">
              <option value="">Kies klant</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>{client.name}{client.status === "gestopt" ? " · gestopt" : ""}</option>
              ))}
            </select>
            <input name="week_label" value={weekLabel} onChange={(event) => setWeekLabel(event.target.value)} placeholder="Week of datum" className="rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {(Object.entries(SIGNALS) as [SignalKey, SignalConfig][]).map(([key, signal]) => (
              <div key={key} className="rounded-2xl border border-light/8 bg-light/3 p-4">
                <p className="font-bold text-light">{signal.label}</p>
                <p className="mt-1 text-xs text-light/45">{signal.question}</p>
                <select name={key === "eenOpEen" ? "een_op_een" : key} value={values[key]} onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))} className="mt-3 w-full rounded-lg border border-light/12 bg-bg px-3 py-2 text-sm text-light outline-none focus:border-terra/60">
                  {signal.options.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <p className="mt-3 text-sm text-light/70">{selectedMeaning(key, values[key])}</p>
              </div>
            ))}
          </div>

          <textarea name="hoofdgewoonte" value={hoofdgewoonte} onChange={(event) => setHoofdgewoonte(event.target.value)} placeholder="Hoofdgewoonte die nu het meeste oplevert" rows={3} className="w-full rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60" />
          <textarea name="bottleneck" value={bottleneck} onChange={(event) => setBottleneck(event.target.value)} placeholder="Grootste bottleneck deze week" rows={3} className="w-full rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60" />
          <textarea name="next_step" value={nextStep} onChange={(event) => setNextStep(event.target.value)} placeholder="Volgende concrete stap voor de cliënt" rows={3} className="w-full rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60" />
          <input type="hidden" name="intern_advies" value={advies} />
          <button type="submit" className="rounded-lg border-2 border-terra px-4 py-2.5 text-sm font-black text-terra transition-colors hover:bg-terra/10">Klantenreview opslaan</button>
        </form>
      </section>

      <section className="ef-card-accent space-y-3 p-5">
        <p className="text-[11px] font-bold tracking-[0.18em] text-terra uppercase">Intern advies</p>
        <p className="text-base font-bold text-light">{advies}</p>
        <p className="text-xs text-light/55">Dit advies volgt de coachingvolgorde. Eerst plan-fit en adherence, pas daarna opschalen.</p>
      </section>

      <section className="ef-card space-y-3 p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">Samenvatting voor notities</h2>
          <button type="button" onClick={async () => { await navigator.clipboard.writeText(summary); }} className="rounded-lg border border-terra/40 px-3 py-1.5 text-xs font-bold text-terra transition-colors hover:bg-terra/10">Kopieer tekst</button>
        </div>
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-2xl border border-light/8 bg-bg/70 p-4 text-sm text-light/80">{summary}</pre>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">Laatste klantenreviews</h2>
          <p className="mt-1 text-sm text-light/55">Laatste opgeslagen klantenreviews per klant, direct vanuit de OS.</p>
        </div>
        {reviews.length === 0 ? (
          <div className="ef-card p-5 text-sm text-light/55">Nog geen klantenreviews opgeslagen.</div>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <div key={review.id} className="ef-card space-y-3 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold text-light">{review.client_name}</p>
                    <p className="text-xs text-light/45">{review.week_label}</p>
                  </div>
                  <form action={async () => { "use server"; await deleteGainzReview(review.id); }}>
                    <button type="submit" className="text-xs font-bold text-light/35 transition-colors hover:text-terra">Verwijder</button>
                  </form>
                </div>
                <div className="grid gap-2 text-sm text-light/75 md:grid-cols-2">
                  <p><strong>Uitvoerbaarheid:</strong> {review.uitvoerbaarheid ?? "-"}</p>
                  <p><strong>Resultaat:</strong> {review.resultaat ?? "-"}</p>
                  <p><strong>Adherence:</strong> {review.adherence ?? "-"}</p>
                  <p><strong>Tevredenheid:</strong> {review.tevredenheid ?? "-"}</p>
                  <p><strong>1:1:</strong> {review.een_op_een ?? "-"}</p>
                  <p><strong>Verlenging:</strong> {review.verlenging ?? "-"}</p>
                  <p><strong>Referral:</strong> {review.referral ?? "-"}</p>
                </div>
                <div className="space-y-2 text-sm text-light/72">
                  <p><strong>Hoofdgewoonte:</strong> {review.hoofdgewoonte ?? "-"}</p>
                  <p><strong>Bottleneck:</strong> {review.bottleneck ?? "-"}</p>
                  <p><strong>Volgende stap:</strong> {review.next_step ?? "-"}</p>
                  <p><strong>Intern advies:</strong> {review.intern_advies ?? "-"}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
