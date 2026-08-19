type SectionHeadingProps = {
  /** Deel van de kop in LIGHT */
  children: React.ReactNode;
  /** Het woord dat in terra oplicht */
  accent?: string;
  /** Kleine regel boven de kop */
  eyebrow?: string;
  className?: string;
};

/**
 * Grote kop in Elite Fit-stijl: alles in LIGHT met één woord in terra,
 * optioneel met categorie-indicator (bolletje + streepje) erboven.
 */
export function SectionHeading({
  children,
  accent,
  eyebrow,
  className = "",
}: SectionHeadingProps) {
  return (
    <div className={className}>
      {eyebrow ? (
        <div className="mb-3 flex items-center gap-2">
          <span
            className="h-1.5 w-1.5 rounded-full bg-terra"
            style={{ boxShadow: "0 0 10px rgba(176,102,98,.9)" }}
          />
          <span className="h-px w-5 bg-terra" />
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-terra">
            {eyebrow}
          </span>
        </div>
      ) : null}
      <h1 className="text-3xl leading-[0.95] font-black tracking-tight text-light sm:text-4xl">
        {children}
        {accent ? <span className="ef-accent"> {accent}</span> : null}
      </h1>
    </div>
  );
}
