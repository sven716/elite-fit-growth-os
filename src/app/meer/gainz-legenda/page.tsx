import { SectionHeading } from "@/components/SectionHeading";

type StatusItem = {
  label: string;
  color: "groen" | "oranje" | "rood" | "neutraal";
  bullets: string[];
};

type LegendSection = {
  title: string;
  intro: string;
  items: StatusItem[];
};

const SECTIONS: LegendSection[] = [
  {
    title: "Uitvoerbaarheid / past plan bij leven",
    intro:
      "Eerst kijken of het plan echt past bij werk, gezin, energie en weekstructuur.",
    items: [
      {
        label: "Groen",
        color: "groen",
        bullets: [
          "plan past zichtbaar bij werk, gezin en ritme",
          "voeding en training zijn meestal uitvoerbaar zonder veel frictie",
          "weinig noodzaak om te versimpelen",
        ],
      },
      {
        label: "Oranje",
        color: "oranje",
        bullets: [
          "plan werkt deels, maar schuurt met agenda, energie of praktische haalbaarheid",
          "adherence wisselt door leefstijlfrictie",
          "versimpelen of strakker plannen kan nodig zijn",
        ],
      },
      {
        label: "Rood",
        color: "rood",
        bullets: [
          "plan past duidelijk niet bij iemands leven",
          "cliënt loopt vast op tijd, energie, stress of weekstructuur",
          "eerst leefstijl-fit herstellen, daarna pas op resultaat sturen",
        ],
      },
    ],
  },
  {
    title: "Resultaat op koers",
    intro:
      "Pas na leefstijl-fit en adherence kijken we of de trend logisch richting doel beweegt.",
    items: [
      {
        label: "Groen",
        color: "groen",
        bullets: [
          "trend beweegt duidelijk richting doel",
          "of: gedrag staat goed en resultaat volgt logisch met iets meer tijd",
        ],
      },
      {
        label: "Oranje",
        color: "oranje",
        bullets: [
          "gemengd beeld met kleine progressie of schommelingen",
          "nog onduidelijk of bottleneck in adherence, herstel of plan zit",
        ],
      },
      {
        label: "Rood",
        color: "rood",
        bullets: [
          "resultaat blijft uit of beweegt verkeerde kant op",
          "niet meer te verklaren als normale ruis of te korte meetperiode",
        ],
      },
    ],
  },
  {
    title: "Adherence",
    intro:
      "Hoe consistent voert iemand voeding, training en hoofdafspraken echt uit.",
    items: [
      {
        label: "Hoog",
        color: "groen",
        bullets: [
          "voeding, training en hoofdafspraken worden grotendeels uitgevoerd",
          "afwijkingen zijn incidenteel",
        ],
      },
      {
        label: "Redelijk",
        color: "oranje",
        bullets: [
          "veel gaat goed, maar duidelijke stukken missen nog",
          "patroon is nog niet stabiel genoeg om agressiever op te schalen",
        ],
      },
      {
        label: "Laag",
        color: "rood",
        bullets: [
          "basis wordt niet consistent uitgevoerd",
          "eerst versimpelen, verduidelijken of bottleneck oplossen",
        ],
      },
    ],
  },
  {
    title: "Tevredenheidssignaal",
    intro:
      "Meet of de cliënt zich gehoord voelt en de begeleiding nog als waardevol ervaart.",
    items: [
      {
        label: "Groen",
        color: "groen",
        bullets: [
          "cliënt voelt zich gehoord",
          "ervaart duidelijkheid en waarde",
          "communiceert betrokken en positief",
        ],
      },
      {
        label: "Oranje",
        color: "oranje",
        bullets: [
          "twijfel, frictie of afvlakking zichtbaar",
          "minder gevoel van richting of grip",
          "nog niet zorgelijk, wel opletten",
        ],
      },
      {
        label: "Rood",
        color: "rood",
        bullets: [
          "cliënt lijkt afgehaakt, onzeker of teleurgesteld",
          "waardeperceptie staat onder druk",
          "directe extra aandacht nodig",
        ],
      },
    ],
  },
  {
    title: "1:1-signaal",
    intro:
      "Geeft aan of schriftelijke coaching genoeg is of dat een gesprek meer oplost.",
    items: [
      {
        label: "Niet relevant",
        color: "neutraal",
        bullets: [
          "schriftelijke coaching is nu voldoende",
          "bottleneck is klein of duidelijk",
        ],
      },
      {
        label: "In de gaten houden",
        color: "oranje",
        bullets: [
          "signalen dat schriftelijke coaching net te smal wordt",
          "nog geen directe noodzaak",
        ],
      },
      {
        label: "Voorstellen",
        color: "oranje",
        bullets: [
          "een 1:1 lost waarschijnlijk meer op dan nog een losse feedbackronde",
          "maatwerk, afstemming of heroriëntatie is nodig",
        ],
      },
      {
        label: "Nodig",
        color: "rood",
        bullets: [
          "zonder gesprek blijft de cliënt waarschijnlijk hangen",
          "plan, doel of leefstijl-fit moet actief herijkt worden",
        ],
      },
    ],
  },
  {
    title: "Verlengsignaal",
    intro:
      "Helpt bepalen wanneer het logisch is om verlengen te bespreken.",
    items: [
      {
        label: "Niet relevant",
        color: "neutraal",
        bullets: [
          "traject zit nog niet in die fase",
          "of de basis klopt nog onvoldoende om hier al naar te kijken",
        ],
      },
      {
        label: "Later",
        color: "oranje",
        bullets: ["potentie aanwezig, maar timing nog te vroeg"],
      },
      {
        label: "Binnenkort bespreken",
        color: "oranje",
        bullets: [
          "eindpunt komt in zicht en er ligt nog progressie open",
          "cliënt haalt duidelijk waarde uit begeleiding",
        ],
      },
      {
        label: "Nu bespreken",
        color: "groen",
        bullets: [
          "logisch en tijdig moment",
          "cliënt heeft baat bij doorpakken of borgen van resultaat",
        ],
      },
    ],
  },
  {
    title: "Referralsignaal",
    intro:
      "Alleen relevant als resultaat, vertrouwen en tevredenheid al sterk staan.",
    items: [
      {
        label: "Niet relevant",
        color: "neutraal",
        bullets: ["resultaat, vertrouwen of tevredenheid nog niet sterk genoeg"],
      },
      {
        label: "Later",
        color: "oranje",
        bullets: ["cliënt beweegt de goede kant op, maar timing is nog te vroeg"],
      },
      {
        label: "Kansrijk bij volgende positieve week",
        color: "oranje",
        bullets: ["bijna goed moment, nog iets meer stabiliteit of resultaat nodig"],
      },
      {
        label: "Nu kansrijk",
        color: "groen",
        bullets: [
          "cliënt ervaart resultaat",
          "is tevreden",
          "heeft vertrouwen",
          "referral voelt natuurlijk, niet geforceerd",
        ],
      },
    ],
  },
];

