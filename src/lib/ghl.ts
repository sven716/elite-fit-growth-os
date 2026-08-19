export const GHL_USER_ID = "cfb57eb3-8efe-4372-9e9e-21bee4ea8009";

export type GhlNormalizedContact = {
  id: string;
  locationId: string | null;
  name: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  tags: string[];
  updatedAt: string | null;
};

export type GhlNormalizedOpportunity = {
  id: string;
  contactId: string | null;
  locationId: string | null;
  pipelineId: string | null;
  pipelineStageId: string | null;
  pipelineStageName: string | null;
  status: string | null;
  monetaryValue: number | null;
  assignedTo: string | null;
  updatedAt: string | null;
};

export type GhlNormalizedAppointment = {
  id: string;
  contactId: string | null;
  locationId: string | null;
  title: string | null;
  status: string | null;
  startAt: string | null;
  endAt: string | null;
  calendarId: string | null;
  assignedTo: string | null;
  updatedAt: string | null;
};

export type GhlNormalizedPayload = {
  eventType: string;
  externalEventId: string;
  locationId: string | null;
  contact: GhlNormalizedContact | null;
  opportunity: GhlNormalizedOpportunity | null;
  appointment: GhlNormalizedAppointment | null;
  raw: Record<string, unknown>;
};

export type GhlTaskSpec = {
  sourceRef: string;
  title: string;
  dueDate: string | null;
  category: "opvolgen";
};

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function getByPath(
  source: Record<string, unknown>,
  path: readonly string[],
): unknown {
  let current: unknown = source;

  for (const segment of path) {
    const object = asObject(current);
    if (!object || !(segment in object)) return undefined;
    current = object[segment];
  }

  return current;
}

