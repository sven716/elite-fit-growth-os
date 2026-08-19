"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Alle schermen — zichtbaar in de zijbalk op desktop. */
const ALL_NAV = [
  { href: "/", label: "Cockpit" },
  { href: "/doelen", label: "Doelen" },
  { href: "/planning", label: "Planning" },
  { href: "/taken", label: "Taken" },
  { href: "/klanten", label: "Klanten" },
  { href: "/winnaarsformule", label: "Formule" },
  { href: "/kosten", label: "Kosten" },
  { href: "/account", label: "Account" },
] as const;

/** Vijf hoofdknoppen voor de onderbalk op mobiel. */
const PRIMARY_NAV = [
  { href: "/", label: "Cockpit" },
  { href: "/doelen", label: "Doelen" },
  { href: "/planning", label: "Planning" },
  { href: "/taken", label: "Taken" },
  { href: "/meer", label: "Meer" },
] as const;

/** Schermen die onder "Meer" vallen — bepaalt of die knop actief oogt. */
const UNDER_MORE = [
  "/meer",
  "/klanten",
  "/winnaarsformule",
  "/kosten",
  "/account",
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/meer") return UNDER_MORE.some((p) => pathname.startsWith(p));
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const chromeless = pathname.startsWith("/login");

  return (
    <>
      <div className="ef-glows" aria-hidden />
      <div className="ef-grain" aria-hidden />
      <div className="ef-vignette" aria-hidden />

      {chromeless ? (
        <main className="relative z-10 flex min-h-dvh flex-col px-5 py-10">
          <div className="mx-auto w-full max-w-3xl">{children}</div>
        </main>
      ) : (
        <div className="relative z-10 flex min-h-dvh flex-col lg:flex-row">
          {/* Zijbalk (desktop) */}
          <aside className="hidden w-56 shrink-0 flex-col border-r border-light/8 px-5 py-8 lg:flex">
            <div className="mb-10">
              <p className="text-[11px] font-bold tracking-[0.18em] text-light/40 uppercase">
                Elite Fit
              </p>
              <p className="text-xl leading-tight font-black text-light">
                Growth <span className="ef-accent">OS</span>
              </p>
            </div>
            <nav className="flex flex-col gap-1">
              {ALL_NAV.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
                      active
                        ? "bg-terra/12 text-terra"
                        : "text-light/55 hover:bg-light/5 hover:text-light"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Inhoud */}
          <main className="flex-1 px-5 pt-8 pb-28 sm:px-8 lg:px-12 lg:pb-12">
            <div className="mx-auto w-full max-w-3xl">{children}</div>
          </main>

          {/* Onderbalk (mobiel) */}
          <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-light/10 bg-bg/95 backdrop-blur lg:hidden">
            <div className="flex items-stretch justify-around">
              {PRIMARY_NAV.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex flex-1 flex-col items-center gap-1 px-1 py-3 text-[11px] font-bold transition-colors ${
                      active ? "text-terra" : "text-light/50"
                    }`}
                  >
                    <span
                      className={`h-1 w-1 rounded-full ${
                        active ? "bg-terra" : "bg-transparent"
                      }`}
                      style={
                        active
                          ? { boxShadow: "0 0 10px rgba(176,102,98,.9)" }
                          : undefined
                      }
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
