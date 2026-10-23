import type { WorkArea } from "@/lib/work-areas";

export type ExceptionPriority = "normaal" | "hoog";

export type ExceptionTaskSpec = {
  sourceRef: string;
  title: string;
  description: string;
  area: WorkArea;
  priority: ExceptionPriority;
  actionUrl: string;
};

export type IntegrationStatusInput = {
  source: string;
  status: string;
  last_completed_at: string | null;
  message: string | null;
};

export type FinanceSnapshotInput = {
  overdue_count: number | null;
  last_synced_at: string | null;
} | null;

export type SalesSnapshotInput = {
  unattributed_opportunities: number | null;
  unread_conversations: number | null;
  last_synced_at: string | null;
} | null;

export type ContentAssetInput = {
  status: string;
  created_at: string;
  approved_at: string | null;
  scheduled_for: string | null;
  external_url: string | null;
};

export type CoachingInput = {
  activeClientIds: string[];
  latestReviewByClient: Record<string, string | null>;
};

export type ExceptionInputs = {
  integrations: IntegrationStatusInput[];
  finance: FinanceSnapshotInput;
  sales: SalesSnapshotInput;
  content: ContentAssetInput[];
  coaching: CoachingInput;
  now?: Date;
};

const EXPECTED_INTEGRATIONS = [
  "instagram",
  "ghl",
  "moneybird",
  "google_analytics",
  "google_calendar",
  "fathom",
] as const;

function ageInHours(value: string | null, now: Date) {
  if (!value) return Number.POSITIVE_INFINITY;
  const parsed = new Date(value).getTime();
  if (!Number.isFinite(parsed)) return Number.POSITIVE_INFINITY;
  return (now.getTime() - parsed) / 3_600_000;
}

function ageInDays(value: string | null, now: Date) {
  return ageInHours(value, now) / 24;
}

function countLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function detectExceptionTasks(inputs: ExceptionInputs): ExceptionTaskSpec[] {
  const now = inputs.now ?? new Date();
  const tasks: ExceptionTaskSpec[] = [];
  const integrations = new Map(inputs.integrations.map((status) => [status.source, status]));

  for (const source of EXPECTED_INTEGRATIONS) {
    const status = integrations.get(source);
    const missing = !status;
    const stale = status ? ageInHours(status.last_completed_at, now) > 36 : true;
    const unhealthy = status ? status.status !== "ok" : true;
    if (!missing && !stale && !unhealthy) continue;

    const reason = missing
      ? "Er is nog geen synchronisatiestatus beschikbaar."
      : unhealthy
        ? status.message || `De synchronisatie heeft status ${status.status}.`
        : "De laatste geslaagde synchronisatie is ouder dan 36 uur.";

    tasks.push({
      sourceRef: `automation:integration:${source}`,
      title: `Controleer koppeling: ${source.replaceAll("_", " ")}`,
      description: reason,
      area: "operations",
      priority: "hoog",
      actionUrl: "/operations",
    });
  }

  if (!inputs.finance) {
    tasks.push({
      sourceRef: "automation:finance:missing-snapshot",
      title: "Controleer Moneybird-synchronisatie",
      description: "Er is geen financiële momentopname beschikbaar.",
      area: "administratie",
      priority: "hoog",
      actionUrl: "/administratie",
    });
  } else if (ageInHours(inputs.finance.last_synced_at, now) > 36) {
    tasks.push({
      sourceRef: "automation:finance:stale-snapshot",
      title: "Ververs financiële gegevens",
      description: "De laatste Moneybird-momentopname is ouder dan 36 uur.",
      area: "administratie",
      priority: "hoog",
      actionUrl: "/administratie",
    });
  }

  const overdueCount = inputs.finance?.overdue_count ?? 0;
  if (overdueCount > 0) {
    tasks.push({
      sourceRef: "automation:finance:overdue-invoices",
      title: `Controleer ${countLabel(overdueCount, "te late factuur", "te late facturen")}`,
      description: "Controleer de actuele facturen in Moneybird en bepaal per uitzondering de vervolgactie.",
      area: "administratie",
      priority: "hoog",
      actionUrl: "/administratie",
    });
  }

  if (!inputs.sales) {
    tasks.push({
      sourceRef: "automation:sales:missing-snapshot",
      title: "Controleer GHL-synchronisatie",
      description: "Er is geen actuele salesmomentopname beschikbaar.",
      area: "sales",
      priority: "hoog",
      actionUrl: "/sales",
    });
  } else if (ageInHours(inputs.sales.last_synced_at, now) > 36) {
    tasks.push({
      sourceRef: "automation:sales:stale-snapshot",
      title: "Ververs GHL-gegevens",
      description: "De laatste salesmomentopname is ouder dan 36 uur.",
      area: "sales",
      priority: "hoog",
      actionUrl: "/sales",
    });
  }

  const unattributed = inputs.sales?.unattributed_opportunities ?? 0;
  if (unattributed > 0) {
    tasks.push({
      sourceRef: "automation:sales:unattributed-opportunities",
      title: `Corrigeer ${countLabel(unattributed, "saleskans zonder bron", "saleskansen zonder bron")}`,
      description: "Leg de herkomst in GHL vast zodat omzet en content betrouwbaar toegeschreven kunnen worden.",
      area: "sales",
      priority: "normaal",
      actionUrl: "/sales",
    });
  }

  const unread = inputs.sales?.unread_conversations ?? 0;
  if (unread > 0) {
    tasks.push({
      sourceRef: "automation:sales:unread-conversations",
      title: `Beoordeel ${countLabel(unread, "ongelezen gesprek", "ongelezen gesprekken")}`,
      description: "Controleer in GHL welke gesprekken een persoonlijke reactie of vervolgstap nodig hebben.",
      area: "sales",
      priority: "hoog",
      actionUrl: "/sales",
    });
  }

  const waiting = inputs.content.filter((asset) => asset.status === "wacht_op_goedkeuring").length;
  if (waiting > 0) {
    tasks.push({
      sourceRef: "automation:content:waiting-approval",
      title: `Beoordeel ${countLabel(waiting, "contentconcept", "contentconcepten")}`,
      description: "Deze content wacht op jouw inhoudelijke goedkeuring voordat planning of publicatie verder mag.",
      area: "content",
      priority: "hoog",
      actionUrl: "/content",
    });
  }

  const blocked = inputs.content.filter((asset) => asset.status === "geblokkeerd").length;
  if (blocked > 0) {
    tasks.push({
      sourceRef: "automation:content:blocked",
      title: `Los ${countLabel(blocked, "contentblokkade", "contentblokkades")} op`,
      description: "Bekijk per geblokkeerd onderdeel welke informatie, toestemming of correctie ontbreekt.",
      area: "content",
      priority: "hoog",
      actionUrl: "/content",
    });
  }

  const approvedUnscheduled = inputs.content.filter((asset) => {
    if (asset.status !== "goedgekeurd" || asset.scheduled_for || asset.external_url) return false;
    return ageInDays(asset.approved_at || asset.created_at, now) > 2;
  }).length;
  if (approvedUnscheduled > 0) {
    tasks.push({
      sourceRef: "automation:content:approved-unscheduled",
      title: `Plan ${countLabel(approvedUnscheduled, "goedgekeurd contentstuk", "goedgekeurde contentstukken")}`,
      description: "De content is langer dan twee dagen goedgekeurd maar heeft nog geen planning of publicatiekoppeling.",
      area: "content",
      priority: "normaal",
      actionUrl: "/content",
    });
  }

  const staleReviewCount = inputs.coaching.activeClientIds.filter((clientId) => {
    const latestReview = inputs.coaching.latestReviewByClient[clientId] ?? null;
    return ageInDays(latestReview, now) > 14;
  }).length;
  if (staleReviewCount > 0) {
    tasks.push({
      sourceRef: "automation:coaching:reviews-overdue",
      title: `Controleer ${countLabel(staleReviewCount, "klant zonder recente review", "klanten zonder recente review")}`,
      description: "Deze actieve klanten hebben in Growth OS geen review van de afgelopen veertien dagen. Controleer de live coachingbron voordat je opvolgt.",
      area: "coaching",
      priority: "hoog",
      actionUrl: "/coaching",
    });
  }

  return tasks.sort((a, b) => a.sourceRef.localeCompare(b.sourceRef));
}

export function exceptionDueDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
