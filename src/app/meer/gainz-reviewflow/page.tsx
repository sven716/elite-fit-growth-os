import { SectionHeading } from "@/components/SectionHeading";
import { createClient } from "@/lib/supabase/server";
import { saveGainzReview, deleteGainzReview } from "@/lib/actions";

type SelectOption = {
  value: string;
  label: string;
  meaning: string;
};

type SignalBlock = {
  name: string;
  title: string;
  question: string;
  options: SelectOption[];
};

const SIGNALS: SignalBlock[] = [
  {
    name: "uitvoerbaarheid",
    title: "Uitvoerbaarheid",
    question: "Past het plan echt bij iemands leven?",
    options: [
      { value: "groen", label: "Groen", meaning: "Plan past zichtbaar bij werk, gezin en ritme." },
      { value: "oranje", label: "Oranje", meaning: "Plan schuurt met agenda, energie of praktische haalbaarheid." },
      { value: "rood", label: "Rood", meaning: "Plan past duidelijk niet en moet eerst leefstijl-fit krijgen." },
    ],
  },
  {
    name: "resultaat",
    title: "Resultaat op koers",
    question: "Beweegt de trend logisch richting doel?",
    options: [
      { value: "groen", label: "Groen", meaning: "Trend beweegt duidelijk richting doel of gaat logisch volgen." },
      { value: "oranje", label: "Oranje", meaning: "Gemengd beeld, nog onduidelijk waar de bottleneck zit." },
      { value: "rood", label: "Rood", meaning: "Resultaat blijft uit of beweegt verkeerde kant op." },
    ],
  },
  {
    name: "adherence",
    title: "Adherence",
    question: "Hoe consistent voert iemand de basis echt uit?",
    options: [
      { value: "hoog", label: "Hoog", meaning: "Voeding, training en hoofdafspraken worden grotendeels uitgevoerd." },
      { value: "redelijk", label: "Redelijk", meaning: "Veel gaat goed, maar het patroon is nog niet stabiel." },
      { value: "laag", label: "Laag", meaning: "Basis wordt niet consistent uitgevoerd." },
    ],
  },
  {
    name: "tevredenheid",
    title: "Tevredenheidssignaal",
    question: "Voelt de klant zich gehoord en goed begeleid?",
    options: [
      { value: "groen", label: "Groen", meaning: "Klant voelt zich gehoord en ervaart duidelijkheid en waarde." },
      { value: "oranje", label: "Oranje", meaning: "Twijfel, frictie of afvlakking zichtbaar. Opletten." },
      { value: "rood", label: "Rood", meaning: "Klant lijkt afgehaakt, onzeker of teleurgesteld." },
    ],
  },
  {
    name: "een_op_een",
    title: "1:1-signaal",
    question: "Is schriftelijke coaching genoeg of lost een gesprek meer op?",
    options: [
      { value: "niet relevant", label: "Niet relevant", meaning: "Schriftelijke coaching is nu voldoende." },
      { value: "in de gaten houden", label: "In de gaten houden", meaning: "Nog geen directe noodzaak, wel signalen om op te letten." },
      { value: "voorstellen", label: "Voorstellen", meaning: "Een 1:1 lost waarschijnlijk meer op dan nog een losse feedbackronde." },
      { value: "nodig", label: "Nodig", meaning: "Zonder gesprek blijft de klant waarschijnlijk hangen." },
    ],
  },
  {
    name: "verlenging",
    title: "Verlengsignaal",
    question: "Wanneer is verlengen logisch om te bespreken?",
    options: [
      { value: "niet relevant", label: "Niet relevant", meaning: "Nog te vroeg of basis klopt nog onvoldoende." },
      { value: "later", label: "Later", meaning: "Potentie aanwezig, maar timing nog te vroeg." },
      { value: "binnenkort bespreken", label: "Binnenkort bespreken", meaning: "Eindpunt komt in zicht en er ligt nog progressie open." },
      { value: "nu bespreken", label: "Nu bespreken", meaning: "Logisch en tijdig moment om doorpakken of borgen te bespreken." },
    ],
  },
  {
    name: "referral",
    title: "Referralsignaal",
    question: "Is een referral al natuurlijk en kansrijk?",
    options: [
      { value: "niet relevant", label: "Niet relevant", meaning: "Resultaat, vertrouwen of tevredenheid nog niet sterk genoeg." },
      { value: "later", label: "Later", meaning: "Gaat goede kant op, maar timing is nog te vroeg." },
      { value: "kansrijk bij volgende positieve week", label: "Kansrijk bij volgende positieve week", meaning: "Bijna goed moment, nog iets meer stabiliteit of resultaat nodig." },
      { value: "nu kansrijk", label: "Nu kansrijk", meaning: "Resultaat, vertrouwen en tevredenheid staan sterk genoeg." },
    ],
  },
];

