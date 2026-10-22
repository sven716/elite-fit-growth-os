import Link from "next/link";
import { SectionHeading } from "@/components/SectionHeading";

const LINKS = [
  {
    href: "/coaching",
    label: "Coaching",
    hint: "Klanten, reviews en concrete vervolgacties",
  },
  {
    href: "/operations",
    label: "Operations",
    hint: "Systemen, synchronisaties, capaciteit en interne kwaliteit",
  },
  {
    href: "/administratie",
    label: "Administratie",
    hint: "Moneybird-overzicht, afwijkingen en financiële acties",
  },
  {
    href: "/doelen",
    label: "Doelen en rapportage",
    hint: "Maand- en jaardoelen buiten de dagelijkse actielijst",
  },
  {
    href: "/winnaarsformule",
    label: "Dagritme",
    hint: "Terugkerende persoonlijke routines en streaks",
  },
  {
    href: "/account",
    label: "Account",
    hint: "Wachtwoord wijzigen en uitloggen",
  },
];

export default function MeerPage() {
  return (
    <div className="space-y-6">
      <div>
        <SectionHeading eyebrow="Overige werkgebieden" accent="MEER">
          Alles
        </SectionHeading>
        <p className="mt-2 text-sm text-light/45">
          Detailfuncties staan onder het werkgebied waar ze thuishoren.
        </p>
      </div>

      <div className="space-y-3">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="ef-card flex items-center justify-between gap-4 p-4 transition-colors hover:border-terra/30"
          >
            <div>
              <p className="font-bold text-light">{link.label}</p>
              <p className="text-xs text-light/45">{link.hint}</p>
            </div>
            <span className="shrink-0 text-light/25">›</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