function firstDefined(
  source: Record<string, unknown>,
  paths: readonly (readonly string[])[],
): unknown {
  for (const path of paths) {
    const value = getByPath(source, path);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

function pickString(
  source: Record<string, unknown>,
  paths: readonly (readonly string[])[],
): string | null {
  const value = firstDefined(source, paths);
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (typeof value === "number") return String(value);
  return null;
}

function pickNumber(
  source: Record<string, unknown>,
  paths: readonly (readonly string[])[],
): number | null {
  const value = firstDefined(source, paths);
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(",", ".").replace(/[^0-9.-]/g, "");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function pickStringArray(
  source: Record<string, unknown>,
  paths: readonly (readonly string[])[],
): string[] {
  const value = firstDefined(source, paths);
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : String(item)))
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function isoOrNull(value: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function dateOnly(value: string | null): string | null {
  if (!value) return null;
  return value.slice(0, 10);
}

function fallbackName(firstName: string | null, lastName: string | null) {
  return [firstName, lastName].filter(Boolean).join(" ").trim() || "Onbekende lead";
}

function slug(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeWebhookPayload(
  input: unknown,
): GhlNormalizedPayload {
  const raw = asObject(input);
  if (!raw) {
    throw new Error("Webhook-body is geen object.");
  }

  const eventType =
    pickString(raw, [
      ["type"],
      ["eventType"],
      ["event"],
      ["triggerType"],
      ["meta", "type"],
    ]) ?? "unknown";

  const locationId = pickString(raw, [
    ["locationId"],
    ["location_id"],
    ["location", "id"],
    ["companyId"],
  ]);

  const firstName = pickString(raw, [
    ["contact", "firstName"],
    ["contact", "first_name"],
    ["firstName"],
    ["first_name"],
  ]);
  const lastName = pickString(raw, [
    ["contact", "lastName"],
    ["contact", "last_name"],
    ["lastName"],
    ["last_name"],
  ]);

  const contactId = pickString(raw, [
    ["contactId"],
    ["contact_id"],
    ["contact", "id"],
    ["contact", "contactId"],
    ["id"],
  ]);

  const contactName =
    pickString(raw, [
      ["contact", "name"],
      ["name"],
      ["contact", "fullName"],
    ]) ?? fallbackName(firstName, lastName);

  const contact = contactId
    ? {
        id: contactId,
        locationId,
        name: contactName,
        firstName,
        lastName,
        email: pickString(raw, [
          ["contact", "email"],
          ["email"],
        ]),
        phone: pickString(raw, [
          ["contact", "phone"],
          ["phone"],
        ]),
        source: pickString(raw, [
          ["contact", "source"],
          ["source"],
        ]),
        tags: pickStringArray(raw, [
          ["contact", "tags"],
          ["tags"],
        ]),
        updatedAt: isoOrNull(
          pickString(raw, [
            ["contact", "dateUpdated"],
            ["contact", "updatedAt"],
            ["updatedAt"],
            ["dateUpdated"],
          ]),
        ),
      }
    : null;

  const opportunityId = pickString(raw, [
    ["opportunityId"],
    ["opportunity_id"],
    ["opportunity", "id"],
    ["opportunity", "opportunityId"],
  ]);

  const opportunity = opportunityId
    ? {
        id: opportunityId,
        contactId,
        locationId,
        pipelineId: pickString(raw, [
          ["pipelineId"],
          ["pipeline_id"],
          ["opportunity", "pipelineId"],
        ]),
        pipelineStageId: pickString(raw, [
          ["pipelineStageId"],
          ["pipeline_stage_id"],
          ["opportunity", "pipelineStageId"],
          ["stageId"],
        ]),
        pipelineStageName: pickString(raw, [
          ["pipelineStageName"],
          ["stage", "name"],
          ["opportunity", "pipelineStageName"],
          ["status"],
        ]),
        status: pickString(raw, [
          ["opportunity", "status"],
          ["status"],
        ]),
        monetaryValue: pickNumber(raw, [
          ["opportunity", "monetaryValue"],
          ["monetaryValue"],
          ["value"],
        ]),
        assignedTo: pickString(raw, [
          ["opportunity", "assignedTo"],
          ["assignedTo"],
          ["userId"],
        ]),
        updatedAt: isoOrNull(
          pickString(raw, [
            ["opportunity", "updatedAt"],
            ["updatedAt"],
            ["dateUpdated"],
          ]),
        ),
      }
    : null;

  const appointmentId = pickString(raw, [
    ["appointmentId"],
    ["appointment_id"],
    ["appointment", "id"],
    ["calendarEventId"],
  ]);

  const appointment = appointmentId
    ? {
        id: appointmentId,
        contactId,
        locationId,
        title: pickString(raw, [
          ["appointment", "title"],
          ["title"],
          ["calendarTitle"],
        ]),
        status: pickString(raw, [
          ["appointment", "status"],
          ["calendarStatus"],
          ["status"],
        ]),
        startAt: isoOrNull(
          pickString(raw, [
            ["appointment", "startTime"],
            ["startTime"],
            ["startAt"],
          ]),
        ),
        endAt: isoOrNull(
          pickString(raw, [
            ["appointment", "endTime"],
            ["endTime"],
            ["endAt"],
          ]),
        ),
        calendarId: pickString(raw, [
          ["appointment", "calendarId"],
          ["calendarId"],
        ]),
        assignedTo: pickString(raw, [
          ["appointment", "assignedUserId"],
          ["assignedUserId"],
          ["userId"],
        ]),
        updatedAt: isoOrNull(
          pickString(raw, [
            ["appointment", "updatedAt"],
            ["updatedAt"],
            ["dateUpdated"],
          ]),
        ),
      }
    : null;

  const externalEventId =
    pickString(raw, [
      ["messageId"],
      ["eventId"],
      ["webhookId"],
      ["id"],
    ]) ??
    [eventType, locationId, contactId, opportunityId, appointmentId]
      .filter(Boolean)
      .join(":");

  return {
    eventType,
    externalEventId,
    locationId,
    contact,
    opportunity,
    appointment,
    raw,
  };
}

export function buildTaskSpecs(payload: GhlNormalizedPayload): GhlTaskSpec[] {
  const tasks = new Map<string, GhlTaskSpec>();
  const appointment = payload.appointment;
  const opportunity = payload.opportunity;
  const contactName = payload.contact?.name ?? "Onbekende lead";
  const eventSlug = slug(payload.eventType);
  const appointmentStatus = slug(appointment?.status);

  if (appointment?.id) {
    const dueDate = dateOnly(appointment.startAt);
    const appointmentLabel = appointment.title ? ` — ${appointment.title}` : "";

    if (
      appointmentStatus.includes("book") ||
      appointmentStatus.includes("confirm") ||
      eventSlug.includes("appointment")
    ) {
      tasks.set(`appointment:${appointment.id}:voorbereiden`, {
        sourceRef: `appointment:${appointment.id}:voorbereiden`,
        title: `Strategiegesprek voorbereiden: ${contactName}${appointmentLabel}`,
        dueDate,
        category: "opvolgen",
      });
    }

    if (
      appointmentStatus.includes("no-show") ||
      appointmentStatus.includes("noshow") ||
      eventSlug.includes("no-show") ||
      eventSlug.includes("noshow")
    ) {
      tasks.set(`appointment:${appointment.id}:no-show`, {
        sourceRef: `appointment:${appointment.id}:no-show`,
        title: `No-show opvolgen: ${contactName}`,
        dueDate: dueDate ?? new Date().toISOString().slice(0, 10),
        category: "opvolgen",
      });
    }

    if (
      appointmentStatus.includes("cancel") ||
      eventSlug.includes("cancel")
    ) {
      tasks.set(`appointment:${appointment.id}:opnieuw-plannen`, {
        sourceRef: `appointment:${appointment.id}:opnieuw-plannen`,
        title: `Afspraak opnieuw plannen: ${contactName}`,
        dueDate: dueDate ?? new Date().toISOString().slice(0, 10),
        category: "opvolgen",
      });
    }
  }

  const opportunityStatus = slug(opportunity?.status);
  const stageName = slug(opportunity?.pipelineStageName);
  if (
    opportunity?.id &&
    (opportunityStatus.includes("won") || stageName.includes("won"))
  ) {
    tasks.set(`opportunity:${opportunity.id}:nieuwe-klant-check`, {
      sourceRef: `opportunity:${opportunity.id}:nieuwe-klant-check`,
      title: `Nieuwe klant controleren in Growth OS: ${contactName}`,
      dueDate: new Date().toISOString().slice(0, 10),
      category: "opvolgen",
    });
  }

  return [...tasks.values()];
}