export default async function GainzReviewflowPage() {
  const supabase = await createClient();
  const [{ data: clientsData }, { data: reviewsData }] = await Promise.all([
    supabase.from("clients").select("id, name, status").order("status").order("name"),
    supabase
      .from("gainz_reviews")
      .select(
        "id, week_label, uitvoerbaarheid, resultaat, adherence, tevredenheid, een_op_een, verlenging, referral, hoofdgewoonte, bottleneck, next_step, intern_advies, created_at, clients(name)",
      )
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const clients = clientsData ?? [];
  const reviews = (reviewsData ?? []).map((review) => ({
    id: review.id,
    client_name:
      Array.isArray(review.clients) && review.clients[0]?.name
        ? review.clients[0].name
        : typeof review.clients === "object" && review.clients && "name" in review.clients
          ? String(review.clients.name)
          : "Onbekende klant",
    week_label: review.week_label,
    uitvoerbaarheid: review.uitvoerbaarheid,
    resultaat: review.resultaat,
    adherence: review.adherence,
    tevredenheid: review.tevredenheid,
    een_op_een: review.een_op_een,
    verlenging: review.verlenging,
    referral: review.referral,
    hoofdgewoonte: review.hoofdgewoonte,
    bottleneck: review.bottleneck,
    next_step: review.next_step,
    intern_advies: review.intern_advies,
  }));

  return (
    <div className="space-y-8">
      <SectionHeading eyebrow="Coaching" accent="Reviewflow">
        Gainz
      </SectionHeading>

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
            <select name="client_id" className="rounded-lg border border-light/12 bg-bg px-3 py-2 text-sm text-light outline-none focus:border-terra/60" defaultValue="">
              <option value="">Kies klant</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                  {client.status === "gestopt" ? " · gestopt" : ""}
                </option>
              ))}
            </select>
            <input name="week_label" placeholder="Week of datum" className="rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {SIGNALS.map((signal) => (
              <div key={signal.name} className="rounded-2xl border border-light/8 bg-light/3 p-4">
                <p className="font-bold text-light">{signal.title}</p>
                <p className="mt-1 text-xs text-light/45">{signal.question}</p>
                <select name={signal.name} className="mt-3 w-full rounded-lg border border-light/12 bg-bg px-3 py-2 text-sm text-light outline-none focus:border-terra/60">
                  {signal.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-3 text-sm text-light/70">{signal.options[0]?.meaning}</p>
              </div>
            ))}
          </div>

          <textarea name="hoofdgewoonte" placeholder="Hoofdgewoonte die nu het meeste oplevert" rows={3} className="w-full rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60" />
          <textarea name="bottleneck" placeholder="Grootste bottleneck deze week" rows={3} className="w-full rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60" />
          <textarea name="next_step" placeholder="Volgende concrete stap voor de klant" rows={3} className="w-full rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60" />
          <textarea name="intern_advies" placeholder="Intern advies voor Sven of coaching" rows={3} className="w-full rounded-lg border border-light/12 bg-light/5 px-3 py-2 text-sm text-light outline-none focus:border-terra/60" />
          <button type="submit" className="rounded-lg border-2 border-terra px-4 py-2.5 text-sm font-black text-terra transition-colors hover:bg-terra/10">Klantenreview opslaan</button>
        </form>
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
