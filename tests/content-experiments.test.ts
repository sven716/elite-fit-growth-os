import assert from "node:assert/strict";
import test from "node:test";
import {
  experimentScoreExplanation,
  scoreExperimentVariants,
  type ExperimentVariantMetrics,
} from "../src/lib/content-experiments.ts";

const base: ExperimentVariantMetrics[] = [
  {
    code: "A",
    views: 700,
    reach: 500,
    skipRate: 50,
    avgWatchTimeMs: 8000,
    saved: 2,
    shares: 2,
    comments: 1,
    conversations: 0,
    qualifiedLeads: 0,
  },
  {
    code: "B",
    views: 900,
    reach: 650,
    skipRate: 40,
    avgWatchTimeMs: 9000,
    saved: 4,
    shares: 5,
    comments: 2,
    conversations: 1,
    qualifiedLeads: 0,
  },
  {
    code: "C",
    views: 600,
    reach: 430,
    skipRate: 55,
    avgWatchTimeMs: 7000,
    saved: 1,
    shares: 1,
    comments: 0,
    conversations: 0,
    qualifiedLeads: 0,
  },
];

test("hookscore beloont lagere skip en hogere kijktijd", () => {
  const scores = scoreExperimentVariants(base, "hook");
  assert.equal(scores.find((row) => row.code === "B")?.score, 100);
  assert.equal(scores.find((row) => row.code === "C")?.score, 0);
});

test("ontbrekende waarden tellen niet als nul", () => {
  const sparse = base.map((row) => ({
    ...row,
    reach: null,
    shares: null,
  }));
  const scores = scoreExperimentVariants(sparse, "hook");
  assert.equal(scores.find((row) => row.code === "B")?.score, 100);
  assert.equal(scores.find((row) => row.code === "B")?.measuredWeight, 85);
});

test("zonder vergelijkbare metingen is er nog geen score", () => {
  const empty = base.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [key, key === "code" ? value : null]),
    ),
  ) as ExperimentVariantMetrics[];
  assert.ok(scoreExperimentVariants(empty, "bereik").every((row) => row.score === null));
});

test("score-uitleg maakt de weging zichtbaar", () => {
  const explanation = experimentScoreExplanation("gesprekken");
  assert.match(explanation, /passende leads 30%/);
  assert.match(explanation, /gesprekken 25%/);
});
