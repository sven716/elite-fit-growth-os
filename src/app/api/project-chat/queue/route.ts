import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function authorized(request: NextRequest) {
  const secret = process.env.PROJECT_CHAT_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return Response.json({ ok: false, error: "Niet bevoegd." }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: claimed, error: claimError } = await supabase.rpc(
    "claim_project_chat_messages",
    { p_limit: 5 },
  );
  if (claimError) {
    return Response.json({ ok: false, error: claimError.message }, { status: 500 });
  }

  const ids = (claimed ?? []).map((row: { message_id: string }) => row.message_id);
  if (ids.length === 0) return Response.json({ ok: true, messages: [] });

  const { data, error } = await supabase
    .from("project_messages")
    .select(
      "id, content, source_ref, created_at, project_id, thread_id, projects(name, description, kind, event_date, status), project_threads(title, topic_type, bot_profile, hermes_session_name, linked_content_idea_id)",
    )
    .in("id", ids)
    .order("created_at");

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, messages: data ?? [] });
}

type QueueBody = {
  message_id?: string;
  response?: string;
  error?: string;
};

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return Response.json({ ok: false, error: "Niet bevoegd." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as QueueBody | null;
  const messageId = body?.message_id?.trim();
  if (!messageId) {
    return Response.json({ ok: false, error: "message_id ontbreekt." }, { status: 400 });
  }

  const supabase = createAdminClient();

  if (body?.error) {
    const { error } = await supabase.rpc("fail_project_chat_message", {
      p_message_id: messageId,
      p_error: body.error,
    });
    if (error) {
      return Response.json({ ok: false, error: error.message }, { status: 500 });
    }
    return Response.json({ ok: true, status: "failed" });
  }

  const response = body?.response?.trim();
  if (!response) {
    return Response.json({ ok: false, error: "response ontbreekt." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("complete_project_chat_message", {
    p_message_id: messageId,
    p_response: response,
  });
  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, response_id: data });
}
