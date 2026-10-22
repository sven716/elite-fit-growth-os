export const WORK_AREAS = [
  "centraal",
  "content",
  "sales",
  "coaching",
  "operations",
  "administratie",
] as const;

export type WorkArea = (typeof WORK_AREAS)[number];

export const WORK_AREA_LABELS: Record<WorkArea, string> = {
  centraal: "Centraal",
  content: "Content",
  sales: "Sales",
  coaching: "Coaching",
  operations: "Operations",
  administratie: "Administratie",
};

export const WORK_AREA_HINTS: Record<WorkArea, string> = {
  centraal: "Bedrijfsbreed en niet aan één afdeling gebonden",
  content: "Ideeën, productie, goedkeuring en publicatie",
  sales: "Leads, gesprekken, opvolging en overdracht",
  coaching: "Klanten, reviews, retentie en coachingsacties",
  operations: "Systemen, automatiseringen, projecten en kwaliteit",
  administratie: "Financiën, facturen, doelen en leveranciers",
};

export function isWorkArea(value: string): value is WorkArea {
  return WORK_AREAS.includes(value as WorkArea);
}