function toneClasses(color: StatusItem["color"]) {
  switch (color) {
    case "groen":
      return {
        badge: "border border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
        dot: "bg-emerald-300",
      };
    case "oranje":
      return {
        badge: "border border-terra/30 bg-terra/12 text-terra-light",
        dot: "bg-terra",
      };
    case "rood":
      return {
        badge: "border border-rose-400/25 bg-rose-400/10 text-rose-200",
        dot: "bg-rose-300",
      };
    default:
      return {
        badge: "border border-light/10 bg-light/6 text-light/75",
        dot: "bg-light/35",
      };
  }
}

export default function GainzLegendaPage() {
  return (
    <div className="space-y-8">
      <SectionHeading eyebrow="Coaching" accent="Legenda">
        Gainz
      </SectionHeading>

      <div className="ef-card-accent space-y-3 p-5">
        <p className="text-[11px] font-bold tracking-[0.18em] text-terra uppercase">
          Hoofdregel
        </p>
        <ol className="space-y-2 text-sm text-light/80">
          <li>1. past het plan bij iemands leven</li>
          <li>2. kan iemand het volhouden</li>
          <li>3. volgt resultaat</li>
          <li>4. blijft iemand goed begeleid</li>
          <li>5. pas daarna kijk je naar 1:1, verlenging en referral</li>
        </ol>
        <p className="text-xs text-light/55">
          Dit is referentie voor coachingtaal in de OS. Nog niet automatisch
          gekoppeld aan klantdata of check-inflows.
        </p>
      </div>

      {SECTIONS.map((section) => (
        <section key={section.title} className="space-y-3">
          <div>
            <h2 className="text-lg font-black text-light">{section.title}</h2>
            <p className="mt-1 text-sm text-light/55">{section.intro}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {section.items.map((item) => {
              const tone = toneClasses(item.color);
              return (
                <div key={item.label} className="ef-card p-4">
                  <div className="mb-3 flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} />
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold tracking-[0.14em] uppercase ${tone.badge}`}
                    >
                      {item.label}
                    </span>
                  </div>

                  <ul className="space-y-2 text-sm text-light/78">
                    {item.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-2">
                        <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-light/30" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
