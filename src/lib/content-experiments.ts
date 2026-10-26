export type ExperimentObjective = "hook" | "bereik" | "interactie" | "gesprekken";
export type MeasurementWindow = "24h" | "72h";

export type ExperimentVariantMetrics = {
  code: string;
  views: number | null;
  reach: number | null;
  skipRate: number | null;
  avgWatchTimeMs: number | null;
  saved: number | null;
  shares: number | null;
  comments: number | null;
  conversations: number | null;
  qualifiedLeads: number | null;
};

export type ScoredVariant = ExperimentVariantMetrics & {
  score: number | null;
  measuredWeight: number;
};

type MetricKey = Exclude<keyof ExperimentVariantMetrics, "code">;

type WeightedMetric = {
  key: MetricKey;
  weight: number;
  lowerIsBetter?: boolean;
};

const WEIGHTS: Record<ExperimentObjective, WeightedMetric[]> = {
  hook: [
    { key: "skipRate", weight: 45, lowerIsBetter: true },
    { key: "avgWatchTimeMs", weight: 40 },
    { key: "reach", weight: 10 },
    { key: "shares", weight: 5 },
  ],
  bereik: [
    { key: "skipRate", weight: 30, lowerIsBetter: true },
    { key: "avgWatchTimeMs", weight: 25 },
    { key: "reach", weight: 25 },
    { key: "shares", weight: 10 },
    { key: "saved", weight: 5 },
    { key: "comments", weight: 5 },
  ],
  interactie: [
    { key: "skipRate", weight: 15, lowerIsBetter: true },
    { key: "avgWatchTimeMs", weight: 15 },
    { key: "shares", weight: 25 },
    { key: "saved", weight: 25 },
    { key: "comments", weight: 15 },
    { key: "reach", weight: 5 },
  ],
  gesprekken: [
    { key: "qualifiedLeads", weight: 30 },
    { key: "conversations", weight: 25 },
    { key: "skipRate", weight: 15, lowerIsBetter: true },
    { key: "avgWatchTimeMs", weight: 10 },
    { key: "shares", weight: 10 },
    { key: "saved", weight: 5 },
    { key: "comments", weight: 5 },
  ],
};

function rankScore(
  value: number,
  knownValues: number[],
  lowerIsBetter: boolean,
): number {
  const unique = [...new Set(knownValues)].sort((a, b) =>
    lowerIsBetter ? a - b : b - a,
  );
  if (unique.length === 1) return 100;
  const rank = unique.indexOf(value);
  return Math.round((1 - rank / (unique.length - 1)) * 100);
}

/**
 * Maakt een transparante score binnen één testbatch. De score vergelijkt alleen
 * varianten uit dezelfde test en gebruikt geen verzonnen marktbenchmark.
 * Ontbrekende metingen tellen niet als nul; hun gewicht wordt uitgesloten.
 */
export function scoreExperimentVariants(
  variants: ExperimentVariantMetrics[],
  objective: ExperimentObjective,
): ScoredVariant[] {
  const weightedMetrics = WEIGHTS[objective];

  return variants.map((variant) => {
    let points = 0;
    let measuredWeight = 0;

    for (const metric of weightedMetrics) {
      const value = variant[metric.key];
      if (typeof value !== "number") continue;

      const knownValues = variants
        .map((candidate) => candidate[metric.key])
        .filter((candidate): candidate is number => typeof candidate === "number");
      if (knownValues.length < 2) continue;

      points +=
        rankScore(value, knownValues, Boolean(metric.lowerIsBetter)) * metric.weight;
      measuredWeight += metric.weight;
    }

    return {
      ...variant,
      score: measuredWeight > 0 ? Math.round((points / measuredWeight) * 10) / 10 : null,
      measuredWeight,
    };
  });
}

export function experimentScoreExplanation(objective: ExperimentObjective): string {
  const labels: Record<MetricKey, string> = {
    views: "weergaven",
    reach: "bereik",
    skipRate: "lager skippercentage",
    avgWatchTimeMs: "gemiddelde kijktijd",
    saved: "opgeslagen",
    shares: "gedeeld",
    comments: "reacties",
    conversations: "gesprekken",
    qualifiedLeads: "passende leads",
  };

  return WEIGHTS[objective]
    .map((metric) => `${labels[metric.key]} ${metric.weight}%`)
    .join(" · ");
}

export function metricsForWindow(
  variant: Record<string, unknown>,
  window: MeasurementWindow,
): ExperimentVariantMetrics {
  const suffix = window === "24h" ? "24h" : "72h";
  const numberOrNull = (key: string) =>
    typeof variant[key] === "number" ? (variant[key] as number) : null;

  return {
    code: String(variant.code),
    views: numberOrNull(`views_${suffix}`),
    reach: numberOrNull(`reach_${suffix}`),
    skipRate: numberOrNull(`skip_rate_${suffix}`),
    avgWatchTimeMs: numberOrNull(`avg_watch_time_ms_${suffix}`),
    saved: numberOrNull(`saved_${suffix}`),
    shares: numberOrNull(`shares_${suffix}`),
    comments: numberOrNull(`comments_${suffix}`),
    conversations: numberOrNull("conversations"),
    qualifiedLeads: numberOrNull("qualified_leads"),
  };
}
