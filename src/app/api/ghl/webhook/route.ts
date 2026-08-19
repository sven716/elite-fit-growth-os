import { createAdminClient } from "@/lib/supabase/admin";
import {
  GHL_USER_ID,
  buildTaskSpecs,
  normalizeWebhookPayload,
} from "@/lib/ghl";
import { type NextRequest } from "next/server";

function json(status: number, body: Record<string, unknown>) {
  return Response.json(body, { status });
}

function getToken(request: NextRequest) {
  return request.nextUrl.searchParams.get("token");
}

function getConfiguredLocationId() {
  return process.env.GHL_LOCATION_ID?.trim() || null;
}

export async function GET(request: NextRequest) {
  const token = getToken(request);
  const secret = process.env.GHL_WEBHOOK_SECRET?.trim() || null;

  return json(200, {
    ok: true,
    authorized: Boolean(secret && token === secret),
    config: {
      webhookSecret: Boolean(secret),
      supabaseServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      ghlLocationId: Boolean(getConfiguredLocationId()),
    },
  });
}

export async function POST(request: NextRequest) {
  const secret = process.env.GHL_WEBHOOK_SECRET?.trim() || null;
  if (!secret) {
    return json(500, {
      ok: false,
      error: "Webhook-secret ontbreekt in de omgeving.",
    });
  }

  if (getToken(request) !== secret) {
    return json(401, { ok: false, error: "Ongeldige webhook-token." });
  }

  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
    return json(400, {
      ok: false,
      error: "Webhook-body is geen geldige JSON.",
    });
  }

  const payload = normalizeWebhookPayload(parsedBody);
  const configuredLocationId = getConfiguredLocationId();
  if (configuredLocationId && payload.locationId !== configuredLocationId) {
    return json(202, {
      ok: true,
      skipped: true,
      reason: "Webhook hoort bij een andere GHL-locatie.",
      locationId: payload.locationId,
    });
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Onbekende fout.";
    return json(500, { ok: false, error: message });
  }

  const now = new Date().toISOString();
  const eventRow = {
    user_id: GHL_USER_ID,
    source: "ghl",
    external_event_id: payload.externalEventId,
    event_type: payload.eventType,
    location_id: payload.locationId,
    contact_id: payload.contact?.id ?? null,
    opportunity_id: payload.opportunity?.id ?? null,
    appointment_id: payload.appointment?.id ?? null,
    payload: payload.raw,
    received_at: now,
  };

  const writes: Promise<unknown>[] = [
    supabase.from("ghl_event_log").upsert(eventRow, {
      onConflict: "user_id,external_event_id",
    }),
  ];

  if (payload.contact) {
    writes.push(
      supabase.from("ghl_contacts").upsert(
        {
          user_id: GHL_USER_ID,
          external_id: payload.contact.id,
          location_id: payload.contact.locationId,
          name: payload.contact.name,
          first_name: payload.contact.firstName,
          last_name: payload.contact.lastName,
          email: payload.contact.email,
          phone: payload.contact.phone,
          source: payload.contact.source,
          tags: payload.contact.tags,
          last_synced_at: now,
          updated_at_remote: payload.contact.updatedAt,
        },
        { onConflict: "user_id,external_id" },
      ),
    );
  }

  if (payload.opportunity) {
    writes.push(
      supabase.from("ghl_opportunities").upsert(
        {
          user_id: GHL_USER_ID,
          external_id: payload.opportunity.id,
          contact_external_id: payload.opportunity.contactId,
          location_id: payload.opportunity.locationId,
          pipeline_id: payload.opportunity.pipelineId,
          pipeline_stage_id: payload.opportunity.pipelineStageId,
          pipeline_stage_name: payload.opportunity.pipelineStageName,
          status: payload.opportunity.status,
          monetary_value: payload.opportunity.monetaryValue,
          assigned_to: payload.opportunity.assignedTo,
          last_synced_at: now,
          updated_at_remote: payload.opportunity.updatedAt,
        },
        { onConflict: "user_id,external_id" },
      ),
    );
  }

  if (payload.appointment) {
    writes.push(
      supabase.from("ghl_appointments").upsert(
        {
          user_id: GHL_USER_ID,
          external_id: payload.appointment.id,
          contact_external_id: payload.appointment.contactId,
          location_id: payload.appointment.locationId,
          title: payload.appointment.title,
          status: payload.appointment.status,
          start_at: payload.appointment.startAt,
          end_at: payload.appointment.endAt,
          calendar_id: payload.appointment.calendarId,
          assigned_to: payload.appointment.assignedTo,
          last_synced_at: now,
          updated_at_remote: payload.appointment.updatedAt,
        },
        { onConflict: "user_id,external_id" },
      ),
    );
  }

  const taskSpecs = buildTaskSpecs(payload);
  for (const task of taskSpecs) {
    writes.push(
      supabase.from("tasks").upsert(
        {
          user_id: GHL_USER_ID,
          title: task.title,
          due_date: task.dueDate,
          category: task.category,
          status: "open",
          source: "ghl",
          source_ref: task.sourceRef,
        },
        { onConflict: "user_id,source_ref" },
      ),
    );
  }

  const results = await Promise.all(writes);
  const firstError = results
    .map((result) => {
      if (
        typeof result === "object" &&
        result !== null &&
        "error" in result &&
        result.error
      ) {
        return String((result as { error: { message?: string } }).error.message);
      }
      return null;
    })
    .find(Boolean);

  if (firstError) {
    return json(500, {
      ok: false,
      error: firstError,
    });
  }

  return json(200, {
    ok: true,
    eventType: payload.eventType,
    saved: {
      contact: Boolean(payload.contact),
      opportunity: Boolean(payload.opportunity),
      appointment: Boolean(payload.appointment),
      tasks: taskSpecs.length,
    },
  });
}
