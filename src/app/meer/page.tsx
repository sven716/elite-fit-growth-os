import Link from "next/link";
import { SectionHeading } from "@/components/SectionHeading";

const LINKS = [
  {
    href: "/klanten",
    label: "Klanten",
    hint: "Nieuwe klanten toevoegen en je klantenbestand",
  },
  {
    href: "/winnaarsformule",
    label: "Winnaarsformule",
    hint: "Je dagelijkse acties en streaks",
  },
  {
    href: "/meer/gainz-legenda",
    label: "Gainz-legenda",
    hint: "Coaching-signalen en vaste betekenis per status",
  },
  {
    href: "/meer/gainz-reviewflow",
    label: "Gainz-reviewflow",
    hint: "Vaste weekreview met signalen, bottleneck en intern advies",
  },
  {
    href: "/kosten",
    label: "Kosten",
    hint: "Uitgaven loggen en bewaken",
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
      <SectionHeading eyebrow="Meer" accent="OS">
        Rest van je
      </SectionHeading>

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
